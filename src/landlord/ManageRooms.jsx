import "./ManageRooms.css";
import { ArrowLeft, Bath, BedDouble, CalendarDays, CheckCircle2, DoorOpen, Edit3, MapPin, Menu, MoreVertical, Plus, Tag, Trash2, TrendingUp, Users, Wind, Wrench, X, } from "lucide-react";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { safeRandomId } from "@/utils/safeRandomId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
const formatDate = (value) => {
    if (!value)
        return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Not recorded"
        : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
};
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
export function ManageRooms() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { refreshApartments } = useApartmentsContext();
    const [property, setProperty] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [processingRoomId, setProcessingRoomId] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openRoomMenuId, setOpenRoomMenuId] = useState(null);
    const [roomImages, setRoomImages] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [form, setForm] = useState(emptyRoomForm);
    const mainRef = useRef(null);
    useEffect(() => {
        if (formOpen) {
            mainRef.current?.querySelector(".manage-rooms-card-2")?.scrollIntoView({ block: "start" });
        }
    }, [formOpen, form.id]);
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
    const resetForm = () => { setForm(emptyRoomForm()); setRoomImages([]); setUploadProgress(null); setFormOpen(false); };
    const openAddForm = () => { setForm(emptyRoomForm()); setRoomImages([]); setUploadProgress(null); setFormOpen(true); };
    const openEditForm = (room) => {
        setForm(roomToForm(room));
        setRoomImages((room.images ?? []).map((url, index) => ({ id: `existing-${index}`, url, isPrimary: index === 0, sortOrder: index })));
        setUploadProgress(null);
        setFormOpen(true);
    };
    const formToRoom = () => ({
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
        status: form.status,
        isOccupied: form.status === "occupied",
        images: roomImages.map((image) => image.url),
    });
    const uploadPendingRoomImages = async () => {
        if (!id)
            return [];
        const ordered = [...roomImages].sort((a, b) => {
            if (a.isPrimary !== b.isPrimary)
                return a.isPrimary ? -1 : 1;
            return a.sortOrder - b.sortOrder;
        });
        const roomUploadId = form.id || safeRandomId();
        const urls = [];
        const pendingCount = ordered.filter((image) => image.file || image.url.startsWith("data:")).length;
        let completedUploads = 0;
        setUploadProgress(pendingCount > 0 ? 0 : null);
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
                urls.push(await uploadApartmentRoomImage(id, roomUploadId, compressed, uploadName));
                completedUploads += 1;
                setUploadProgress((completedUploads / pendingCount) * 100);
            }
        }
        return urls;
    };
    const saveRoom = async () => {
        if (!id)
            return;
        if (!form.name.trim())
            return void toast.error("Please enter a room number or name.");
        if (!form.price || Number(form.price) < 0)
            return void toast.error("Please enter a valid monthly rent.");
        if (Number(form.maxOccupants) < 1)
            return void toast.error("Room capacity must be at least one.");
        setIsSaving(true);
        try {
            const uploadedImageUrls = await uploadPendingRoomImages();
            const room = { ...formToRoom(), images: uploadedImageUrls };
            if (form.id) {
                const updated = await updateApartmentRoom(id, form.id, room, user.id);
                setRooms((current) => current.map((item) => item.id === form.id ? updated : item));
                toast.success("Room updated");
            }
            else {
                const created = await createApartmentRoom(id, room, user.id);
                setRooms((current) => [...current, created]);
                toast.success("Room added");
            }
            await refreshApartments();
            resetForm();
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save room.");
        }
        finally {
            setIsSaving(false);
            setUploadProgress(null);
        }
    };
    const changeRoomStatus = async (room, status) => {
        if (!id || !room.id || processingRoomId)
            return;
        setOpenRoomMenuId(null);
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
    const propertyStatus = property.status
        ? getStatusOption(property.status)
        : property.isPublished
            ? getStatusOption("available")
            : { label: "Unpublished", className: "manage-rooms-badge-4" };
    const sidebar = <LandlordSidebar user={user} verified={Boolean(user.verified || user.isVerified)} activeSection="overview" onSectionChange={(section) => navigate(`/dashboard?section=${section}`)} onClose={() => setSidebarOpen(false)} onLogout={handleLogout}/>;
    const summaryCards = [
        { label: "Total Rooms", helper: "All rooms in this property", value: roomCounts.total, icon: DoorOpen, iconClass: "landlord-tone-brand", border: "landlord-border-brand" },
        { label: "Available", helper: "Ready for tenants", value: roomCounts.available, icon: CheckCircle2, iconClass: "landlord-tone-available", border: "landlord-border-brand" },
        { label: "Occupied", helper: "Currently rented", value: roomCounts.occupied, icon: BedDouble, iconClass: "landlord-tone-muted", border: "landlord-border-brand" },
        { label: "Under Maintenance", helper: "Temporarily unavailable", value: roomCounts.maintenance, icon: Wrench, iconClass: "landlord-tone-warning", border: "landlord-border-brand" },
    ];
    return (<div className="app-shell landlord-shell landlord-manage-rooms">
      <div className="app-shell-fixed-sidebar">{sidebar}</div>
      {sidebarOpen && <div className="app-sidebar-overlay"><button aria-label="Close navigation" className="manage-rooms-close-navigation" onClick={() => setSidebarOpen(false)}/><div className="app-sidebar-drawer">{sidebar}<button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close"><X className="manage-rooms-x-icon"/></button></div></div>}

      <main ref={mainRef} className="app-shell-page-main">
        <div className="app-shell-content">
          <div className="manage-rooms-row">
            <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger"><Menu className="manage-rooms-menu-icon"/></button>
            <span className="manage-rooms-room-management">Room Management</span>
          </div>

          <header className="manage-rooms-header">
            <div className="manage-rooms-row-2">
              <button onClick={() => navigate("/dashboard?section=overview")} className="manage-rooms-back-to-my-properties"><ArrowLeft className="manage-rooms-arrow-left-icon"/>Back to My Properties</button>
              <Button onClick={openAddForm} className="manage-rooms-add-room"><Plus className="manage-rooms-plus-icon"/>Add Room</Button>
            </div>
            <p className="manage-rooms-room-management-2">Room Management</p>
            <div className="manage-rooms-row-3"><h1 className="manage-rooms-title">{property.title}</h1><Badge className={`${propertyStatus.className} manage-rooms-badge-5`}>{propertyStatus.label}</Badge></div>
            <p className="manage-rooms-text-2"><MapPin className="manage-rooms-map-pin-icon"/>{address || "Address not provided"}</p>
            <svg aria-hidden="true" viewBox="0 0 300 120" className="manage-rooms-svg-icon" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M18 105h265M52 105V38h92v67M72 60h24v45m19-45h16v19h-16M159 105V49h76v56M178 70h22v35m20-63v63M43 38h111M151 49h92"/><path d="M77 94h12m42-15h12M251 105V72h20v33M258 72V52h7v20" opacity=".7"/></svg>
          </header>

          <section className="manage-rooms-section">
            {summaryCards.map(({ label, helper, value, icon: Icon, iconClass, border }) => (<div key={label} className={`manage-rooms-card ${border} manage-rooms-panel`}>
                <div className="manage-rooms-row-4"><span className={`manage-rooms-grid-2 ${iconClass}`}><Icon className="manage-rooms-icon-icon"/></span><div><p className="manage-rooms-text-3">{value}</p><p className="manage-rooms-text-4">{label}</p></div></div>
                <p className="manage-rooms-text-5">{helper}</p>
              </div>))}
          </section>

          {formOpen && (<Card className="manage-rooms-card-2">
              <CardHeader><CardTitle>{form.id ? "Edit Room" : "Add Room"}</CardTitle><CardDescription>Enter the details for this room. Property information remains unchanged.</CardDescription></CardHeader>
              <CardContent className="manage-rooms-card-content">
                <div className="manage-rooms-grid-3">
                  <div className="manage-rooms-panel-2"><Label>Room Number / Name *</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Room 101"/></div>
                  <div className="manage-rooms-panel-2"><Label>Room Type</Label><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="manage-rooms-select">{ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
                  <div className="manage-rooms-panel-2"><Label>Monthly Rent *</Label><Input type="number" inputMode="decimal" min={0} step="any" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="hide-number-spinners"/></div>
                  <div className="manage-rooms-panel-2"><Label>Capacity *</Label><Input type="number" min={1} value={form.maxOccupants} onChange={(event) => setForm((current) => ({ ...current, maxOccupants: event.target.value }))} className="hide-number-spinners"/></div>
                  <div className="manage-rooms-panel-2"><Label>Room Size (sq ft)</Label><Input type="number" min={0} value={form.sqft} onChange={(event) => setForm((current) => ({ ...current, sqft: event.target.value }))} className="hide-number-spinners"/></div>
                  <div className="manage-rooms-panel-2"><Label>Room Status</Label><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="manage-rooms-select">{ROOM_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                </div>
                <div className="manage-rooms-panel-2"><Label>Room Description</Label><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the room, layout, or included fixtures."/></div>
                <div className="manage-rooms-grid-4">
                  <div className="manage-rooms-card-3"><div><p className="manage-rooms-private-bathroom">Private Bathroom</p><p className="manage-rooms-private-or-en-suite-bathroom">Private or en-suite bathroom</p></div><Switch checked={form.hasPrivateBath} onCheckedChange={(checked) => setForm((current) => ({ ...current, hasPrivateBath: checked }))}/></div>
                  <div className="manage-rooms-card-3"><div><p className="manage-rooms-air-conditioning">Air Conditioning</p><p className="manage-rooms-room-has-ac-installed">Room has AC installed</p></div><Switch checked={form.hasAC} onCheckedChange={(checked) => setForm((current) => ({ ...current, hasAC: checked }))}/></div>
                </div>
                <div className="manage-rooms-panel-2"><Label>Bathroom Information</Label>{form.hasPrivateBath ? <select value={form.bathroomType} onChange={(event) => setForm((current) => ({ ...current, bathroomType: event.target.value }))} className="manage-rooms-select"><option value="en-suite">Private en-suite bathroom</option><option value="separate">Private separate bathroom</option></select> : <Input value={form.sharedBathLocation} onChange={(event) => setForm((current) => ({ ...current, sharedBathLocation: event.target.value }))} placeholder="Shared bathroom location"/>}</div>
                <div className="manage-rooms-panel-3">
                  <div><Label className="manage-rooms-room-images">Room Images</Label><p className="manage-rooms-text-6">Upload up to 10 JPG, PNG, or WebP images. Drag thumbnails to reorder and select a cover photo.</p></div>
                  <MultiImageUploader images={roomImages} onImagesChange={setRoomImages} maxImages={10} maxFileSize={8} uploadProgress={uploadProgress} disabled={isSaving}/>
                </div>
                <div className="manage-rooms-content"><Button onClick={() => void saveRoom()} disabled={isSaving} className="manage-rooms-button">{isSaving ? "Saving..." : form.id ? "Save Room" : "Add Room"}</Button><Button variant="outline" onClick={resetForm} disabled={isSaving}>Cancel</Button></div>
              </CardContent>
            </Card>)}

          {rooms.length === 0 ? (<div className="manage-rooms-card-4"><DoorOpen className="manage-rooms-door-open-icon-2"/><h2 className="manage-rooms-no-rooms-have-been-added-yet">No rooms have been added yet.</h2><p className="manage-rooms-text-7">Add the first room to make availability visible across your property listing.</p><Button onClick={openAddForm} className="manage-rooms-add-first-room"><Plus className="manage-rooms-plus-icon"/>Add First Room</Button></div>) : (<section className="manage-rooms-section-2">
              {rooms.map((room) => {
                const status = statusForRoom(room);
                const statusOption = getStatusOption(status);
                const roomImage = room.images?.find(Boolean);
                const amenities = [room.hasPrivateBath ? "Private bathroom" : "Shared bathroom", room.hasAC ? "Air conditioning" : "No air conditioning"].filter(Boolean);
                return (<article key={room.id} className="manage-rooms-article">
                    <div className="manage-rooms-panel-4">
                      <div className="manage-rooms-grid-5">
                        <div className="manage-rooms-panel-5">
                          {roomImage ? <img src={roomImage} alt={`${room.name || "Room"} interior`} className="manage-rooms-image"/> : <div className="manage-rooms-grid-6"><div><DoorOpen className="manage-rooms-door-open-icon-3"/><p className="manage-rooms-no-room-image-uploaded">No room image uploaded</p></div></div>}
                        </div>
                        <div className="manage-rooms-panel-6">
                          <div className="manage-rooms-row-5">
                            <div><h2 className="manage-rooms-heading">{room.name || "Room"}</h2><p className="manage-rooms-text-8">{room.description || "No room description provided."}</p></div>
                            <div className="manage-rooms-row-6"><Badge className={`${statusOption.className} manage-rooms-badge-5`}>{statusOption.label}</Badge><button aria-label={`Actions for ${room.name || "room"}`} disabled={processingRoomId === room.id} onClick={() => setOpenRoomMenuId((current) => current === room.id ? null : room.id ?? null)} className="manage-rooms-button-2"><MoreVertical className="manage-rooms-more-vertical-icon"/></button>{openRoomMenuId === room.id && <div className="manage-rooms-card-5">{status !== "maintenance" && <button disabled={processingRoomId !== null} onClick={() => void changeRoomStatus(room, "maintenance")} className="manage-rooms-mark-as-under-maintenance"><Wrench className="manage-rooms-wrench-icon"/>Mark as Under Maintenance</button>}<button disabled={processingRoomId !== null} onClick={() => { openEditForm(room); setOpenRoomMenuId(null); }} className="manage-rooms-edit-room"><Edit3 className="manage-rooms-edit3-icon"/>Edit Room</button><button disabled={processingRoomId !== null} onClick={() => void removeRoom(room)} className="manage-rooms-delete-room"><Trash2 className="manage-rooms-trash2-icon"/>Delete Room</button></div>}</div>
                          </div>
                          <div className="manage-rooms-grid-7">
                            <div className="manage-rooms-panel-7"><p className="manage-rooms-monthly-rent">Monthly Rent</p><p className="manage-rooms-text-9">₱{(room.price ?? 0).toLocaleString("en-PH")}</p></div>
                            <div className="manage-rooms-panel-8"><p className="manage-rooms-capacity">Capacity</p><p className="manage-rooms-text-10"><Users className="manage-rooms-users-icon"/>{room.maxOccupants ?? 1}</p></div>
                            <div className="manage-rooms-panel-8"><p className="manage-rooms-room-type">Room Type</p><p className="manage-rooms-text-9">{room.type || "Not provided"}</p></div>
                            <div className="manage-rooms-panel-8"><p className="manage-rooms-room-size">Room Size</p><p className="manage-rooms-text-9">{room.sqft ? `${room.sqft.toLocaleString("en-PH")} sq ft` : "Not provided"}</p></div>
                          </div>
                          <div className="manage-rooms-row-7">{amenities.map((amenity) => <span key={amenity} className="manage-rooms-card-6">{amenity.includes("bathroom") ? <Bath className="manage-rooms-bath-icon"/> : <Wind className="manage-rooms-wind-icon"/>}{amenity}</span>)}</div>
                        </div>
                      </div>

                      <div className="manage-rooms-grid-8">
                        <Button variant="outline" disabled={processingRoomId !== null} onClick={() => void changeRoomStatus(room, status === "available" ? "occupied" : "available")} className="manage-rooms-button-3">{processingRoomId === room.id ? "Updating..." : status === "available" ? <><Users className="manage-rooms-users-icon-2"/>Mark as Occupied</> : <><CheckCircle2 className="manage-rooms-check-circle2-icon"/>Mark as Available</>}</Button>
                        <Button variant="outline" disabled={processingRoomId !== null} onClick={() => openEditForm(room)} className="manage-rooms-edit-room-2"><Edit3 className="manage-rooms-edit3-icon-2"/>Edit Room</Button>
                        <Button variant="outline" disabled={processingRoomId !== null} onClick={() => void removeRoom(room)} className="manage-rooms-delete-room-2"><Trash2 className="manage-rooms-trash2-icon-2"/>Delete Room</Button>
                      </div>
                    </div>
                    <div className="manage-rooms-grid-9">
                      {[{ label: "Created", value: formatDate(room.createdAt), icon: CalendarDays }, { label: "Created By", value: "Not recorded", icon: Users }, { label: "Last Updated", value: "Not recorded", icon: TrendingUp }, { label: "Room ID", value: room.id || "Not recorded", icon: Tag }].map(({ label, value, icon: Icon }) => <div key={label} className="manage-rooms-panel-9"><p className="manage-rooms-text-11"><Icon className="manage-rooms-icon-icon-2"/>{label}</p><p className="manage-rooms-text-12" title={value}>{value}</p></div>)}
                    </div>
                  </article>);
            })}
            </section>)}

          <section className="manage-rooms-section-3"><span className="manage-rooms-grid-10"><Wrench className="manage-rooms-wrench-icon-2"/></span><div><h2 className="manage-rooms-room-status-guide">Room Status Guide</h2><p className="manage-rooms-text-13">Keep room availability updated so tenants always see accurate room information. Under Maintenance rooms remain unavailable until you mark them available.</p></div></section>
        </div>
      </main>
    </div>);
}
