import "./ManageRooms.css";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, LoaderCircle, Menu, Pencil, Plus, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, Navigate, useBlocker, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { createApartmentRoom, deleteApartmentRoom, fetchApartmentWithImages, updateApartmentRoom, uploadApartmentRoomImage } from "@/data/apartments";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { supabase } from "@/services/supabaseClient";
import { getRoomAmenities, normalizeRoomList } from "@/utils/roomFeatures";

/*
 * Room management stays in this existing JSX/CSS pair.
 * File sections: landlord shell, list page, edit page, editor, add dialog,
 * shared fields, preview, loading/error states, property loading,
 * unsaved-change guard, and room constants/validation/photo helpers.
 * Components and helpers below are defined once and reused by both routes.
 */

// ---------------------------------------------------------------------------
// 0. Shared landlord shell — sidebar on desktop, menu drawer on phones
// ---------------------------------------------------------------------------

function RoomsShell({ user, children }) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarProps = {
        user,
        verified: Boolean(user?.isVerified),
        activeSection: "overview",
        onSectionChange: (section) => navigate(`/dashboard?section=${section}`),
        onClose: () => setSidebarOpen(false),
        onLogout: () => {
            logout?.();
            navigate("/");
        },
    };
    return <div className="app-shell landlord-shell landlord-manage-rooms">
        <div className="app-shell-frame">
            <aside className="app-shell-sidebar"><LandlordSidebar {...sidebarProps} /></aside>
            {sidebarOpen && <div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
            <aside className={`app-sidebar-drawer ${sidebarOpen ? "is-open" : ""}`}>
                <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" className="app-sidebar-close"><X className="rm-menu-icon" /></button>
                <LandlordSidebar {...sidebarProps} />
            </aside>
            <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger"><Menu className="rm-menu-icon" /></button>
            <main className="app-shell-main">
                <div className="app-shell-content app-shell-content-mobile-nav">{children}</div>
            </main>
        </div>
    </div>;
}

// ---------------------------------------------------------------------------
// 1. Manage Rooms — empty state, paginated list, and deletion
// ---------------------------------------------------------------------------

