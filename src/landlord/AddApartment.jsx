import "./AddApartment.css";
import { PropertyLocationPicker } from "@/landlord/PropertyLocationPicker";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { apartmentFormValuesFromApartment, createApartment, deleteApartment, fetchApartmentWithImages, resolveAppUserId, uploadApartmentImage, } from "@/data/apartments";
import { VERIFICATION_DOCUMENT_TYPES, uploadVerificationDocuments, validateVerificationFile, } from "@/services/verificationDocumentsService";
import { deletePropertyDraft, fetchPropertyDraft, savePropertyDraft, } from "@/services/propertyDraftService";
import { DEFAULT_LA_PAZ_MAP_CENTER, hasValidApartmentCoordinates, } from "@/utils/mapCoordinates";
import { supabase } from "@/services/supabaseClient";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Camera, Check, Cloud, CloudUpload, FileText, Home, ListChecks, MapPin, Menu, Plus, RotateCcw, ShieldCheck, Trash2, Upload, X, } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
function isPropertyDraft(value) {
    if (!value || typeof value !== "object")
        return false;
    const draft = value;
    return draft.version === 2 && typeof draft.savedAt === "string" && Number.isFinite(draft.currentStep);
}
const VALID_ID_TYPES = [
    "Passport",
    "Driver's License",
    "SSS ID",
    "GSIS ID",
    "PhilHealth ID",
    "Postal ID",
    "Voter's ID",
    "PRC ID",
    "National ID (PhilSys)",
    "TIN ID",
    "Barangay ID",
    "Senior Citizen ID",
    "PWD ID",
    "OFW ID",
];
const SUGGESTED_FEATURES = [
    "Pet Friendly",
    "Furnished",
    "Semi-Furnished",
    "Balcony",
    "Garden",
    "Storage Room",
    "Near Market",
    "Near Hospital",
    "Near School",
];
const SUGGESTED_AMENITIES = [
    "WiFi", "Parking", "Laundry Area", "Gym", "Swimming Pool", "CCTV", "Elevator", "Generator", "Water Heater",
];
const normalizeListValues = (value) => {
    const canonical = new Map(SUGGESTED_AMENITIES.map((item) => [item.toLowerCase(), item]));
    return value.split(",").map((item) => item.trim()).filter(Boolean).reduce((items, item) => {
        const normalized = canonical.get(item.toLowerCase()) ?? item;
        if (!items.some((existing) => existing.toLowerCase() === normalized.toLowerCase()))
            items.push(normalized);
        return items;
    }, []);
};
const INITIAL_FORM_DATA = {
    title: "",
    sqft: 500,
    address: "",
    city: "La Paz",
    state: "Iloilo City",
    zip: "5000",
    description: "",
    availableDate: new Date().toISOString().split("T")[0],
    petFriendly: false,
    parking: false,
    furnished: false,
    image: "",
    images: [],
    amenities: [],
    utilities: false,
    status: "available",
};
const INITIAL_VERIFICATION_DATA = {
    businessPermit: "",
    permitExpiry: "",
    tinNumber: "",
    idType: "",
    idNumber: "",
};
export function AddApartment() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { refreshApartments } = useApartmentsContext();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const totalSteps = 4;
    const stepConfig = [
        { number: 1, title: "Property Information", description: "Photos, name, and basic details" },
        { number: 2, title: "Location", description: "Address and exact map location" },
        { number: 3, title: "Amenities & Features", description: "Amenities, utilities, and additional features" },
        { number: 4, title: "Property Verification", description: "Permit details and verification documents" },
    ];
    const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
    const [locationLookupRequest, setLocationLookupRequest] = useState(0);
    const [locationPinned, setLocationPinned] = useState(false);
    const [locationResolving, setLocationResolving] = useState(false);
    const lastAutoGeocodedAddressRef = useRef("");
    const [uploadedImages, setUploadedImages] = useState([]);
    const [amenitiesInput, setAmenitiesInput] = useState("");
    const [utilitiesInput, setUtilitiesInput] = useState("");
    const [features, setFeatures] = useState([]);
    const [featureInput, setFeatureInput] = useState("");
    const addFeature = (value) => {
        const trimmed = value.trim();
        if (!trimmed)
            return;
        if (features.map((f) => f.toLowerCase()).includes(trimmed.toLowerCase())) {
            toast.error("Feature already added");
            return;
        }
        setFeatures((prev) => [...prev, trimmed]);
        setFeatureInput("");
        setValidationErrors((previous) => {
            if (!previous.features)
                return previous;
            const next = { ...previous };
            delete next.features;
            return next;
        });
    };
    const removeFeature = (index) => setFeatures((prev) => prev.filter((_, i) => i !== index));
    const handleFeatureKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addFeature(featureInput);
        }
    };
    const [verificationData, setVerificationData] = useState({ ...INITIAL_VERIFICATION_DATA });
    const [verificationDocuments, setVerificationDocuments] = useState([]);
    const [pendingDraft, setPendingDraft] = useState(null);
    const [draftStatus, setDraftStatus] = useState("idle");
    const [draftReady, setDraftReady] = useState(false);
    const [imageReuploadRequired, setImageReuploadRequired] = useState(false);
    const autoSaveTimerRef = useRef(null);
    const skipNextAutoSaveRef = useRef(false);
    const submissionCompleteRef = useRef(false);
    const selectVerificationDocument = (type, file) => {
        if (!file)
            return;
        const error = validateVerificationFile(file);
        if (error) {
            toast.error(error);
            return;
        }
        setVerificationDocuments((current) => {
            const previous = current.find((document) => document.type === type);
            if (previous?.previewUrl.startsWith("blob:"))
                URL.revokeObjectURL(previous.previewUrl);
            return [
                ...current.filter((document) => document.type !== type),
                { type, file, previewUrl: URL.createObjectURL(file) },
            ];
        });
    };
    const removePendingVerificationDocument = (type) => {
        setVerificationDocuments((current) => {
            const document = current.find((item) => item.type === type);
            if (document?.previewUrl.startsWith("blob:"))
                URL.revokeObjectURL(document.previewUrl);
            return current.filter((item) => item.type !== type);
        });
    };
    const hasDraftContent = useMemo(() => {
        const verificationHasContent = Object.values(verificationData).some((value) => value.trim().length > 0);
        return Boolean(String(formData.title ?? "").trim()
            || String(formData.description ?? "").trim()
            || String(formData.address ?? "").trim()
            || amenitiesInput.trim()
            || utilitiesInput.trim()
            || features.length > 0
            || featureInput.trim()
            || uploadedImages.length > 0
            || verificationDocuments.length > 0
            || verificationHasContent
            || currentStep > 1);
    }, [amenitiesInput, currentStep, featureInput, features, formData, uploadedImages, utilitiesInput, verificationData, verificationDocuments]);
    const resetDraftForm = () => {
        setCurrentStep(1);
        setFormData({ ...INITIAL_FORM_DATA });
        setUploadedImages([]);
        setAmenitiesInput("");
        setUtilitiesInput("");
        setFeatures([]);
        setFeatureInput("");
        setVerificationData({ ...INITIAL_VERIFICATION_DATA });
        setVerificationDocuments((current) => {
            current.forEach((document) => {
                if (document.previewUrl.startsWith("blob:"))
                    URL.revokeObjectURL(document.previewUrl);
            });
            return [];
        });
        setValidationErrors({});
        setImageReuploadRequired(false);
        setLocationPinned(false);
        setLocationResolving(false);
        lastAutoGeocodedAddressRef.current = "";
    };
    const discardDraft = (resetForm = true) => {
        if (user?.id) {
            void deletePropertyDraft(user.id).catch((error) => {
                console.error("Unable to delete the property draft:", error);
            });
        }
        setPendingDraft(null);
        setDraftReady(true);
        setDraftStatus("idle");
        if (resetForm)
            resetDraftForm();
    };
    const continueDraft = () => {
        if (!pendingDraft)
            return;
        skipNextAutoSaveRef.current = true;
        setCurrentStep(Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1)));
        const restoredFormData = { ...INITIAL_FORM_DATA, ...pendingDraft.formData, image: "", images: [] };
        setFormData(restoredFormData);
        setLocationPinned(hasValidApartmentCoordinates(restoredFormData.lat, restoredFormData.lng));
        setUploadedImages(pendingDraft.uploadedImages ?? []);
        setAmenitiesInput(pendingDraft.amenitiesInput ?? "");
        setUtilitiesInput(pendingDraft.utilitiesInput ?? "");
        setFeatures(pendingDraft.features ?? []);
        setFeatureInput(pendingDraft.featureInput ?? "");
        setVerificationData({ ...INITIAL_VERIFICATION_DATA, ...pendingDraft.verificationData });
        setImageReuploadRequired(Boolean(pendingDraft.requiresImageReupload));
        setPendingDraft(null);
        setDraftReady(true);
        setDraftStatus("restored");
        toast.success("Property draft restored");
    };
    useEffect(() => {
        if (!user?.id)
            return;
        let active = true;
        setDraftReady(false);
        setPendingDraft(null);
        void fetchPropertyDraft(user.id)
            .then((parsed) => {
            if (!active)
                return;
            if (parsed && isPropertyDraft(parsed)) {
                setPendingDraft(parsed);
            }
            else if (parsed) {
                void deletePropertyDraft(user.id).catch((error) => {
                    console.error("Unable to remove an invalid property draft:", error);
                });
            }
        })
            .catch((error) => {
            console.error("Unable to read the Add Property draft:", error);
        })
            .finally(() => {
            if (active)
                setDraftReady(true);
        });
        return () => {
            active = false;
        };
    }, [user?.id]);
    const persistDraft = useCallback(async (updateStatus = true) => {
        if (!user?.id || !hasDraftContent || submissionCompleteRef.current)
            return;
        const persistentImages = uploadedImages
            .filter((image) => !image.file && /^https?:\/\//i.test(image.url))
            .map((image) => ({ ...image, file: undefined }));
        const hasLocalPropertyImages = uploadedImages.some((image) => Boolean(image.file) || /^(data:|blob:)/i.test(image.url));
        const { image: _image, images: _images, ...safeFormData } = formData;
        const draft = {
            version: 2,
            savedAt: new Date().toISOString(),
            currentStep,
            formData: safeFormData,
            amenitiesInput,
            utilitiesInput,
            features,
            featureInput,
            verificationData: INITIAL_VERIFICATION_DATA,
            uploadedImages: persistentImages,
            requiresImageReupload: hasLocalPropertyImages || imageReuploadRequired,
        };
        try {
            await savePropertyDraft(user.id, draft);
            if (updateStatus)
                setDraftStatus("saved");
        }
        catch (error) {
            console.error("Unable to save the Add Property draft:", error);
            if (updateStatus)
                setDraftStatus("error");
        }
    }, [amenitiesInput, currentStep, featureInput, features, formData, hasDraftContent, imageReuploadRequired, uploadedImages, user?.id, utilitiesInput, verificationData]);
    useEffect(() => {
        if (!draftReady || !user?.id || submissionCompleteRef.current)
            return;
        if (skipNextAutoSaveRef.current) {
            skipNextAutoSaveRef.current = false;
            return;
        }
        if (autoSaveTimerRef.current)
            clearTimeout(autoSaveTimerRef.current);
        if (!hasDraftContent) {
            void deletePropertyDraft(user.id).catch((error) => {
                console.error("Unable to clear the empty property draft:", error);
            });
            setDraftStatus("idle");
            return;
        }
        setDraftStatus("saving");
        autoSaveTimerRef.current = setTimeout(() => void persistDraft(), 700);
        return () => {
            if (autoSaveTimerRef.current)
                clearTimeout(autoSaveTimerRef.current);
        };
    }, [draftReady, hasDraftContent, persistDraft, user?.id]);
    const fieldClass = (field) => validationErrors[field]
        ? "landlord-field-invalid"
        : "landlord-field-normal";
    const clearValidationError = (field) => {
        setValidationErrors((previous) => {
            if (!previous[field])
                return previous;
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };
    const FieldError = ({ field }) => validationErrors[field] ? <p className="add-apartment-text">{validationErrors[field]}</p> : null;
    const locationAddressQuery = useMemo(() => [formData.address, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", "), [formData.address, formData.city, formData.state, formData.zip]);
    useEffect(() => {
        if (currentStep !== 2)
            return;
        if (!String(formData.address ?? "").trim())
            return;
        const normalizedQuery = locationAddressQuery.trim().replace(/\s+/g, " ").toLowerCase();
        if (!normalizedQuery || normalizedQuery === lastAutoGeocodedAddressRef.current)
            return;
        setLocationResolving(true);
        const timer = window.setTimeout(() => {
            lastAutoGeocodedAddressRef.current = normalizedQuery;
            setLocationLookupRequest((request) => request + 1);
        }, 800);
        return () => window.clearTimeout(timer);
    }, [currentStep, formData.address, locationAddressQuery]);
    const getSubmittedAmenities = () => normalizeListValues(amenitiesInput);
    const getSubmittedFeatures = () => {
        const submittedFeatures = featureInput.trim() ? [...features, featureInput.trim()] : features;
        return submittedFeatures.filter((feature, index, list) => list.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index);
    };
    const validateAllFields = () => {
        const errors = {};
        if (!String(formData.title ?? "").trim())
            errors.title = "Property name is required.";
        if (!Number(formData.sqft))
            errors.sqft = "Total property area is required.";
        if (!String(formData.description ?? "").trim())
            errors.description = "Property description is required.";
        if (uploadedImages.length === 0)
            errors.images = "Upload at least one property image.";
        if (!String(formData.address ?? "").trim())
            errors.address = "Complete address is required.";
        if (locationResolving) {
            errors.mapLocation = "Finding this address on the map. Please wait a moment.";
        }
        else if (!locationPinned || !hasValidApartmentCoordinates(formData.lat, formData.lng)) {
            errors.mapLocation = "Select the property's real map location before submitting.";
        }
        if (!String(verificationData.businessPermit).trim())
            errors.businessPermit = "Business permit number is required.";
        const firstStep = errors.title || errors.sqft || errors.description || errors.images
            ? 1
            : errors.address || errors.mapLocation
                ? 2
                : errors.businessPermit
                    ? 4
                    : currentStep;
        return { isValid: Object.keys(errors).length === 0, errors, firstStep };
    };
    const validateStep = (step) => {
        const { errors } = validateAllFields();
        const belongsToStep = (field) => {
            if (step === 1)
                return ["title", "sqft", "description", "images"].includes(field);
            if (step === 2)
                return ["address", "mapLocation"].includes(field);
            if (step === 3)
                return false;
            if (step === 4)
                return field === "businessPermit";
            return false;
        };
        const stepErrors = Object.fromEntries(Object.entries(errors).filter(([field]) => belongsToStep(field)));
        setValidationErrors(stepErrors);
        return Object.keys(stepErrors).length === 0;
    };
    const handleStepClick = (targetStep) => {
        if (targetStep === currentStep || isSubmitting)
            return;
        if (targetStep < currentStep) {
            setCurrentStep(targetStep);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        for (let step = currentStep; step < targetStep; step += 1) {
            if (!validateStep(step)) {
                setCurrentStep(step);
                toast.error(`Complete ${stepConfig[step - 1].title} before continuing.`);
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
        }
        setCurrentStep(targetStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        }
        else {
            if (currentStep === 1 && uploadedImages.length === 0) {
                toast.error("Please upload at least one property image");
            }
            else {
                toast.error("Please fill in all required fields for this step");
            }
        }
    };
    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Prevent duplicate submissions while async operation is in flight
        if (isSubmitting) {
            toast.error("Please wait for your submission to complete...");
            return;
        }
        if (!user || user.role !== "landlord") {
            toast.error("Only landlords can add apartments");
            return;
        }
        if (!user.id) {
            toast.error("User ID is missing. Please log in again.");
            return;
        }
        if (uploadedImages.length === 0) {
            toast.error("Please upload at least one property image");
            return;
        }
        const validation = validateAllFields();
        setValidationErrors(validation.errors);
        if (!validation.isValid) {
            setCurrentStep(validation.firstStep);
            toast.error("Please complete all required fields before submitting.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        const submittedAmenities = getSubmittedAmenities();
        const submittedFeatures = getSubmittedFeatures();
        const featureLower = submittedFeatures.map((f) => f.toLowerCase());
        const utilityItems = utilitiesInput.split(",").map((u) => u.trim()).filter(Boolean);
        // Get primary image or use first image
        const primaryImageUrl = uploadedImages.find((img) => img.isPrimary)?.url || uploadedImages[0].url;
        const draftApartment = {
            id: "",
            title: formData.title || "",
            price: 0,
            bedrooms: 0,
            bathrooms: 0,
            sqft: Number(formData.sqft) || 500,
            address: formData.address || "",
            city: formData.city || "La Paz",
            state: formData.state || "Iloilo City",
            zip: formData.zip || "5000",
            image: primaryImageUrl,
            images: uploadedImages.map((img) => img.url),
            description: formData.description || "",
            amenities: submittedAmenities,
            availableDate: formData.availableDate || new Date().toISOString().split("T")[0],
            petFriendly: featureLower.includes("pet friendly"),
            parking: featureLower.includes("parking"),
            furnished: featureLower.includes("furnished"),
            utilities: utilityItems,
            lat: Number(formData.lat),
            lng: Number(formData.lng),
            landlordId: user.id,
            isPublished: false,
            status: formData.status ?? "available",
        };
        let createdApartmentId = null;
        let requiredSetupComplete = false;
        setIsSubmitting(true);
        try {
            const formValues = {
                ...apartmentFormValuesFromApartment(draftApartment),
                utilityItems,
                customFeatures: submittedFeatures,
                verification: {
                    propertyName: formData.title || "",
                    propertyAddress: [formData.address, formData.city, formData.state, formData.zip].filter(Boolean).join(", "),
                    businessPermit: verificationData.businessPermit,
                    permitExpiry: verificationData.permitExpiry,
                    tinNumber: verificationData.tinNumber,
                    idType: verificationData.idType,
                    idNumber: verificationData.idNumber,
                },
            };
            const landlordIdentity = {
                id: user.id,
                authId: user.authId,
                email: user.email,
                name: user.name,
                role: user.role,
            };
            const resolvedLandlordId = await resolveAppUserId(landlordIdentity);
            const created = await createApartment({ ...formValues, landlordId: resolvedLandlordId }, resolvedLandlordId);
            createdApartmentId = created.id;
            // Upload all images and collect their URLs
            const uploadedImageUrls = [];
            for (let i = 0; i < uploadedImages.length; i++) {
                const img = uploadedImages[i];
                if (img.file) {
                    const url = await uploadApartmentImage(created.id, img.file, `apartment-image-${i}.jpg`);
                    uploadedImageUrls.push(url);
                }
                else {
                    // If it's a data URL (from camera), convert and upload
                    if (img.url.startsWith("data:")) {
                        // Extract base64 data from data URL
                        const base64 = img.url.split(",")[1];
                        const binaryString = atob(base64);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let j = 0; j < binaryString.length; j++) {
                            bytes[j] = binaryString.charCodeAt(j);
                        }
                        const blob = new Blob([bytes], { type: "image/jpeg" });
                        const url = await uploadApartmentImage(created.id, blob, `apartment-image-${i}.jpg`);
                        uploadedImageUrls.push(url);
                    }
                }
            }
            if (uploadedImageUrls.length > 0) {
                // Insert with primary flag
                const imagesToInsert = uploadedImageUrls.map((url, idx) => {
                    const originalImg = uploadedImages[idx];
                    return {
                        url,
                        is_primary: originalImg.isPrimary || idx === 0,
                        sort_order: idx,
                    };
                });
                // Insert directly into database with proper structure
                const insertPayload = imagesToInsert.map((img) => ({
                    apartment_id: created.id,
                    url: img.url,
                    is_primary: img.is_primary,
                    sort_order: img.sort_order,
                }));
                const { error: imageMetadataError } = await supabase.from("apartment_images").insert(insertPayload);
                if (imageMetadataError)
                    throw new Error(imageMetadataError.message || "Unable to save apartment images.");
            }
            await uploadVerificationDocuments(created.id, resolvedLandlordId, verificationDocuments);
            const persistedApartment = await fetchApartmentWithImages(created.id);
            if (!persistedApartment || persistedApartment.images.length !== uploadedImageUrls.length) {
                throw new Error("The property was created, but its permanent images could not be verified.");
            }
            requiredSetupComplete = true;
            await refreshApartments();
            submissionCompleteRef.current = true;
            if (autoSaveTimerRef.current)
                clearTimeout(autoSaveTimerRef.current);
            await deletePropertyDraft(user.id);
            setDraftStatus("idle");
            toast.success("Property submitted successfully and is awaiting admin review.");
            navigate("/dashboard");
        }
        catch (error) {
            console.error("Failed to submit apartment:", error);
            const message = error instanceof Error ? error.message : "Unable to save apartment.";
            let rollbackFailed = false;
            if (createdApartmentId && !requiredSetupComplete) {
                try {
                    await deleteApartment(createdApartmentId);
                }
                catch (rollbackError) {
                    rollbackFailed = true;
                    console.error("Failed to roll back incomplete apartment:", rollbackError);
                }
            }
            toast.error(rollbackFailed
                ? `${message} The incomplete property may still appear in My Properties; please remove it before trying again.`
                : message);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    if (user?.role !== "landlord") {
        return <Navigate to="/dashboard" replace/>;
    }
    return (<div className="app-shell landlord-shell landlord-add-property">
      <div className="app-shell-frame">
        <aside className="app-shell-sidebar">
          <LandlordSidebar
            user={user}
            verified={Boolean(user?.isVerified)}
            activeSection="add-property"
            onSectionChange={(section) => {
              navigate(`/dashboard?section=${section}`);
            }}
            onLogout={() => {
              logout?.();
              navigate("/");
            }}
          />
        </aside>

        {sidebarOpen && (
          <div
            className="app-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`app-sidebar-drawer ${sidebarOpen ? "is-open" : ""}`}>
          <LandlordSidebar
            user={user}
            verified={Boolean(user?.isVerified)}
            activeSection="add-property"
            onSectionChange={(section) => {
              navigate(`/dashboard?section=${section}`);
            }}
            onClose={() => setSidebarOpen(false)}
            onLogout={() => {
              logout?.();
              navigate("/");
            }}
          />
        </aside>

        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
          className="app-sidebar-trigger"
        >
          <Menu className="add-apartment-menu-icon"/>
        </button>

        <main className="app-shell-main">
      <div className="app-shell-content app-shell-content-mobile-nav">
        <div className="add-apartment-panel-4">
          <h1 className="add-apartment-add-property">Add Property</h1>
          <p className="add-apartment-text-4">Submit property information for review, then manage individual rooms separately.</p>
          <p className="add-apartment-step">Step {currentStep} of {totalSteps}</p>
          <div className="add-apartment-row-3">
            {draftStatus !== "idle" && (<span className={`add-apartment-card-3 ${draftStatus === "error" ? "add-apartment-span" : "add-apartment-span-2"}`}>
                {draftStatus === "saving" ? <Cloud className="add-apartment-cloud-icon"/> : <CloudUpload className="add-apartment-cloud-upload-icon"/>}
                {draftStatus === "saving" && "Saving..."}
                {draftStatus === "saved" && "Draft saved"}
                {draftStatus === "restored" && "Restored from draft"}
                {draftStatus === "error" && "Draft could not be saved"}
              </span>)}
            {hasDraftContent && draftReady && (<button type="button" onClick={() => {
                if (window.confirm("Discard this property draft and clear all entered details?"))
                    discardDraft(true);
            }} className="add-apartment-discard-draft">
                <RotateCcw className="add-apartment-rotate-ccw-icon"/>Discard Draft
              </button>)}
          </div>
        </div>

        {!user?.isVerified && (<Alert className="add-apartment-card-4">
            <AlertCircle className="add-apartment-alert-circle-icon"/>
            <AlertTitle className="add-apartment-verification-pending">Verification Pending</AlertTitle>
            <AlertDescription className="add-apartment-alert-description">
              You can submit and manage the property while verification is pending. It will only become visible to tenants after the required admin verification and publication approval.
            </AlertDescription>
          </Alert>)}

        <div className="add-apartment-container">
          <div className="add-apartment-row-4">
            {stepConfig.map((step, idx) => (<div key={step.number} className="add-apartment-row-5">
                <button type="button" onClick={() => handleStepClick(step.number)} disabled={isSubmitting} aria-label={`Go to step ${step.number}: ${step.title}`} aria-current={currentStep === step.number ? "step" : undefined} className={`add-apartment-button-3 ${currentStep >= step.number
                ? "add-apartment-button-4"
                : "add-apartment-button-5"}`}>
                  {currentStep > step.number ? <Check className="add-apartment-check-icon"/> : step.number}
                </button>
                {idx < stepConfig.length - 1 && (<div className={`add-apartment-panel-5 ${currentStep > step.number
                    ? "add-apartment-panel-6"
                    : "add-apartment-panel-7"}`}/>)}
              </div>))}
          </div>
          <div className="add-apartment-grid">
            {stepConfig.map((step) => (<button key={step.number} type="button" onClick={() => handleStepClick(step.number)} disabled={isSubmitting} aria-label={`Go to ${step.title}`} className={`add-apartment-button-6 ${currentStep === step.number
                ? "add-apartment-button-7"
                : currentStep > step.number
                    ? "add-apartment-button-8"
                    : "add-apartment-button-9"}`}>
                {step.title}
              </button>))}
          </div>
        </div>

        <Card className="add-apartment-card-5">
          <CardHeader className="add-apartment-card-header">
            <CardTitle className="add-apartment-card-title">{stepConfig[currentStep - 1].title}</CardTitle>
            <CardDescription>{stepConfig[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="add-apartment-card-content">
            <form onSubmit={handleSubmit} noValidate className="add-apartment-form">
              {currentStep === 1 && (<>
                  <div className="add-apartment-panel-8">
                    <div className="add-apartment-row-6">
                      <Upload className="add-apartment-upload-icon"/>
                      <h3 className="add-apartment-property-photos">Property Photos</h3>
                    </div>

                    <MultiImageUploader images={uploadedImages} onImagesChange={(images) => {
                setUploadedImages(images);
                if (images.length > 0)
                    setImageReuploadRequired(false);
                setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.images;
                    return next;
                });
            }} maxImages={10} maxFileSize={5}/>
                    <p className="add-apartment-text-5">Upload clear photos of the property exterior, common areas, and facilities. Individual room photos can be managed separately in Manage Rooms.</p>
                    {imageReuploadRequired && (<Alert className="add-apartment-card-6">
                        <Upload className="add-apartment-upload-icon-2"/>
                        <AlertDescription className="add-apartment-alert-description-2">Please re-upload images before submitting.</AlertDescription>
                      </Alert>)}
                    <FieldError field="images"/>
                  </div>

                  <div className="add-apartment-panel-8">
                    <div className="add-apartment-row-6">
                      <Building2 className="add-apartment-building2-icon"/>
                      <h3 className="add-apartment-basic-information">Basic Information</h3>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-property-name">Property Name *</Label>
                      <Input value={formData.title} onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("title");
            }} placeholder="e.g., Sunset Residences" required aria-invalid={Boolean(validationErrors.title)} className={fieldClass("title")}/>
                      <FieldError field="title"/>
                    </div>

                    <div className="add-apartment-grid-2">
                      <div className="add-apartment-panel-9">
                        <Label className="add-apartment-total-property-area-sq-ft">Total Property Area (sq ft) *</Label>
                        <Input type="number" value={formData.sqft || ""} onChange={(e) => {
                setFormData({ ...formData, sqft: Number(e.target.value) });
                if (Number(e.target.value) > 0)
                    clearValidationError("sqft");
            }} required aria-invalid={Boolean(validationErrors.sqft)} className={`${fieldClass("sqft")} hide-number-spinners`}/>
                        <p className="add-apartment-text-5">Enter the approximate total floor area of the property.</p>
                        <FieldError field="sqft"/>
                      </div>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-description">Description *</Label>
                      <Textarea value={formData.description} onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("description");
            }} rows={4} required aria-invalid={Boolean(validationErrors.description)} placeholder="Describe the property, surrounding area, accessibility, and other important details." className={`${fieldClass("description")} add-apartment-textarea`}/>
                      <FieldError field="description"/>
                    </div>
                  </div>
                </>)}

              {currentStep === 2 && (<div className="add-apartment-panel-8">
                  <div className="add-apartment-row-6">
                    <MapPin className="add-apartment-map-pin-icon"/>
                    <h3 className="add-apartment-location-details">Location Details</h3>
                  </div>

                  <div className="add-apartment-panel-9">
                    <Label className="add-apartment-detailed-address-street-address">Detailed Address / Street Address *</Label>
                    <Input value={formData.address} onChange={(e) => {
                setFormData({ ...formData, address: e.target.value, lat: undefined, lng: undefined });
                setLocationPinned(false);
                setLocationResolving(Boolean(e.target.value.trim()));
                if (e.target.value.trim())
                    clearValidationError("address");
            }} onBlur={() => setLocationLookupRequest((request) => request + 1)} placeholder="House number, street, subdivision" required aria-invalid={Boolean(validationErrors.address)} className={fieldClass("address")}/>
                    <FieldError field="address"/>
                  </div>

                  <div className="add-apartment-grid-3">
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-district-area">District / Area</Label>
                      <Input value={formData.city} readOnly className="add-apartment-input"/>
                    </div>
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-city">City</Label>
                      <Input value={formData.state} readOnly className="add-apartment-input"/>
                    </div>
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-zip-code">ZIP Code</Label>
                      <Input value={formData.zip} readOnly className="add-apartment-input"/>
                    </div>
                  </div>

                  <div className="add-apartment-panel-9">
                    <Label className="add-apartment-map-location">Map Location</Label>
                    <p className="add-apartment-text-6">Enter the property address to locate it automatically, or click/drag the map pin to select the exact location. The detected location updates from the selected point.</p>
                    <div className="add-apartment-card-7">
                      <PropertyLocationPicker lat={Number.isFinite(Number(formData.lat)) ? Number(formData.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat} lng={Number.isFinite(Number(formData.lng)) ? Number(formData.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng} addressQuery={locationAddressQuery} geocodeRequestKey={locationLookupRequest} onGeocodeStatusChange={(status) => setLocationResolving(status === "loading")} onMapAddressChange={(detectedAddress) => {
                setFormData((current) => ({
                    ...current,
                    // Preserve detailed landlord-entered directions; the detected
                    // map address remains visible below the map while coordinates
                    // provide the authoritative exact point.
                    address: String(current.address ?? "").trim() || detectedAddress,
                }));
                clearValidationError("address");
            }} onLocationChange={(lat, lng) => {
                setFormData((current) => ({ ...current, lat, lng }));
                setLocationPinned(hasValidApartmentCoordinates(lat, lng));
                if (hasValidApartmentCoordinates(lat, lng))
                    clearValidationError("mapLocation");
            }}/>
                    </div>
                    <FieldError field="mapLocation"/>
                  </div>
                </div>)}

              {currentStep === 3 && (<>
                  <div className="add-apartment-panel-8">
                    <div className="add-apartment-row-6">
                      <Building2 className="add-apartment-building2-icon"/>
                      <h3 className="add-apartment-amenities">Amenities</h3>
                    </div>
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-amenities-comma-separated">Amenities (comma-separated)</Label>
                      <Textarea value={amenitiesInput} onChange={(e) => {
                setAmenitiesInput(e.target.value);
                if (e.target.value.split(",").some((amenity) => amenity.trim())) {
                    clearValidationError("amenities");
                }
            }} aria-invalid={Boolean(validationErrors.amenities)} placeholder="e.g., Parking, WiFi, Gym, Pool" rows={3} className={`${fieldClass("amenities")} add-apartment-textarea`}/>
                      <FieldError field="amenities"/>
                      <div className="add-apartment-row-7">
                        {SUGGESTED_AMENITIES.filter((suggestion) => !getSubmittedAmenities().some((item) => item.toLowerCase() === suggestion.toLowerCase())).map((suggestion) => (<button key={suggestion} type="button" onClick={() => setAmenitiesInput((current) => [...normalizeListValues(current), suggestion].join(", "))} className="add-apartment-button-10">
                            <Plus className="add-apartment-plus-icon-2"/> {suggestion}
                          </button>))}
                      </div>
                    </div>
                  </div>

                  <div className="add-apartment-panel-8">
                    <div className="add-apartment-row-6">
                      <Home className="add-apartment-home-icon-2"/>
                      <h3 className="add-apartment-utilities-included">Utilities Included</h3>
                    </div>
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-included-utilities-comma-separated">Included Utilities (comma-separated)</Label>
                      <Textarea value={utilitiesInput} onChange={(e) => setUtilitiesInput(e.target.value)} placeholder="e.g., Water, Electricity, Internet" rows={3} className="add-apartment-textarea-2"/>
                    </div>
                  </div>

                  <div className="add-apartment-panel-8">
                    <div className="add-apartment-row-6">
                      <ListChecks className="add-apartment-list-checks-icon"/>
                      <h3 className="add-apartment-additional-features">Additional Features</h3>
                    </div>

                    <div className="add-apartment-row-8">
                      <Input value={featureInput} onChange={(e) => {
                setFeatureInput(e.target.value);
                if (e.target.value.trim())
                    clearValidationError("features");
            }} onKeyDown={handleFeatureKeyDown} aria-invalid={Boolean(validationErrors.features)} placeholder="Type feature and press Enter" className={`${fieldClass("features")} add-apartment-input-2`}/>
                      <Button type="button" onClick={() => addFeature(featureInput)} className="add-apartment-button-11">
                        <Plus className="add-apartment-plus-icon"/>
                      </Button>
                    </div>
                    <FieldError field="features"/>
                    <p className="add-apartment-text-5">Additional features are optional. Add only features the property actually has.</p>

                    {features.length > 0 && (<div className="add-apartment-row-7">
                        {features.map((feature, i) => (<span key={i} className="add-apartment-card-8">
                            {feature}
                            <button type="button" onClick={() => removeFeature(i)} className="add-apartment-button-12">
                              <X className="add-apartment-x-icon-2"/>
                            </button>
                          </span>))}
                      </div>)}

                    <div className="add-apartment-panel-10">
                      <p className="add-apartment-quick-add">Quick Add</p>
                      <div className="add-apartment-row-7">
                        {SUGGESTED_FEATURES.filter((s) => !features.map((f) => f.toLowerCase()).includes(s.toLowerCase())).map((suggestion) => (<button key={suggestion} type="button" onClick={() => addFeature(suggestion)} className="add-apartment-button-13">
                            <Plus className="add-apartment-plus-icon-3"/> {suggestion}
                          </button>))}
                      </div>
                    </div>
                  </div>
                </>)}

              {currentStep === 4 && (<div className="add-apartment-panel-8">
                  <div className="add-apartment-row-6">
                    <ShieldCheck className="add-apartment-shield-check-icon"/>
                    <h3 className="add-apartment-property-verification">Property Verification</h3>
                  </div>

                  <div className="add-apartment-panel-9">
                    <Label className="add-apartment-property-name-2">
                      <Building2 className="add-apartment-building2-icon-2"/> Property Name
                    </Label>
                    <Input value={String(formData.title ?? "")} readOnly placeholder="e.g., Sunset Heights" className="add-apartment-input-3"/>
                    <p className="add-apartment-text-5">Carried from Property Information. Go back to step 1 to edit this name.</p>
                  </div>

                  <div className="add-apartment-panel-9">
                    <Label className="add-apartment-property-address">
                      <MapPin className="add-apartment-map-pin-icon-2"/> Property Address
                    </Label>
                    <Input value={[formData.address, formData.city, formData.state, formData.zip].filter(Boolean).join(", ")} readOnly className="add-apartment-input-3"/>
                    <p className="add-apartment-text-5">Carried from Location. Go back to step 2 to change this address.</p>
                  </div>

                  <div className="add-apartment-grid-4">
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-business-permit-number">
                        <FileText className="add-apartment-file-text-icon"/> Business Permit Number *
                      </Label>
                      <Input value={verificationData.businessPermit} onChange={(e) => {
                setVerificationData({ ...verificationData, businessPermit: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("businessPermit");
            }} aria-invalid={Boolean(validationErrors.businessPermit)} placeholder="B-2024-XXXXX" className={fieldClass("businessPermit")}/>
                      <FieldError field="businessPermit"/>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-permit-expiry-date-optional">Permit Expiry Date (optional)</Label>
                      <Input type="date" value={verificationData.permitExpiry} onChange={(e) => setVerificationData({ ...verificationData, permitExpiry: e.target.value })}/>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-tin-optional">TIN (optional)</Label>
                      <Input value={verificationData.tinNumber} onChange={(e) => {
                setVerificationData({ ...verificationData, tinNumber: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("tinNumber");
            }} aria-invalid={Boolean(validationErrors.tinNumber)} placeholder="XXX-XXX-XXX-XXX" className={fieldClass("tinNumber")}/>
                      <FieldError field="tinNumber"/>
                    </div>
                  </div>

                  <div className="add-apartment-grid-4">
                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-valid-id-type-optional">Valid ID Type (optional)</Label>
                      <select value={verificationData.idType} onChange={(e) => {
                setVerificationData({ ...verificationData, idType: e.target.value });
                if (e.target.value)
                    clearValidationError("idType");
            }} aria-invalid={Boolean(validationErrors.idType)} className={`add-apartment-select ${validationErrors.idType ? "add-apartment-select-2" : "add-apartment-select-3"}`}>
                        <option value="">Select ID Type</option>
                        {VALID_ID_TYPES.map((id) => (<option key={id} value={id}>
                            {id}
                          </option>))}
                      </select>
                      <FieldError field="idType"/>
                    </div>

                    <div className="add-apartment-panel-9">
                      <Label className="add-apartment-id-number-optional">ID Number (optional)</Label>
                      <Input value={verificationData.idNumber} onChange={(e) => {
                setVerificationData({ ...verificationData, idNumber: e.target.value });
                if (e.target.value.trim())
                    clearValidationError("idNumber");
            }} aria-invalid={Boolean(validationErrors.idNumber)} placeholder="Enter ID number" className={fieldClass("idNumber")}/>
                      <FieldError field="idNumber"/>
                    </div>
                  </div>

                  <div className="add-apartment-panel-11">
                    <div>
                      <h3 className="add-apartment-verification-documents">Verification Documents</h3>
                      <p className="add-apartment-text-7">Upload your business permit document for admin review. If no document is uploaded, it will be marked as “Not provided.”</p>
                      <p className="add-apartment-text-8">JPG, JPEG, PNG, WebP, or PDF · maximum 10 MB each</p>
                    </div>
                    <div className="add-apartment-grid-5">
                      {VERIFICATION_DOCUMENT_TYPES
                        .filter((documentType) => /business[\s_-]*permit/i.test(`${documentType.key ?? ""} ${documentType.label ?? ""}`))
                        .map((documentType) => {
                const document = verificationDocuments.find((item) => item.type === documentType.key);
                const uploadId = `verification-upload-${documentType.key}`;
                const cameraId = `verification-camera-${documentType.key}`;
                return (<div key={documentType.key} className="add-apartment-card-9">
                            <div className="add-apartment-row-9">
                              <span className="add-apartment-grid-6"><FileText className="add-apartment-file-text-icon-2"/></span>
                              <div className="add-apartment-panel-12"><p className="add-apartment-text-9">{documentType.label}</p><p className="add-apartment-text-10">{document?.file.name || "Not provided"}</p></div>
                            </div>
                            {document && (<div className="add-apartment-panel-13">
                                {document.file.type === "application/pdf" ? (<a href={document.previewUrl} target="_blank" rel="noopener noreferrer" className="add-apartment-preview-pdf"><FileText className="add-apartment-file-text-icon-3"/>Preview PDF</a>) : (<a href={document.previewUrl} target="_blank" rel="noopener noreferrer"><img src={document.previewUrl} alt={`${documentType.label} preview`} className="add-apartment-image-2"/></a>)}
                              </div>)}
                            <div className="add-apartment-grid-7">
                              <input id={uploadId} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" className="add-apartment-input-4" onChange={(event) => { selectVerificationDocument(documentType.key, event.target.files?.[0]); event.currentTarget.value = ""; }}/>
                              <label htmlFor={uploadId} className="add-apartment-label"><Upload className="add-apartment-upload-icon-3"/>{document ? "Replace" : "Upload"}</label>
                              <input id={cameraId} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="add-apartment-input-4" onChange={(event) => { selectVerificationDocument(documentType.key, event.target.files?.[0]); event.currentTarget.value = ""; }}/>
                              <label htmlFor={cameraId} className="add-apartment-take-photo"><Camera className="add-apartment-camera-icon"/>Take photo</label>
                              {document && <button type="button" onClick={() => removePendingVerificationDocument(documentType.key)} className="add-apartment-remove-file"><Trash2 className="add-apartment-trash2-icon"/>Remove file</button>}
                            </div>
                          </div>);
            })}
                    </div>
                  </div>
                </div>)}

              <div className="add-apartment-row-10">
                {currentStep > 1 ? (<Button type="button" variant="outline" onClick={handlePrevStep} className="add-apartment-previous">
                    <ArrowLeft className="add-apartment-arrow-left-icon"/> Previous
                  </Button>) : (<Button type="button" variant="outline" onClick={() => navigate(-1)} className="add-apartment-cancel">
                    <ArrowLeft className="add-apartment-arrow-left-icon"/> Cancel
                  </Button>)}

                {currentStep < totalSteps ? (<Button type="button" onClick={handleNextStep} className="add-apartment-next">
                    Next <ArrowRight className="add-apartment-arrow-right-icon"/>
                  </Button>) : (<Button type="submit" disabled={isSubmitting || locationResolving} className="add-apartment-button-14">
                    <Check className="add-apartment-check-icon"/> {isSubmitting ? "Submitting..." : locationResolving ? "Finding location..." : "Submit Property"}
                  </Button>)}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
        </main>
      </div>

      {pendingDraft && (<div className="add-apartment-overlay" role="dialog" aria-modal="true" aria-labelledby="draft-dialog-title">
          <div className="add-apartment-card-10">
            <div className="add-apartment-row-11">
              <span className="add-apartment-row-12">
                <CloudUpload className="add-apartment-cloud-upload-icon-2"/>
              </span>
              <div className="add-apartment-panel-12">
                <h2 id="draft-dialog-title" className="add-apartment-draft-dialog-title">Continue your property draft?</h2>
                <p className="add-apartment-saved">
                  Saved {new Date(pendingDraft.savedAt).toLocaleString("en-PH")}. You can return to step {Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1))} or start over.
                </p>
              </div>
            </div>
            {pendingDraft.requiresImageReupload && (<div className="add-apartment-card-11">
                <Upload className="add-apartment-upload-icon-4"/>
                Please re-upload images before submitting.
              </div>)}
            <div className="add-apartment-grid-8">
              <Button type="button" onClick={continueDraft} className="add-apartment-continue-draft">
                Continue Draft
              </Button>
              <Button type="button" variant="outline" onClick={() => discardDraft(true)} className="add-apartment-discard-draft-2">
                Discard Draft
              </Button>
            </div>
          </div>
        </div>)}
    </div>);
}
