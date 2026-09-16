import { Pencil, Bath, Building2, CalendarDays, ChevronLeft, ChevronRight, Heart, MapPin, Square, Star, AlertTriangle, ArrowLeft, BedDouble, Check, CheckCircle2, DoorOpen, Mail, Menu, Phone, Users, X } from "lucide-react";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { PropertyLocationPicker } from "@/landlord/PropertyLocationPicker";
import { apartmentToFormValues } from "@/utils/apartmentMappers";
import { updateApartment, persistApartmentImages, fetchApartmentDetailAccessState, fetchApartmentWithImages, getLandlordVerification, recordApartmentView } from "@/data/apartments";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MapView } from "@/components/MapView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { isTenantRole } from "@/services/authService";
import { fetchApartmentRatings, subscribeToApartmentRatings, removeApartmentRating, saveApartmentRating } from "@/services/apartmentRatingsService";
import { useFavorites } from "@/tenant/useFavorites";
import { createReport, fetchPublicLandlordById } from "@/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getImageUrl } from "@/utils/images";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { DEFAULT_LA_PAZ_MAP_CENTER, hasValidApartmentCoordinates, isDefaultMapCenter } from "@/utils/mapCoordinates";
import { toast } from "sonner";
import { MobileNavigation } from "@/tenant/MobileNavigation";
import { Sidebar } from "@/tenant/Sidebar";
import { useTenantNotifications } from "@/tenant/useTenantNotifications";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { RoomImageGallery } from "@/components/RoomImageGallery";
import { uploadReportEvidence } from "@/services/reportEvidenceService";
const STATUS_LABEL = { available: "Available", occupied: "Occupied", maintenance: "Under Maintenance" };
const STATUS_STYLE = { available: "apartment-detail-badge-2", occupied: "apartment-detail-badge-3", maintenance: "apartment-detail-badge-4" };
const roomStatus = (room) => room.status ?? (room.isOccupied ? "occupied" : "available");
const dateLabel = (value) => {
    if (!value)
        return "Not provided";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};
const listFromUnknown = (value) => Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim().length > 0)
    : typeof value === "string" ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) : [];

function InlinePropertyInfo({ label, fields = [], apartment, enabled, onSave, children, photos = false, location = false }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({});
    const [pictures, setPictures] = useState([]);
    const [saving, setSaving] = useState(false);
    const [lookup, setLookup] = useState(0);
    const [resolving, setResolving] = useState(false);
    const start = () => {
        setDraft(Object.fromEntries(fields.map(({ key }) => [key, apartment[key] ?? ""])));
        if (location) setDraft(current => ({ ...current, lat: apartment.lat, lng: apartment.lng }));
        setPictures((apartment.images || []).map((url, index) => ({ id: 'existing-' + index, url, isPrimary: index === 0, sortOrder: index })));
        setEditing(true);
    };
    const submit = async (event) => {
        event.preventDefault();
        if (saving || resolving) return;
        if (location && !hasValidApartmentCoordinates(draft.lat, draft.lng)) {
            toast.error("Please pin the property's exact location before saving.");
            return;
        }
        setSaving(true);
        try {
            await onSave(draft, photos ? pictures : null);
            setEditing(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save changes.");
        } finally { setSaving(false); }
    };
    if (!enabled) return children;
    return <div className="property-inline-section">
      <div className="property-inline-heading"><span>{label}</span><button type="button" aria-label={'Edit ' + label} title={'Edit ' + label} className="property-inline-pencil" onClick={start} disabled={editing}><Pencil size={16}/></button></div>
      {editing ? <form className="property-inline-form" onSubmit={submit}>
        <fieldset disabled={saving}>
          {fields.map(({ key, label: fieldLabel, type = "text", required = false, options }) => <label key={key} className="property-inline-field"><span>{fieldLabel}</span>
            {type === "textarea" ? <textarea autoFocus={key === fields[0]?.key} rows={4} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}/> : options ? <select value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}>{options.map(value => <option key={value} value={value}>{value}</option>)}</select> : <input autoFocus={key === fields[0]?.key} type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} required={required} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}/>}
          </label>)}
          {photos && <MultiImageUploader images={pictures} onImagesChange={setPictures} maxImages={10} disabled={saving}/>}
          {location && <><Button type="button" variant="outline" onClick={() => setLookup(value => value + 1)}>Find address on map</Button><PropertyLocationPicker lat={hasValidApartmentCoordinates(draft.lat, draft.lng) ? Number(draft.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat} lng={hasValidApartmentCoordinates(draft.lat, draft.lng) ? Number(draft.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng} addressQuery={[draft.address, draft.city, draft.state, draft.zip, "Philippines"].filter(Boolean).join(", ")} geocodeRequestKey={lookup} onGeocodeStatusChange={status => setResolving(status === "loading")} onLocationChange={(lat, lng) => setDraft(current => ({ ...current, lat, lng }))}/></>}
          <div className="property-inline-actions"><Button type="submit" disabled={saving || resolving}>{saving ? "Saving..." : resolving ? "Finding location..." : "Save Changes"}</Button><Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button></div>
        </fieldset>
      </form> : children}
    </div>;
}

