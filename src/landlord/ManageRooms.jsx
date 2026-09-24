import "./ManageRooms.css";
import { ArrowLeft, BedDouble, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, ImagePlus, MapPin, Menu, MoreVertical, Pencil, Plus, Star, Upload, Users, Wrench, X, } from "lucide-react";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { safeRandomId } from "@/utils/safeRandomId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabaseClient";
import { createApartmentRoom, deleteApartmentRoom, fetchApartmentRooms, fetchApartmentWithImages, updateApartmentRoom, updateApartmentRoomStatus, uploadApartmentRoomImage, } from "@/data/apartments";

const ROOM_TYPES = ["Bedroom", "Studio", "Shared room", "Suite", "Loft", "Other"];
const ROOM_STATUS_OPTIONS = [
    { value: "available", label: "Available", className: "manage-rooms-badge" },
    { value: "occupied", label: "Occupied", className: "manage-rooms-badge-2" },
    { value: "maintenance", label: "Under Maintenance", className: "manage-rooms-badge-3" },
];
const MAX_ROOM_IMAGES = 10;
const MAX_ROOM_IMAGE_MB = 8;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const emptyRoomForm = () => ({
    name: "",
    type: "Bedroom",
    price: "",
    maxOccupants: "",
    sqft: "",
    description: "",
    hasPrivateBath: false,
    bathroomType: "",
    sharedBathLocation: "",
    hasAC: false,
    status: "available",
});
const roomToForm = (room) => ({
    id: room.id,
    name: room.name ?? "",
    type: room.type || "Bedroom",
    price: room.price ? String(room.price) : "",
    maxOccupants: room.maxOccupants ? String(room.maxOccupants) : "",
    sqft: String(room.sqft ?? ""),
    description: room.description ?? "",
    hasPrivateBath: room.hasPrivateBath === true,
    bathroomType: room.bathroomType || "en-suite",
    sharedBathLocation: room.sharedBathLocation ?? "",
    hasAC: room.hasAC === true,
    status: room.status ?? (room.isOccupied ? "occupied" : "available"),
});
const statusForRoom = (room) => room.status ?? (room.isOccupied ? "occupied" : "available");
const getStatusOption = (status) => ROOM_STATUS_OPTIONS.find((option) => option.value === status) ?? ROOM_STATUS_OPTIONS[0];

// Cover photo is always the first image; keep isPrimary / sortOrder in sync with the order.
const normalizeImages = (list) => list.map((image, index) => ({ ...image, isPrimary: index === 0, sortOrder: index }));
const imagesFromRoom = (room) => normalizeImages((room?.images ?? []).filter(Boolean).map((url, index) => ({ id: `existing-${index}`, url })));
const revokeIfBlob = (url) => { if (typeof url === "string" && url.startsWith("blob:"))
    URL.revokeObjectURL(url); };

// Used to tell whether a card has unsaved edits (status is excluded: it is saved by its own buttons).
const DIRTY_FIELDS = ["name", "type", "price", "maxOccupants", "sqft", "description", "hasPrivateBath", "bathroomType", "sharedBathLocation", "hasAC"];
const snapshotOf = (form, images) => JSON.stringify([
    DIRTY_FIELDS.map((key) => form[key] ?? ""),
    images.map((image) => (image.file ? `file:${image.id}` : image.url)),
]);

const compressRoomImage = async (source) => {
    if (source.size <= 1.5 * 1024 * 1024 || typeof createImageBitmap !== "function")
        return source;
    try {
        const bitmap = await createImageBitmap(source);
        const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? source), "image/webp", 0.82));
    }
    catch {
        return source;
    }
};