export function ManageRooms() {
    const { id } = useParams();
    const { state } = useLocation();
    const { user } = useAuth();
    const { refreshApartments } = useApartmentsContext();
    const { property, rooms, isLoading, error, refreshError, refresh, upsertRoom, removeRoom } = useManagedProperty(id);
    const [addOpen, setAddOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const deleting = useRef(false);
    const [page, setPage] = useState(() => Math.max(1, Number(state?.roomPage) || 1));
    const restoredPage = useRef(false);
    useEffect(() => {
        if (isLoading || restoredPage.current || !state?.savedRoomId) return;
        restoredPage.current = true;
        const index = rooms.findIndex((room) => room.id === state.savedRoomId);
        if (index >= 0) setPage(Math.floor(index / ROOMS_PER_PAGE) + 1);
    }, [isLoading, rooms, state?.savedRoomId]);
    const pageCount = Math.max(1, Math.ceil(rooms.length / ROOMS_PER_PAGE));
    const currentPage = Math.min(page, pageCount);
    const visibleRooms = rooms.slice((currentPage - 1) * ROOMS_PER_PAGE, currentPage * ROOMS_PER_PAGE);
    const listRef = useRef(null);
    const canManage = property?.landlordId === user?.id && user?.role === "landlord";
    const refreshListings = () => { void Promise.resolve().then(refreshApartments).catch(() => undefined); };

    const addRoom = async (payload) => {
        if (!canManage) throw new Error("You do not have permission to manage this property.");
        const saved = await createApartmentRoom(id, payload, user.id);
        upsertRoom(saved);
        const ordered = sortRooms([...rooms.filter((room) => room.id !== saved.id), saved]);
        setPage(Math.floor(ordered.findIndex((room) => room.id === saved.id) / ROOMS_PER_PAGE) + 1);
        refreshListings();
        if (saved.syncWarning) toast.warning(saved.syncWarning);
        else toast.success("Room added successfully.");
    };
    const confirmDelete = async () => {
        if (!canManage || !deleteTarget || deleting.current) return;
        deleting.current = true;
        setIsDeleting(true);
        setDeleteError("");
        try {
            const result = await deleteApartmentRoom(id, deleteTarget.id, user.id);
            removeRoom(deleteTarget.id);
            setPage(Math.min(currentPage, Math.max(1, Math.ceil((rooms.length - 1) / ROOMS_PER_PAGE))));
            setDeleteTarget(null);
            refreshListings();
            if (result?.syncWarning) toast.warning(result.syncWarning);
            else toast.success("Room deleted successfully.");
        } catch (cause) {
            setDeleteError(cause instanceof Error ? cause.message : "Unable to delete this room. Please try again.");
        } finally {
            deleting.current = false;
            setIsDeleting(false);
        }
    };
    const changePage = (next) => {
        setPage(next);
        listRef.current?.focus({ preventScroll: true });
    };

    if (user?.role !== "landlord") return <Navigate to="/dashboard" replace />;
    if (isLoading) return <RoomsShell user={user}><RoomPageState loading /></RoomsShell>;
    if (error) return <RoomsShell user={user}><RoomPageState title="Unable to load rooms" message={error} onRetry={() => void refresh()} /></RoomsShell>;
    if (!property || !canManage) return <RoomsShell user={user}><RoomPageState /></RoomsShell>;

    return <RoomsShell user={user}><div className="room-management">
        <div className="rm-page rm-page--list">
            <Link className="rm-back-link" to="/dashboard?section=overview">
                <ArrowLeft aria-hidden="true" />Back to My Properties
            </Link>
            <header className="rm-page-heading">
                <h1>Manage Rooms — {property.title || "Untitled property"}</h1>
                <p>Add, edit, or update the rooms.</p>
            </header>
            {refreshError && <div className="rm-error-banner" role="status">Room updates are temporarily unavailable. Your last loaded rooms are still shown. <button type="button" onClick={() => void refresh(true)}>Retry</button></div>}
            <section ref={listRef} tabIndex={-1} className={`rm-room-list${rooms.length ? " rm-room-list--populated" : ""}`} aria-labelledby="rooms-heading">
                <header className="rm-list-heading">
                    <div>
                        <h2 id="rooms-heading">Rooms ({rooms.length})</h2>
                        <p>Manage the individual rooms for this property.</p>
                    </div>
                    {rooms.length > 0 && <Button className="rm-button rm-button--primary" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" />Add Room</Button>}
                </header>
                {rooms.length === 0 ? <div className="rm-empty-state">
                    <h3>No rooms added yet</h3>
                    <p>Start by adding rooms for this property.</p>
                    <Button className="rm-button rm-button--primary" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" />Add Room</Button>
                </div> : <>
                    <div className="rm-table-wrap">
                        <table className="rm-table">
                            <caption className="ui-sr-only">Rooms in {property.title}. Page {currentPage} of {pageCount}.</caption>
                            <thead><tr><th scope="col">Apartment Unit</th><th scope="col">Room Type</th><th scope="col">Monthly Rent</th><th scope="col">Capacity</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
                            <tbody>{visibleRooms.map((room) => {
                                const status = roomStatus(room);
                                const statusLabel = ROOM_STATUSES.find((option) => option.value === status)?.label;
                                return <tr key={room.id}>
                                    <th scope="row" className="rm-room-name">{room.name || "Unnamed room"}</th>
                                    <td data-label="Room Type"><span className="rm-type-badge">{room.type || "Room"}</span></td>
                                    <td data-label="Monthly Rent"><span className="rm-rent">₱ {formatRoomRent(room.price)}</span></td>
                                    <td data-label="Capacity">{formatRoomCapacity(room.maxOccupants)}</td>
                                    <td data-label="Status"><span className={`rm-status-badge rm-status-badge--${status}`}>{statusLabel}</span></td>
                                    <td className="rm-row-actions"><div>
                                        <Button asChild variant="outline" className="rm-row-button"><Link to={`/landlord/properties/${id}/rooms/${room.id}/edit`} state={{ roomPage: currentPage }} aria-label={`Edit ${room.name}`}><Pencil aria-hidden="true" />Edit</Link></Button>
                                        <Button variant="outline" className="rm-row-button rm-row-button--delete" aria-label={`Delete ${room.name}`} onClick={() => { setDeleteTarget(room); setDeleteError(""); }}>Delete</Button>
                                    </div></td>
                                </tr>;
                            })}</tbody>
                        </table>
                    </div>
                    <nav className="rm-pagination" aria-label="Room pagination">
                        <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}><ChevronLeft aria-hidden="true" /></button>
                        <span aria-live="polite">Page {currentPage} of {pageCount}</span>
                        <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}><ChevronRight aria-hidden="true" /></button>
                    </nav>
                </>}
            </section>
        </div>
        {addOpen && <AddRoomDialog property={property} rooms={rooms} onClose={() => setAddOpen(false)} onSave={addRoom} onRestoreFocus={() => listRef.current?.focus({ preventScroll: true })} />}
        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting.current) setDeleteTarget(null); }}>
            <AlertDialogContent className="rm-dialog rm-confirm-dialog" onCloseAutoFocus={(event) => { event.preventDefault(); listRef.current?.focus(); }}>
                <AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.name || "this room"}?</AlertDialogTitle>
                    <AlertDialogDescription>This permanently removes this room from the property. Your property and its other rooms will not be deleted.</AlertDialogDescription></AlertDialogHeader>
                {deleteError && <p className="rm-error-banner" role="alert">{deleteError}</p>}
                <AlertDialogFooter>
                    <AlertDialogCancel className="rm-button" disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <Button className="rm-button rm-button--danger" disabled={isDeleting} onClick={() => void confirmDelete()}>{isDeleting && <LoaderCircle className="rm-spinner" aria-hidden="true" />}{isDeleting ? "Deleting…" : "Delete Room"}</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div></RoomsShell>;
}

