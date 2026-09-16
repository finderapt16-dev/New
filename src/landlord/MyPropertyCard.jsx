import "./MyPropertyCard.css";
import { ApartmentRatingSummary } from "@/components/ApartmentRatingSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { Bath, BedDouble, Building2, Edit2, Eye, EyeOff, Eye as EyeOpen, Heart, MapPin, Ruler, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getRoomStatus, getApartmentStatus, getStatusOption } from "@/landlord/landlordStatus";
export const MyPropertyCard = ({ apartment, propertyViewMode, ratingSummary, ratingsLoading, openViewers, aptViews, openFavoriters, aptFavs, setEditingApartment, handleTogglePublication, deletingApartmentId, handleDeleteApartment }) => {
    const status = getApartmentStatus(apartment);
    const statusOption = getStatusOption(status);
    const roomCount = apartment.rooms?.length ?? 0;
    const availableRooms = apartment.rooms?.filter((room) => getRoomStatus(room) === "available").length ?? 0;
    const location = formatApartmentLocation(apartment, "Address unavailable");
    const roomOrBedCount = roomCount > 0 ? roomCount : Number(apartment.bedrooms ?? 0);
    return (<article key={apartment.id} className={`property-card-article ${propertyViewMode === "list" ? "property-card-article-2" : ""}`}>
    <div className={`property-card-panel ${propertyViewMode === "list" ? "property-card-panel-2" : "property-card-panel-3"}`}>
      {apartment.image ? <img src={apartment.image} alt={apartment.title || "Property"} className="property-card-image"/> : <div className="property-card-row"><Building2 className="property-card-building2-icon"/></div>}
      <div className="property-card-row-2"><Badge className="property-card-your-property">Your Property</Badge><Badge className={`property-card-card ${statusOption.className}`}>{statusOption.label}</Badge>{!apartment.isPublished && <Badge className="property-card-unpublished">Unpublished</Badge>}</div>
    </div>
    <div className="property-card-content">
      <div className="property-card-row-3"><div className="property-card-panel-4"><h2 className="property-card-heading">{apartment.title || "Untitled property"}</h2><ApartmentRatingSummary stats={ratingSummary.byApartment.get(apartment.id)} isLoading={ratingsLoading} className="property-card-apartment-rating-summary"/><p className="property-card-text"><MapPin className="property-card-map-pin-icon"/>{location}</p></div><div className="property-card-panel-5"><p className="property-card-room-pricing">Room pricing</p><p className="property-card-manage-rooms">Manage Rooms</p></div></div>
      <div className="property-card-grid">{[{ label: roomCount > 0 ? "Rooms" : "Beds", value: roomOrBedCount, icon: BedDouble }, { label: "Bathrooms", value: Number(apartment.bathrooms ?? 0), icon: Bath }, { label: "Floor Area", value: Number(apartment.sqft ?? 0) > 0 ? `${Number(apartment.sqft).toLocaleString("en-PH")} sqft` : "Unavailable", icon: Ruler }].map(({ label, value, icon: Icon }) => <div key={label} className="property-card-card-2"><Icon className="property-card-icon-icon"/><strong className="property-card-strong">{value}</strong><span className="property-card-span">{label}</span></div>)}</div>
      <div className="property-card-row-4"><Badge className="property-card-badge">{statusOption.label}</Badge><span className="property-card-available">{availableRooms} available / {roomCount} total rooms</span></div>
      <div className="property-card-grid-2"><Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=properties", backLabel: "Back to My Properties" }}><Button variant="outline" className="property-card-view-property"><Eye className="property-card-eye-icon"/>View Property</Button></Link><Link to={`/landlord/properties/${apartment.id}/rooms`}><Button className="property-card-manage-rooms-2">Manage Rooms</Button></Link></div>
      <div className="property-card-grid-3"><button onClick={() => openViewers(apartment.id, apartment.title, aptViews(apartment.id))} className="property-card-views"><Eye className="property-card-eye-icon-2"/>{aptViews(apartment.id)} Views</button><button onClick={() => openFavoriters(apartment.id, apartment.title, aptFavs(apartment.id))} className="property-card-saved"><Heart className="property-card-heart-icon"/>{aptFavs(apartment.id)} Saved</button><button onClick={() => setEditingApartment(apartment)} className="property-card-edit"><Edit2 className="property-card-edit2-icon"/>Edit</button></div>
      <div className="property-card-grid-4">{apartment.isPublished ? <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, false)} className="property-card-unpublish"><EyeOff className="property-card-eye-off-icon"/>Unpublish</Button> : <Button variant="outline" onClick={() => void handleTogglePublication(apartment.id, true)} className="property-card-publish"><EyeOpen className="property-card-eye-open-icon"/>Publish</Button>}<Button variant="outline" disabled={deletingApartmentId === apartment.id} onClick={() => void handleDeleteApartment(apartment.id)} className="property-card-button"><Trash2 className="property-card-trash2-icon"/>{deletingApartmentId === apartment.id ? "Deleting..." : "Delete"}</Button></div>
    </div>
  </article>);
};
