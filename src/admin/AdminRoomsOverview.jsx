import "./AdminRoomsOverview.css";
import { ArrowLeft, BedDouble, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fetchApartmentInspectionDetails } from "@/services/apartmentsService";
import "./admin-theme.css";

const asNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const roomName = (room, index) => room.name || room.room_name || room.room_type || `Room ${index + 1}`;
const roomStatus = (room) => room.status === "occupied" || room.isOccupied || room.is_occupied ? "Occupied" : room.status === "maintenance" ? "Maintenance" : "Available";

export function AdminRoomsOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [apartment, setApartment] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const returnTo = location.state?.returnTo || `/admin/apartment/${id}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const details = await fetchApartmentInspectionDetails(id);
        if (!active) return;
        setApartment(details?.apartment ?? null);
        setRooms(details?.rooms ?? details?.apartment?.rooms ?? []);
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  const available = useMemo(() => rooms.filter((room) => roomStatus(room) === "Available").length, [rooms]);
  const rents = rooms.map((room) => asNumber(room.rent ?? room.price)).filter((rent) => rent > 0);
  const priceRange = rents.length ? `P${Math.min(...rents).toLocaleString()} - P${Math.max(...rents).toLocaleString()} / month` : "No room pricing submitted";

  return <main className="admin-rooms-overview-page">
    <header className="admin-rooms-overview-header">
      <div><button type="button" onClick={() => navigate(returnTo)}><ArrowLeft /> Back to Property Review</button><h1>Rooms Overview</h1><p>Review all submitted rooms for {apartment?.title || "this property"} before approving the property listing.</p></div>
      <div className="admin-rooms-overview-property"><small>PROPERTY</small><strong>{apartment?.title || "Loading property"} · {rooms.length} Rooms</strong></div>
    </header>

    {loading ? <p className="admin-rooms-overview-loading">Loading submitted rooms...</p> : <>
      <section className="admin-rooms-overview-summary">
        <div><small>PROPERTY ADDRESS</small><strong>{apartment?.address || "Not provided"}, {apartment?.city || ""}</strong></div>
        <div><small>TOTAL ROOMS</small><strong>{rooms.length}</strong></div>
        <div><small>AVAILABLE</small><strong>{available}</strong></div>
        <div><small>PRICE RANGE</small><strong>{priceRange}</strong></div>
        <span>Pending Approval</span>
      </section>

      <section className="admin-rooms-overview-grid">
        {rooms.map((room, index) => {
          const image = Array.isArray(room.images) ? room.images[0] : room.image_url || room.imageUrl;
          const capacity = asNumber(room.maxOccupants ?? room.max_occupants, 1);
          const hasBath = room.hasPrivateBath ?? room.has_private_bath;
          return <article key={room.id || index}>
            {image ? <img src={image} alt={roomName(room, index)} /> : <div className="admin-rooms-overview-placeholder"><BedDouble /></div>}
          <div className="admin-rooms-overview-card-content"><h2>{roomName(room, index)}</h2><p className="admin-rooms-overview-rent">P{asNumber(room.rent ?? room.price).toLocaleString()} <small>/ month</small></p><dl><div><dt>Capacity</dt><dd>{capacity} tenant{capacity === 1 ? "" : "s"}</dd></div><div><dt>Beds</dt><dd>{asNumber(room.beds ?? room.bedrooms, 1)} Bed</dd></div><div><dt>Bathroom</dt><dd>{hasBath ? "Private" : "Shared"}</dd></div><div><dt>Amenities</dt><dd>{room.hasAC || room.has_ac ? "WiFi, AC" : "WiFi"}</dd></div></dl><Button variant="outline" size="sm" onClick={() => { setSelectedRoom({ room, index }); setSelectedImageIndex(0); }}>View Room Details</Button></div>
          </article>;
        })}
        {rooms.length === 0 && <p className="admin-rooms-overview-empty">No rooms have been submitted for this property.</p>}
      </section>

      <footer className="admin-rooms-overview-footer"><div><strong>Room Review</strong><p>Review individual room details, photos, capacity, rent, amenities, and availability before returning to the property review.</p></div><Button onClick={() => navigate(returnTo)}>Back to Property Review</Button></footer>
    </>}
    {selectedRoom && (() => {
      const room = selectedRoom.room;
      const roomImages = Array.isArray(room.images) ? room.images.filter(Boolean) : [room.image_url || room.imageUrl].filter(Boolean);
      const selectedImage = roomImages[selectedImageIndex];
      const capacity = asNumber(room.maxOccupants ?? room.max_occupants, 1);
      const hasBath = room.hasPrivateBath ?? room.has_private_bath;
      const hasAc = room.hasAC ?? room.has_ac;
      return <div className="admin-room-detail-overlay" onClick={() => setSelectedRoom(null)}><section className="admin-room-detail-dialog" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Room details">
        <button type="button" className="admin-room-detail-close" onClick={() => setSelectedRoom(null)} aria-label="Close room details"><X /></button>
        <header><h1>{roomName(room, selectedRoom.index)}</h1><span className={roomStatus(room) === "Available" ? "is-available" : ""}>{roomStatus(room)}</span></header>
        <div className="admin-room-detail-layout"><div><div className="admin-room-detail-image">{selectedImage ? <img src={selectedImage} alt={roomName(room, selectedRoom.index)} /> : <BedDouble />}{roomImages.length > 1 && <><button type="button" className="is-previous" onClick={() => setSelectedImageIndex((current) => (current - 1 + roomImages.length) % roomImages.length)}><ChevronLeft /></button><button type="button" className="is-next" onClick={() => setSelectedImageIndex((current) => (current + 1) % roomImages.length)}><ChevronRight /></button><span>{roomImages.map((image, index) => <i key={`${image}-${index}`} className={index === selectedImageIndex ? "is-active" : ""}/>)}</span></>}<Expand /></div>{roomImages.length > 1 && <div className="admin-room-detail-thumbnails">{roomImages.slice(0, 4).map((image, index) => <button type="button" key={`${image}-${index}`} onClick={() => setSelectedImageIndex(index)} className={index === selectedImageIndex ? "is-active" : ""}><img src={image} alt={`Room image ${index + 1}`} /></button>)}</div>}<section className="admin-room-detail-description"><h2>Description</h2><p>{room.description || "No room description was submitted."}</p></section></div>
          <aside><p className="admin-room-detail-price">P {asNumber(room.rent ?? room.price).toLocaleString()} <small>/ month</small></p><dl className="admin-room-detail-facts"><div><dt>Capacity</dt><dd>{capacity} person{capacity === 1 ? "" : "s"}</dd></div><div><dt>Floor Area</dt><dd>{asNumber(room.sqft)} sq ft</dd></div><div><dt>Bathroom</dt><dd>{hasBath ? "Private" : "Shared"}</dd></div><div><dt>Air Conditioning</dt><dd>{hasAc ? "Yes" : "No"}</dd></div></dl><h2>Amenities</h2><div className="admin-room-detail-tags"><span>{hasBath ? "Private bathroom" : "Shared bathroom"}</span>{hasAc && <span>Air conditioning</span>}<span>WiFi</span></div><h2>Additional Information</h2><dl className="admin-room-detail-additional"><div><dt>Property Type</dt><dd>{apartment?.propertyType || "Apartment"}</dd></div><div><dt>Available Date</dt><dd>{apartment?.availableDate ? new Date(apartment.availableDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "Not provided"}</dd></div><div><dt>Utilities</dt><dd>{Array.isArray(apartment?.utilities) && apartment.utilities.length ? apartment.utilities.join(", ") : "Not included"}</dd></div></dl></aside></div>
      </section></div>;
    })()}
  </main>;
}