// ---------------------------------------------------------------------------
// 2. Edit Room — protected route using the same JSX/CSS pair
// ---------------------------------------------------------------------------

export function EditRoom() {
    const { id, roomId } = useParams();
    const { user } = useAuth();
    const { property, rooms, isLoading, error, refreshError, refresh } = useManagedProperty(id);
    if (user?.role !== "landlord") return <Navigate to="/dashboard" replace />;
    if (isLoading) return <RoomsShell user={user}><RoomPageState loading /></RoomsShell>;
    if (error) return <RoomsShell user={user}><RoomPageState title="Unable to load room" message={error} onRetry={() => void refresh()} /></RoomsShell>;
    if (!property || property.landlordId !== user.id) return <RoomsShell user={user}><RoomPageState /></RoomsShell>;
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return <RoomsShell user={user}><RoomPageState title="Room not available" message="This room may have been removed. Return to the room list to continue." backTo={`/landlord/properties/${id}/rooms`} backLabel="Back to Manage Rooms" /></RoomsShell>;
    return <RoomsShell user={user}><RoomEditor key={roomId} property={property} room={room} rooms={rooms} refreshError={refreshError} /></RoomsShell>;
}

// ---------------------------------------------------------------------------
// 3. Room editor — photos, details, amenities, utilities, and status
// ---------------------------------------------------------------------------

