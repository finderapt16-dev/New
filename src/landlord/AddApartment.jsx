import "./AddApartment.css";
import { PropertyLocationPicker } from "@/landlord/PropertyLocationPicker";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
import { ArrowLeft, ArrowRight, Check, ChevronDown, Cloud, CloudUpload, FileText, MapPin, Plus, RotateCcw, Upload, X } from "lucide-react";
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
const MAX_VERIFICATION_FILES = 5;
const MAX_VERIFICATION_FILE_SIZE_MB = 8;
const SUGGESTED_AMENITIES = [
    "Wi-Fi", "Laundry Area", "AC", "Parking", "CCTV", "Gym", "Study Lounge", "Balcony", "Pool", "Elevator",
];
const SUGGESTED_UTILITIES = ["Water", "Electricity", "Internet"];
const SUGGESTED_HOUSE_RULES = [
    "Students Only", "Visitors Allowed", "Cooking Allowed", "No Smoking", "No Alcohol", "Pets Allowed",
];
const VERIFICATION_UPLOAD_TYPES = [
    "mayors_business_permit",
    "proof_of_ownership",
    "business_registration",
    "barangay_clearance",
    "additional_supporting_documents",
];
const normalizeListValues = (value, canonicalItems = []) => {
    const canonical = new Map(canonicalItems.map((item) => [item.toLowerCase(), item]));
    return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean).reduce((items, item) => {
        const normalized = canonical.get(item.toLowerCase()) ?? item;
        if (!items.some((existing) => existing.toLowerCase() === normalized.toLowerCase()))
            items.push(normalized);
        return items;
    }, []);
};
const composeStreetAddress = (street = "", barangay = "") => [
    String(street ?? "").trim(),
    String(barangay ?? "").trim() ? `Brgy. ${String(barangay).trim()}` : "",
].filter(Boolean).join(", ");
const INITIAL_FORM_DATA = {
    title: "",
    sqft: 500,
    minPrice: "",
    maxPrice: "",
    street: "",
    barangay: "",
    address: "",
    city: "La Paz",
    state: "Iloilo City",
    zip: "5000",
    lat: DEFAULT_LA_PAZ_MAP_CENTER.lat,
    lng: DEFAULT_LA_PAZ_MAP_CENTER.lng,
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
    const { user } = useAuth();
    const { refreshApartments } = useApartmentsContext();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const totalSteps = 4;
    const stepConfig = [
        { number: 1, title: "Property Information", shortTitle: "Property Information" },
        { number: 2, title: "Location Details", shortTitle: "Location Details" },
        { number: 3, title: "Amenities & House Rules", shortTitle: "Amenities & House Rules" },
        { number: 4, title: "Property Verification", shortTitle: "Property Verification" },
    ];
    const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA });
    const [locationLookupRequest, setLocationLookupRequest] = useState(0);
    const [locationPinned, setLocationPinned] = useState(false);
    const [locationResolving, setLocationResolving] = useState(false);
    const manualLocationPinRef = useRef(false);
    const lastAutoGeocodedAddressRef = useRef("");
    const [uploadedImages, setUploadedImages] = useState([]);
    const [amenitiesInput, setAmenitiesInput] = useState("");
    const [utilitiesInput, setUtilitiesInput] = useState("");
    const [customAmenityInput, setCustomAmenityInput] = useState("");
    const [customUtilityInput, setCustomUtilityInput] = useState("");
    const [features, setFeatures] = useState([]);
    const [featureInput, setFeatureInput] = useState("");
    const verificationFileInputRef = useRef(null);
    const verificationDocumentsRef = useRef([]);
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
            if (!previous.features && !previous.houseRules)
                return previous;
            const next = { ...previous };
            delete next.features;
            delete next.houseRules;
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
    verificationDocumentsRef.current = verificationDocuments;
    const [pendingDraft, setPendingDraft] = useState(null);
    const [draftStatus, setDraftStatus] = useState("idle");
    const [draftReady, setDraftReady] = useState(false);
    const [imageReuploadRequired, setImageReuploadRequired] = useState(false);
    const autoSaveTimerRef = useRef(null);
    const skipNextAutoSaveRef = useRef(false);
    const submissionCompleteRef = useRef(false);
    const addVerificationDocuments = (files) => {
        const incomingFiles = Array.from(files ?? []);
        const availableTypes = VERIFICATION_UPLOAD_TYPES.filter((type) => !verificationDocuments.some((document) => document.type === type));
        const slots = Math.min(MAX_VERIFICATION_FILES - verificationDocuments.length, availableTypes.length);
        if (incomingFiles.length > slots)
            toast.error(`You can upload up to ${MAX_VERIFICATION_FILES} verification files.`);
        const acceptedFiles = incomingFiles.slice(0, Math.max(0, slots));
        const addedDocuments = [];
        acceptedFiles.forEach((file) => {
            const validationError = validateVerificationFile(file);
            if (validationError) {
                toast.error(validationError);
                return;
            }
            if (file.size > MAX_VERIFICATION_FILE_SIZE_MB * 1024 * 1024) {
                toast.error(`Each verification file must be ${MAX_VERIFICATION_FILE_SIZE_MB} MB or smaller.`);
                return;
            }
            const duplicate = verificationDocuments.some((document) => document.file.name === file.name && document.file.size === file.size)
                || addedDocuments.some((document) => document.file.name === file.name && document.file.size === file.size);
            if (duplicate) {
                toast.error(`${file.name} is already selected.`);
                return;
            }
            const type = availableTypes[addedDocuments.length];
            if (!type)
                return;
            addedDocuments.push({ type, file, previewUrl: URL.createObjectURL(file) });
        });
        if (addedDocuments.length > 0)
            setVerificationDocuments((current) => [...current, ...addedDocuments]);
    };
    const updateVerificationDocumentType = (currentType, nextType) => {
        if (!VERIFICATION_UPLOAD_TYPES.includes(nextType) || verificationDocuments.some((document) => document.type === nextType && document.type !== currentType))
            return;
        setVerificationDocuments((current) => current.map((document) => document.type === currentType ? { ...document, type: nextType } : document));
    };
    const removePendingVerificationDocument = (type) => {
        setVerificationDocuments((current) => {
            const document = current.find((item) => item.type === type);
            if (document?.previewUrl.startsWith("blob:"))
                URL.revokeObjectURL(document.previewUrl);
            return current.filter((item) => item.type !== type);
        });
    };
    useEffect(() => () => {
        verificationDocumentsRef.current.forEach((document) => {
            if (document.previewUrl.startsWith("blob:"))
                URL.revokeObjectURL(document.previewUrl);
        });
    }, []);
    const hasDraftContent = useMemo(() => {
        const verificationHasContent = Object.values(verificationData).some((value) => value.trim().length > 0);
        return Boolean(String(formData.title ?? "").trim()
            || String(formData.description ?? "").trim()
            || String(formData.address ?? "").trim()
            || String(formData.minPrice ?? "").trim()
            || String(formData.maxPrice ?? "").trim()
            || amenitiesInput.trim()
            || utilitiesInput.trim()
            || customAmenityInput.trim()
            || customUtilityInput.trim()
            || features.length > 0
            || featureInput.trim()
            || uploadedImages.length > 0
            || verificationDocuments.length > 0
            || verificationHasContent
            || currentStep > 1);
    }, [amenitiesInput, currentStep, customAmenityInput, customUtilityInput, featureInput, features, formData, uploadedImages, utilitiesInput, verificationData, verificationDocuments]);
    const resetDraftForm = () => {
        setCurrentStep(1);
        setFormData({ ...INITIAL_FORM_DATA });
        setUploadedImages([]);
        setAmenitiesInput("");
        setUtilitiesInput("");
        setCustomAmenityInput("");
        setCustomUtilityInput("");
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
        manualLocationPinRef.current = false;
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
        const savedFormData = { ...INITIAL_FORM_DATA, ...pendingDraft.formData, image: "", images: [] };
        if (!savedFormData.street && savedFormData.address)
            savedFormData.street = savedFormData.address;
        savedFormData.address = composeStreetAddress(savedFormData.street, savedFormData.barangay) || savedFormData.address || "";
        const restoredFormData = savedFormData;
        setFormData(restoredFormData);
        const restoredLocationPinned = hasValidApartmentCoordinates(restoredFormData.lat, restoredFormData.lng);
        setLocationPinned(restoredLocationPinned);
        manualLocationPinRef.current = restoredLocationPinned;
        setUploadedImages(pendingDraft.uploadedImages ?? []);
        setAmenitiesInput(pendingDraft.amenitiesInput ?? "");
        setUtilitiesInput(pendingDraft.utilitiesInput ?? "");
        setCustomAmenityInput(pendingDraft.customAmenityInput ?? "");
        setCustomUtilityInput(pendingDraft.customUtilityInput ?? "");
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
            customAmenityInput,
            customUtilityInput,
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
    }, [amenitiesInput, currentStep, customAmenityInput, customUtilityInput, featureInput, features, formData, hasDraftContent, imageReuploadRequired, uploadedImages, user?.id, utilitiesInput]);
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
    const fieldClass = (field) => validationErrors[field] ? "landlord-field-invalid" : "";
    const clearValidationError = (field) => {
        setValidationErrors((previous) => {
            if (!previous[field])
                return previous;
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };
    const FieldError = ({ field }) => validationErrors[field] ? <p className="add-property-error" role="alert">{validationErrors[field]}</p> : null;
    const locationAddressQuery = useMemo(() => [formData.address, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", "), [formData.address, formData.city, formData.state, formData.zip]);
    const updateLocationField = (field, value) => {
        setFormData((current) => {
            const next = { ...current, [field]: value };
            next.address = composeStreetAddress(next.street, next.barangay);
            next.lat = undefined;
            next.lng = undefined;
            return next;
        });
        lastAutoGeocodedAddressRef.current = "";
        manualLocationPinRef.current = false;
        setLocationPinned(false);
        setLocationResolving(Boolean(composeStreetAddress(field === "street" ? value : formData.street, field === "barangay" ? value : formData.barangay)));
        clearValidationError(field);
        clearValidationError("address");
        clearValidationError("mapLocation");
    };
    const updateCoordinateField = (field, rawValue) => {
        const value = rawValue === "" ? undefined : Number(rawValue);
        const latitude = field === "lat" ? value : Number(formData.lat);
        const longitude = field === "lng" ? value : Number(formData.lng);
        setFormData((current) => ({ ...current, [field]: value }));
        const isValid = hasValidApartmentCoordinates(latitude, longitude);
        setLocationPinned(isValid);
        manualLocationPinRef.current = isValid;
        if (isValid) {
            lastAutoGeocodedAddressRef.current = locationAddressQuery.trim().replace(/\s+/g, " ").toLowerCase();
            setLocationResolving(false);
            clearValidationError("mapLocation");
        }
    };
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
    const getSubmittedAmenities = () => normalizeListValues(amenitiesInput, SUGGESTED_AMENITIES);
    const getSubmittedUtilities = () => normalizeListValues(utilitiesInput, SUGGESTED_UTILITIES);
    const getSubmittedFeatures = () => {
        const submittedFeatures = featureInput.trim() ? [...features, featureInput.trim()] : features;
        return submittedFeatures.filter((feature, index, list) => list.findIndex((item) => item.toLowerCase() === feature.toLowerCase()) === index);
    };
    const toggleListOption = (kind, value) => {
        const isAmenity = kind === "amenity";
        const currentValues = isAmenity ? getSubmittedAmenities() : getSubmittedUtilities();
        const nextValues = currentValues.some((item) => item.toLowerCase() === value.toLowerCase())
            ? currentValues.filter((item) => item.toLowerCase() !== value.toLowerCase())
            : [...currentValues, value];
        (isAmenity ? setAmenitiesInput : setUtilitiesInput)(nextValues.join(", "));
        if (!isAmenity && nextValues.length > 0)
            clearValidationError("utilities");
    };
    const addCustomListOption = (kind) => {
        const isAmenity = kind === "amenity";
        const value = (isAmenity ? customAmenityInput : customUtilityInput).trim();
        if (!value)
            return;
        const currentValues = isAmenity ? getSubmittedAmenities() : getSubmittedUtilities();
        if (currentValues.some((item) => item.toLowerCase() === value.toLowerCase())) {
            toast.error("This item has already been added.");
            return;
        }
        (isAmenity ? setAmenitiesInput : setUtilitiesInput)([...currentValues, value].join(", "));
        (isAmenity ? setCustomAmenityInput : setCustomUtilityInput)("");
        if (!isAmenity)
            clearValidationError("utilities");
    };
    const toggleHouseRule = (value) => {
        const next = features.some((item) => item.toLowerCase() === value.toLowerCase())
            ? features.filter((item) => item.toLowerCase() !== value.toLowerCase())
            : [...features, value];
        setFeatures(next);
        if (next.length > 0)
            clearValidationError("houseRules");
    };
    const validateAllFields = () => {
        const errors = {};
        if (!String(formData.title ?? "").trim())
            errors.title = "Property name is required.";
        if (!Number(formData.sqft) || Number(formData.sqft) <= 0)
            errors.sqft = "Enter a valid property area.";
        if (!String(formData.description ?? "").trim())
            errors.description = "Property description is required.";
        if (String(formData.description ?? "").length > 500)
            errors.description = "Description must be 500 characters or fewer.";
        if (uploadedImages.length === 0)
            errors.images = "Upload at least one property photo.";
        if (!Number(formData.minPrice) || Number(formData.minPrice) <= 0)
            errors.minPrice = "Enter a minimum price.";
        if (!Number(formData.maxPrice) || Number(formData.maxPrice) <= 0)
            errors.maxPrice = "Enter a maximum price.";
        else if (Number(formData.minPrice) > 0 && Number(formData.maxPrice) < Number(formData.minPrice))
            errors.maxPrice = "Maximum price must be at least the minimum price.";
        if (!String(formData.barangay ?? "").trim())
            errors.barangay = "Barangay is required.";
        if (!String(formData.street ?? "").trim())
            errors.street = "Street is required.";
        if (locationResolving) {
            errors.mapLocation = "Finding this address on the map. Please wait a moment.";
        }
        else if (!locationPinned || !hasValidApartmentCoordinates(formData.lat, formData.lng)) {
            errors.mapLocation = "Select the property's exact location on the map or enter its coordinates.";
        }
        if (getSubmittedUtilities().length === 0)
            errors.utilities = "Select at least one utility or add another utility.";
        if (getSubmittedFeatures().length === 0)
            errors.houseRules = "Select at least one house rule or add another rule.";
        if (!String(verificationData.businessPermit).trim())
            errors.businessPermit = "Business permit number is required.";
        if (!String(verificationData.permitExpiry).trim())
            errors.permitExpiry = "Permit expiry date is required.";
        const firstStep = errors.title || errors.sqft || errors.description || errors.images || errors.minPrice || errors.maxPrice
            ? 1
            : errors.barangay || errors.street || errors.mapLocation
                ? 2
                : errors.utilities || errors.houseRules
                    ? 3
                    : errors.businessPermit || errors.permitExpiry
                        ? 4
                        : currentStep;
        return { isValid: Object.keys(errors).length === 0, errors, firstStep };
    };
    const validateStep = (step) => {
        const { errors } = validateAllFields();
        const belongsToStep = (field) => {
            if (step === 1)
                return ["title", "sqft", "description", "images", "minPrice", "maxPrice"].includes(field);
            if (step === 2)
                return ["barangay", "street", "mapLocation"].includes(field);
            if (step === 3)
                return ["utilities", "houseRules"].includes(field);
            if (step === 4)
                return ["businessPermit", "permitExpiry"].includes(field);
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
        const utilityItems = getSubmittedUtilities();
        const featureLower = submittedFeatures.map((feature) => feature.toLowerCase());
        const amenityLower = submittedAmenities.map((amenity) => amenity.toLowerCase());
        // Get primary image or use first image
        const primaryImageUrl = uploadedImages.find((img) => img.isPrimary)?.url || uploadedImages[0].url;
        const draftApartment = {
            id: "",
            title: formData.title || "",
            price: Number(formData.minPrice) || 0,
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
            petFriendly: featureLower.includes("pets allowed"),
            parking: amenityLower.includes("parking"),
            furnished: false,
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
                featureMetadata: {
                    propertyPriceRange: {
                        minimum: Number(formData.minPrice),
                        maximum: Number(formData.maxPrice),
                    },
                    locationDetails: {
                        barangay: formData.barangay.trim(),
                        street: formData.street.trim(),
                    },
                    houseRules: submittedFeatures,
                },
                verification: {
                    propertyName: formData.title || "",
                    propertyAddress: [
                        formData.street,
                        formData.barangay ? `Brgy. ${formData.barangay}` : "",
                        formData.city,
                        formData.state,
                        formData.zip,
                    ].filter(Boolean).join(", "),
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
    const verificationAddress = [
        formData.street,
        formData.barangay ? `Brgy. ${formData.barangay}` : "",
        formData.city,
        formData.state,
        formData.zip,
    ].filter(Boolean).join(", ");
    const selectedAmenities = getSubmittedAmenities();
    const selectedUtilities = getSubmittedUtilities();
    const documentLabel = (type) => VERIFICATION_DOCUMENT_TYPES.find((documentType) => documentType.key === type)?.label ?? "Supporting document";
    if (user?.role !== "landlord") {
        return <Navigate to="/dashboard" replace />;
    }
    return (
        <main className="landlord-add-property">
            <div className="add-property-page">
                <header className="add-property-heading">
                    <div>
                        <h1>Add Property</h1>
                        <p>Submit property information for review, then manage individual rooms separately.</p>
                    </div>
                    <div className="add-property-heading-meta">
                        <span className="add-property-step-count">Step {currentStep} of {totalSteps}</span>
                        {draftStatus !== "idle" && (
                            <span className={`add-property-draft-status ${draftStatus === "error" ? "is-error" : ""}`} role="status">
                                {draftStatus === "saving" ? <Cloud className="add-property-status-icon" /> : <CloudUpload className="add-property-status-icon" />}
                                {draftStatus === "saving" && "Saving draft…"}
                                {draftStatus === "saved" && "Draft saved"}
                                {draftStatus === "restored" && "Draft restored"}
                                {draftStatus === "error" && "Draft could not be saved"}
                            </span>
                        )}
                        {hasDraftContent && draftReady && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm("Discard this property draft and clear all entered details?"))
                                        discardDraft(true);
                                }}
                                className="add-property-discard-draft"
                            >
                                <RotateCcw size={13} /> Discard draft
                            </button>
                        )}
                    </div>
                </header>

                <nav className="add-property-progress" aria-label="Property setup progress">
                    {stepConfig.map((step, index) => (
                        <div className={`add-property-progress-step ${currentStep === step.number ? "is-current" : ""} ${currentStep > step.number ? "is-complete" : ""}`} key={step.number}>
                            <div className="add-property-progress-track">
                                <button
                                    type="button"
                                    className="add-property-progress-circle"
                                    onClick={() => handleStepClick(step.number)}
                                    disabled={isSubmitting}
                                    aria-label={`Go to step ${step.number}: ${step.title}`}
                                    aria-current={currentStep === step.number ? "step" : undefined}
                                >
                                    {currentStep > step.number ? <Check size={13} aria-hidden="true" /> : step.number}
                                </button>
                                {index < stepConfig.length - 1 && <span className="add-property-progress-line" aria-hidden="true" />}
                            </div>
                            <button
                                type="button"
                                className="add-property-progress-label"
                                onClick={() => handleStepClick(step.number)}
                                disabled={isSubmitting}
                                aria-label={`Go to ${step.title}`}
                            >
                                {step.shortTitle}
                            </button>
                        </div>
                    ))}
                </nav>

                <Card className={`add-property-card add-property-card--step-${currentStep}`}>
                    <CardHeader className="add-property-card-header">
                        <h2 className="add-property-card-title">{stepConfig[currentStep - 1].title}</h2>
                        <CardDescription className="add-property-card-description">
                            {currentStep === 1 && "Photos, name, and basic details."}
                            {currentStep === 2 && "Specify your exact address and map position."}
                            {currentStep === 3 && "Select the amenities, utilities, and policies for your property."}
                            {currentStep === 4 && "Permit details and verification documents."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="add-property-card-content">
                        <form onSubmit={handleSubmit} noValidate className="add-property-form">
                            {currentStep === 1 && (
                                <>
                                    <section className="add-property-section">
                                        <div className="add-property-section-heading">
                                            <h3>Upload Photos <span className="add-property-required">*</span></h3>
                                            <p>At least one photo of your apartment’s exterior, common areas, and facilities. You can upload up to 5 images. Individual room photos can be managed separately.</p>
                                        </div>
                                        <div className="add-property-uploader">
                                            <MultiImageUploader
                                                images={uploadedImages}
                                                onImagesChange={(images) => {
                                                    setUploadedImages(images);
                                                    if (images.length > 0)
                                                        setImageReuploadRequired(false);
                                                    clearValidationError("images");
                                                }}
                                                maxImages={5}
                                                maxFileSize={5}
                                                allowedFormats={["image/jpeg", "image/png"]}
                                                compact
                                            />
                                        </div>
                                        {imageReuploadRequired && <p className="add-property-inline-note">Please re-upload your property photos before submitting.</p>}
                                        <FieldError field="images" />
                                    </section>

                                    <section className="add-property-section">
                                        <h3 className="add-property-section-title">Property Information</h3>
                                        <div className="add-property-form-field">
                                            <Label htmlFor="add-property-name">Property Name <span className="add-property-required">*</span></Label>
                                            <Input
                                                id="add-property-name"
                                                value={formData.title}
                                                onChange={(event) => {
                                                    setFormData((current) => ({ ...current, title: event.target.value }));
                                                    if (event.target.value.trim()) clearValidationError("title");
                                                }}
                                                placeholder="e.g., Sunset Residences"
                                                aria-invalid={Boolean(validationErrors.title)}
                                                className={fieldClass("title")}
                                            />
                                            <FieldError field="title" />
                                        </div>

                                        <div className="add-property-form-field">
                                            <Label htmlFor="add-property-area">Total Property Area (sq ft) <span className="add-property-required">*</span></Label>
                                            <Input
                                                id="add-property-area"
                                                type="number"
                                                min="1"
                                                step="1"
                                                inputMode="numeric"
                                                value={formData.sqft ?? ""}
                                                onChange={(event) => {
                                                    setFormData((current) => ({ ...current, sqft: event.target.value }));
                                                    if (Number(event.target.value) > 0) clearValidationError("sqft");
                                                }}
                                                placeholder="500"
                                                aria-invalid={Boolean(validationErrors.sqft)}
                                                className={fieldClass("sqft")}
                                            />
                                            <FieldError field="sqft" />
                                        </div>

                                        <div className="add-property-form-field">
                                            <Label htmlFor="add-property-description">Description <span className="add-property-required">*</span></Label>
                                            <Textarea
                                                id="add-property-description"
                                                value={formData.description}
                                                onChange={(event) => {
                                                    setFormData((current) => ({ ...current, description: event.target.value.slice(0, 500) }));
                                                    if (event.target.value.trim()) clearValidationError("description");
                                                }}
                                                rows={3}
                                                maxLength={500}
                                                placeholder="Describe the property, surrounding area, accessibility, and other important details."
                                                aria-invalid={Boolean(validationErrors.description)}
                                                className={`add-property-textarea ${fieldClass("description")}`}
                                            />
                                            <div className="add-property-description-meta">
                                                <FieldError field="description" />
                                                <span>{String(formData.description ?? "").length}/500</span>
                                            </div>
                                        </div>

                                        <fieldset className="add-property-price-range">
                                            <legend>Price Range</legend>
                                            <div className="add-property-fields add-property-fields--two">
                                                <div className="add-property-form-field">
                                                    <Label htmlFor="add-property-min-price">Minimum Price <span className="add-property-required">*</span></Label>
                                                    <Input
                                                        id="add-property-min-price"
                                                        type="number"
                                                        min="1"
                                                        step="100"
                                                        inputMode="numeric"
                                                        value={formData.minPrice}
                                                        onChange={(event) => {
                                                            setFormData((current) => ({ ...current, minPrice: event.target.value }));
                                                            if (Number(event.target.value) > 0) clearValidationError("minPrice");
                                                            if (Number(event.target.value) <= Number(formData.maxPrice)) clearValidationError("maxPrice");
                                                        }}
                                                        placeholder="e.g., 5,000"
                                                        aria-invalid={Boolean(validationErrors.minPrice)}
                                                        className={fieldClass("minPrice")}
                                                    />
                                                    <FieldError field="minPrice" />
                                                </div>
                                                <div className="add-property-form-field">
                                                    <Label htmlFor="add-property-max-price">Maximum Price <span className="add-property-required">*</span></Label>
                                                    <Input
                                                        id="add-property-max-price"
                                                        type="number"
                                                        min="1"
                                                        step="100"
                                                        inputMode="numeric"
                                                        value={formData.maxPrice}
                                                        onChange={(event) => {
                                                            setFormData((current) => ({ ...current, maxPrice: event.target.value }));
                                                            if (Number(event.target.value) > 0) clearValidationError("maxPrice");
                                                        }}
                                                        placeholder="e.g., 10,000"
                                                        aria-invalid={Boolean(validationErrors.maxPrice)}
                                                        className={fieldClass("maxPrice")}
                                                    />
                                                    <FieldError field="maxPrice" />
                                                </div>
                                            </div>
                                        </fieldset>
                                    </section>
                                </>
                            )}

                            {currentStep === 2 && (
                                <div className="add-property-step-content">
                                    <section className="add-property-section">
                                        <h3 className="add-property-section-title">Address</h3>
                                        <div className="add-property-fields add-property-fields--two">
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-barangay">Barangay <span className="add-property-required">*</span></Label>
                                                <Input
                                                    id="add-property-barangay"
                                                    value={formData.barangay ?? ""}
                                                    onChange={(event) => updateLocationField("barangay", event.target.value)}
                                                    placeholder="e.g., Nabitasan"
                                                    aria-invalid={Boolean(validationErrors.barangay)}
                                                    className={fieldClass("barangay")}
                                                />
                                                <FieldError field="barangay" />
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-street">Street <span className="add-property-required">*</span></Label>
                                                <Input
                                                    id="add-property-street"
                                                    value={formData.street ?? ""}
                                                    onChange={(event) => updateLocationField("street", event.target.value)}
                                                    onBlur={() => setLocationLookupRequest((request) => request + 1)}
                                                    placeholder="e.g., Luna St."
                                                    aria-invalid={Boolean(validationErrors.street)}
                                                    className={fieldClass("street")}
                                                />
                                                <FieldError field="street" />
                                            </div>
                                        </div>
                                        <div className="add-property-fields add-property-fields--three">
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-district">District / Area</Label>
                                                <Input
                                                    id="add-property-district"
                                                    value={formData.city ?? ""}
                                                    onChange={(event) => updateLocationField("city", event.target.value)}
                                                    placeholder="La Paz"
                                                />
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-city">City</Label>
                                                <Input
                                                    id="add-property-city"
                                                    value={formData.state ?? ""}
                                                    onChange={(event) => updateLocationField("state", event.target.value)}
                                                    placeholder="Iloilo City"
                                                />
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-zip">ZIP Code</Label>
                                                <Input
                                                    id="add-property-zip"
                                                    value={formData.zip ?? ""}
                                                    onChange={(event) => updateLocationField("zip", event.target.value)}
                                                    placeholder="5000"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="add-property-section add-property-map-section">
                                        <div className="add-property-section-heading">
                                            <h3>Map Location</h3>
                                            <p>Enter the property address to locate it automatically, or click the map or drag the pin to select the exact location.</p>
                                        </div>
                                        <div className="add-property-map">
                                            <PropertyLocationPicker
                                                lat={Number.isFinite(Number(formData.lat)) ? Number(formData.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat}
                                                lng={Number.isFinite(Number(formData.lng)) ? Number(formData.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng}
                                                addressQuery={locationAddressQuery}
                                                geocodeRequestKey={locationLookupRequest}
                                                onGeocodeStatusChange={(status) => {
                                                    if (!manualLocationPinRef.current)
                                                        setLocationResolving(status === "loading");
                                                }}
                                                onMapAddressChange={() => clearValidationError("mapLocation")}
                                                onLocationChange={(lat, lng, source) => {
                                                    if (source === "geocode" && manualLocationPinRef.current)
                                                        return;
                                                    if (source === "map")
                                                        manualLocationPinRef.current = false;
                                                    setFormData((current) => ({ ...current, lat, lng }));
                                                    setLocationPinned(hasValidApartmentCoordinates(lat, lng));
                                                    if (hasValidApartmentCoordinates(lat, lng)) clearValidationError("mapLocation");
                                                }}
                                            />
                                        </div>
                                        {locationResolving && <p className="add-property-map-status" role="status">Finding this address on the map…</p>}
                                        <FieldError field="mapLocation" />
                                        <div className="add-property-fields add-property-fields--two add-property-coordinates">
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-latitude">Latitude</Label>
                                                <Input
                                                    id="add-property-latitude"
                                                    type="number"
                                                    min="-90"
                                                    max="90"
                                                    step="any"
                                                    inputMode="decimal"
                                                    value={formData.lat ?? ""}
                                                    onChange={(event) => updateCoordinateField("lat", event.target.value)}
                                                    placeholder="10.7200"
                                                />
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-longitude">Longitude</Label>
                                                <Input
                                                    id="add-property-longitude"
                                                    type="number"
                                                    min="-180"
                                                    max="180"
                                                    step="any"
                                                    inputMode="decimal"
                                                    value={formData.lng ?? ""}
                                                    onChange={(event) => updateCoordinateField("lng", event.target.value)}
                                                    placeholder="122.5621"
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="add-property-step-content add-property-step-content--compact">
                                    <section className="add-property-section">
                                        <div className="add-property-section-heading">
                                            <h3>AMENITIES</h3>
                                            <p>Select the available amenities for your property listing.</p>
                                        </div>
                                        <div className="add-property-option-grid add-property-option-grid--five">
                                            {SUGGESTED_AMENITIES.map((amenity) => {
                                                const selected = selectedAmenities.some((item) => item.toLowerCase() === amenity.toLowerCase());
                                                return (
                                                    <button
                                                        key={amenity}
                                                        type="button"
                                                        className={`add-property-option ${selected ? "is-selected" : ""}`}
                                                        onClick={() => toggleListOption("amenity", amenity)}
                                                        aria-pressed={selected}
                                                    >
                                                        {amenity}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <Label className="add-property-small-label" htmlFor="add-property-custom-amenity">Other amenity <span>(optional)</span></Label>
                                        <div className="add-property-custom-entry">
                                            <Input
                                                id="add-property-custom-amenity"
                                                value={customAmenityInput}
                                                onChange={(event) => setCustomAmenityInput(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        addCustomListOption("amenity");
                                                    }
                                                }}
                                                placeholder="Type an amenity and press Enter"
                                            />
                                            <Button type="button" className="add-property-add-chip-button" onClick={() => addCustomListOption("amenity")}>
                                                Add
                                            </Button>
                                        </div>
                                        <div className="add-property-chip-row">
                                            {selectedAmenities.filter((amenity) => !SUGGESTED_AMENITIES.some((suggestion) => suggestion.toLowerCase() === amenity.toLowerCase())).map((amenity) => (
                                                <span className="add-property-chip" key={amenity}>
                                                    {amenity}
                                                    <button type="button" aria-label={`Remove ${amenity}`} onClick={() => setAmenitiesInput(getSubmittedAmenities().filter((item) => item !== amenity).join(", "))}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="add-property-section">
                                        <div className="add-property-section-heading">
                                            <h3>UTILITIES INCLUDED <span className="add-property-required">*</span></h3>
                                            <p>Select which operational utilities are included in the base rent price.</p>
                                        </div>
                                        <div className="add-property-option-grid add-property-option-grid--three">
                                            {SUGGESTED_UTILITIES.map((utility) => {
                                                const selected = selectedUtilities.some((item) => item.toLowerCase() === utility.toLowerCase());
                                                return (
                                                    <button
                                                        key={utility}
                                                        type="button"
                                                        className={`add-property-option ${selected ? "is-selected" : ""}`}
                                                        onClick={() => toggleListOption("utility", utility)}
                                                        aria-pressed={selected}
                                                    >
                                                        {utility}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <FieldError field="utilities" />
                                        <Label className="add-property-small-label" htmlFor="add-property-custom-utility">Other utility <span>(optional)</span></Label>
                                        <div className="add-property-custom-entry">
                                            <Input
                                                id="add-property-custom-utility"
                                                value={customUtilityInput}
                                                onChange={(event) => setCustomUtilityInput(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        addCustomListOption("utility");
                                                    }
                                                }}
                                                placeholder="Type a utility and press Enter"
                                            />
                                            <Button type="button" className="add-property-add-chip-button" onClick={() => addCustomListOption("utility")}>
                                                Add
                                            </Button>
                                        </div>
                                        <div className="add-property-chip-row">
                                            {selectedUtilities.filter((utility) => !SUGGESTED_UTILITIES.some((suggestion) => suggestion.toLowerCase() === utility.toLowerCase())).map((utility) => (
                                                <span className="add-property-chip" key={utility}>
                                                    {utility}
                                                    <button type="button" aria-label={`Remove ${utility}`} onClick={() => setUtilitiesInput(getSubmittedUtilities().filter((item) => item !== utility).join(", "))}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="add-property-section">
                                        <div className="add-property-section-heading">
                                            <h3>HOUSE RULES &amp; POLICIES <span className="add-property-required">*</span></h3>
                                            <p>Specify core landlord restrictions for boarding houses and apartments.</p>
                                        </div>
                                        <div className="add-property-option-grid add-property-option-grid--three">
                                            {SUGGESTED_HOUSE_RULES.map((rule) => {
                                                const selected = features.some((item) => item.toLowerCase() === rule.toLowerCase());
                                                return (
                                                    <button
                                                        key={rule}
                                                        type="button"
                                                        className={`add-property-option ${selected ? "is-selected" : ""}`}
                                                        onClick={() => toggleHouseRule(rule)}
                                                        aria-pressed={selected}
                                                    >
                                                        {rule}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <FieldError field="houseRules" />
                                        <Label className="add-property-small-label" htmlFor="add-property-custom-rule">Other rule <span>(optional)</span></Label>
                                        <div className="add-property-custom-entry">
                                            <Input
                                                id="add-property-custom-rule"
                                                value={featureInput}
                                                onChange={(event) => setFeatureInput(event.target.value)}
                                                onKeyDown={handleFeatureKeyDown}
                                                placeholder="Type a rule and press Enter"
                                            />
                                            <Button type="button" className="add-property-add-chip-button" onClick={() => addFeature(featureInput)}>
                                                Add
                                            </Button>
                                        </div>
                                        <div className="add-property-chip-row">
                                            {features.filter((rule) => !SUGGESTED_HOUSE_RULES.some((suggestion) => suggestion.toLowerCase() === rule.toLowerCase())).map((rule, index) => (
                                                <span className="add-property-chip" key={`${rule}-${index}`}>
                                                    {rule}
                                                    <button type="button" aria-label={`Remove ${rule}`} onClick={() => removeFeature(features.indexOf(rule))}><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="add-property-step-content">
                                    <section className="add-property-section">
                                        <div className="add-property-section-heading">
                                            <h3>PROPERTY INFORMATION</h3>
                                            <p>Provide the basic property details used for verification.</p>
                                        </div>
                                        <div className="add-property-form-field">
                                            <Label htmlFor="add-property-review-name">Property Name</Label>
                                            <Input id="add-property-review-name" value={formData.title} readOnly />
                                            <p className="add-property-helper">Carried from Property Information. Go back to step 1 to edit this name.</p>
                                        </div>
                                        <div className="add-property-form-field">
                                            <Label htmlFor="add-property-review-address">Property Address</Label>
                                            <Input id="add-property-review-address" value={verificationAddress} readOnly />
                                            <p className="add-property-helper">Carried from Location. Go back to step 2 to change this address.</p>
                                        </div>
                                    </section>

                                    <section className="add-property-section">
                                        <div className="add-property-fields add-property-fields--two">
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-permit">Business Permit Number <span className="add-property-required">*</span></Label>
                                                <Input
                                                    id="add-property-permit"
                                                    value={verificationData.businessPermit}
                                                    onChange={(event) => {
                                                        setVerificationData((current) => ({ ...current, businessPermit: event.target.value }));
                                                        if (event.target.value.trim()) clearValidationError("businessPermit");
                                                    }}
                                                    placeholder="e.g., B-2024-0001"
                                                    aria-invalid={Boolean(validationErrors.businessPermit)}
                                                    className={fieldClass("businessPermit")}
                                                />
                                                <FieldError field="businessPermit" />
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-expiry">Permit Expiry Date <span className="add-property-required">*</span></Label>
                                                <Input
                                                    id="add-property-expiry"
                                                    type="date"
                                                    value={verificationData.permitExpiry}
                                                    onChange={(event) => {
                                                        setVerificationData((current) => ({ ...current, permitExpiry: event.target.value }));
                                                        if (event.target.value) clearValidationError("permitExpiry");
                                                    }}
                                                    aria-invalid={Boolean(validationErrors.permitExpiry)}
                                                    className={fieldClass("permitExpiry")}
                                                />
                                                <FieldError field="permitExpiry" />
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-tin">TIN <span>(Optional)</span></Label>
                                                <Input
                                                    id="add-property-tin"
                                                    value={verificationData.tinNumber}
                                                    onChange={(event) => setVerificationData((current) => ({ ...current, tinNumber: event.target.value }))}
                                                    placeholder="XXX-XXX-XXX-XXX"
                                                />
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-id-type">Any type of valid ID <span>(Optional)</span></Label>
                                                <div className="add-property-select-wrap">
                                                    <select
                                                        id="add-property-id-type"
                                                        value={verificationData.idType}
                                                        onChange={(event) => setVerificationData((current) => ({ ...current, idType: event.target.value }))}
                                                        className="add-property-select"
                                                    >
                                                        <option value="">Select ID Type</option>
                                                        {VALID_ID_TYPES.map((idType) => <option key={idType} value={idType}>{idType}</option>)}
                                                    </select>
                                                    <ChevronDown size={14} aria-hidden="true" />
                                                </div>
                                            </div>
                                            <div className="add-property-form-field">
                                                <Label htmlFor="add-property-id-number">ID Number <span>(Optional)</span></Label>
                                                <Input
                                                    id="add-property-id-number"
                                                    value={verificationData.idNumber}
                                                    onChange={(event) => setVerificationData((current) => ({ ...current, idNumber: event.target.value }))}
                                                    placeholder="Enter ID Number"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="add-property-section">
                                        <div className="add-property-section-heading">
                                            <h3>VERIFICATION DOCUMENT</h3>
                                            <p>Upload your business permit documents for admin review.</p>
                                        </div>
                                        <input
                                            ref={verificationFileInputRef}
                                            type="file"
                                            multiple
                                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                                            className="add-property-file-input"
                                            onChange={(event) => {
                                                addVerificationDocuments(event.target.files);
                                                event.currentTarget.value = "";
                                            }}
                                            aria-label="Choose verification documents"
                                        />
                                        {verificationDocuments.length < MAX_VERIFICATION_FILES && (
                                            <div
                                                className="add-property-document-dropzone"
                                                onDragOver={(event) => event.preventDefault()}
                                                onDrop={(event) => {
                                                    event.preventDefault();
                                                    addVerificationDocuments(event.dataTransfer.files);
                                                }}
                                            >
                                                <button type="button" onClick={() => verificationFileInputRef.current?.click()}>
                                                    <Upload size={23} strokeWidth={1.5} />
                                                    <strong>Drag and drop files here or click to browse</strong>
                                                    <span>JPG, JPEG, PNG, or PDF · Max {MAX_VERIFICATION_FILE_SIZE_MB} MB · Up to {MAX_VERIFICATION_FILES} files</span>
                                                </button>
                                            </div>
                                        )}
                                        {verificationDocuments.length > 0 && (
                                            <div className="add-property-document-list">
                                                {verificationDocuments.map((document) => (
                                                    <div className="add-property-document-row" key={document.type}>
                                                        {document.file.type === "application/pdf" ? (
                                                            <span className="add-property-document-icon"><FileText size={18} /></span>
                                                        ) : (
                                                            <img src={document.previewUrl} alt="" className="add-property-document-thumbnail" />
                                                        )}
                                                        <div className="add-property-document-info">
                                                            <strong>{document.file.name}</strong>
                                                            <select
                                                                aria-label={`Document category for ${document.file.name}`}
                                                                value={document.type}
                                                                onChange={(event) => updateVerificationDocumentType(document.type, event.target.value)}
                                                            >
                                                                {VERIFICATION_UPLOAD_TYPES.map((type) => (
                                                                    <option key={type} value={type} disabled={verificationDocuments.some((other) => other.type === type && other.type !== document.type)}>
                                                                        {documentLabel(type)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <button type="button" className="add-property-remove-document" onClick={() => removePendingVerificationDocument(document.type)} aria-label={`Remove ${document.file.name}`}>
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}

                            <div className="add-property-actions">
                                {currentStep > 1 ? (
                                    <Button type="button" variant="outline" onClick={handlePrevStep} className="add-property-button add-property-button--secondary">
                                        <ArrowLeft size={14} /> Previous
                                    </Button>
                                ) : (
                                    <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="add-property-button add-property-button--secondary">
                                        <ArrowLeft size={14} /> Cancel
                                    </Button>
                                )}
                                {currentStep < totalSteps ? (
                                    <Button type="button" onClick={handleNextStep} disabled={isSubmitting} className="add-property-button add-property-button--primary">
                                        Next <ArrowRight size={14} />
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={isSubmitting || locationResolving} className="add-property-button add-property-button--primary">
                                        {isSubmitting ? "Submitting…" : locationResolving ? "Finding location…" : "Submit"}
                                        {!isSubmitting && !locationResolving && <ArrowRight size={14} />}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {pendingDraft && (
                <div className="add-property-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-property-draft-title">
                    <div className="add-property-draft-modal">
                        <span className="add-property-draft-icon"><CloudUpload size={22} /></span>
                        <div>
                            <h2 id="add-property-draft-title">Continue your property draft?</h2>
                            <p>Saved {new Date(pendingDraft.savedAt).toLocaleString("en-PH")}. You can return to step {Math.min(totalSteps, Math.max(1, pendingDraft.currentStep || 1))} or start over.</p>
                        </div>
                        {pendingDraft.requiresImageReupload && <p className="add-property-inline-note">Please re-upload property photos before submitting.</p>}
                        <div className="add-property-draft-actions">
                            <Button type="button" onClick={continueDraft} className="add-property-button add-property-button--primary">Continue Draft</Button>
                            <Button type="button" variant="outline" onClick={() => discardDraft(true)} className="add-property-button add-property-button--secondary">Discard Draft</Button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