const recordedDetailViewKeys = new Set();
export function ApartmentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const routeLocation = useLocation();
    const { user, canEditApartment, logout } = useAuth();
    const tenantAccount = isTenantRole(user?.role);
    const { unreadCount } = useTenantNotifications(tenantAccount);
    const { isFavorite, toggleFavorite } = useFavorites();
    const { apartments: contextApartments, refreshApartments: refreshPropertyListings } = useApartmentsContext();
    const [apartment, setApartment] = useState(null);
    const [landlord, setLandlord] = useState(null);
    const [verified, setVerified] = useState(false);
    const [loading, setLoading] = useState(true);
    const [accessState, setAccessState] = useState(null);
    const [imageIndex, setImageIndex] = useState(0);
    const [mobileNav, setMobileNav] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportDetails, setReportDetails] = useState("");
    const [reportContact, setReportContact] = useState("");
    const [evidence, setEvidence] = useState([]);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [ratings, setRatings] = useState([]);
    const [ratingSaving, setRatingSaving] = useState(false);
    const listingUpdatedAt = id ? contextApartments.find((item) => item.id === id)?.updatedAt : undefined;
    const returnTo = (() => {
        const value = routeLocation.state?.returnTo;
        return typeof value === "string" && value.startsWith("/") ? value : null;
    })();
    const backLabel = (() => {
        const value = routeLocation.state?.backLabel;
        return typeof value === "string" && value.trim() ? value : null;
    })();
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id)
                return setLoading(false);
            if (apartment?.id !== id) setLoading(true);
            setAccessState(null);
            try {
                const listing = await fetchApartmentWithImages(id);
                if (!active)
                    return;
                setApartment(listing);
                if (!listing) {
                    const state = await fetchApartmentDetailAccessState(id);
                    if (active)
                        setAccessState(state);
                    return;
                }
                setAccessState("accessible");
                let landlordVerified = false;
                if (listing?.landlordId) {
                    const [owner, isVerified] = await Promise.all([fetchPublicLandlordById(listing.landlordId), getLandlordVerification(listing.landlordId)]);
                    landlordVerified = isVerified;
                    if (active) {
                        setLandlord(owner);
                        setVerified(isVerified);
                    }
                }
                else if (active) {
                    setLandlord(null);
                    setVerified(false);
                }
                if (listing && user && isTenantVisibleApartment({ ...listing, landlordVerified }) && isTenantRole(user.role) && listing.landlordId !== user.id) {
                    const viewKey = `${routeLocation.key}:${user.id}:${listing.id}`;
                    if (recordedDetailViewKeys.has(viewKey))
                        return;
                    recordedDetailViewKeys.add(viewKey);
                    void recordApartmentView(listing.id, { id: user.id, authId: user.authId, email: user.email, name: user.name, role: user.role })
                        .catch((error) => {
                        recordedDetailViewKeys.delete(viewKey);
                        console.error("Unable to record apartment view:", error);
                    });
                }
            }
            catch (error) {
                console.error("Failed to load apartment:", error);
                if (active) {
                    setApartment(null);
                    setAccessState("error");
                }
            }
            finally {
                if (active)
                    setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [id, listingUpdatedAt, routeLocation.key, user?.authId, user?.email, user?.id, user?.name, user?.role]);
    useEffect(() => {
        if (!id)
            return;
        let active = true;
        const loadRatings = () => fetchApartmentRatings(id).then((rows) => { if (active)
            setRatings(rows); }).catch((error) => console.error("Unable to load apartment ratings:", error));
        void loadRatings();
        const unsubscribe = subscribeToApartmentRatings(loadRatings, id);
        return () => { active = false; unsubscribe(); };
    }, [id]);
    useEffect(() => {
        if (!selectedRoom?.id || !apartment?.rooms)
            return;
        setSelectedRoom(apartment.rooms.find((room) => room.id === selectedRoom.id) ?? null);
    }, [apartment?.rooms, selectedRoom?.id]);
    const images = useMemo(() => apartment
        ? [...new Set([apartment.image, ...apartment.images].filter(Boolean).map(getImageUrl).filter(Boolean))]
        : [], [apartment]);
    const favorite = apartment ? isFavorite(apartment.id) : false;
    const canEdit = apartment ? canEditApartment(apartment.id, apartment.landlordId) : false;
    const ownListing = user?.role === "landlord" && (apartment?.landlordId === user.id || canEdit);
    const landlordPortal = user?.role === "landlord";
    const landlordMarketDetail = landlordPortal && routeLocation.pathname.startsWith("/landlord/market/");
    const renter = tenantAccount;
    const currentRating = ratings.find((rating) => rating.tenant_id === user?.id)?.rating ?? 0;
    const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.rating), 0) / ratings.length : 0;
    const setTenantRating = async (rating) => { if (!apartment || !user?.id)
        return; setRatingSaving(true); try {
        await saveApartmentRating(apartment.id, user.id, rating);
        toast.success("Rating saved.");
    }
    catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save rating.");
    }
    finally {
        setRatingSaving(false);
    } };
    const clearTenantRating = async () => { if (!apartment || !user?.id)
        return; setRatingSaving(true); try {
        await removeApartmentRating(apartment.id, user.id);
        toast.success("Rating removed.");
    }
    catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to remove rating.");
    }
    finally {
        setRatingSaving(false);
    } };
    const handleBack = () => {
        if (landlordMarketDetail)
            return navigate("/browse");
        if (returnTo)
            return navigate(returnTo);
        if (ownListing)
            return navigate("/dashboard?section=overview");
        navigate("/browse");
    };
    const editableInfo = ownListing && canEdit && !landlordMarketDetail;
    const savePropertyInfo = async (patch, pictures) => {
        if (!editableInfo) throw new Error("You cannot edit this property.");
        if (pictures) {
            const saved = await persistApartmentImages(apartment.id, pictures, user.id);
            setApartment(saved);
            setImageIndex(0);
        } else {
            const current = await fetchApartmentWithImages(apartment.id);
            if (!current) throw new Error("Property is no longer available.");
            const features = current.features && !Array.isArray(current.features) ? { ...current.features } : { customFeatures: Array.isArray(current.features) ? current.features : [] };
            const updated = { ...current, ...patch };
            if ('amenitiesText' in patch) updated.amenities = patch.amenitiesText.split(',').map(value => value.trim()).filter(Boolean);
            if ('featuresText' in patch) {
                features.customFeatures = patch.featuresText.split(',').map(value => value.trim()).filter(Boolean);
                const names = features.customFeatures.map(value => value.toLowerCase());
                updated.petFriendly = names.includes('pet friendly');
                updated.parking = names.includes('parking');
                updated.furnished = names.includes('furnished');
            }
            if ('rulesText' in patch) features.safetyRules = patch.rulesText.split('\n').map(value => value.trim()).filter(Boolean);
            if ('propertyType' in patch) features.propertyType = patch.propertyType.trim();
            if ('utilitiesText' in patch) updated.utilities = patch.utilitiesText.split(',').map(value => value.trim()).filter(Boolean);
            updated.features = features;
            if ('title' in patch && !patch.title.trim()) throw new Error("Property name is required.");
            const values = { ...apartmentToFormValues(updated), featureMetadata: features };
            const saved = await updateApartment(apartment.id, values, user.id);
            setApartment(saved);
        }
        void refreshPropertyListings();
        toast.success("Property details saved.");
    };
    const submitReport = async () => {
        if (!apartment || !user?.id)
            return;
        if (!reportDetails.trim())
            return void toast.error("Please describe the problem.");
        if (evidence.length === 0)
            return void toast.error("Please upload at least one image or evidence file.");
        setSubmittingReport(true);
        try {
            const report = await createReport({ reporter_id: user.id, reporter_role: user.role, apartment_id: apartment.id, category: "Apartment problem", issue_type: "Tenant-submitted problem", tags: [], details: reportDetails.trim(), contact: reportContact.trim() || user.email, date_of_incident: null, landlord_id: apartment.landlordId, has_evidence: evidence.length > 0, evidence_count: evidence.length });
            if (!report?.id)
                throw new Error("Unable to save report.");
            const uploads = await Promise.all(evidence.map((item) => uploadReportEvidence({ reportId: report.id, file: item.file, fileName: item.fileName, fileType: item.fileType, mimeType: item.mimeType, uploadedBy: user.id })));
            if (uploads.some((result) => !result))
                throw new Error("Report saved, but one or more evidence files could not be uploaded. Please contact support.");
            setReportOpen(false);
            setReportDetails("");
            setReportContact("");
            setEvidence([]);
            toast.success("Report submitted for admin review.");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to submit report.");
        }
        finally {
            setSubmittingReport(false);
        }
    };
    if (loading)
        return <div className="apartment-detail-loading-apartment-details">Loading apartment details...</div>;
    if (!apartment && accessState === "not_found")
        return <div className="apartment-detail-grid"><div><Building2 className="apartment-detail-building2-icon"/><h1 className="apartment-detail-apartment-not-found">Apartment not found</h1><Button className="apartment-detail-back-to-browse" onClick={() => navigate("/browse")}>Back to Browse</Button></div></div>;
    if (!apartment && accessState === "unavailable")
        return <div className="apartment-detail-grid"><div><AlertTriangle className="apartment-detail-alert-triangle-icon"/><h1 className="apartment-detail-listing-not-available">Listing not available</h1><p className="apartment-detail-text">This apartment is not currently available to Tenant users.</p><Button className="apartment-detail-go-back" onClick={handleBack}>Go Back</Button></div></div>;
    if (!apartment)
        return <div className="apartment-detail-grid"><div><AlertTriangle className="apartment-detail-alert-triangle-icon"/><h1 className="apartment-detail-unable-to-load-apartment">Unable to load apartment</h1><p className="apartment-detail-text">Please check your connection and try again.</p><Button className="apartment-detail-back-to-browse" onClick={() => navigate("/browse")}>Back to Browse</Button></div></div>;
    if (!ownListing && user?.role !== "admin" && !isTenantVisibleApartment({ ...apartment, landlordVerified: verified }))
        return <div className="apartment-detail-grid"><div><AlertTriangle className="apartment-detail-alert-triangle-icon"/><h1 className="apartment-detail-listing-not-available">Listing not available</h1><p className="apartment-detail-text">This apartment becomes visible after the property is approved, published, active, and its landlord is verified.</p><Button className="apartment-detail-go-back" onClick={handleBack}>Go Back</Button></div></div>;
    const locationText = formatApartmentLocation(apartment);
    const locationDetails = [
        { label: "Complete Address", value: apartment.address },
        { label: "City / District", value: [apartment.city, apartment.state].filter(Boolean).join(", ") },
        { label: "ZIP Code", value: apartment.zip },
    ].filter((item) => item.value && item.value.trim().length > 0);
    const mapPinAvailable = hasValidApartmentCoordinates(apartment.lat, apartment.lng);
    const hasAddressText = locationText !== "Location not provided";
    const mapPinMessage = isDefaultMapCenter(apartment.lat, apartment.lng)
        ? "This listing has an address, but its map pin is still the old default La Paz center. The landlord needs to edit the listing and pin the exact location."
        : hasAddressText
            ? "This listing has an address, but no exact latitude and longitude were saved for the map pin."
            : "No address or map pin has been saved for this listing.";
    const status = apartment.status ?? "available";
    const availableRooms = apartment.rooms?.filter((room) => roomStatus(room) === "available").length ?? 0;
    const maxOccupants = apartment.rooms?.reduce((total, room) => total + (room.maxOccupants || 0), 0) || 0;
    const featureRecord = !Array.isArray(apartment.features) && apartment.features ? apartment.features : {};
    const rules = listFromUnknown(featureRecord.safetyRules ?? featureRecord.houseRules);
    const propertyFeatures = [apartment.petFriendly && "Pet Friendly", apartment.parking && "Parking", apartment.furnished && "Furnished", ...listFromUnknown(featureRecord.customFeatures)].filter(Boolean);
    const landlordName = landlord?.name || "Not provided";
    const editableApartment = { ...apartment, amenitiesText: (apartment.amenities || []).join(", "), featuresText: propertyFeatures.join(", "), utilitiesText: Array.isArray(apartment.utilities) ? apartment.utilities.join(", ") : "", rulesText: rules.join("\n") };
    const missingValue = ownListing ? "Not specified" : "Not provided";
    const renderSidebar = () => {
        if (user?.role === "landlord") {
            return <LandlordSidebar user={user} verified={user.isVerified} activeSection={landlordMarketDetail ? "market" : "overview"} onSectionChange={(section) => navigate(`/dashboard?section=${section}`)} onClose={() => setMobileNav(false)} onLogout={() => { logout(); navigate("/"); }}/>;
        }
        return <Sidebar active="apartments" unreadCount={unreadCount}/>;
    };
    return (<div className={`app-shell ${landlordPortal ? "landlord-shell landlord-property-detail" : "tenant-detail-colors"}`}>
      {renter && <MobileNavigation active="apartments" unreadCount={unreadCount}/>}
      <div className="app-shell-frame">
      {landlordPortal
            ? <aside className="app-shell-sidebar">{renderSidebar()}</aside>
            : <div className="apartment-detail-panel"><Sidebar active="apartments" unreadCount={unreadCount}/></div>}
      {mobileNav && !renter && <div className="app-sidebar-overlay"><button aria-label="Close navigation" className="apartment-detail-close-navigation" onClick={() => setMobileNav(false)}/><div className="app-sidebar-drawer">{renderSidebar()}<button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="app-sidebar-close"><X className="apartment-detail-x-icon"/></button></div></div>}
      <div className="app-shell-main"><main className="app-shell-content app-shell-content-mobile-nav"><div className="apartment-detail-container">
        <div className="apartment-detail-content"><div className="apartment-detail-row">{!renter && <button aria-label="Open navigation" onClick={() => setMobileNav(true)} className="app-sidebar-trigger"><Menu className="apartment-detail-menu-icon"/></button>}<Button variant="ghost" onClick={handleBack} className={`apartment-detail-button ${landlordPortal ? "apartment-detail-button-2" : ""}`}><ArrowLeft className="apartment-detail-arrow-left-icon"/><span className="apartment-detail-span">{landlordMarketDetail ? "Back to Market Overview" : backLabel ?? (ownListing ? "Back to My Properties" : "Back to Browse")}</span></Button></div><div className="apartment-detail-row-2">{tenantAccount && <Button variant="outline" size="icon" onClick={() => void toggleFavorite(apartment.id)} title={favorite ? "Remove favorite" : "Add favorite"} className="apartment-detail-button-3"><Heart className={`apartment-detail-heart-icon ${favorite ? "apartment-detail-heart-icon-2" : ""}`}/></Button>}</div></div>

        <header className="apartment-detail-header"><div className="apartment-detail-panel-2"><Badge className={`apartment-detail-for-rent ${landlordPortal ? "apartment-detail-for-rent-2" : "apartment-detail-for-rent-3"}`}>For Rent</Badge><InlinePropertyInfo label="Property name" fields={[{ key: "title", label: "Property name", required: true }]} apartment={apartment} enabled={editableInfo} onSave={savePropertyInfo}><h1 className={`apartment-detail-title ${landlordPortal ? "apartment-detail-title-2" : "apartment-detail-title-3"}`}>{apartment.title || "Untitled apartment"}</h1></InlinePropertyInfo><div className={`apartment-detail-row-3 ${landlordPortal ? "apartment-detail-panel-3" : "apartment-detail-panel-4"}`}><span className="apartment-detail-row-4"><MapPin className={`apartment-detail-map-pin-icon ${landlordPortal ? "apartment-detail-map-pin-icon-2" : "apartment-detail-map-pin-icon-2"}`}/><span className="apartment-detail-span-2">{locationText}</span></span><Badge className={apartment.isPublished === false ? "apartment-detail-badge" : "apartment-detail-badge-2"}>{apartment.isPublished === false ? "Unpublished" : "Published"}</Badge>{verified && <VerifiedBadge label={landlordPortal ? "Verified Landlord" : "Verified Listing"}/>}</div></div><div className={`apartment-detail-panel-5 ${landlordPortal ? "apartment-detail-panel-6" : "apartment-detail-panel-7"}`}><p className={`apartment-detail-room-pricing ${landlordPortal ? "apartment-detail-room-pricing-2" : ""}`}>Room Pricing</p><p className={`apartment-detail-text-2 ${landlordPortal ? "apartment-detail-text-3" : "apartment-detail-text-4"}`}>View each room to see its monthly rent.</p><div className={`apartment-detail-row-5 ${landlordPortal ? "apartment-detail-panel-8" : "apartment-detail-panel-9"}`}><span>{STATUS_LABEL[status]}</span><span className={ownListing && availableRooms > 0 ? "apartment-detail-span-3" : ""}>{availableRooms > 0 ? `${availableRooms} ${availableRooms === 1 ? "room" : "rooms"} available` : "All rooms occupied"}</span></div></div></header>

        <InlinePropertyInfo label="Property photos" fields={[]} apartment={editableApartment} enabled={editableInfo} onSave={savePropertyInfo} photos><section className="apartment-detail-section"><div className="apartment-detail-panel-10">{images.length ? <img src={images[imageIndex]} alt={`${apartment.title} image ${imageIndex + 1}`} className="apartment-detail-image"/> : <div className="apartment-detail-no-images-uploaded">No images uploaded</div>}{images.length > 1 && <><button onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} className="apartment-detail-button-4"><ChevronLeft className="apartment-detail-chevron-left-icon"/></button><button onClick={() => setImageIndex((imageIndex + 1) % images.length)} className="apartment-detail-button-5"><ChevronRight className="apartment-detail-chevron-right-icon"/></button><span className="apartment-detail-span-4">{imageIndex + 1} / {images.length}</span></>}</div>{images.length > 1 && <div className="apartment-detail-row-6">{images.map((source, index) => <button key={`${source}-${index}`} onClick={() => setImageIndex(index)} className={`apartment-detail-button-6 ${index === imageIndex ? (landlordPortal ? "apartment-detail-button-7" : "apartment-detail-button-7") : "apartment-detail-button-8"}`}><img src={source} alt={`${apartment.title} thumbnail ${index + 1}`} className="apartment-detail-image"/></button>)}</div>}</section></InlinePropertyInfo>

        <section className="apartment-detail-section-2">{[{ label: "Bedrooms", value: apartment.bedrooms || missingValue, icon: BedDouble }, { label: "Bathrooms", value: apartment.bathrooms || missingValue, icon: Bath }, { label: "Floor Area", value: apartment.sqft ? `${apartment.sqft} sq ft` : missingValue, icon: Square }, { label: "Max Occupants", value: maxOccupants || missingValue, icon: Users }, { label: "Date Posted", value: dateLabel(apartment.createdAt) === "Not provided" ? missingValue : dateLabel(apartment.createdAt), icon: CalendarDays }].map(({ label, value, icon: Icon }) => <div key={label} className="apartment-detail-row-7"><span className="apartment-detail-grid-2"><Icon className="apartment-detail-icon-icon"/></span><span className="apartment-detail-span-5"><strong className="apartment-detail-strong">{value}</strong><span className="apartment-detail-span-6">{label}</span></span></div>)}</section>

        <div className="apartment-detail-grid-3"><div className="apartment-detail-panel-11">
          <InlinePropertyInfo label="About this apartment" fields={[{"key":"description","label":"Description","type":"textarea"},{"key":"amenitiesText","label":"Amenities (comma-separated)"},{"key":"featuresText","label":"Features (comma-separated)"}]} apartment={editableApartment} enabled={editableInfo} onSave={savePropertyInfo} ><section className="apartment-detail-section-3"><h2 className="apartment-detail-about-this-apartment">About this apartment</h2><p className="apartment-detail-text-5">{apartment.description || "No description provided."}</p><div className="apartment-detail-row-8">{[...apartment.amenities, ...propertyFeatures].length ? [...new Set([...apartment.amenities, ...propertyFeatures])].map((item) => <span key={item} className={`apartment-detail-span-7 ${landlordPortal ? "apartment-detail-span-8" : "apartment-detail-span-8"}`}><Check className={`apartment-detail-check-icon ${landlordPortal ? "apartment-detail-check-icon-2" : "apartment-detail-check-icon-3"}`}/>{item}</span>) : <p className="apartment-detail-no-amenities-provided">No amenities provided.</p>}</div></section></InlinePropertyInfo>
          <section className="apartment-detail-section-4"><div className="apartment-detail-content-2"><div className="apartment-detail-panel-2"><h2 className="apartment-detail-rooms-amenities">Rooms & Amenities {editableInfo && <Link className="property-inline-pencil" aria-label="Edit rooms" title="Edit rooms" to={`/landlord/properties/${apartment.id}/rooms`}><Pencil size={16}/></Link>}</h2><p className="apartment-detail-text-6">Current room availability from the landlord.</p></div><Badge className="apartment-detail-available">{availableRooms} available</Badge></div>{apartment.rooms?.length ? <div className="apartment-detail-panel-12">{apartment.rooms.map((room, index) => <button type="button" key={room.id || index} onClick={() => setSelectedRoom(room)} className={`apartment-detail-button-9 ${landlordPortal ? "apartment-detail-button-10" : "apartment-detail-button-11"}`}><div className="apartment-detail-grid-4">{room.images?.[0] ? <img src={getImageUrl(room.images[0])} alt={room.name || `Room ${index + 1}`} className="apartment-detail-image-2"/> : <div className="apartment-detail-grid-5"><DoorOpen className="apartment-detail-door-open-icon"/></div>}<div className="apartment-detail-panel-13"><div className="apartment-detail-content-3"><div className="apartment-detail-panel-2"><h3 className="apartment-detail-heading">{room.name || `Room ${index + 1}`}</h3><p className="apartment-detail-text-7">{room.type || "Room type not provided"}</p></div><Badge className={`${STATUS_STYLE[roomStatus(room)]} apartment-detail-badge-5`}>{STATUS_LABEL[roomStatus(room)]}</Badge></div><div className="apartment-detail-grid-6"><span className="apartment-detail-span-2"><b>₱{Number(room.price || 0).toLocaleString("en-PH")}</b><small className="apartment-detail-monthly-rent">Monthly rent</small></span><span><b>{room.maxOccupants || "-"}</b><small className="apartment-detail-capacity">Capacity</small></span><span><b>{room.hasPrivateBath ? "Private" : "Shared"}</b><small className="apartment-detail-bathroom">Bathroom</small></span><span><b>{room.hasAC ? "Yes" : "No"}</b><small className="apartment-detail-air-conditioning">Air conditioning</small></span></div>{room.description && <p className="apartment-detail-text-8">{room.description}</p>}<p className={`apartment-detail-view-room-details ${landlordPortal ? "apartment-detail-view-room-details-2" : "apartment-detail-view-room-details-3"}`}>View room details</p></div></div></button>)}</div> : <div className="apartment-detail-no-room-information-available">No room information available.</div>}</section>
          <InlinePropertyInfo label="Location" fields={[{"key":"address","label":"Complete address","type":"text","required":true},{"key":"city","label":"City","type":"text","required":true},{"key":"state","label":"Province","type":"text","required":true},{"key":"zip","label":"ZIP code","type":"text","required":true}]} apartment={editableApartment} enabled={editableInfo} onSave={savePropertyInfo} location><section className="apartment-detail-section-4">
            <h2 className="apartment-detail-location">Location</h2>
            <div className={`apartment-detail-card ${landlordPortal ? "apartment-detail-panel-14" : "apartment-detail-panel-15"}`}>
              <div className="apartment-detail-row-9">
                <MapPin className={`apartment-detail-map-pin-icon-3 ${landlordPortal ? "apartment-detail-map-pin-icon-2" : "apartment-detail-map-pin-icon-2"}`}/>
                <div className="apartment-detail-panel-2">
                  <h3 className="apartment-detail-location-details">Location Details</h3>
                  <p className="apartment-detail-text-9">{locationText}</p>
                </div>
              </div>
              {locationDetails.length > 0 && (<dl className="apartment-detail-grid-7">
                  {locationDetails.map(({ label, value }) => (<div key={label} className="apartment-detail-panel-16">
                      <dt className="apartment-detail-dt">{label}</dt>
                      <dd className="apartment-detail-dd">{value}</dd>
                    </div>))}
                </dl>)}
            </div>
            {mapPinAvailable ? <div className="apartment-detail-panel-17"><MapView lat={apartment.lat} lng={apartment.lng} zoom={15} showSingleMarker/></div> : <div className={`apartment-detail-card-2 ${landlordPortal ? "apartment-detail-panel-18" : "apartment-detail-panel-19"}`}><MapPin className={`apartment-detail-map-pin-icon-4 ${landlordPortal ? "apartment-detail-map-pin-icon-2" : "apartment-detail-map-pin-icon-2"}`}/><p className="apartment-detail-exact-map-pin-needed">Exact map pin needed</p><p className="apartment-detail-text-10">{mapPinMessage}</p></div>}
          </section></InlinePropertyInfo>
        </div><aside className="apartment-detail-aside">
          <section className="apartment-detail-section-3"><h2 className="apartment-detail-landlord-information">Landlord Information</h2><div className="apartment-detail-row-10"><span className={`apartment-detail-grid-8 ${landlordPortal ? "apartment-detail-span-9" : "apartment-detail-span-10"}`}>{landlordName === "Not provided" ? "L" : landlordName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div className="apartment-detail-panel-2"><strong className="apartment-detail-strong-2">{landlordName}</strong>{verified && <VerifiedBadge label={landlordPortal ? "Verified Landlord" : "Verified Listing"} className="apartment-detail-verified-badge"/>}</div></div><div className="apartment-detail-panel-20"><p className="apartment-detail-text-11"><Mail className="apartment-detail-mail-icon"/><span className="apartment-detail-span-2">{landlord?.email || "Email not provided"}</span></p><p className="apartment-detail-text-11"><Phone className="apartment-detail-phone-icon"/><span className="apartment-detail-span-2">{landlord?.mobile || landlord?.mobileNumber || "Phone not provided"}</span></p></div></section>
          <InlinePropertyInfo label="Property details" fields={[{"key":"propertyType","label":"Property type"},{"key":"sqft","label":"Floor area (sq ft)","type":"number"},{"key":"availableDate","label":"Available date","type":"date"},{"key":"utilitiesText","label":"Utilities included (comma-separated)"}]} apartment={editableApartment} enabled={editableInfo} onSave={savePropertyInfo} ><section className="apartment-detail-section-3"><h2 className="apartment-detail-property-details">Property Details</h2><dl className="apartment-detail-dl">{[{ label: "Property Type", value: apartment.propertyType || "Not provided" }, { label: "Available Date", value: dateLabel(apartment.availableDate) }, { label: "Utilities", value: Array.isArray(apartment.utilities) && apartment.utilities.length ? apartment.utilities.join(", ") : "Not included" }, { label: "Status", value: STATUS_LABEL[status] }, { label: "ZIP Code", value: apartment.zip || "Not provided" }].map(({ label, value }) => <div key={label} className="apartment-detail-grid-9"><dt className="apartment-detail-dt-2">{label}</dt><dd className="apartment-detail-dd-2">{value}</dd></div>)}</dl></section></InlinePropertyInfo>
          <InlinePropertyInfo label="Safety & rules" fields={[{"key":"rulesText","label":"Rules (one per line)","type":"textarea"}]} apartment={editableApartment} enabled={editableInfo} onSave={savePropertyInfo} ><section className="apartment-detail-section-3"><h2 className="apartment-detail-safety-rules">Safety & Rules</h2>{rules.length ? <ul className="apartment-detail-ul">{rules.map((rule) => <li key={rule} className="apartment-detail-li"><CheckCircle2 className="apartment-detail-check-circle2-icon"/><span className="apartment-detail-span-2">{rule}</span></li>)}</ul> : <p className="apartment-detail-no-safety-rules-provided">No safety rules provided.</p>}</section></InlinePropertyInfo>
          {renter && <section className="apartment-detail-section-5"><h2 className="apartment-detail-tenant-rating">Tenant Rating</h2><p className="apartment-detail-text-12">{ratings.length ? `★ ${averageRating.toFixed(1)} based on ${ratings.length} rating${ratings.length === 1 ? "" : "s"}` : "No ratings yet"}</p><div className="apartment-detail-row-11">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" disabled={ratingSaving} aria-label={`Rate ${value} stars`} onClick={() => void setTenantRating(value)}><Star className={`apartment-detail-star-icon ${value <= currentRating ? "apartment-detail-star-icon-2" : "apartment-detail-star-icon-3"}`}/></button>)}</div>{currentRating > 0 && <button type="button" disabled={ratingSaving} onClick={() => void clearTenantRating()} className="apartment-detail-remove-my-rating">Remove my rating</button>}</section>}
          {renter && <section className="apartment-detail-section-6"><div className="apartment-detail-row-9"><AlertTriangle className="apartment-detail-alert-triangle-icon-2"/><div className="apartment-detail-panel-2"><h2 className="apartment-detail-report-a-problem">Report a Problem</h2><p className="apartment-detail-text-13">Let us know about any issues you encountered with an apartment listing.</p></div></div><Button variant="outline" onClick={() => setReportOpen(true)} className="apartment-detail-report-a-problem-2">Report a Problem</Button></section>}
        </aside></div>
      </div></main>

      <div className={`apartment-detail-overlay ${landlordPortal ? "apartment-detail-panel-21" : "apartment-detail-panel-22"}`}><div className="apartment-detail-container-2"><div className="apartment-detail-panel-23"><strong className={`apartment-detail-prices-are-listed-per-room ${landlordPortal ? "apartment-detail-prices-are-listed-per-room-2" : "apartment-detail-prices-are-listed-per-room-3"}`}>Prices are listed per room</strong><span className="apartment-detail-span-11">{STATUS_LABEL[status]}</span></div>{tenantAccount && <Button variant="outline" onClick={() => void toggleFavorite(apartment.id)} className="apartment-detail-button-3"><Heart className={`apartment-detail-heart-icon-3 ${favorite ? "apartment-detail-heart-icon-2" : ""}`}/><span className="apartment-detail-span-12">{favorite ? "Saved" : "Add to Favorites"}</span></Button>}</div></div>
      </div>
      </div>

      {selectedRoom && <div className="apartment-detail-overlay-2" onClick={() => setSelectedRoom(null)}>
        <div className="apartment-detail-panel-24" onClick={(event) => event.stopPropagation()}>
          <div className="apartment-detail-row-12"><div><h2 className="apartment-detail-heading-2">{selectedRoom.name || "Room details"}</h2><p className="apartment-detail-text-14">{selectedRoom.type || "Room type not provided"}</p></div><button onClick={() => setSelectedRoom(null)} className="apartment-detail-button-12"><X className="apartment-detail-x-icon"/></button></div>
          <div className="apartment-detail-grid-10">
            <RoomImageGallery images={selectedRoom.images} roomName={selectedRoom.name || "Room"}/>
            <div className="apartment-detail-panel-25">
              <div className="apartment-detail-row-13"><Badge className={STATUS_STYLE[roomStatus(selectedRoom)]}>{STATUS_LABEL[roomStatus(selectedRoom)]}</Badge>{selectedRoom.sqft ? <Badge className="apartment-detail-sq-ft">{selectedRoom.sqft} sq ft</Badge> : null}</div>
              <div className="apartment-detail-grid-11"><div className="apartment-detail-card-3"><p className="apartment-detail-monthly-rent-2">Monthly rent</p><p className="apartment-detail-text-15">₱{Number(selectedRoom.price || 0).toLocaleString("en-PH")}</p></div><div className="apartment-detail-card-3"><p className="apartment-detail-capacity-2">Capacity</p><p className="apartment-detail-text-15">{selectedRoom.maxOccupants || "Not provided"}</p></div><div className="apartment-detail-card-3"><p className="apartment-detail-bathroom-2">Bathroom</p><p className="apartment-detail-text-15">{selectedRoom.hasPrivateBath ? "Private" : selectedRoom.bathroomType || "Shared"}</p></div><div className="apartment-detail-card-3"><p className="apartment-detail-air-conditioning-2">Air conditioning</p><p className="apartment-detail-text-15">{selectedRoom.hasAC ? "Yes" : "No"}</p></div></div>
              <div><h3 className="apartment-detail-amenities">Amenities</h3><div className="apartment-detail-row-14"><Badge className="apartment-detail-badge-6">{selectedRoom.hasPrivateBath ? "Private bathroom" : "Shared bathroom"}</Badge>{selectedRoom.hasAC && <Badge className="apartment-detail-air-conditioning-3">Air conditioning</Badge>}</div></div>
              {selectedRoom.sharedBathLocation && <div className="apartment-detail-card-4"><p className="apartment-detail-shared-bathroom-location">Shared bathroom location</p><p className="apartment-detail-text-16">{selectedRoom.sharedBathLocation}</p></div>}
              <div><h3 className="apartment-detail-description">Description</h3><p className="apartment-detail-text-17">{selectedRoom.description || "No room description provided."}</p></div>
            </div>
          </div>
        </div>
      </div>}
      {reportOpen && <div className="apartment-detail-overlay-3" onClick={() => setReportOpen(false)}><div className="apartment-detail-panel-26" onClick={(event) => event.stopPropagation()}><div className="apartment-detail-row-12"><div><h2 className="apartment-detail-report-a-problem">Report a Problem</h2><p className="apartment-detail-text-6">Let us know about any issues you encountered with an apartment listing.</p></div><button onClick={() => setReportOpen(false)} className="apartment-detail-button-13"><X className="apartment-detail-x-icon"/></button></div><div className="apartment-detail-panel-27"><section className="apartment-detail-section-7"><div className="apartment-detail-panel-28"><p className="apartment-detail-1-select-apartment">1 Select Apartment</p><p className="apartment-detail-text-18">Choose the apartment listing related to your report.</p></div><div className="apartment-detail-card-5">{apartment.title || "Untitled apartment"}</div></section><section className="apartment-detail-section-7"><div className="apartment-detail-panel-28"><p className="apartment-detail-2-describe-the-problem">2 Describe the Problem</p><p className="apartment-detail-text-18">Please provide as much detail as possible.</p></div><div className="apartment-detail-panel-29"><textarea rows={5} maxLength={500} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="apartment-detail-textarea" placeholder="Describe what you experienced in as much detail as possible..."/><span className="apartment-detail-500">{reportDetails.length}/500</span></div></section><section className="apartment-detail-section-7"><div className="apartment-detail-panel-28"><p className="apartment-detail-3-upload-image-evidence">3 Upload Image / Evidence <span className="apartment-detail-required">Required</span></p><p className="apartment-detail-text-18">Attach images or documents that can help us understand the issue.</p></div><EvidenceUploader evidenceFiles={evidence} onEvidenceChange={setEvidence} maxFiles={5} maxFileSize={10} required/><div className="apartment-detail-card-6"><p className="apartment-detail-text-19">Evidence helps us review your report faster.</p><p className="apartment-detail-text-20">Clear screenshots, photos, or documents are very helpful.</p></div></section><section className="apartment-detail-section-7"><div className="apartment-detail-panel-28"><p className="apartment-detail-4-contact-information">4 Contact Information</p><p className="apartment-detail-text-18">We may contact you for more details if needed.</p></div><input value={reportContact} onChange={(event) => setReportContact(event.target.value)} placeholder={user?.email || "Enter your email address"} className="apartment-detail-input"/></section></div><div className="apartment-detail-grid-12"><Button variant="outline" onClick={() => { setReportDetails(""); setReportContact(user?.email || ""); setEvidence([]); }} disabled={submittingReport} className="apartment-detail-clear-form">Clear Form</Button><Button onClick={() => void submitReport()} disabled={submittingReport || !reportDetails.trim() || evidence.length === 0} className="apartment-detail-button-14">{submittingReport ? "Submitting..." : "Submit Report"}</Button></div></div></div>}
    </div>);
}