function RoomEditor({ property, room, rooms, refreshError }) {
    const { user } = useAuth();
    const { refreshApartments } = useApartmentsContext();
    const navigate = useNavigate();
    const { state } = useLocation();
    const returnState = { roomPage: state?.roomPage || 1 };
    const listPath = `/landlord/properties/${property.id}/rooms`;
    const [form, setForm] = useState(() => roomToForm(room, property));
    const [images, setImages] = useState(() => roomImages(room));
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [externalChange, setExternalChange] = useState(false);
    const formRef = useRef(null);
    const saving = useRef(false);
    const base = roomSnapshot(roomToForm(room, property), roomImages(room));
    const baseline = useRef(base);
    const previousServer = useRef(base);
    const snapshot = roomSnapshot(form, images);
    const dirty = snapshot !== baseline.current;
    const { blocker, allowNavigation } = useRoomLeaveGuard(dirty, isSaving);

    // Background/realtime refreshes may update a clean editor, never an active draft.
    useEffect(() => {
        if (base === previousServer.current) return;
        previousServer.current = base;
        if (snapshot === baseline.current) {
            baseline.current = base;
            setForm(roomToForm(room, property));
            setImages(roomImages(room));
        } else {
            setExternalChange(true);
        }
    }, [base, snapshot, room, property]);

    const change = (key) => (event) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
        setSaveError("");
    };
    const setAmenities = (amenities) => setForm((current) => ({
        ...current, amenities, hasAC: amenities.includes("Air Conditioning"), hasPrivateBath: amenities.includes("Private Bathroom"),
    }));
    const submit = async (event) => {
        event.preventDefault();
        if (saving.current) return;
        const nextErrors = validateRoomForm(form, rooms, room);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            requestAnimationFrame(() => {
                const field = formRef.current?.querySelector('[aria-invalid="true"]');
                field?.closest("details")?.setAttribute("open", "");
                field?.focus();
            });
            return;
        }
        saving.current = true;
        setIsSaving(true);
        setSaveError("");
        try {
            const urls = await persistRoomPhotos(property.id, room.id, images, uploadApartmentRoomImage, setUploadProgress);
            const saved = await updateApartmentRoom(property.id, room.id, buildRoomPayload(form, urls), user.id);
            allowNavigation();
            blocker.reset?.();
            if (saved.syncWarning) toast.warning(saved.syncWarning);
            else toast.success("Room changes saved successfully.");
            // A listing refresh failure must not make a persisted room look unsaved.
            void Promise.resolve().then(refreshApartments).catch(() => undefined);
            navigate(listPath, { replace: true, state: { ...returnState, savedRoomId: room.id } });
        } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : "Unable to save this room. Please try again.");
        } finally {
            saving.current = false;
            setIsSaving(false);
            setUploadProgress(null);
        }
    };
    const types = [...new Set([...ROOM_TYPES, form.type])];
    const descriptionLimit = Math.max(ROOM_DESCRIPTION_LIMIT, room.description?.length || 0);

    return <div className="room-management">
        <div className="rm-page rm-page--edit">
            <Link className="rm-back-link" to={listPath} state={returnState}><ArrowLeft aria-hidden="true" />Back to Manage Rooms</Link>
            <header className="rm-page-heading"><h1>Edit Room</h1><p>Update the details for {room.name} in {property.title}.</p></header>
            {(refreshError || externalChange) && <p className="rm-notice" role="status">{externalChange ? "This room was updated elsewhere. Your unsaved changes have been kept; review them before saving." : "Live updates are temporarily unavailable. Your changes are still here."}</p>}
            <form ref={formRef} className="rm-edit-form" onSubmit={submit} noValidate aria-busy={isSaving}>
                <div className="rm-edit-main">
                    <RoomSection title="Room Photos" description="Add or update photos of this room. You can upload multiple images." className="rm-photos">
                        <MultiImageUploader images={images} onImagesChange={setImages} maxImages={MAX_ROOM_PHOTOS} maxFileSize={MAX_ROOM_PHOTO_MB} disabled={isSaving} uploadProgress={uploadProgress} compact />
                    </RoomSection>
                    <RoomSection title="Room Information">
                        <fieldset className="rm-form-grid rm-information-grid" disabled={isSaving}>
                            <RoomField name="name" label="Room Number / Name" required pencil error={errors.name}>
                                {(props) => <input {...props} value={form.name} onChange={change("name")} maxLength={Math.max(120, room.name?.length || 0)} autoComplete="off" />}
                            </RoomField>
                            <RoomField name="maxOccupants" label="Capacity" required pencil error={errors.maxOccupants}>
                                {(props) => <input {...props} type="number" min="1" step="1" inputMode="numeric" value={form.maxOccupants} onChange={change("maxOccupants")} />}
                            </RoomField>
                            <RoomField name="price" label="Monthly Rent (₱)" required pencil error={errors.price}>
                                {(props) => <input {...props} type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={change("price")} />}
                            </RoomField>
                            <RoomField name="description" label="Description" pencil error={errors.description}>
                                {(props) => <textarea {...props} rows={2} maxLength={descriptionLimit} value={form.description} onChange={change("description")} placeholder="Describe the room, natural lighting, and who it is ideal for…" />}
                            </RoomField>
                        </fieldset>
                        <p className="rm-character-count">{form.description.length}/{descriptionLimit}</p>
                        <details className="rm-additional-details">
                            <summary>Additional room details <span>(optional)</span></summary>
                            <fieldset disabled={isSaving} className="rm-form-grid">
                                <RoomField name="type" label="Room Type" select required error={errors.type}>
                                    {(props) => <select {...props} value={form.type} onChange={change("type")}>{types.map((type) => <option key={type}>{type}</option>)}</select>}
                                </RoomField>
                                <RoomField name="sqft" label="Floor Area (sq ft)" error={errors.sqft}>
                                    {(props) => <input {...props} type="number" min="0" step="any" inputMode="decimal" value={form.sqft} onChange={change("sqft")} placeholder="0" />}
                                </RoomField>
                                {form.hasPrivateBath ? <RoomField name="bathroomType" label="Private Bathroom Type" select>
                                    {(props) => <select {...props} value={form.bathroomType} onChange={change("bathroomType")}><option value="en-suite">En-suite</option><option value="separate">Separate</option>{!["en-suite", "separate"].includes(form.bathroomType) && <option>{form.bathroomType}</option>}</select>}
                                </RoomField> : <RoomField name="sharedBathLocation" label="Shared Bathroom Location">
                                    {(props) => <input {...props} value={form.sharedBathLocation} onChange={change("sharedBathLocation")} placeholder="e.g. End of the hallway" />}
                                </RoomField>}
                            </fieldset>
                        </details>
                    </RoomSection>
                    <RoomOptionPicker title="Amenities" description="Select the amenities available in this room." options={ROOM_AMENITIES} selected={form.amenities} onChange={setAmenities} disabled={isSaving} kind="amenity" />
                    <RoomOptionPicker title="Utilities Included" description="Select which utilities are included in the monthly rent." options={ROOM_UTILITIES} selected={form.utilities} onChange={(utilities) => setForm((current) => ({ ...current, utilities }))} disabled={isSaving} kind="utility" />
                </div>
                <div className="rm-edit-aside">
                    <RoomSection title="Room Status" description="Set the current status of this room.">
                        <fieldset className="rm-status-options" disabled={isSaving}>
                            <legend className="ui-sr-only">Room Status</legend>
                            {ROOM_STATUSES.map((status) => <label key={status.value} className={`rm-status-option${form.status === status.value ? " is-selected" : ""}`}>
                                <input type="radio" name="status" value={status.value} checked={form.status === status.value} onChange={change("status")} />
                                <span><strong>{status.label}</strong><small>{status.description}</small></span>
                            </label>)}
                        </fieldset>
                        <p className="ui-sr-only">Status changes take effect when you save.</p>
                    </RoomSection>
                    <RoomPreview form={form} images={images} />
                </div>
                <div className="rm-edit-footer">
                    {saveError && <p className="rm-error-banner" role="alert">{saveError}</p>}
                    <div className="rm-save-actions">
                        <Button type="button" variant="outline" className="rm-button" disabled={isSaving} onClick={() => navigate(listPath, { state: returnState })}>Cancel</Button>
                        <Button type="submit" className="rm-button rm-button--primary" disabled={isSaving || !dirty}>
                            {isSaving && <LoaderCircle className="rm-spinner" aria-hidden="true" />}{isSaving ? uploadProgress !== null && uploadProgress < 100 ? "Uploading photos…" : "Saving…" : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
        <UnsavedRoomChanges blocker={blocker} saving={isSaving} />
    </div>;
}

