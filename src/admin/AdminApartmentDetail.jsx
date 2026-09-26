import { MapView } from "@/components/MapView";
import "./AdminApartmentDetail.css";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getLandlordVerification, updateApartmentPublication, } from "@/data/apartments";
import { fetchApartmentInspectionDetails, } from "@/services/apartmentsService";
import { fetchPendingAppeals, fetchAdminReports, fetchApartmentChangeLogs, fetchLandlordProfile, fetchUserById, sendAdminMessageToLandlord, } from "@/services/dashboardSupabaseService";
import { VERIFICATION_DOCUMENT_TYPES, fetchApartmentVerificationDocuments, } from "@/services/verificationDocumentsService";
import { formatAuditLogForDisplay } from "@/utils/auditLogDisplay";
import { fetchApartmentRatings, subscribeToApartmentRatings } from "@/services/apartmentRatingsService";
import { supabase } from "@/services/supabaseClient";
import { clearAdminNavigationMemory, getAdminModulePath, rememberAdminModuleLocation } from "@/admin/adminNavigationMemory";
import { AdminSidebar } from "@/admin/AdminSidebar";
import { getAdminAvailabilityLabel, getAdminListingLabel, getAdminRoomState, getLowestRoomRent } from "@/admin/adminListingState";
import { AlertTriangle, ArrowLeft, Building2, CalendarCheck, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, Eye, EyeOff, Expand, FileSearch, FileText, Flag, Home, Image as ImageIcon, Mail, Menu, MapPin, MessageSquare, Phone, Send, ShieldCheck, Star, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
const toFiniteNumber = (value, fallback = 0) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};
const getRecordText = (value, keys, fallback) => {
    if (!value || typeof value !== "object") {
        return fallback;
    }
    const record = value;
    for (const key of keys) {
        const candidate = record[key];
        if (typeof candidate === "string" && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return fallback;
};
const getRecordNumber = (value, keys, fallback = 0) => {
    if (!value || typeof value !== "object") {
        return fallback;
    }
    const record = value;
    for (const key of keys) {
        const candidate = record[key];
        if (candidate !== undefined && candidate !== null && candidate !== "") {
            return toFiniteNumber(candidate, fallback);
        }
    }
    return fallback;
};
const STATUS_BADGE = {
    available: "admin-apartment-detail-badge-3",
    occupied: "admin-apartment-detail-badge-4",
    maintenance: "admin-apartment-detail-badge-5",
};
const STATUS_LABEL = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
};
const SHOW_SELECTED_REPORT_DETAILS = false;
const getLandlordVerificationStatus = (landlord) => {
    if (!landlord)
        return "Missing";
    const explicitStatus = String(landlord.landlord_status ?? landlord.verification_status ?? landlord.status ?? "").trim();
    if (landlord.is_verified === true || landlord.isVerified === true)
        return "Verified";
    if (explicitStatus.length > 0) {
        const normalized = explicitStatus.toLowerCase();
        if (["pending", "unverified", "under_review"].includes(normalized))
            return "Pending Review";
        return normalized.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
    }
    return "Incomplete";
};
const canPublishForLandlord = (landlord) => (landlord?.is_verified ?? landlord?.isVerified) === true && !["pending", "unverified", "rejected", "suspended", "disabled"].includes(String(landlord?.landlord_status ?? landlord?.verification_status ?? landlord?.status ?? "").trim().toLowerCase());
const getRoomStatus = (room) => {
    return getAdminRoomState(room);
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const getText = (record, keys, fallback = "—") => {
    if (!record)
        return fallback;
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0)
            return value.trim();
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
        if (typeof value === "boolean")
            return value ? "Yes" : "No";
    }
    return fallback;
};
const getStringList = (value) => {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
    return [];
};
const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};
const scrollToFirstVisibleSection = (ids) => {
    const target = ids
        .map((id) => document.getElementById(id))
        .find((element) => element && element.offsetParent !== null);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
};
function DetailRow({ label, value }) {
    return (<div className="admin-apartment-detail-card">
      <p className="admin-apartment-detail-text">{label}</p>
      <div className="admin-apartment-detail-panel">{value || "—"}</div>
    </div>);
}
function ImageTile({ src, label }) {
    return (<div className="admin-apartment-detail-card-2">
      <div className="admin-apartment-detail-panel-2">
        <ImageWithFallback src={src} alt={label || "Apartment image"} className="admin-apartment-detail-image-with-fallback"/>
      </div>
      {label && <p className="admin-apartment-detail-text-2">{label}</p>}
    </div>);
}
export function AdminApartmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const routeLocation = useLocation();
    const { user, logout } = useAuth();
    const portalBasePath = "/dashboard";
    const apartmentDetailBasePath = "/admin/apartment";
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [apartment, setApartment] = useState(null);
    const [inspectionDetails, setInspectionDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [landlord, setLandlord] = useState(null);
    const [landlordProfile, setLandlordProfile] = useState(null);
    const [verifiedLandlord, setVerifiedLandlord] = useState(null);
    const [reports, setReports] = useState([]);
    const [ratings, setRatings] = useState([]);
    const [appeals, setAppeals] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedReport, setSelectedReport] = useState(null);
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [changeLogOpen, setChangeLogOpen] = useState(false);
    const [changeLogLoading, setChangeLogLoading] = useState(false);
    const [changeLogs, setChangeLogs] = useState([]);
    const [changeLogActors, setChangeLogActors] = useState({});
    const [verificationDocuments, setVerificationDocuments] = useState([]);
    const [showAllDocuments, setShowAllDocuments] = useState(false);
    const [isUpdatingPublication, setIsUpdatingPublication] = useState(false);
    const returnTo = (() => {
        const value = routeLocation.state?.returnTo;
        return typeof value === "string" && value.startsWith("/") ? value : `${portalBasePath}?section=apartments`;
    })();
    const backLabel = (() => {
        const value = routeLocation.state?.backLabel;
        return typeof value === "string" && value.trim() ? value : "Back to Apartments";
    })();
    const handleBack = () => {
        if (user?.id && returnTo.includes("section=apartments")) {
            rememberAdminModuleLocation(user.id, "apartments", { view: "overview" });
        }
        navigate(returnTo);
    };
    const navigateToAdminModule = (section) => {
        if (!user?.id)
            return navigate(`${portalBasePath}?section=${section}`);
        const rememberedPath = getAdminModulePath(user.id, section);
        const destination = rememberedPath;
        navigate(destination);
        setSidebarOpen(false);
    };
    useEffect(() => {
        let active = true;
        const loadData = async () => {
            if (!id) {
                setApartment(null);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const details = await fetchApartmentInspectionDetails(id);
                const submittedDocuments = await fetchApartmentVerificationDocuments(id);
                if (!active)
                    return;
                const loaded = details?.apartment ?? null;
                setInspectionDetails(details);
                setApartment(loaded);
                setVerificationDocuments(submittedDocuments);
                if (loaded?.id && user?.id) {
                    rememberAdminModuleLocation(user.id, "apartments", { view: "apartment-inspection", apartmentId: loaded.id });
                }
                else if (!loaded && user?.id) {
                    rememberAdminModuleLocation(user.id, "apartments", { view: "overview" });
                    navigate(`${portalBasePath}?section=apartments`, { replace: true });
                }
                if (loaded?.landlordId) {
                    const landlordData = await fetchUserById(loaded.landlordId);
                    if (active && landlordData) {
                        setLandlord(landlordData);
                    }
                    const isVerified = await getLandlordVerification(loaded.landlordId);
                    if (active && isVerified) {
                        setVerifiedLandlord({ name: "Verified Landlord" });
                    }
                    const profile = await fetchLandlordProfile(loaded.landlordId);
                    if (active) {
                        setLandlordProfile(profile);
                    }
                }
                const [allReports, ratingRows] = await Promise.all([fetchAdminReports(), fetchApartmentRatings(id)]);
                if (active)
                    setRatings(ratingRows);
                if (active && allReports) {
                    const apartmentReports = allReports.filter((r) => r.apartment_id === id || r.apartmentId === id);
                    setReports(apartmentReports);
                }
                const allAppeals = await fetchPendingAppeals();
                if (active)
                    setAppeals(allAppeals);
            }
            catch (error) {
                console.error("Failed to load apartment data:", error);
                if (active) {
                    setApartment(null);
                }
            }
            finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };
        void loadData();
        return () => {
            active = false;
        };
    }, [id]);
    useEffect(() => {
        if (!id)
            return;
        let active = true;
        const refreshRatings = () => {
            void fetchApartmentRatings(id)
                .then((rows) => { if (active)
                setRatings(rows); })
                .catch((error) => console.error("Unable to refresh apartment ratings:", error));
        };
        const unsubscribe = subscribeToApartmentRatings(refreshRatings, id);
        return () => { active = false; unsubscribe(); };
    }, [id]);
    useEffect(() => {
        if (!id)
            return;
        const refreshInspection = () => {
            void fetchApartmentInspectionDetails(id).then((details) => {
                setInspectionDetails(details);
                setApartment(details?.apartment ?? null);
            });
        };
        const channel = supabase
            .channel(`admin-apartment-detail-${id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartments", filter: `id=eq.${id}` }, refreshInspection)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms", filter: `apartment_id=eq.${id}` }, refreshInspection)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_images", filter: `apartment_id=eq.${id}` }, refreshInspection)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_verification_documents", filter: `apartment_id=eq.${id}` }, refreshInspection)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_users" }, refreshInspection)
            .on("postgres_changes", { event: "*", schema: "public", table: "appeals" }, () => { void fetchPendingAppeals().then(setAppeals); })
            .subscribe();
        const refreshOnFocus = () => refreshInspection();
        const refreshOnVisibility = () => {
            if (document.visibilityState === "visible")
                refreshInspection();
        };
        window.addEventListener("focus", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshOnVisibility);
        return () => {
            window.removeEventListener("focus", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshOnVisibility);
            void supabase.removeChannel(channel);
        };
    }, [id]);
    useEffect(() => {
        const sectionId = routeLocation.hash.replace(/^#/, "");
        if (isLoading || !sectionId.startsWith("admin-"))
            return;
        const timer = window.setTimeout(() => scrollToSection(sectionId), 100);
        return () => window.clearTimeout(timer);
    }, [isLoading, routeLocation.hash]);

    const handleRefreshData = async () => {
        if (!id)
            return;
        try {
            setIsLoading(true);
            const details = await fetchApartmentInspectionDetails(id);
            const submittedDocuments = await fetchApartmentVerificationDocuments(id);
            if (details?.apartment) {
                setInspectionDetails(details);
                setApartment(details.apartment);
                setVerificationDocuments(submittedDocuments);
                if (details.apartment?.landlordId) {
                    const landlordData = await fetchUserById(details.apartment.landlordId);
                    if (landlordData)
                        setLandlord(landlordData);
                    const isVerified = await getLandlordVerification(details.apartment.landlordId);
                    if (isVerified)
                        setVerifiedLandlord({ name: "Verified Landlord" });
                    const profile = await fetchLandlordProfile(details.apartment.landlordId);
                    if (profile)
                        setLandlordProfile(profile);
                }
                const allReports = await fetchAdminReports();
                if (allReports) {
                    const apartmentReports = allReports.filter((r) => r.apartment_id === id || r.apartmentId === id);
                    setReports(apartmentReports);
                }
                toast.success("Data refreshed successfully");
            }
        }
        catch (error) {
            console.error("Error refreshing data:", error);
            toast.error("Failed to refresh data");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handlePublicationReview = async () => {
        if (!apartment?.id || !user?.id || isUpdatingPublication)
            return;
        const nextPublished = apartment.isPublished === false;
        setIsUpdatingPublication(true);
        try {
            await updateApartmentPublication(apartment.id, nextPublished, user.id);
            setApartment((current) => current ? {
                ...current,
                isPublished: nextPublished,
                approvalStatus: nextPublished ? "approved" : "pending",
                isArchived: nextPublished ? false : current.isArchived,
                deletedAt: nextPublished ? undefined : current.deletedAt,
            } : current);
            toast.success(nextPublished ? "Property approved and published" : "Property unpublished");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update publication status.");
        }
        finally {
            setIsUpdatingPublication(false);
        }
    };

    const handleViewListingDetails = () => {
        if (!apartment?.id) {
            toast.error("Apartment information is unavailable");
            return;
        }
        navigate(`/apartment/${apartment.id}`, { state: { preview: true, returnTo: routeLocation.pathname } });
    };
    const openDocumentReview = (document) => {
        if (!apartment?.id || !document?.id)
            return;
        navigate(`/admin/apartment/${apartment.id}/document/${document.id}`, {
            state: { returnTo: routeLocation.pathname, backLabel: "Back to Review" },
        });
    };
    const handleSendMessage = async () => {
        const landlordId = landlord?.id ?? apartment?.landlordId;
        if (!user?.id || !apartment?.id || !landlordId) {
            toast.error("Unable to identify the apartment landlord");
            return;
        }
        if (!messageText.trim()) {
            toast.error("Please enter a message");
            return;
        }
        setIsSendingMessage(true);
        try {
            const sent = await sendAdminMessageToLandlord({
                adminId: user.id,
                landlordId,
                apartmentId: apartment.id,
                apartmentTitle: apartment.title,
                message: messageText.trim(),
                reportId: selectedReport?.id ?? null,
            });
            if (!sent) {
                toast.error("Failed to send the message");
                return;
            }
            setMessageText("");
            setMessageModalOpen(false);
            toast.success("Message sent to landlord");
        }
        catch (error) {
            console.error("Error sending landlord message:", error);
            toast.error("Failed to send the message");
        }
        finally {
            setIsSendingMessage(false);
        }
    };
    const handleOpenChangeLog = async () => {
        if (!apartment?.id) {
            toast.error("Apartment information is unavailable");
            return;
        }
        setChangeLogOpen(true);
        setChangeLogLoading(true);
        try {
            const logs = await fetchApartmentChangeLogs(apartment.id);
            const listingChanges = logs.filter((log) => {
                const changes = isRecord(log.details?.changes) ? log.details.changes : null;
                return changes && Object.keys(changes).length > 0;
            });
            setChangeLogs(listingChanges);
            const actorIds = Array.from(new Set(listingChanges.map((log) => {
                const details = log.details;
                return String(log.admin_id ?? details?.actor_id ?? "");
            }).filter(Boolean)));
            const actors = await Promise.all(actorIds.map(async (actorId) => [actorId, await fetchUserById(actorId)]));
            setChangeLogActors(Object.fromEntries(actors.map(([actorId, actor]) => [actorId, actor?.name || "Administrator"])));
        }
        catch (error) {
            console.error("Error loading apartment change log:", error);
            setChangeLogs([]);
            toast.error("Failed to load the change log");
        }
        finally {
            setChangeLogLoading(false);
        }
    };
    if (isLoading) {
        return (<div className="admin-apartment-detail-row">
        <p className="admin-apartment-detail-loading-apartment-details">Loading apartment details...</p>
      </div>);
    }
    if (!apartment) {
        return (<div className="admin-apartment-detail-row">
        <Card className="admin-apartment-detail-card-3">
          <AlertTriangle className="admin-apartment-detail-alert-triangle-icon"/>
          <h2 className="admin-apartment-detail-apartment-not-found">Apartment Not Found</h2>
          <p className="admin-apartment-detail-unable-to-load-apartment-details">Unable to load apartment details.</p>
          <Button onClick={handleBack} className="admin-apartment-detail-go-back">
            Go Back
          </Button>
        </Card>
      </div>);
    }
    const rawApartment = inspectionDetails?.rawApartment ?? null;
    const rawFeatures = isRecord(rawApartment?.features) ? rawApartment.features : {};
    const imageRows = inspectionDetails?.images ?? [];
    const roomRows = inspectionDetails?.rooms ?? [];
    const images = Array.from(new Set([
        ...imageRows
            .slice()
            .sort((left, right) => {
            const leftPrimary = left.is_primary === true ? 1 : 0;
            const rightPrimary = right.is_primary === true ? 1 : 0;
            if (leftPrimary !== rightPrimary)
                return rightPrimary - leftPrimary;
            return getRecordNumber(left, ["sort_order"]) - getRecordNumber(right, ["sort_order"]);
        })
            .map((image) => getText(image, ["url"], "")),
        apartment.image,
        ...apartment.images,
    ].filter(Boolean)));
    const coverImage = images[0] || apartment.image;
    const roomsForDisplay = roomRows.length > 0 ? roomRows : (apartment.rooms ?? []).map((room) => room);
    const availableRoomCount = roomsForDisplay.filter((room) => getRoomStatus(room) === "available").length;
    const customFeatures = getStringList(rawFeatures.customFeatures ?? apartment.features);
    const verificationData = isRecord(rawFeatures.verification) ? rawFeatures.verification : {};
    const propertyType = getText(rawFeatures, ["propertyType", "property_type", "type"], apartment.propertyType || "—");
    const barangay = getText(rawFeatures, ["barangay", "district", "area"], "—");
    const datePosted = getText(rawApartment, ["created_at", "createdAt"], apartment.createdAt || apartment.availableDate);
    const submittedDocumentCards = VERIFICATION_DOCUMENT_TYPES.map((definition) => ({
        ...definition,
        document: verificationDocuments.find((document) => document.documentType === definition.key),
    }));
    const relatedAppeals = appeals.filter((appeal) => {
        const source = Array.isArray(appeal.supporting_docs)
            ? appeal.supporting_docs.find((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && entry.kind === "source")
            : undefined;
        return source?.apartment_id === apartment.id || reports.some((report) => report.id === appeal.report_id);
    });
    const selectedImage = images[currentImageIndex] || coverImage;
    const imageCount = images.length;
    const canNavigateImages = imageCount > 1;
    const handlePreviousImage = () => {
        if (!canNavigateImages)
            return;
        setCurrentImageIndex((index) => (index - 1 + imageCount) % imageCount);
    };
    const handleNextImage = () => {
        if (!canNavigateImages)
            return;
        setCurrentImageIndex((index) => (index + 1) % imageCount);
    };
    const listingStatusLabel = getAdminListingLabel(apartment);
    const listingIsPublished = listingStatusLabel === "Published";
    const availabilityLabel = getAdminAvailabilityLabel({ ...apartment, rooms: roomsForDisplay });
    const activeReports = reports.filter((report) => !["resolved", "dismissed", "archived"].includes(String(report.status ?? "pending").toLowerCase()));
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + getRecordNumber(rating, ["rating"], 0), 0) / ratings.length : 0;
    const landlordVerificationStatus = getLandlordVerificationStatus(landlord);
    const landlordCanPublish = canPublishForLandlord(landlord);
    const publicationBlockedByLandlord = false;
    const formattedDatePosted = datePosted
        ? new Date(datePosted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
        : "—";
    const formattedDatePostedTime = datePosted
        ? new Date(datePosted).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
        : "";
    const sectionNavItems = [
        { label: "Overview", target: "admin-property-details", icon: Building2 },
        { label: "Images", target: "admin-images", icon: ImageIcon },
        { label: "Rooms", target: "admin-rooms", icon: Home },
        { label: "Location", target: "admin-location", icon: MapPin },
        { label: "Documents", target: "admin-verification", icon: FileSearch },
    ];
    const Sidebar = () => <AdminSidebar
        activeSection="apartments"
        pendingReports={activeReports.length}
        activeAppealsCount={0}
        unreadNotifsCount={0}
        navigateToAdminModule={navigateToAdminModule}
        handleLogout={() => {
            if (user?.id)
                clearAdminNavigationMemory(user.id);
            logout?.();
            navigate("/");
        }}
    />;
    return (<div className="admin-apartment-detail">
      <aside className="admin-apartment-detail-aside"><Sidebar /></aside>
      {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="admin-apartment-detail-close-navigation"/>}
      <aside className={`admin-apartment-detail-aside-2 ${sidebarOpen ? "admin-apartment-detail-aside-3" : "admin-apartment-detail-aside-4"}`}><Sidebar /></aside>
      <main className="admin-apartment-detail-main-2">
      <div className="admin-apartment-detail-container">
        <button onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger" aria-label="Open navigation"><Menu className="admin-apartment-detail-menu-icon"/></button>
        <div className="admin-apartment-detail-content-2">
          <div className="admin-apartment-detail-panel-7">
            <Button variant="ghost" onClick={handleBack} className="admin-apartment-detail-button-4">
              <ArrowLeft className="admin-apartment-detail-arrow-left-icon"/>
              Back to Apartments
            </Button>
            <div className="admin-apartment-detail-content-3">
              <h1 className="admin-apartment-detail-apartment-review">Landlord &amp; Property Review</h1>
              <p className="admin-apartment-detail-text-3">Review the landlord submission, permit, property details, rooms, and location before deciding on this listing.</p>
            </div>
          </div>
          <div className="admin-apartment-detail-row-4">
            <Button onClick={() => apartment.id && navigate(`/apartment/${apartment.id}`, { state: { preview: true, returnTo: routeLocation.pathname } })} variant="outline" className="admin-apartment-detail-preview-tenant-view"><Eye className="admin-apartment-detail-eye-icon"/>Preview Tenant View</Button>
            <Button onClick={handleRefreshData} disabled={isLoading} variant="outline" className="admin-apartment-detail-refresh-apartment-data" title="Refresh apartment data" aria-label="Refresh apartment data">
              {isLoading ? (<span className="admin-apartment-detail-spinner">⟳</span>) : (<span>↻</span>)}
            </Button>
          </div>
        </div>

        <section className="property-review" aria-label="Landlord and property review">
          <div className="property-review-status">
            <span className={apartment.isPublished ? "property-review-status-published" : "property-review-status-pending"}>
              {apartment.isPublished ? "Published" : "Pending approval"}
            </span>
            <span>Submitted {formattedDatePosted}</span>
          </div>

          <div className="property-review-top-grid">
            <section className="property-review-panel">
              <div className="property-review-panel-heading"><span><Users /></span><div><h2>Account Information</h2><p>Landlord details submitted with this property.</p></div></div>
              <dl className="property-review-details">
                <div><dt>Full Name</dt><dd>{landlord?.name || "Not provided"}</dd></div>
                <div><dt>Email</dt><dd>{landlord?.email || "Not provided"}</dd></div>
                <div><dt>Contact Number</dt><dd>{landlord?.mobile || landlordProfile?.phone || "Not provided"}</dd></div>
                <div><dt>Address</dt><dd>{landlordProfile?.address || `${apartment.address}, ${apartment.city}`}</dd></div>
                <div><dt>Date Registered</dt><dd>{(landlord?.createdAt ?? landlord?.created_at) ? new Date(landlord.createdAt ?? landlord.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : formattedDatePosted}</dd></div>
              </dl>
            </section>

            <section className="property-review-panel" id="admin-verification">
              <div className="property-review-panel-heading"><span><FileSearch /></span><div><h2>Permit Document Review</h2><p>Documents submitted for this listing.</p></div></div>
              {submittedDocumentCards.filter(({ document }) => document).slice(0, 1).map(({ key, label, document }) => <div className="property-review-permit" key={key}>
                {document.mimeType === "application/pdf" ? <div className="property-review-pdf"><FileText /><small>PDF</small></div> : <img src={document.previewUrl} alt={label} />}
                <dl className="property-review-details">
                  <div><dt>Document</dt><dd>{label}</dd></div>
                  <div><dt>Permit Number</dt><dd>{getText(verificationData, ["businessPermit"], landlordProfile?.business_permit_number || "Not provided")}</dd></div>
                  <div><dt>File</dt><dd>{document.fileName || "Submitted document"}</dd></div>
                </dl>
                <Button onClick={() => openDocumentReview(document)} size="sm">View Full Document</Button>
              </div>)}
              {!submittedDocumentCards.some(({ document }) => document) && <p className="property-review-empty">No verification document has been submitted yet.</p>}
              <button type="button" className="property-review-link" onClick={() => setShowAllDocuments((current) => !current)}>{showAllDocuments ? "Show fewer documents" : `View all documents (${verificationDocuments.length})`}</button>
              {showAllDocuments && <div className="property-review-document-list">{submittedDocumentCards.slice(1).map(({ key, label, document }) => <div key={key}><strong>{label}</strong><span>{document?.fileName || "Not provided"}</span>{document && <button type="button" onClick={() => openDocumentReview(document)}>Open</button>}</div>)}</div>}
            </section>
          </div>

          <section className="property-review-panel property-review-property" id="admin-property-details">
            <div className="property-review-panel-heading"><span><Building2 /></span><div><h2>Property Listing Review</h2></div><Button variant="outline" size="sm" onClick={() => apartment.id && navigate(`/apartment/${apartment.id}`, { state: { preview: true, returnTo: routeLocation.pathname } })}><Eye /> Preview Tenant View</Button></div>
            <div className="property-review-property-grid">
              <div className="property-review-gallery">
                <div className="property-review-main-image">{selectedImage ? <ImageWithFallback src={selectedImage} alt={apartment.title} /> : <div className="property-review-image-empty"><Building2 />No property image</div>}
                  {selectedImage && <button type="button" className="property-review-full-image" onClick={() => window.open(selectedImage, "_blank", "noopener,noreferrer")}><Expand />View Full Image</button>}
                  {canNavigateImages && <><button type="button" className="property-review-image-arrow is-previous" onClick={handlePreviousImage} aria-label="Previous property image"><ChevronLeft /></button><button type="button" className="property-review-image-arrow is-next" onClick={handleNextImage} aria-label="Next property image"><ChevronRight /></button><span className="property-review-image-dots">{images.map((image, index) => <i key={`${image}-${index}`} className={index === currentImageIndex ? "is-active" : ""}/>)}</span></>}
                </div>
                {imageCount > 1 && <div className="property-review-thumbnails">{images.slice(0, 5).map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setCurrentImageIndex(index)} aria-label={`View image ${index + 1}`} className={currentImageIndex === index ? "is-active" : ""}><ImageWithFallback src={image} alt={`Property image ${index + 1}`} /></button>)}</div>}
              </div>
              <div className="property-review-listing-details">
                <h3>{apartment.title}</h3>
                <dl className="property-review-details">
                  <div><dt>Property Address</dt><dd>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</dd></div>
                  <div><dt>Property Type</dt><dd>{propertyType}</dd></div>
                  <div><dt>Total Rooms</dt><dd>{roomsForDisplay.length || apartment.bedrooms}</dd></div>
                  <div><dt>Price Range</dt><dd>{getLowestRoomRent(apartment) ? `P${getLowestRoomRent(apartment).toLocaleString()} and up / month` : "See room records"}</dd></div>
                  <div><dt>Description</dt><dd>{apartment.description || "No description provided."}</dd></div>
                </dl>
                <div className="property-review-tags">{apartment.amenities.slice(0, 5).map((amenity) => <span key={amenity}>{amenity}</span>)}</div>
              </div>
            </div>
          </section>

          <section className="property-review-panel property-review-rooms-panel" id="admin-rooms">
            <div className="property-review-panel-heading"><span><Home /></span><div><h2>Rooms Overview</h2><p>Review the submitted rooms for this property.</p></div>{roomsForDisplay.length > 0 && <button type="button" className="property-review-outline-action" onClick={() => navigate(`/admin/apartment/${apartment.id}/rooms`, { state: { returnTo: routeLocation.pathname } })}>View all rooms</button>}</div>
            <div className="property-review-rooms">{roomsForDisplay.length ? roomsForDisplay.slice(0, 4).map((room, index) => <article key={room.id || index}>
              {getStringList(room.images ?? room.image_url ?? room.imageUrl)[0] ? <ImageWithFallback src={getStringList(room.images ?? room.image_url ?? room.imageUrl)[0]} alt={getText(room, ["room_name", "name"], `Room ${index + 1}`)} /> : <div className="property-review-room-image"><Home /></div>}
              <strong>{getText(room, ["room_name", "name"], `Room ${index + 1}`)}</strong><span>P{getRecordNumber(room, ["rent", "price"], 0).toLocaleString()} / month</span><small>{getRecordNumber(room, ["sqft"], 0)} sqft · {getRecordNumber(room, ["maxOccupants", "max_occupants"], 1)} occupants</small><em>{STATUS_LABEL[getRoomStatus(room)] || "Available"}</em>
            </article>) : <p className="property-review-empty">No rooms have been added to this property.</p>}</div>
          </section>

          <section className="property-review-panel property-review-location-panel" id="admin-location">
            <div className="property-review-panel-heading"><span><MapPin /></span><div><h2>Location</h2></div><button type="button" className="property-review-outline-action" onClick={() => window.open(`https://www.google.com/maps?q=${apartment.lat},${apartment.lng}`, "_blank", "noopener,noreferrer")}>View on Map <ExternalLink /></button></div>
            <div className="property-review-location"><div><MapView lat={apartment.lat} lng={apartment.lng} zoom={15} showSingleMarker={true}/></div><dl className="property-review-details"><div><dt>Address</dt><dd>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</dd></div></dl></div>
          </section>

          <section className="property-review-decision">
            <div><strong>Review Decision</strong><p>Confirm the landlord details, permit, property listing, rooms, and location before publishing.</p></div>
            <div><Button variant="outline" onClick={() => { setMessageText("Please update the submitted property information before approval."); setMessageModalOpen(true); }}>Request Changes</Button><Button onClick={() => void handlePublicationReview()} disabled={isUpdatingPublication}>{isUpdatingPublication ? "Updating..." : apartment.isPublished ? "Unpublish Listing" : "Approve Listing"}</Button></div>
          </section>
        </section>

        <section className="admin-apartment-detail-section" aria-labelledby="review-summary-title">
          <h2 id="review-summary-title" className="admin-apartment-detail-review-summary-title">Review Summary</h2>
          <div className="admin-apartment-detail-grid">
            {[
            { label: "Listing Status", value: listingStatusLabel, helper: listingIsPublished ? "Published for tenant visibility checks" : "Not visible to tenants", icon: listingIsPublished ? CheckCircle2 : EyeOff, tone: listingIsPublished ? "admin-text-success" : "admin-text-warning" },
            { label: "Room Availability", value: availabilityLabel, helper: `${roomsForDisplay.length} configured room${roomsForDisplay.length === 1 ? "" : "s"}`, icon: Home, tone: availableRoomCount > 0 ? "admin-text-success" : "admin-text-muted" },
            { label: "Landlord Verification", value: landlordVerificationStatus, helper: landlordCanPublish ? "Publication requirement met" : "Requires review", icon: ShieldCheck, tone: landlordCanPublish ? "admin-text-success" : "admin-text-warning" },
            { label: "Submitted On", value: formattedDatePosted, helper: formattedDatePostedTime || "Time not provided", icon: CalendarCheck, tone: "admin-text-brand" },
            { label: "Active Reports", value: String(activeReports.length), helper: activeReports.length ? "Requires review" : "No active reports", icon: Flag, tone: activeReports.length ? "admin-text-danger" : "admin-text-muted" },
            { label: "Tenant Rating", value: ratings.length ? averageRating.toFixed(1) : "No ratings yet", helper: ratings.length ? `${ratings.length} tenant rating${ratings.length === 1 ? "" : "s"}` : "No tenant ratings", icon: Star, tone: "admin-text-brand" },
        ].map(({ label, value, helper, icon: Icon, tone }) => <div key={label} className="admin-apartment-detail-row-5"><Icon className={`admin-apartment-detail-icon-icon-2 ${tone}`}/><div><p className="admin-apartment-detail-text-4">{label}</p><p className="admin-apartment-detail-text-5">{value}</p><p className="admin-apartment-detail-text-6">{helper}</p></div></div>)}
          </div>
        </section>

        <div className="admin-apartment-detail-card-6">
          <div className="admin-apartment-detail-row-6">
            {sectionNavItems.map(({ label, target, icon: Icon }) => (<button key={target} type="button" onClick={() => target === "admin-verification" ? scrollToFirstVisibleSection(["admin-verification-rail", "admin-verification"]) : scrollToSection(target)} className="admin-apartment-detail-button-5">
                <Icon className="admin-apartment-detail-icon-icon"/>
                {label}
              </button>))}
          </div>
        </div>

        <div className="admin-apartment-detail-grid-2">
          <div className="admin-apartment-detail-grid-3">
            <Card id="admin-images" className="admin-apartment-detail-admin-images">
              <div className="admin-apartment-detail-panel-8">
                {selectedImage ? (<ImageWithFallback src={selectedImage} alt={apartment.title} className="admin-apartment-detail-image-with-fallback"/>) : (<div className="admin-apartment-detail-content-4">
                    <Building2 className="admin-apartment-detail-building2-icon"/>
                    <p className="admin-apartment-detail-no-apartment-images-uploaded">No apartment images uploaded</p>
                  </div>)}
                <div className="admin-apartment-detail-row-7">
                  {coverImage && <Badge className="admin-apartment-detail-main-cover-photo">Main Cover Photo</Badge>}
                  <Badge className="admin-apartment-detail-uploaded-image-s">{imageCount} uploaded image(s)</Badge>
                </div>
                {canNavigateImages && (<>
                    <button type="button" title="Previous image" onClick={handlePreviousImage} className="admin-apartment-detail-button-6">
                      <ChevronLeft className="admin-apartment-detail-chevron-left-icon"/>
                    </button>
                    <button type="button" title="Next image" onClick={handleNextImage} className="admin-apartment-detail-button-7">
                      <ChevronRight className="admin-apartment-detail-chevron-right-icon"/>
                    </button>
                  </>)}
              </div>
              <CardContent className="admin-apartment-detail-card-content">
                {imageCount > 0 && (<div className="admin-apartment-detail-row-8">
                    {images.map((img, index) => (<button type="button" key={`${img}-${index}`} title={`View image ${index + 1}`} className={`admin-apartment-detail-button-8 ${currentImageIndex === index ? "admin-apartment-detail-button-9" : "admin-apartment-detail-button-10"}`} onClick={() => setCurrentImageIndex(index)}>
                        <ImageWithFallback src={img} alt={`View ${index + 1}`} className="admin-apartment-detail-image-with-fallback"/>
                      </button>))}
                    {imageRows.length > 0 && (<button type="button" onClick={() => scrollToSection("admin-all-images")} className="admin-apartment-detail-view-all-images">
                        <span className="admin-apartment-detail-span-2">+</span>
                        View All Images ({imageRows.length})
                      </button>)}
                  </div>)}
                {imageRows.length > 0 && (<div id="admin-all-images" className="admin-apartment-detail-admin-all-images">
                    <h2 className="admin-apartment-detail-all-property-images">
                      <ImageIcon className="admin-apartment-detail-image-icon-icon"/>
                      All Property Images
                    </h2>
                    <div className="admin-apartment-detail-grid-4">
                      {imageRows.map((image, index) => {
                const url = getText(image, ["url"], "");
                if (!url)
                    return null;
                return (<ImageTile key={`${url}-${index}`} src={url} label={`${image.is_primary ? "Cover Photo" : "Additional Image"}${getText(image, ["caption"], "") ? ` - ${getText(image, ["caption"], "")}` : ""}`}/>);
            })}
                    </div>
                  </div>)}
              </CardContent>
            </Card>

            <Card id="admin-overview" className="admin-apartment-detail-admin-overview">
              <CardContent className="admin-apartment-detail-card-content-2">
                <div className="admin-apartment-detail-row-9">
                  <span className="admin-apartment-detail-row-10">
                    <FileSearch className="admin-apartment-detail-file-search-icon"/>
                  </span>
                  <div>
                    <h2 className="admin-apartment-detail-inspection-overview">Inspection Overview</h2>
                    <p className="admin-apartment-detail-text-7">Review and verify apartment listing details and landlord information.</p>
                  </div>
                </div>
                <div className="admin-apartment-detail-grid-5">
                  {[
            { label: "Listing Status", value: listingStatusLabel, helper: listingIsPublished ? "Published for tenant visibility checks" : "Not visible to tenants", icon: CheckCircle2, tone: "admin-tone-success-icon" },
            { label: "Submitted On", value: formattedDatePosted, helper: formattedDatePostedTime, icon: CalendarCheck, tone: "admin-tone-info-icon" },
            { label: "Reports", value: `${reports.length} report(s)`, helper: reports.length > 0 ? "Requires review" : "No active reports", icon: Flag, tone: "admin-tone-report-icon" },
            { label: "Tenant Rating", value: ratings.length ? `★ ${(ratings.reduce((sum, row) => sum + Number(row.rating), 0) / ratings.length).toFixed(1)}` : "No ratings yet", helper: ratings.length ? `Based on ${ratings.length} rating${ratings.length === 1 ? "" : "s"}` : "No tenant ratings", icon: Eye, tone: "admin-tone-warning-icon" },
            { label: "Visibility", value: apartment.isPublished === false ? "Hidden" : "Public", helper: apartment.isPublished === false ? "Not visible to tenants" : "Visible to all tenants", icon: Eye, tone: "admin-tone-orange-icon" },
        ].map(({ label, value, helper, icon: Icon, tone }) => (<div key={label} className="admin-apartment-detail-card-7">
                      <div className="admin-apartment-detail-row-2">
                        <span className={`admin-apartment-detail-row-11 ${tone}`}><Icon className="admin-apartment-detail-icon-icon-3"/></span>
                        <div className="admin-apartment-detail-panel-7">
                          <p className="admin-apartment-detail-text-8">{label}</p>
                          <p className="admin-apartment-detail-text-9">{value}</p>
                          <p className="admin-apartment-detail-text-10">{helper || "—"}</p>
                        </div>
                      </div>
                    </div>))}
                </div>
              </CardContent>
            </Card>

            {relatedAppeals.length > 0 && <Card className="admin-apartment-detail-card-8"><CardContent className="admin-apartment-detail-card-content-3"><div className="admin-apartment-detail-row-12"><div><h2 className="admin-apartment-detail-related-appeals">Related Appeals</h2><p className="admin-apartment-detail-text-11">Landlord appeals connected to this apartment or its reports.</p></div><Badge className="admin-apartment-detail-badge">{relatedAppeals.length}</Badge></div><div className="admin-apartment-detail-panel-9">{relatedAppeals.map((appeal) => <div key={appeal.id} className="admin-apartment-detail-row-13"><FileText className="admin-apartment-detail-file-text-icon"/><div className="admin-apartment-detail-panel-10"><p className="admin-apartment-detail-text-12">{appeal.reason || "Appeal"}</p><p className="admin-apartment-detail-text-13">{appeal.description || "No explanation provided."}</p></div><Badge className="admin-apartment-detail-badge-2">{String(appeal.status || "pending").replace(/_/g, " ")}</Badge></div>)}</div><Button variant="outline" onClick={() => navigate(`${portalBasePath}?section=appeals`)} className="admin-apartment-detail-open-appeal-management">Open Appeal Management</Button></CardContent></Card>}

            <Card id="admin-property-details" className="admin-apartment-detail-admin-property-details">
              <CardContent className="admin-apartment-detail-card-content-2">
                <div className="admin-apartment-detail-row-14">
                  <span className="admin-apartment-detail-row-15">
                    <Building2 className="admin-apartment-detail-building2-icon-2"/>
                  </span>
                  <div className="admin-apartment-detail-panel-7">
                    <h1 className="admin-apartment-detail-title">{apartment.title}</h1>
                    <div className="admin-apartment-detail-row-16">
                      <MapPin className="admin-apartment-detail-map-pin-icon"/>
                      <span>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</span>
                    </div>
                  </div>
                </div>
                <div className="admin-apartment-detail-panel-11">
                  <MapPin className="admin-apartment-detail-map-pin-icon-2"/>
                  <span>{apartment.address}, {apartment.city}, {apartment.state} {apartment.zip}</span>
                </div>

                <div className="admin-apartment-detail-grid-6">
                  <DetailRow label="Property Name" value={apartment.title}/>
                  <DetailRow label="Property Type" value={propertyType}/>
                  <DetailRow label="Property Description" value={apartment.description}/>
                  <DetailRow label="Complete Address" value={`${apartment.address}, ${apartment.city}, ${apartment.state} ${apartment.zip}`}/>
                  <DetailRow label="Room Pricing" value="See individual room records"/>
                  <DetailRow label="Available Rooms" value={availableRoomCount}/>
                  <DetailRow label="Total Rooms" value={roomsForDisplay.length || apartment.bedrooms}/>
                  <DetailRow label="Listing Status" value={listingStatusLabel}/>
                  <DetailRow label="Date Posted" value={datePosted ? new Date(datePosted).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"}/>
                </div>

                <div className="admin-apartment-detail-grid-7">
                  <div className="admin-apartment-detail-card-9">
                    <p className="admin-apartment-detail-bedrooms">Bedrooms</p>
                    <p className="admin-apartment-detail-text-14">{apartment.bedrooms}</p>
                  </div>
                  <div className="admin-apartment-detail-card-9">
                    <p className="admin-apartment-detail-bathrooms">Bathrooms</p>
                    <p className="admin-apartment-detail-text-14">{apartment.bathrooms}</p>
                  </div>
                  <div className="admin-apartment-detail-card-9">
                    <p className="admin-apartment-detail-square-feet">Square Feet</p>
                    <p className="admin-apartment-detail-text-14">{apartment.sqft}</p>
                  </div>
                </div>

                <div className="admin-apartment-detail-row-17">
                  {verifiedLandlord && (<Badge className="admin-apartment-detail-verified-landlord">
                      <ShieldCheck className="admin-apartment-detail-shield-check-icon-2"/>
                      Verified Landlord
                    </Badge>)}
                  {apartment.petFriendly && <Badge variant="secondary">🐾 Pet Friendly</Badge>}
                  {apartment.parking && <Badge variant="secondary">🚗 Parking</Badge>}
                  {apartment.furnished && <Badge variant="secondary">🛋️ Furnished</Badge>}
                </div>

                <div>
                  <h2 className="admin-apartment-detail-description">Description</h2>
                  <p className="admin-apartment-detail-text-15">{apartment.description}</p>
                </div>
              </CardContent>
            </Card>

            <div className="admin-apartment-detail-grid-8">
              {apartment.amenities.length > 0 && (<Card className="admin-apartment-detail-card-10">
                  <CardContent className="admin-apartment-detail-card-content-4">
                    <h2 className="admin-apartment-detail-amenities">Amenities</h2>
                    <div className="admin-apartment-detail-panel-12">
                      {apartment.amenities.map((amenity, index) => (<div key={index} className="admin-apartment-detail-row-18">
                          <Check className="admin-apartment-detail-check-icon"/>
                          <span className="admin-apartment-detail-span-3">{amenity}</span>
                        </div>))}
                    </div>
                  </CardContent>
                </Card>)}

              {Array.isArray(apartment.utilities) && apartment.utilities.length > 0 && (<Card className="admin-apartment-detail-card-10">
                  <CardContent className="admin-apartment-detail-card-content-4">
                    <h2 className="admin-apartment-detail-utilities-included">Utilities Included</h2>
                    <div className="admin-apartment-detail-row-19">
                      {apartment.utilities.map((utility, index) => (<Badge key={index} variant="outline">
                          {utility}
                        </Badge>))}
                    </div>
                  </CardContent>
                </Card>)}
              {(customFeatures.length > 0 || Object.keys(verificationData).length > 0) && (<Card className="admin-apartment-detail-card-10">
                  <CardContent className="admin-apartment-detail-card-content-4">
                    <h2 className="admin-apartment-detail-property-features">Property Features</h2>
                    {customFeatures.length > 0 && (<div className="admin-apartment-detail-row-20">
                        {customFeatures.map((feature, index) => (<Badge key={`${feature}-${index}`} variant="outline">
                            {feature}
                          </Badge>))}
                      </div>)}
                    {Object.keys(verificationData).length > 0 && (<div className="admin-apartment-detail-grid-9">
                        <DetailRow label="Submitted Property Name" value={getText(verificationData, ["propertyName"])}/>
                        <DetailRow label="Submitted Property Address" value={getText(verificationData, ["propertyAddress"])}/>
                        <DetailRow label="Submitted Business Permit" value={getText(verificationData, ["businessPermit"])}/>
                        <DetailRow label="Submitted TIN" value={getText(verificationData, ["tinNumber"])}/>
                      </div>)}
                  </CardContent>
                </Card>)}
            </div>

            {roomsForDisplay.length > 0 && (<Card id="admin-rooms" className="admin-apartment-detail-admin-rooms">
                <CardContent className="admin-apartment-detail-card-content-4">
                  <div className="admin-apartment-detail-row-21">
                    <div className="admin-apartment-detail-row-22">
                      <Home className="admin-apartment-detail-home-icon"/>
                    </div>
                    <div>
                      <h2 className="admin-apartment-detail-room-details">Room Details</h2>
                      <p className="admin-apartment-detail-submitted-room-s">{roomsForDisplay.length} submitted room(s)</p>
                    </div>
                  </div>

                  <div className="admin-apartment-detail-panel-13">
                    {roomsForDisplay.map((room, index) => (<div key={getText(room, ["id"], `room-${index}`)} id={`admin-room-${getText(room, ["id"], `room-${index}`)}`} className={`admin-apartment-detail-card-11 ${getRoomStatus(room) === "occupied"
                    ? "admin-apartment-detail-panel-14"
                    : "admin-apartment-detail-panel-15"}`}>
                        <div className="admin-apartment-detail-row-23">
                          <div>
                            <h3 className="admin-apartment-detail-heading">
                              {getText(room, ["room_name", "name"], `Room ${index + 1}`)}
                            </h3>
                            <p className="admin-apartment-detail-text-16">
                              {getText(room, ["room_type", "type"], "Room type not specified")}
                            </p>
                            <p className="admin-apartment-detail-text-17">
                              ₱{getRecordNumber(room, ["price", "rent"]).toLocaleString()}/month
                            </p>
                          </div>
                          <Badge className={STATUS_BADGE[getRoomStatus(room)]}>
                            {STATUS_LABEL[getRoomStatus(room)]}
                          </Badge>
                        </div>

                        <div className="admin-apartment-detail-grid-10">
                          <div className="admin-apartment-detail-card">
                            <p className="admin-apartment-detail-size">Size</p>
                            <p className="admin-apartment-detail-sqft">{getRecordNumber(room, ["sqft"])} sqft</p>
                          </div>
                          <div className="admin-apartment-detail-card">
                            <p className="admin-apartment-detail-max-guests">Max Guests</p>
                            <p className="admin-apartment-detail-text-18">{getRecordNumber(room, ["maxOccupants", "max_occupants"], 1)}</p>
                          </div>
                          <div className="admin-apartment-detail-card">
                            <p className="admin-apartment-detail-bathroom">Bathroom</p>
                            <p className="admin-apartment-detail-text-18">
                              {room.has_private_bath === true || room.hasPrivateBath === true
                    ? `Private${getText(room, ["bathroom_type"], "") ? ` - ${getText(room, ["bathroom_type"], "")}` : ""}`
                    : `Shared${getText(room, ["shared_bath_location"], "") ? ` - ${getText(room, ["shared_bath_location"], "")}` : ""}`}
                            </p>
                          </div>
                          <div className="admin-apartment-detail-card">
                            <p className="admin-apartment-detail-ac">AC</p>
                            <p className="admin-apartment-detail-text-18">{room.has_ac === true || room.hasAC === true ? "Yes" : "No"}</p>
                          </div>
                        </div>
                        <div className="admin-apartment-detail-grid-11">
                          <DetailRow label="Room Availability Status" value={STATUS_LABEL[getRoomStatus(room)]}/>
                          <DetailRow label="Room Description" value={getText(room, ["description", "room_description"], "No room description submitted")}/>
                        </div>
                        {getStringList(room.images ?? room.image_url ?? room.imageUrl).length > 0 && (<div className="admin-apartment-detail-panel-16">
                            <p className="admin-apartment-detail-room-images">Room Images</p>
                            <div className="admin-apartment-detail-grid-12">
                              {getStringList(room.images ?? room.image_url ?? room.imageUrl).map((src, imageIndex) => (<ImageTile key={`${src}-${imageIndex}`} src={src} label={`${getText(room, ["room_name", "name"], `Room ${index + 1}`)} image ${imageIndex + 1}`}/>))}
                            </div>
                          </div>)}
                      </div>))}
                  </div>
                </CardContent>
              </Card>)}

            <Card id="admin-location" className="admin-apartment-detail-admin-location">
              <CardContent className="admin-apartment-detail-card-content-4">
                <h2 className="admin-apartment-detail-location-details">
                  <MapPin className="admin-apartment-detail-map-pin-icon-3"/>
                  Location Details
                </h2>
                <div className="admin-apartment-detail-grid-13">
                  <DetailRow label="Complete Address" value={`${apartment.address}, ${apartment.city}, ${apartment.state} ${apartment.zip}`}/>
                  <DetailRow label="Barangay / District" value={barangay}/>
                  <DetailRow label="City" value={apartment.city || "—"}/>
                  <DetailRow label="ZIP Code" value={apartment.zip || "—"}/>
                  <DetailRow label="Latitude" value={apartment.lat ? apartment.lat.toFixed(6) : "—"}/>
                  <DetailRow label="Longitude" value={apartment.lng ? apartment.lng.toFixed(6) : "—"}/>
                </div>
                <h3 className="admin-apartment-detail-map-location">Map Location</h3>
                <div className="admin-apartment-detail-card-12">
                  <MapView lat={apartment.lat} lng={apartment.lng} zoom={15} showSingleMarker={true}/>
                </div>
              </CardContent>
            </Card>

            <Card id="admin-verification" className="admin-apartment-detail-admin-verification">
                <CardContent className="admin-apartment-detail-card-content-4">
                  <div className="admin-apartment-detail-row-21">
                    <div className="admin-apartment-detail-row-24">
                      <FileSearch className="admin-apartment-detail-file-search-icon-2"/>
                    </div>
                    <div>
                      <h2 className="admin-apartment-detail-verification-documents">Verification Documents</h2>
                      <p className="admin-apartment-detail-text-19">{landlord?.name || "Landlord"} · {apartment.title}</p>
                    </div>
                  </div>

                  <div className="admin-apartment-detail-grid-14">
                    <DetailRow label="Property Permit Number" value={getText(verificationData, ["businessPermit"], "Not provided for this property")}/>
                    <DetailRow label="Landlord Verification" value={landlordVerificationStatus}/>
                    <DetailRow label="Documents Provided" value={`${verificationDocuments.length} of ${VERIFICATION_DOCUMENT_TYPES.length}`}/>
                  </div>

                  <div className="admin-apartment-detail-grid-15">
                    {(showAllDocuments ? submittedDocumentCards : submittedDocumentCards.slice(0, 4)).map(({ key, label, document }) => (<div key={key} className="admin-apartment-detail-card-13">
                        <div className="admin-apartment-detail-row-25">
                          <div><h3 className="admin-apartment-detail-heading-2">{label}</h3><p className={`admin-apartment-detail-text-20 ${document ? "admin-apartment-detail-text-21" : "admin-apartment-detail-text-22"}`}>{document?.fileName || "Not provided"}</p></div>
                          {document && <ExternalLink className="admin-apartment-detail-external-link-icon"/>}
                        </div>
                        {document ? <>
                          {document.mimeType === "application/pdf" ? <div className="admin-apartment-detail-card-14"><FileText className="admin-apartment-detail-file-text-icon-2"/></div> : <img src={document.previewUrl} alt={label} className="admin-apartment-detail-image-2"/>}
                          <Button onClick={() => openDocumentReview(document)} className="admin-apartment-detail-view-full-document"><ExternalLink className="admin-apartment-detail-external-link-icon-2"/>View Full Document</Button>
                        </> : <div className="admin-apartment-detail-not-provided">Not provided</div>}
                      </div>))}
                  </div>
                  <Button type="button" variant="outline" onClick={() => setShowAllDocuments((current) => !current)} className="admin-apartment-detail-button-11">
                    <FileSearch className="admin-apartment-detail-file-search-icon-3"/>
                    {showAllDocuments ? "Show Fewer Documents" : `View All Documents (${submittedDocumentCards.length})`}
                  </Button>
                </CardContent>
              </Card>

            {reports.length > 0 && (<Card className="admin-apartment-detail-card-15">
                <CardContent className="admin-apartment-detail-card-content-5">
                  <div className="admin-apartment-detail-row-21">
                    <div className="admin-apartment-detail-row-26">
                      <Flag className="admin-apartment-detail-flag-icon"/>
                    </div>
                    <div>
                      <h2 className="admin-apartment-detail-linked-reports">Linked Reports</h2>
                      <p className="admin-apartment-detail-report-s-against-this-listing">{reports.length} report(s) against this listing</p>
                    </div>
                  </div>

                  <div className="admin-apartment-detail-panel-17">
                    {reports.map((report, idx) => (<div key={report.id || idx} className={`admin-apartment-detail-card-16 ${selectedReport?.id === report.id
                    ? "admin-apartment-detail-panel-18"
                    : "admin-apartment-detail-panel-19"}`} onClick={() => setSelectedReport(report)}>
                        <div className="admin-apartment-detail-row-27">
                          <div className="admin-apartment-detail-panel-5">
                            <h3 className="admin-apartment-detail-heading-2">{report.issue_type || "Report"}</h3>
                            <p className="admin-apartment-detail-text-23">{getRecordText(report, ["details", "reason"], "—")}</p>
                            <div className="admin-apartment-detail-row-28">
                              <span>{report.reporter_name || "Unknown"}</span>
                              <span>•</span>
                              <span>
                                {report.submitted_at
                    ? new Date(report.submitted_at).toLocaleDateString("en-PH")
                    : "—"}
                              </span>
                              {report.severity && (<>
                                  <span>•</span>
                                  <span className="admin-apartment-detail-span-4">
                                    {report.severity === "high" ? "🔴" : report.severity === "med" ? "🟡" : "🟢"} {report.severity.toUpperCase()}
                                  </span>
                                </>)}
                            </div>
                          </div>
                          <Badge className={`admin-apartment-detail-badge-6 ${report.status === "pending"
                    ? "admin-apartment-detail-badge-7"
                    : report.status === "resolved"
                        ? "admin-apartment-detail-badge-8"
                        : "admin-apartment-detail-badge-9"}`}>
                            {report.status?.toUpperCase() || "PENDING"}
                          </Badge>
                        </div>
                      </div>))}
                  </div>
                </CardContent>
              </Card>)}
          </div>

          <div className="admin-apartment-detail-panel-20">
            {landlord && (<Card className="admin-apartment-detail-card-10">
                <CardContent className="admin-apartment-detail-card-content-4">
                  <h2 className="admin-apartment-detail-landlord-information">
                    <span className="admin-apartment-detail-row-29"><Users className="admin-apartment-detail-users-icon"/></span>
                    Landlord Information
                  </h2>

                  <div className="admin-apartment-detail-panel-17">
                    <div>
                      <p className="admin-apartment-detail-name">Name</p>
                      <p className="admin-apartment-detail-text-24">{landlord.name || "—"}</p>
                    </div>

                    <div>
                      <p className="admin-apartment-detail-email">Email</p>
                      <div className="admin-apartment-detail-row-18">
                        <Mail className="admin-apartment-detail-mail-icon"/>
                        <a href={`mailto:${landlord.email}`} className="admin-apartment-detail-a">
                          {landlord.email || "—"}
                        </a>
                      </div>
                    </div>

                    {landlord.mobile && (<div>
                        <p className="admin-apartment-detail-phone">Phone</p>
                        <div className="admin-apartment-detail-row-18">
                          <Phone className="admin-apartment-detail-phone-icon"/>
                          <a href={`tel:${landlord.mobile}`} className="admin-apartment-detail-a-2">
                            {landlord.mobile}
                          </a>
                        </div>
                      </div>)}

                    <div className={`admin-apartment-detail-card-17 ${landlordCanPublish
                ? "admin-apartment-detail-panel-21"
                : "admin-apartment-detail-panel-22"}`}>
                      {landlordCanPublish ? (<ShieldCheck className="admin-apartment-detail-shield-check-icon-3"/>) : (<AlertTriangle className="admin-apartment-detail-alert-triangle-icon-2"/>)}
                      <span className={`admin-apartment-detail-landlord-status ${landlordCanPublish ? "admin-apartment-detail-landlord-status-2" : "admin-apartment-detail-landlord-status-3"}`}>
                        Landlord Status: {landlordVerificationStatus}
                      </span>
                    </div>

                    {publicationBlockedByLandlord && (<div className="admin-apartment-detail-card-18">
                        This apartment cannot be published because the landlord has not been verified.
                      </div>)}

                    {landlordProfile && (<>
                        {landlordProfile.business_permit_number && (<div>
                            <p className="admin-apartment-detail-business-permit">Business Permit</p>
                            <p className="admin-apartment-detail-text-24">{landlordProfile.business_permit_number}</p>
                          </div>)}

                        {landlordProfile.tin_number && (<div>
                            <p className="admin-apartment-detail-tin-number">TIN Number</p>
                            <p className="admin-apartment-detail-text-24">{landlordProfile.tin_number}</p>
                          </div>)}

                        {landlordProfile.business_name && (<div>
                            <p className="admin-apartment-detail-business-name">Business Name</p>
                            <p className="admin-apartment-detail-text-24">{landlordProfile.business_name}</p>
                          </div>)}

                        {landlordProfile.id_number && (<div>
                            <p className="admin-apartment-detail-id-number">ID Number</p>
                            <p className="admin-apartment-detail-text-24">{landlordProfile.id_number}</p>
                          </div>)}

                        {landlordProfile.years_active && (<div>
                            <p className="admin-apartment-detail-years-active">Years Active</p>
                            <p className="admin-apartment-detail-year-s">{landlordProfile.years_active} year(s)</p>
                          </div>)}

                        {landlordProfile.total_units && (<div>
                            <p className="admin-apartment-detail-total-units">Total Units</p>
                            <p className="admin-apartment-detail-text-24">{landlordProfile.total_units}</p>
                          </div>)}
                      </>)}

                    <div className="admin-apartment-detail-grid-16">
                      <Button onClick={() => scrollToFirstVisibleSection(["admin-verification-rail", "admin-verification"])} variant="outline" className="admin-apartment-detail-view-documents">
                        <FileSearch className="admin-apartment-detail-file-search-icon-4"/>
                        View Documents
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>)}

            <Card className="admin-apartment-detail-card-19">
              <CardContent className="admin-apartment-detail-card-content-4">
                <h2 className="admin-apartment-detail-administrative-actions">
                  <span className="admin-apartment-detail-row-30"><ShieldCheck className="admin-apartment-detail-shield-check-icon-4"/></span>
                  Administrative Actions
                </h2>

                <div className="admin-apartment-detail-panel-17">
                  <div className={`admin-apartment-detail-card-20 ${apartment.isPublished === false ? "admin-apartment-detail-panel-23" : "admin-apartment-detail-panel-24"}`}>
                    {apartment.isPublished === false ? (publicationBlockedByLandlord ? "Publication is blocked until the landlord verification requirement is complete." : "This apartment is ready for an administrative publishing decision.") : "This apartment is published and visible to tenants."}
                  </div>
                  <Button onClick={() => void handlePublicationReview()} disabled={isUpdatingPublication || publicationBlockedByLandlord} variant="outline" className={apartment.isPublished === false ? "admin-apartment-detail-button-12" : "admin-apartment-detail-button-13"}>{apartment.isPublished === false ? <Eye className="admin-apartment-detail-eye-icon"/> : <EyeOff className="admin-apartment-detail-eye-off-icon"/>}{isUpdatingPublication ? "Updating..." : apartment.isPublished === false ? "Approve & Publish" : "Unpublish Listing"}</Button>
                  <Button onClick={handleViewListingDetails} variant="outline" className="admin-apartment-detail-preview-tenant-view-2">
                    <Eye className="admin-apartment-detail-eye-icon-2"/>
                    Preview Tenant View
                  </Button>

                  <Button onClick={() => setMessageModalOpen(true)} disabled={!apartment.landlordId} variant="outline" className="admin-apartment-detail-send-message-to-landlord">
                    <MessageSquare className="admin-apartment-detail-message-square-icon"/>
                    Send Message to Landlord
                  </Button>

                  <Button onClick={() => void handleOpenChangeLog()} variant="outline" className="admin-apartment-detail-view-change-log">
                    <ClipboardList className="admin-apartment-detail-clipboard-list-icon"/>
                    View Change Log
                  </Button>

                  {activeReports.length > 0 && (<div className="admin-apartment-detail-panel-25">
                      <p className="admin-apartment-detail-active-reports">
                        <Flag className="admin-apartment-detail-flag-icon-2"/>
                        Active Reports: {activeReports.length}
                      </p>
                      <Button variant="outline" onClick={() => navigate(`${portalBasePath}?section=reports`)} className="admin-apartment-detail-view-reports">View Reports</Button>
                    </div>)}
                </div>
              </CardContent>
            </Card>

            <Card id="admin-verification-rail" className="admin-apartment-detail-admin-verification-rail">
              <CardContent className="admin-apartment-detail-card-content-4">
                <div className="admin-apartment-detail-row-31">
                  <span className="admin-apartment-detail-row-32">
                    <FileSearch className="admin-apartment-detail-file-search-icon"/>
                  </span>
                  <div className="admin-apartment-detail-panel-7">
                    <h2 className="admin-apartment-detail-verification-documents-2">Verification Documents</h2>
                    <p className="admin-apartment-detail-text-25">{landlord?.name || "Landlord"} - {apartment.title}</p>
                  </div>
                </div>

                <div className="admin-apartment-detail-grid-17">
                  <DetailRow label="Property Permit Number" value={getText(verificationData, ["businessPermit"], "Not provided for this property")}/>
                  <DetailRow label="Landlord Verification" value={landlordVerificationStatus}/>
                  <DetailRow label="Documents Provided" value={`${verificationDocuments.length} of ${VERIFICATION_DOCUMENT_TYPES.length}`}/>
                </div>

                <div className="admin-apartment-detail-grid-18">
                  {(showAllDocuments ? submittedDocumentCards : submittedDocumentCards.slice(0, 4)).map(({ key, label, document }) => (<div key={key} className="admin-apartment-detail-card-21">
                      <div className="admin-apartment-detail-panel-27">
                        <h3 className="admin-apartment-detail-heading-3">{label}</h3>
                        <p className={`admin-apartment-detail-text-26 ${document ? "admin-apartment-detail-text-21" : "admin-apartment-detail-text-22"}`}>{document?.fileName || "Not provided"}</p>
                      </div>
                      {document ? (<>
                          {document.mimeType === "application/pdf" ? (<div className="admin-apartment-detail-card-22"><FileText className="admin-apartment-detail-file-text-icon-3"/></div>) : (<img src={document.previewUrl} alt={label} className="admin-apartment-detail-image-3"/>)}
                          <Button onClick={() => openDocumentReview(document)} className="admin-apartment-detail-view-full-document-2">
                            View Full Document
                          </Button>
                        </>) : (<div className="admin-apartment-detail-not-provided-2">Not provided</div>)}
                    </div>))}
                </div>

                <Button type="button" variant="outline" onClick={() => setShowAllDocuments((current) => !current)} className="admin-apartment-detail-button-11">
                  {showAllDocuments ? "Show Fewer Documents" : `View All Documents (${submittedDocumentCards.length})`}
                </Button>
              </CardContent>
            </Card>

            <Card className="admin-apartment-detail-card-10">
              <CardContent className="admin-apartment-detail-card-content-4">
                <h2 className="admin-apartment-detail-listing-information">
                  <span className="admin-apartment-detail-row-29"><FileText className="admin-apartment-detail-file-text-icon-4"/></span>
                  Listing Information
                </h2>

                <div className="admin-apartment-detail-panel-17">
                  <div>
                    <p className="admin-apartment-detail-available-from">Available From</p>
                    <p className="admin-apartment-detail-text-24">
                      {new Date(apartment.availableDate).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })}
                    </p>
                  </div>

                  <div>
                    <p className="admin-apartment-detail-status">Status</p>
                    <Badge className="admin-apartment-detail-badge-10">
                      {listingStatusLabel}
                    </Badge>
                  </div>

                  <div>
                    <p className="admin-apartment-detail-reports">Reports</p>
                    <p className="admin-apartment-detail-report-s">{reports.length} report(s)</p>
                  </div>

                  <div>
                    <p className="admin-apartment-detail-rooms">Rooms</p>
                    <p className="admin-apartment-detail-room-s">{roomsForDisplay.length || apartment.rooms?.length || 0} room(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {messageModalOpen && (<div className="admin-apartment-detail-overlay" onClick={() => !isSendingMessage && setMessageModalOpen(false)}>
            <div className="admin-apartment-detail-overlay-2"/>
            <div className="admin-apartment-detail-card-23" onClick={(event) => event.stopPropagation()}>
              <div className="admin-apartment-detail-row-33">
                <div>
                  <h2 className="admin-apartment-detail-send-message-to-landlord-2">Send Message to Landlord</h2>
                  <p className="admin-apartment-detail-to">To {landlord?.name || "Apartment landlord"} about {apartment.title}</p>
                </div>
                <button onClick={() => setMessageModalOpen(false)} disabled={isSendingMessage} className="admin-apartment-detail-button-16"><X className="admin-apartment-detail-x-icon"/></button>
              </div>
              <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} rows={6} maxLength={2000} placeholder="Write your message to the landlord..." className="admin-apartment-detail-textarea-2"/>
              <div className="admin-apartment-detail-row-34"><span>The landlord will receive this as a notification.</span><span>{messageText.length}/2000</span></div>
              <div className="admin-apartment-detail-row-35">
                <Button variant="outline" onClick={() => setMessageModalOpen(false)} disabled={isSendingMessage} className="admin-apartment-detail-cancel">Cancel</Button>
                <Button onClick={() => void handleSendMessage()} disabled={isSendingMessage || !messageText.trim()} className="admin-apartment-detail-button-17"><Send className="admin-apartment-detail-send-icon"/>{isSendingMessage ? "Sending..." : "Send Message"}</Button>
              </div>
            </div>
          </div>)}

        {changeLogOpen && (<div className="admin-apartment-detail-overlay" onClick={() => setChangeLogOpen(false)}>
            <div className="admin-apartment-detail-overlay-2"/>
            <div className="admin-apartment-detail-card-24" onClick={(event) => event.stopPropagation()}>
              <div className="admin-apartment-detail-row-36">
                <div><h2 className="admin-apartment-detail-apartment-change-log">Apartment Change Log</h2><p className="admin-apartment-detail-text-27">{apartment.title}</p></div>
                <button onClick={() => setChangeLogOpen(false)} className="admin-apartment-detail-button-18"><X className="admin-apartment-detail-x-icon"/></button>
              </div>
              <div className="admin-apartment-detail-panel-28">
                {changeLogLoading ? (<div className="admin-apartment-detail-loading-change-history">Loading change history...</div>) : changeLogs.length === 0 ? (<div className="admin-apartment-detail-card-25"><ClipboardList className="admin-apartment-detail-clipboard-list-icon-2"/><p className="admin-apartment-detail-no-listing-changes-recorded-yet">No listing changes recorded yet.</p><p className="admin-apartment-detail-text-28">Future property and room updates will appear here.</p></div>) : (<div className="admin-apartment-detail-panel-13">
                    {changeLogs.map((log) => {
                    const displayLog = formatAuditLogForDisplay(log);
                    const actorId = String(log.admin_id ?? log.details?.actor_id ?? "");
                    return (<div key={log.id} className="admin-apartment-detail-card-26">
                          <div className="admin-apartment-detail-content-5">
                            <div><p className="admin-apartment-detail-text-18">{displayLog.title}</p><p className="admin-apartment-detail-by">By {changeLogActors[actorId] || (actorId ? "Administrator" : "System")}</p></div>
                            <p className="admin-apartment-detail-text-29">{log.created_at ? new Date(log.created_at).toLocaleString("en-PH") : "Date unavailable"}</p>
                          </div>
                          <div className="admin-apartment-detail-panel-17">
                            {(displayLog.changes.length > 0 ? displayLog.changes : [{ key: "summary", summary: displayLog.detail }]).map((change) => (<div key={change.key} className="admin-apartment-detail-panel-29">{change.summary}</div>))}
                          </div>
                        </div>);
                })}
                  </div>)}
              </div>
            </div>
          </div>)}

        {SHOW_SELECTED_REPORT_DETAILS && selectedReport && (<Card className="admin-apartment-detail-card-27">
            <CardContent className="admin-apartment-detail-card-content-5">
              <div className="admin-apartment-detail-row-37">
                <h2 className="admin-apartment-detail-report-investigation-details">Report Investigation Details</h2>
                <Button variant="ghost" onClick={() => setSelectedReport(null)}>
                  <X className="admin-apartment-detail-x-icon"/>
                </Button>
              </div>

              <div className="admin-apartment-detail-grid-19">
                <div>
                  <h3 className="admin-apartment-detail-report-information">Report Information</h3>
                  <div className="admin-apartment-detail-panel-17">
                    <div>
                      <p className="admin-apartment-detail-issue-type">Issue Type</p>
                      <p className="admin-apartment-detail-text-24">{selectedReport.issue_type || "—"}</p>
                    </div>

                    <div>
                      <p className="admin-apartment-detail-reported-by">Reported By</p>
                      <p className="admin-apartment-detail-text-24">{selectedReport.reporter_name || selectedReport.reporter_role || "Anonymous"}</p>
                    </div>

                    <div>
                      <p className="admin-apartment-detail-severity">Severity</p>
                      <Badge className={selectedReport.severity === "high"
                ? "admin-apartment-detail-badge-11"
                : selectedReport.severity === "med"
                    ? "admin-apartment-detail-badge-12"
                    : "admin-apartment-detail-badge-13"}>
                        {selectedReport.severity?.toUpperCase() || "UNKNOWN"}
                      </Badge>
                    </div>

                    <div>
                      <p className="admin-apartment-detail-date-reported">Date Reported</p>
                      <p className="admin-apartment-detail-text-24">
                        {selectedReport.submitted_at
                ? new Date(selectedReport.submitted_at).toLocaleDateString("en-PH")
                : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="admin-apartment-detail-status">Status</p>
                      <Badge className={selectedReport.status === "pending"
                ? "admin-apartment-detail-badge-12"
                : selectedReport.status === "resolved"
                    ? "admin-apartment-detail-badge-13"
                    : "admin-apartment-detail-badge-14"}>
                        {selectedReport.status?.toUpperCase() || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="admin-apartment-detail-report-details-inspection">Report Details & Inspection</h3>
                  <div className="admin-apartment-detail-card-28">
                    <p className="admin-apartment-detail-text-30">
                      {getRecordText(selectedReport, ["details", "reason"], "No details provided")}
                    </p>
                  </div>

                  {selectedReport.contact && (<div className="admin-apartment-detail-panel-30">
                      <p className="admin-apartment-detail-reporter-contact">Reporter Contact</p>
                      <p className="admin-apartment-detail-text-24">{selectedReport.contact}</p>
                    </div>)}

                  <div className="admin-apartment-detail-row-38">
                    <Button onClick={() => {
                if (id)
                    navigate(`${apartmentDetailBasePath}/${id}`, { state: { returnTo, backLabel } });
            }} className="admin-apartment-detail-view-reported-apartment">
                      <Building2 className="admin-apartment-detail-building2-icon-3"/>
                      View Reported Apartment
                    </Button>
                    <Button disabled={!apartment?.landlordId} onClick={() => navigate(`${portalBasePath}?section=landlords`)} className="admin-apartment-detail-view-landlord">
                      <Users className="admin-apartment-detail-users-icon-2"/>
                      View Landlord
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>
      </main>
    </div>);
}