// Uploads new files (keeps already-uploaded URLs) and returns the final ordered URL list.
const uploadPendingRoomImages = async (propertyId, roomId, images, onProgress) => {
    const ordered = [...images].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary)
            return a.isPrimary ? -1 : 1;
        return a.sortOrder - b.sortOrder;
    });
    const roomUploadId = roomId || safeRandomId();
    const urls = [];
    const pendingCount = ordered.filter((image) => image.file || image.url.startsWith("data:")).length;
    let completedUploads = 0;
    onProgress(pendingCount > 0 ? 0 : null);
    for (let index = 0; index < ordered.length; index += 1) {
        const image = ordered[index];
        if (!image.file && !image.url.startsWith("data:")) {
            urls.push(image.url);
        }
        else {
            const source = image.file ?? await (await fetch(image.url)).blob();
            const compressed = await compressRoomImage(source);
            const originalName = image.file instanceof File ? image.file.name : `room-image-${index}.webp`;
            const uploadName = compressed !== source && compressed.type === "image/webp"
                ? `${originalName.replace(/\.[^.]+$/, "")}.webp`
                : originalName;
            urls.push(await uploadApartmentRoomImage(propertyId, roomUploadId, compressed, uploadName));
            completedUploads += 1;
            onProgress((completedUploads / pendingCount) * 100);
        }
    }
    return urls;
};

const buildRoomPayload = (form, imageUrls, status) => ({
    id: form.id,
    name: form.name.trim(),
    type: form.type,
    price: Number(form.price) || 0,
    maxOccupants: Number(form.maxOccupants) || 1,
    sqft: Number(form.sqft) || 0,
    description: form.description.trim(),
    hasPrivateBath: form.hasPrivateBath,
    bathroomType: form.hasPrivateBath ? form.bathroomType || "en-suite" : "",
    sharedBathLocation: form.hasPrivateBath ? "" : form.sharedBathLocation.trim(),
    hasAC: form.hasAC,
    status,
    isOccupied: status === "occupied",
    images: imageUrls,
});

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                       */
/* -------------------------------------------------------------------------- */

// A boxed field (label + control + pencil). Wrapping in <label> means clicking
// anywhere on the box, including the pencil, focuses the input.
function Field({ label, prefix, suffix, chevron = false, className = "", children }) {
    return (<label className={`mr-field ${className}`}>
      <span className="mr-field-label">{label}</span>
      <span className="mr-field-control">
        {prefix ? <span className="mr-affix">{prefix}</span> : null}
        {children}
        {suffix ? <span className="mr-affix">{suffix}</span> : null}
        {chevron ? <ChevronDown className="mr-chevron" aria-hidden="true"/> : null}
        <Pencil className="mr-pencil" aria-hidden="true"/>
      </span>
    </label>);
}

/* -------------------------------------------------------------------------- */
/* One room = one inline-editable card                                         */
/* -------------------------------------------------------------------------- */