// ---------------------------------------------------------------------------
// 4. Add Room dialog
// ---------------------------------------------------------------------------

function AddRoomDialog({ property, rooms, onClose, onSave, onRestoreFocus }) {
    const [form, setForm] = useState(emptyRoomForm);
    const [errors, setErrors] = useState({});
    const [saveError, setSaveError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [customCapacity, setCustomCapacity] = useState(false);
    const saving = useRef(false);
    const formRef = useRef(null);
    const change = (key) => (event) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
        setSaveError("");
    };
    const submit = async (event) => {
        event.preventDefault();
        if (saving.current) return;
        const nextErrors = validateRoomForm(form, rooms);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) {
            requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
            return;
        }
        saving.current = true;
        setIsSaving(true);
        setSaveError("");
        try {
            // The quick-add flow intentionally saves only the core room fields.
            // Detailed amenities/utilities are added on the Edit Room page.
            const { amenities, utilities, ...payload } = buildRoomPayload(form);
            await onSave(payload);
            onClose();
        } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : "Unable to add room. Please try again.");
        } finally {
            saving.current = false;
            setIsSaving(false);
        }
    };
    return <Dialog open onOpenChange={(open) => { if (!open && !saving.current) onClose(); }}>
        <DialogContent className="rm-dialog" onInteractOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => { if (saving.current) event.preventDefault(); }}
            onCloseAutoFocus={(event) => { if (onRestoreFocus) { event.preventDefault(); onRestoreFocus(); } }}>
            <div className="rm-dialog-heading">
                <DialogTitle>Add New Room for {property.title || "this property"}</DialogTitle>
                <DialogDescription className="ui-sr-only">Enter the room details. Photos, amenities, and utilities can be added after saving.</DialogDescription>
            </div>
            <form ref={formRef} onSubmit={submit} noValidate aria-busy={isSaving}>
                <fieldset disabled={isSaving} className="rm-form-grid">
                    <RoomField name="name" label="Room Number" required error={errors.name}>
                        {(props) => <input {...props} value={form.name} onChange={change("name")} maxLength={120} placeholder="Room 103" autoComplete="off" />}
                    </RoomField>
                    <RoomField name="type" label="Room Type" required select error={errors.type}>
                        {(props) => <select {...props} value={form.type} onChange={change("type")}>{ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select>}
                    </RoomField>
                    <RoomField name="price" label="Monthly Rent (₱)" required error={errors.price}>
                        {(props) => <input {...props} type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={change("price")} placeholder="5,000" />}
                    </RoomField>
                    <RoomField name="maxOccupants" label="Capacity" required select={!customCapacity} error={errors.maxOccupants}>
                        {(props) => customCapacity
                            ? <input {...props} type="number" min="1" step="1" inputMode="numeric" value={form.maxOccupants} onChange={change("maxOccupants")} placeholder="Number of people" />
                            : <select {...props} value={form.maxOccupants} onChange={(event) => {
                                if (event.target.value === "custom") { setCustomCapacity(true); setForm((current) => ({ ...current, maxOccupants: "" })); }
                                else change("maxOccupants")(event);
                            }}>{Array.from({ length: 10 }, (_, index) => <option value={index + 1} key={index}>{index + 1} pax</option>)}<option value="custom">Custom capacity…</option></select>}
                    </RoomField>
                    <RoomField name="status" label="Status" select className="rm-field--wide" error={errors.status}>
                        {(props) => <select {...props} value={form.status} onChange={change("status")}>{ROOM_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>}
                    </RoomField>
                </fieldset>
                {saveError && <p className="rm-error-banner" role="alert">{saveError}</p>}
                <div className="rm-dialog-actions">
                    <Button type="button" variant="outline" className="rm-button" disabled={isSaving} onClick={onClose}>Cancel</Button>
                    <Button type="submit" className="rm-button rm-button--primary" disabled={isSaving}>{isSaving && <LoaderCircle className="rm-spinner" aria-hidden="true" />}{isSaving ? "Saving…" : "Save Room"}</Button>
                </div>
            </form>
        </DialogContent>
    </Dialog>;
}

// ---------------------------------------------------------------------------
// 5. Shared form fields and option pickers
// ---------------------------------------------------------------------------

function RoomField({ name, label, error, required = false, pencil = false, select = false, className = "", children }) {
    const id = useId();
    return <div className={`rm-field ${className}`}>
        <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
        <div className={`rm-control${pencil ? " rm-control--editable" : ""}${select ? " rm-control--select" : ""}`}>
            {children({ id, name, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined, required })}
            {pencil && <Pencil aria-hidden="true" />}
            {select && <ChevronDown aria-hidden="true" />}
        </div>
        {error && <p id={`${id}-error`} className="rm-field-error">{error}</p>}
    </div>;
}

function RoomSection({ title, description, className = "", children }) {
    const id = useId();
    return <section className={`rm-section ${className}`} aria-labelledby={id}>
        <header className="rm-section-heading">
            <h2 id={id}>{title}</h2>
            {description && <p>{description}</p>}
        </header>
        {children}
    </section>;
}

function RoomOptionPicker({ title, description, options, selected, onChange, disabled, kind }) {
    const id = useId();
    const [custom, setCustom] = useState("");
    const [error, setError] = useState("");
    // Remember custom options after deselecting them, so they can be selected again.
    const [customOptions, setCustomOptions] = useState([]);
    const allOptions = normalizeRoomList([...options, ...customOptions, ...selected], { amenities: kind === "amenity" });
    const toggle = (value) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
    const addCustom = () => {
        const [value] = normalizeRoomList([custom], { amenities: kind === "amenity" });
        if (!value) { setError(`Enter an ${kind === "amenity" ? "amenity" : "included utility"} first.`); return; }
        const existing = allOptions.find((option) => option.toLowerCase() === value.toLowerCase());
        if (existing) {
            if (!selected.includes(existing)) onChange([...selected, existing]);
        } else {
            setCustomOptions((current) => [...current, value]);
            onChange([...selected, value]);
        }
        setCustom("");
        setError("");
    };
    return <RoomSection title={title} description={description} className={`rm-options rm-options--${kind}`}>
        <div className="rm-option-grid" role="group" aria-label={title}>
            {allOptions.map((option) => <button type="button" key={option} aria-pressed={selected.includes(option)}
                className="rm-option" disabled={disabled} onClick={() => toggle(option)}>{option}</button>)}
        </div>
        <label className="rm-custom-label" htmlFor={id}>Other {kind} <span>(optional)</span></label>
        <div className="rm-custom-row">
            <input id={id} value={custom} disabled={disabled} maxLength={60} aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                placeholder={`Type ${kind === "amenity" ? "an amenity" : "a utility"} and press Enter`}
                onChange={(event) => { setCustom(event.target.value); setError(""); }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } }} />
            <Button type="button" className="rm-button rm-button--primary" disabled={disabled || !custom.trim()} onClick={addCustom}
                aria-label={`Add ${kind}`}>Add</Button>
        </div>
        {error && <p id={`${id}-error`} className="rm-field-error">{error}</p>}
    </RoomSection>;
}

