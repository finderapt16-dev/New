import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RoomImageGallery } from "@/components/RoomImageGallery";
import { getRoomAmenities } from "@/utils/roomFeatures";

const dateLabel = value => {
    if (!value) return "Not provided";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

export function RoomDetails({ room, apartment, onClose }) {
    const safeRoom = room ?? {};
    const safeApartment = apartment ?? {};
    const status = safeRoom.isOccupied ? "occupied" : safeRoom.status || "available";
    const statusLabel = { available: "Available", occupied: "Occupied", maintenance: "Under Maintenance" }[status] || "Not provided";
    const capacity = Number(safeRoom.maxOccupants);
    const rent = Number(safeRoom.price);
    const amenities = [...(safeRoom.hasPrivateBath ? [] : ["Shared Bathroom"]), ...getRoomAmenities(safeRoom)];
    const utilities = safeRoom.utilities ?? safeApartment.utilities;

    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="tenant-room-details" aria-describedby={undefined}>
            <header className="tenant-room-heading"><DialogTitle>{safeRoom.name || "Room details"}</DialogTitle><span className={`tenant-room-status tenant-room-status-${status}`}>{statusLabel}</span></header>
            <div className="tenant-room-layout">
                <div className="tenant-room-visuals">
                    <RoomImageGallery key={safeRoom.id || safeRoom.name || "room"} images={safeRoom.images || []} roomName={safeRoom.name || "Room"} compact />
                    <section className="tenant-room-description"><h3>Description</h3><p>{safeRoom.description || "No room description provided."}</p></section>
                </div>
                <div className="tenant-room-information">
                    <p className="tenant-room-price">{Number.isFinite(rent) && rent > 0 ? `₱ ${rent.toLocaleString("en-PH")}` : "Price not provided"}{Number.isFinite(rent) && rent > 0 && <span> / month</span>}</p>
                    <dl className="tenant-room-facts">
                        <div><dt>Capacity</dt><dd>{capacity > 0 ? `${capacity} ${capacity === 1 ? "person" : "people"}` : "Not provided"}</dd></div>
                        <div><dt>Floor Area</dt><dd>{Number(safeRoom.sqft) > 0 ? `${safeRoom.sqft} sq ft` : "Not provided"}</dd></div>
                        <div><dt>Bathroom</dt><dd>{safeRoom.hasPrivateBath ? "Private" : "Shared"}</dd></div>
                        <div><dt>Air Conditioning</dt><dd>{safeRoom.hasAC ? "Yes" : "No"}</dd></div>
                    </dl>
                    <section><h3>Amenities</h3><div className="tenant-room-amenities">{amenities.map(amenity => <span key={amenity}>{amenity}</span>)}</div></section>
                    <section><h3>Additional Information</h3><dl className="tenant-room-additional">
                        <div><dt>Property Type</dt><dd>{safeApartment.propertyType || safeRoom.type || "Not provided"}</dd></div>
                        <div><dt>Available Date</dt><dd>{dateLabel(safeApartment.availableDate)}</dd></div>
                        <div><dt>Utilities</dt><dd>{Array.isArray(utilities) && utilities.length ? utilities.join(", ") : "Not included"}</dd></div>
                        {safeRoom.sharedBathLocation && !safeRoom.hasPrivateBath && <div><dt>Shared Bathroom Location</dt><dd>{safeRoom.sharedBathLocation}</dd></div>}
                    </dl></section>
                </div>
            </div>
        </DialogContent>
    </Dialog>;
}