// room === null means "new room" (unsaved draft card).
function RoomEditorCard({ room, busy, onSave, onDelete, onChangeStatus, onCancelNew }) {
    const isNew = room === null;
    const [draft, setDraft] = useState(() => (room ? roomToForm(room) : emptyRoomForm()));
    const [images, setImages] = useState(() => imagesFromRoom(room));
    const [activeIndex, setActiveIndex] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const fileInputRef = useRef(null);
    const nameInputRef = useRef(null);
    const menuRef = useRef(null);
    const mountedRef = useRef(true);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    const status = isNew ? draft.status : statusForRoom(room);
    const statusOption = getStatusOption(status);
    const controlsLocked = busy || isSaving;

    // ---- keep the card in sync with the server without wiping unsaved edits ----
    const baseSnapshot = snapshotOf(room ? roomToForm(room) : emptyRoomForm(), imagesFromRoom(room));
    const currentSnapshot = snapshotOf(draft, images);
    const isDirty = currentSnapshot !== baseSnapshot;
    const previousBaseRef = useRef(baseSnapshot);
    const currentSnapshotRef = useRef(currentSnapshot);
    currentSnapshotRef.current = currentSnapshot;
    useEffect(() => {
        if (previousBaseRef.current === baseSnapshot)
            return;
        const wasClean = currentSnapshotRef.current === previousBaseRef.current;
        previousBaseRef.current = baseSnapshot;
        if (wasClean && room) {
            setDraft(roomToForm(room));
            setImages(imagesFromRoom(room));
        }
    }, [baseSnapshot, room]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            imagesRef.current.forEach((image) => revokeIfBlob(image.url));
        };
    }, []);

    useEffect(() => {
        if (!menuOpen)
            return;
        const closeOnOutsideClick = (event) => {
            if (!menuRef.current?.contains(event.target))
                setMenuOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [menuOpen]);

    const setField = (key) => (event) => {
        const { value } = event.target;
        setDraft((current) => ({ ...current, [key]: value }));
    };
    const bathroomValue = !draft.hasPrivateBath ? "shared" : draft.bathroomType === "separate" ? "separate" : "en-suite";
    const setBathroom = (event) => {
        const { value } = event.target;
        setDraft((current) => value === "shared"
            ? { ...current, hasPrivateBath: false }
            : { ...current, hasPrivateBath: true, bathroomType: value });
    };
    const setAirCon = (event) => {
        const hasAC = event.target.value === "yes";
        setDraft((current) => ({ ...current, hasAC }));
    };

    // ---- gallery ----
    const safeActiveIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
    const activeImage = images[safeActiveIndex];
    const openPicker = () => fileInputRef.current?.click();
    const showPrevious = () => setActiveIndex((safeActiveIndex - 1 + images.length) % images.length);
    const showNext = () => setActiveIndex((safeActiveIndex + 1) % images.length);
    const handleFiles = (event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (files.length === 0)
            return;
        const accepted = [];
        for (const file of files) {
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                toast.error(`${file.name} is not a JPG, PNG, or WebP image.`);
            }
            else if (file.size > MAX_ROOM_IMAGE_MB * 1024 * 1024) {
                toast.error(`${file.name} is larger than ${MAX_ROOM_IMAGE_MB}MB.`);
            }
            else {
                accepted.push(file);
            }
        }
        const slotsLeft = Math.max(MAX_ROOM_IMAGES - images.length, 0);
        if (accepted.length > slotsLeft)
            toast.error(`You can upload up to ${MAX_ROOM_IMAGES} photos per room.`);
        const toAdd = accepted.slice(0, slotsLeft);
        if (toAdd.length === 0)
            return;
        setImages((current) => normalizeImages([
            ...current,
            ...toAdd.map((file) => ({ id: safeRandomId(), url: URL.createObjectURL(file), file })),
        ]));
        setActiveIndex(images.length);
    };
    const removeImage = (index) => {
        revokeIfBlob(images[index]?.url);
        setImages((current) => normalizeImages(current.filter((_, position) => position !== index)));
        setActiveIndex((current) => Math.max(0, Math.min(current, images.length - 2)));
    };
    const makeCover = (index) => {
        setImages((current) => normalizeImages([current[index], ...current.filter((_, position) => position !== index)]));
        setActiveIndex(0);
    };

    // ---- actions ----
    const applyStatus = (next) => {
        setMenuOpen(false);
        if (isNew)
            setDraft((current) => ({ ...current, status: next }));
        else
            onChangeStatus(room, next);
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const saved = await onSave(room, draft, images, setUploadProgress);
            if (saved && room && mountedRef.current) {
                const previous = images;
                setDraft(roomToForm(saved));
                setImages(imagesFromRoom(saved));
                setActiveIndex(0);
                previous.forEach((image) => revokeIfBlob(image.url));
            }
        }
        finally {
            if (mountedRef.current) {
                setIsSaving(false);
                setUploadProgress(null);
            }
        }
    };

    const bathroomSelect = (<select value={bathroomValue} onChange={setBathroom} disabled={isSaving} className="mr-input mr-select">
      <option value="shared">Shared</option>
      <option value="en-suite">Private (en-suite)</option>
      <option value="separate">Private (separate)</option>
    </select>);

    return (<article className={`mr-card${isNew ? " mr-card--new" : ""}`}>
      <div className="mr-card-body">
        {/* ------------------------------ gallery ------------------------------ */}
        <div className="mr-gallery">
          <div className="mr-stage">
            {activeImage ? (<>
                <img src={activeImage.url} alt={`${draft.name || "Room"} photo ${safeActiveIndex + 1}`} className="mr-stage-image"/>
                {safeActiveIndex === 0 ? <span className="mr-cover-tag">Cover</span> : null}
                <div className="mr-stage-tools">
                  {safeActiveIndex > 0 ? <button type="button" className="mr-chip" onClick={() => makeCover(safeActiveIndex)} disabled={isSaving}><Star className="mr-icon-sm"/>Make cover</button> : null}
                  <button type="button" className="mr-chip mr-chip--danger" aria-label="Remove this photo" onClick={() => removeImage(safeActiveIndex)} disabled={isSaving}><X className="mr-icon-sm"/></button>
                </div>
              </>) : (<button type="button" className="mr-stage-empty" onClick={openPicker} disabled={isSaving}><ImagePlus className="mr-stage-empty-icon"/><span>No photo yet</span></button>)}
            {images.length > 1 ? (<>
                <button type="button" className="mr-arrow mr-arrow--prev" aria-label="Previous photo" onClick={showPrevious}><ChevronLeft className="mr-icon-md"/></button>
                <button type="button" className="mr-arrow mr-arrow--next" aria-label="Next photo" onClick={showNext}><ChevronRight className="mr-icon-md"/></button>
              </>) : null}
          </div>

          <div className="mr-thumbs">
            {images.map((image, index) => (<button key={image.id} type="button" aria-label={`Show photo ${index + 1}`} onClick={() => setActiveIndex(index)} className={`mr-thumb${index === safeActiveIndex ? " is-active" : ""}`}><img src={image.url} alt=""/></button>))}
            {images.length < MAX_ROOM_IMAGES ? <button type="button" className="mr-thumb mr-thumb--add" onClick={openPicker} disabled={isSaving}><Plus className="mr-icon-md"/><span>Add Photo</span></button> : null}
          </div>

          <p className="mr-hint">Upload up to {MAX_ROOM_IMAGES} images (JPG, PNG, WebP). Max {MAX_ROOM_IMAGE_MB}MB each.</p>
          {uploadProgress !== null ? <div className="mr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadProgress)}><span style={{ width: `${uploadProgress}%` }}/></div> : null}
          <button type="button" className="mr-upload" onClick={openPicker} disabled={isSaving}><Upload className="mr-icon-md"/>Upload a Photo / Change Photos</button>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden onChange={handleFiles}/>
        </div>

        {/* ------------------------------ details ------------------------------ */}
        <div className="mr-details">
          <div className="mr-head">
            <div className="mr-head-main">
              <div className="mr-title-row">
                <label className="mr-name">
                  <input ref={nameInputRef} value={draft.name} onChange={setField("name")} placeholder="Room number / name" aria-label="Room number or name" className="mr-name-input" disabled={isSaving}/>
                  <Pencil className="mr-pencil" aria-hidden="true"/>
                </label>
                <Badge className={`${statusOption.className} manage-rooms-badge-5`}>{statusOption.label}</Badge>
              </div>
              <p className="mr-muted">{(room?.description ?? "").trim() || "No room description provided."}</p>
            </div>

            <div className="mr-head-actions">
              <div className="mr-mini">
                {isNew ? (<button type="button" className="mr-mini-btn" onClick={onCancelNew} disabled={isSaving}>Cancel</button>) : (<>
                    <button type="button" className="mr-mini-btn" onClick={() => nameInputRef.current?.focus()} disabled={controlsLocked}>Edit Room</button>
                    <button type="button" className="mr-mini-btn mr-mini-btn--danger" onClick={() => void onDelete(room)} disabled={controlsLocked}>Delete Room</button>
                  </>)}
              </div>
              <div className="mr-menu" ref={menuRef}>
                <button type="button" aria-label={`Actions for ${draft.name || "room"}`} aria-expanded={menuOpen} disabled={controlsLocked} onClick={() => setMenuOpen((open) => !open)} className="mr-kebab"><MoreVertical className="mr-icon-md"/></button>
                {menuOpen ? (<div className="mr-menu-list" role="menu">
                    {status !== "maintenance"
                ? <button type="button" role="menuitem" onClick={() => applyStatus("maintenance")}><Wrench className="mr-icon-sm"/>Mark as Under Maintenance</button>
                : <button type="button" role="menuitem" onClick={() => applyStatus("occupied")}><Users className="mr-icon-sm"/>Mark as Occupied</button>}
                  </div>) : null}
              </div>
            </div>
          </div>

          <div className="mr-fields">
            <Field label="Monthly Rent" prefix="₱" className="mr-span-1"><input type="number" inputMode="decimal" min={0} step="any" value={draft.price} onChange={setField("price")} className="mr-input hide-number-spinners" placeholder="0" disabled={isSaving}/></Field>
            <Field label="Capacity" suffix={Number(draft.maxOccupants) === 1 ? "person" : "people"} className="mr-span-1"><input type="number" min={1} value={draft.maxOccupants} onChange={setField("maxOccupants")} className="mr-input hide-number-spinners" placeholder="1" disabled={isSaving}/></Field>
            <Field label="Room Type" chevron className="mr-span-1"><select value={draft.type} onChange={setField("type")} className="mr-input mr-select" disabled={isSaving}>{ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Room Size" suffix="sq ft" className="mr-span-1"><input type="number" min={0} value={draft.sqft} onChange={setField("sqft")} className="mr-input hide-number-spinners" placeholder="0" disabled={isSaving}/></Field>
            <Field label="Bathroom" chevron className="mr-span-2">{bathroomSelect}</Field>
            <Field label="Air Conditioning" chevron className="mr-span-2"><select value={draft.hasAC ? "yes" : "no"} onChange={setAirCon} className="mr-input mr-select" disabled={isSaving}><option value="no">No air conditioning</option><option value="yes">With air conditioning</option></select></Field>
            {bathroomValue === "shared" ? <Field label="Shared bathroom location (optional)" className="mr-span-4"><input value={draft.sharedBathLocation} onChange={setField("sharedBathLocation")} className="mr-input" placeholder="e.g. End of the hallway" disabled={isSaving}/></Field> : null}
          </div>

          <label className="mr-desc">
            <span className="mr-desc-label">Room description</span>
            <span className="mr-desc-control">
              <textarea rows={3} value={draft.description} onChange={setField("description")} placeholder="Add room description..." className="mr-textarea" disabled={isSaving}/>
              <Pencil className="mr-pencil mr-pencil--corner" aria-hidden="true"/>
            </span>
          </label>

          <div className="mr-footer">
            <Button type="button" variant="outline" disabled={controlsLocked} onClick={() => applyStatus(status === "available" ? "occupied" : "available")} className="mr-btn-status">
              {status === "available" ? <><Users className="mr-icon-sm"/>Mark as Occupied</> : <><CheckCircle2 className="mr-icon-sm"/>Mark as Available</>}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving || busy || (!isNew && !isDirty)} className="mr-btn-save">{isSaving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>
    </article>);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function ManageRooms() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { refreshApartments } = useApartmentsContext();
    const [property, setProperty] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingRoomId, setProcessingRoomId] = useState(null);
    const [newRoomOpen, setNewRoomOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const mainRef = useRef(null);
    useEffect(() => {
        if (newRoomOpen) {
            mainRef.current?.querySelector(".mr-card--new")?.scrollIntoView({ block: "start" });
        }
    }, [newRoomOpen]);
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id)
                return;
            setIsLoading(true);
            try {
                const [loadedProperty, loadedRooms] = await Promise.all([
                    fetchApartmentWithImages(id),
                    fetchApartmentRooms(id),
                ]);
                if (!active)
                    return;
                setProperty(loadedProperty);
                setRooms(loadedRooms);
            }
            catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to load rooms.");
            }
            finally {
                if (active)
                    setIsLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [id]);
    useEffect(() => {
        if (!id)
            return;
        const refreshRooms = () => { void fetchApartmentRooms(id).then(setRooms).catch(() => undefined); };
        const refreshProperty = () => { void fetchApartmentWithImages(id).then(setProperty).catch(() => undefined); };
        const channel = supabase
            .channel(`manage-rooms-${id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms", filter: `apartment_id=eq.${id}` }, refreshRooms)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "apartments", filter: `id=eq.${id}` }, refreshProperty)
            .subscribe();
        const refreshOnFocus = () => { refreshRooms(); refreshProperty(); };
        const refreshOnVisibility = () => {
            if (document.visibilityState === "visible")
                refreshOnFocus();
        };
        window.addEventListener("focus", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshOnVisibility);
        return () => {
            window.removeEventListener("focus", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshOnVisibility);
            void supabase.removeChannel(channel);
        };
    }, [id]);
    const roomCounts = useMemo(() => ({
        total: rooms.length,
        available: rooms.filter((room) => statusForRoom(room) === "available").length,
        occupied: rooms.filter((room) => statusForRoom(room) === "occupied").length,
        maintenance: rooms.filter((room) => statusForRoom(room) === "maintenance").length,
    }), [rooms]);
    if (user?.role !== "landlord")
        return <Navigate to="/dashboard" replace/>;
    const canManage = property && property.landlordId === user.id;

    // Called by a card's Save button. `existing` is the saved room, or null for a new one.
    // Resolves to the saved room, or null if validation/saving failed.
    const saveRoom = async (existing, form, images, onProgress) => {
        if (!id)
            return null;
        if (!form.name.trim()) {
            toast.error("Please enter a room number or name.");
            return null;
        }
        if (!form.price || Number(form.price) < 0) {
            toast.error("Please enter a valid monthly rent.");
            return null;
        }
        if (Number(form.maxOccupants) < 1) {
            toast.error("Room capacity must be at least one.");
            return null;
        }
        try {
            const imageUrls = await uploadPendingRoomImages(id, existing?.id, images, onProgress);
            // Existing rooms keep their persisted status (changed by the status buttons, not by Save).
            const payload = buildRoomPayload({ ...form, id: existing?.id }, imageUrls, existing ? statusForRoom(existing) : form.status);
            let saved;
            if (existing) {
                saved = await updateApartmentRoom(id, existing.id, payload, user.id);
                setRooms((current) => current.map((item) => item.id === existing.id ? saved : item));
                toast.success("Room updated");
            }
            else {
                saved = await createApartmentRoom(id, payload, user.id);
                setRooms((current) => [...current, saved]);
                setNewRoomOpen(false);
                toast.success("Room added");
            }
            try {
                await refreshApartments();
            }
            catch {
                // The room itself was saved; a failed list refresh must not look like a failed save.
            }
            return saved;
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save room.");
            return null;
        }
    };
    const changeRoomStatus = async (room, status) => {
        if (!id || !room.id || processingRoomId)
            return;
        setProcessingRoomId(room.id);
        try {
            await updateApartmentRoomStatus(id, room.id, status, user.id);
            setRooms((current) => current.map((item) => item.id === room.id
                ? { ...item, status, isOccupied: status === "occupied" }
                : item));
            await refreshApartments();
            toast.success("Room status updated");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update room status.");
        }
        finally {
            setProcessingRoomId(null);
        }
    };
    const removeRoom = async (room) => {
        if (!id || !room.id || processingRoomId)
            return;
        const roomName = room.name || "this room";
        if (!window.confirm(`Are you sure you want to delete ${roomName}?\n\nThis removes only this room, not the property.`))
            return;
        setProcessingRoomId(room.id);
        try {
            await deleteApartmentRoom(id, room.id, user.id);
            setRooms((current) => current.filter((item) => item.id !== room.id));
            await refreshApartments();
            toast.success("Room deleted");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to delete room.");
        }
        finally {
            setProcessingRoomId(null);
        }
    };
    const handleLogout = () => {
        logout();
        navigate("/login");
    };
    if (isLoading) {
        return <div className="manage-rooms-loading-room-management">Loading room management...</div>;
    }
    if (!property || !canManage) {
        return (<div className="manage-rooms-grid">
        <div>
          <DoorOpen className="manage-rooms-door-open-icon"/>
          <h1 className="manage-rooms-property-not-available">Property Not Available</h1>
          <p className="manage-rooms-text">This property could not be found or is not assigned to your account.</p>
          <Button onClick={() => navigate("/dashboard?section=overview")}>Back to My Properties</Button>
        </div>
      </div>);
    }
    const address = [property.address, property.city, property.state, property.zip].filter(Boolean).join(", ");
    const sidebar = <LandlordSidebar user={user} verified={Boolean(user.verified || user.isVerified)} activeSection="overview" onSectionChange={(section) => navigate(`/dashboard?section=${section}`)} onClose={() => setSidebarOpen(false)} onLogout={handleLogout}/>;
    const summaryCards = [
        { label: "Total Rooms", helper: "All rooms in this property", value: roomCounts.total, icon: DoorOpen, iconClass: "landlord-tone-brand", border: "landlord-border-brand" },
        { label: "Available", helper: "Ready for tenants", value: roomCounts.available, icon: CheckCircle2, iconClass: "landlord-tone-available", border: "landlord-border-brand" },
        { label: "Occupied", helper: "Currently rented", value: roomCounts.occupied, icon: BedDouble, iconClass: "landlord-tone-muted", border: "landlord-border-brand" },
        { label: "Under Maintenance", helper: "Temporarily unavailable", value: roomCounts.maintenance, icon: Wrench, iconClass: "landlord-tone-warning", border: "landlord-border-brand" },
    ];
    return (<div className="app-shell landlord-shell landlord-manage-rooms">
      <div className="app-shell-fixed-sidebar">{sidebar}</div>
      {sidebarOpen && <div className="app-sidebar-overlay"><button aria-label="Close navigation" className="manage-rooms-close-navigation" onClick={() => setSidebarOpen(false)}/><div className="app-sidebar-drawer is-open">{sidebar}<button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close"><X className="manage-rooms-x-icon"/></button></div></div>}

      <main ref={mainRef} className="app-shell-page-main">
        <div className="app-shell-content">
          <div className="manage-rooms-row">
            <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger"><Menu className="manage-rooms-menu-icon"/></button>
            <span className="manage-rooms-room-management">Room Management</span>
          </div>

          <header className="manage-rooms-header">
            <div className="manage-rooms-row-2">
              <button aria-label="Back to My Properties" onClick={() => navigate("/dashboard?section=overview")} className="manage-rooms-back-to-my-properties"><ArrowLeft className="manage-rooms-arrow-left-icon"/>Back</button>
              <Button onClick={() => setNewRoomOpen(true)} className="manage-rooms-add-room"><Plus className="manage-rooms-plus-icon"/>Add Room</Button>
            </div>
            <p className="manage-rooms-room-management-2">Room Management</p>
            <p className="manage-rooms-text-2"><MapPin className="manage-rooms-map-pin-icon"/>{address || "Address not provided"}</p>
          </header>

          <section className="manage-rooms-section">
            {summaryCards.map(({ label, helper, value, icon: Icon, iconClass, border }) => (<div key={label} className={`manage-rooms-card ${border} manage-rooms-panel`}>
                <div className="manage-rooms-row-4"><span className={`manage-rooms-grid-2 ${iconClass}`}><Icon className="manage-rooms-icon-icon"/></span><div><p className="manage-rooms-text-3">{value}</p><p className="manage-rooms-text-4">{label}</p></div></div>
                <p className="manage-rooms-text-5">{helper}</p>
              </div>))}
          </section>

          {rooms.length === 0 && !newRoomOpen ? (<div className="manage-rooms-card-4"><DoorOpen className="manage-rooms-door-open-icon-2"/><h2 className="manage-rooms-no-rooms-have-been-added-yet">No rooms have been added yet.</h2><p className="manage-rooms-text-7">Add the first room to make availability visible across your property listing.</p><Button onClick={() => setNewRoomOpen(true)} className="manage-rooms-add-first-room"><Plus className="manage-rooms-plus-icon"/>Add First Room</Button></div>) : (<section className="mr-list">
              {newRoomOpen ? <RoomEditorCard key="new-room" room={null} busy={processingRoomId !== null} onSave={saveRoom} onDelete={removeRoom} onChangeStatus={changeRoomStatus} onCancelNew={() => setNewRoomOpen(false)}/> : null}
              {rooms.map((room) => (<RoomEditorCard key={room.id} room={room} busy={processingRoomId !== null} onSave={saveRoom} onDelete={removeRoom} onChangeStatus={changeRoomStatus} onCancelNew={() => undefined}/>))}
            </section>)}
        </div>
      </main>
    </div>);
}