// ---------------------------------------------------------------------------
// 6. Live room preview
// ---------------------------------------------------------------------------

function RoomPreview({ form, images }) {
    const cover = images.find((image) => image.isPrimary) ?? images[0];
    return <RoomSection title="Room Preview" description="This is how your room details will appear to tenants." className="rm-preview-section">
        <article className="rm-preview" aria-label="Room preview">
            <div className="rm-preview-content">
                {cover ? <ImageWithFallback src={cover.url} alt={`${form.name || "Room"} cover photo`} className="rm-preview-photo" />
                    : <div className="rm-preview-photo rm-preview-placeholder" role="img" aria-label="No room photo yet" />}
                <div className="rm-preview-details">
                    <h3>{form.name.trim() || "Room name"}</h3>
                    <p className="rm-preview-meta">{form.type}<span aria-hidden="true">·</span>{formatRoomCapacity(form.maxOccupants)}</p>
                    <p className="rm-preview-price">₱ {formatRoomRent(form.price)}<span>/month</span></p>
                    {form.amenities.length > 0 && <div className="rm-preview-amenities">{form.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div>}
                </div>
            </div>
            <p className="rm-preview-description">{form.description.trim() || "Add a description to help tenants learn more about this room."}</p>
            {form.utilities.length > 0 && <p className="rm-preview-utilities"><strong>Utilities included:</strong> {form.utilities.join(", ")}</p>}
            {form.status !== "available" && <p className="rm-preview-notice">This room is not shown as available while {form.status === "occupied" ? "occupied" : "under maintenance"}.</p>}
        </article>
    </RoomSection>;
}

// ---------------------------------------------------------------------------
// 7. Loading, error, and unavailable-room states
// ---------------------------------------------------------------------------

function RoomPageState({ loading = false, title = "Property not available", message, onRetry, backTo = "/dashboard?section=overview", backLabel = "Back to My Properties" }) {
    return <div className="room-management rm-state">
        <div className="rm-state-content" role={loading ? "status" : undefined}>
            {loading ? <LoaderCircle className="rm-spinner" aria-hidden="true" /> : <DoorOpen aria-hidden="true" />}
            <h1>{loading ? "Loading room management…" : title}</h1>
            {!loading && <>
                <p>{message || "This property could not be found or is not assigned to your account."}</p>
                <div className="rm-state-actions">
                    <Button asChild variant="outline" className="rm-button"><Link to={backTo}><ArrowLeft aria-hidden="true" />{backLabel}</Link></Button>
                    {onRetry && <Button className="rm-button rm-button--primary" onClick={onRetry}>Try again</Button>}
                </div>
            </>}
        </div>
    </div>;
}

// ---------------------------------------------------------------------------
// 8. Shared property loading and realtime synchronization
// ---------------------------------------------------------------------------

function useManagedProperty(id) {
    const [property, setProperty] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshError, setRefreshError] = useState("");
    const mounted = useRef(false);
    const request = useRef(0);
    const refresh = useCallback(async (background = false) => {
        const version = ++request.current;
        if (!background) {
            setIsLoading(true);
            setError("");
        }
        try {
            const loaded = id ? await fetchApartmentWithImages(id) : null;
            if (!mounted.current || request.current !== version) return;
            setProperty(loaded);
            setError("");
            setRefreshError("");
        } catch (cause) {
            if (!mounted.current || request.current !== version) return;
            const message = cause instanceof Error ? cause.message : "Unable to load this property's rooms.";
            if (background) setRefreshError(message);
            else setError(message);
        } finally {
            if (mounted.current && request.current === version) setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        mounted.current = true;
        setProperty(null);
        void refresh();
        let timer;
        const scheduleRefresh = () => {
            clearTimeout(timer);
            timer = setTimeout(() => void refresh(true), 150);
        };
        const onVisibility = () => {
            if (document.visibilityState === "visible") scheduleRefresh();
        };
        const channel = supabase.channel(`managed-property-${id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms", filter: `apartment_id=eq.${id}` }, scheduleRefresh)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartments", filter: `id=eq.${id}` }, scheduleRefresh)
            .subscribe();
        window.addEventListener("focus", scheduleRefresh);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            mounted.current = false;
            request.current += 1;
            clearTimeout(timer);
            window.removeEventListener("focus", scheduleRefresh);
            document.removeEventListener("visibilitychange", onVisibility);
            void supabase.removeChannel(channel);
        };
    }, [id, refresh]);

    const upsertRoom = useCallback((saved) => {
        // A request started before this mutation must not restore stale room data.
        request.current += 1;
        setProperty((current) => current && ({ ...current, rooms: [
            ...(current.rooms ?? []).filter((room) => room.id !== saved.id), saved,
        ] }));
    }, []);
    const removeRoom = useCallback((roomId) => {
        request.current += 1;
        setProperty((current) => current && ({ ...current, rooms: (current.rooms ?? []).filter((room) => room.id !== roomId) }));
    }, []);
    const rooms = useMemo(() => sortRooms(property?.rooms ?? []), [property?.rooms]);
    return { property, rooms, isLoading, error, refreshError, refresh, upsertRoom, removeRoom };
}

// ---------------------------------------------------------------------------
// 9. Unsaved-change navigation guard and confirmation
// ---------------------------------------------------------------------------

function useRoomLeaveGuard(dirty, saving) {
    const allowLeave = useRef(false);
    const blocker = useBlocker(({ currentLocation, nextLocation }) => !allowLeave.current && (dirty || saving)
        && `${currentLocation.pathname}${currentLocation.search}` !== `${nextLocation.pathname}${nextLocation.search}`);
    useEffect(() => {
        if (!dirty && !saving) return;
        const onBeforeUnload = (event) => {
            if (allowLeave.current) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [dirty, saving]);
    return { blocker, allowNavigation: () => { allowLeave.current = true; } };
}

function UnsavedRoomChanges({ blocker, saving }) {
    return <AlertDialog open={blocker.state === "blocked"} onOpenChange={(open) => { if (!open) blocker.reset?.(); }}>
        <AlertDialogContent className="rm-dialog rm-confirm-dialog">
            <AlertDialogHeader>
                <AlertDialogTitle>{saving ? "Your room is still saving" : "Discard unsaved changes?"}</AlertDialogTitle>
                <AlertDialogDescription>{saving ? "Please wait for your room and photos to finish saving before leaving." : "Your changes to this room have not been saved. Leave without saving?"}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="rm-button" onClick={() => blocker.reset?.()}>Keep editing</AlertDialogCancel>
                {!saving && <AlertDialogAction className="rm-button rm-button--danger" onClick={() => blocker.proceed?.()}>Discard changes</AlertDialogAction>}
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>;
}

// ---------------------------------------------------------------------------
// 10. Room constants, form validation, formatting, and photo helpers
// ---------------------------------------------------------------------------

const ROOM_TYPES = ["Single Room", "Double Room", "Studio Unit", "Shared Room", "Bedroom", "Studio", "Suite", "Loft", "Other"];
const ROOM_STATUSES = [
    { value: "available", label: "Available", description: "Room is available for rent." },
    { value: "occupied", label: "Occupied", description: "Room is currently rented out." },
    { value: "maintenance", label: "Under Maintenance", description: "Room is temporarily unavailable." },
];
const ROOM_AMENITIES = ["Wi-Fi", "Air Conditioning", "Bed", "Study Table", "Balcony", "Private Bathroom", "Hot & Cold Shower", "Window"];
const ROOM_UTILITIES = ["Water", "Electricity", "Internet"];
const ROOMS_PER_PAGE = 4;
const MAX_ROOM_PHOTOS = 10;
const MAX_ROOM_PHOTO_MB = 5;
const ROOM_DESCRIPTION_LIMIT = 500;

const roomStatus = (room) => {
    const value = room?.status ?? (room?.isOccupied ? "occupied" : "available");
    return value === "reserved" ? "occupied" : ROOM_STATUSES.some((item) => item.value === value) ? value : "available";
};
const formatRoomRent = (value) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(Number(value) || 0);
const formatRoomCapacity = (value) => `${Number(value) || 1} pax`;
export const sortRooms = (rooms) => [...rooms].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "en", { numeric: true, sensitivity: "base" }) || (a.id || "").localeCompare(b.id || ""));

export function emptyRoomForm() {
    return {
        name: "", type: "Single Room", price: "", maxOccupants: "1", status: "available",
        description: "", sqft: "", hasPrivateBath: false, bathroomType: "en-suite",
        sharedBathLocation: "", hasAC: false, amenities: [], utilities: [],
    };
}

export function roomToForm(room, property) {
    return {
        ...emptyRoomForm(),
        name: room.name ?? "",
        type: room.type || "Single Room",
        price: String(room.price ?? ""),
        maxOccupants: String(room.maxOccupants ?? 1),
        status: roomStatus(room),
        description: room.description ?? "",
        sqft: String(room.sqft ?? ""),
        hasPrivateBath: room.hasPrivateBath === true,
        bathroomType: room.bathroomType || "en-suite",
        sharedBathLocation: room.sharedBathLocation ?? "",
        hasAC: room.hasAC === true,
        amenities: getRoomAmenities(room),
        utilities: normalizeRoomList(room.utilities ?? property?.utilities),
    };
}

export function validateRoomForm(form, rooms = [], existingRoom = null) {
    const errors = {};
    const name = form.name.trim();
    if (!name) errors.name = "Enter a room number or name.";
    else if (rooms.some((room) => room.id !== existingRoom?.id && room.name?.trim().toLowerCase() === name.toLowerCase())) {
        errors.name = "A room with this number or name already exists.";
    }
    if (!form.type.trim()) errors.type = "Choose a room type.";
    if (String(form.price).trim() === "" || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
        errors.price = "Enter a valid monthly rent of ₱0 or more.";
    }
    if (!Number.isSafeInteger(Number(form.maxOccupants)) || Number(form.maxOccupants) < 1) {
        errors.maxOccupants = "Capacity must be a whole number of at least 1.";
    }
    if (form.sqft !== "" && (!Number.isFinite(Number(form.sqft)) || Number(form.sqft) < 0)) {
        errors.sqft = "Enter a valid floor area of 0 or more.";
    }
    // Do not force a landlord to truncate an older, longer description to edit rent.
    if (form.description.length > Math.max(ROOM_DESCRIPTION_LIMIT, existingRoom?.description?.length || 0)) {
        errors.description = `Keep the description within ${ROOM_DESCRIPTION_LIMIT} characters.`;
    }
    if (!ROOM_STATUSES.some((option) => option.value === form.status)) errors.status = "Choose a valid room status.";
    return errors;
}

export function buildRoomPayload(form, images = []) {
    return {
        name: form.name.trim(), type: form.type.trim(), price: Number(form.price),
        maxOccupants: Number(form.maxOccupants), sqft: Number(form.sqft) || 0,
        status: form.status, isOccupied: form.status === "occupied",
        description: form.description.trim(), hasPrivateBath: form.hasPrivateBath,
        bathroomType: form.hasPrivateBath ? form.bathroomType || "en-suite" : "",
        sharedBathLocation: form.hasPrivateBath ? "" : form.sharedBathLocation.trim(),
        hasAC: form.hasAC, amenities: getRoomAmenities(form),
        utilities: normalizeRoomList(form.utilities), images,
    };
}

const roomImages = (room) => (room.images ?? []).filter(Boolean)
    .map((url, index) => ({ id: `existing-${index}`, url, isPrimary: index === 0, sortOrder: index }));

const roomSnapshot = (form, images) => JSON.stringify([
    form,
    images.map((image) => [image.file ? `file:${image.id}` : image.url, image.isPrimary, image.sortOrder]),
]);

// Cache successful uploads on each draft image so retrying a failed save doesn't
// upload the same file again. Blob previews are never sent to the database.
export async function persistRoomPhotos(propertyId, roomId, images, upload, onProgress) {
    const ordered = [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
    const pending = ordered.filter((image) => image.file && !image.uploadedUrl).length;
    let completed = 0;
    onProgress(pending ? 0 : null);
    const urls = [];
    for (const image of ordered) {
        if (image.file && !image.uploadedUrl) {
            image.uploadedUrl = await upload(propertyId, roomId, image.file, image.file.name || "room-photo.jpg");
            completed += 1;
            onProgress(completed / pending * 100);
        }
        const url = image.uploadedUrl || image.url;
        if (!/^https?:\/\//i.test(url)) throw new Error("A photo could not be saved. Please select it again.");
        urls.push(url);
    }
    return urls;
}
