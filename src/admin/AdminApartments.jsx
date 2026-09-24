import "./AdminApartments.css";
import { Building2, Check, Clock3, Eye, MapPin, Search } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getAdminListingLabel, getAdminListingState, getLowestRoomRent } from "@/admin/adminListingState";
import { formatOptionalDate } from "./adminDashboardHelpers";

const statusClass = (apartment) => `is-${getAdminListingState(apartment)}`;

export function AdminApartments({ allApartments, aptSearch, setAptSearch, aptStatusFilter, setAptStatusFilter, aptSort, setAptSort, filteredApts, getLandlordForApt, navigate, apartmentDetailBasePath, portalBasePath }) {
  const publishedCount = allApartments.filter((apartment) => getAdminListingState(apartment) === "published").length;
  const reviewCount = allApartments.filter((apartment) => getAdminListingState(apartment) === "pending").length;
  const stats = [
    { label: "Total Apartments", value: allApartments.length, note: "All listings", icon: Building2, tone: "total" },
    { label: "Published", value: publishedCount, note: "Visible to tenants", icon: Check, tone: "published" },
    { label: "Under Review", value: reviewCount, note: "Requires inspection", icon: Clock3, tone: "review" },
  ];

  return <div className="admin-listings-page">
    <header className="admin-listings-header"><h1>Apartments</h1><p>Review and manage apartment listings.</p></header>
    <section className="admin-listings-stats">{stats.map(({ label, value, note, icon: Icon, tone }) => <article key={label}><span className={`is-${tone}`}><Icon size={16}/></span><div><strong>{value}</strong><b>{label}</b><small>{note}</small></div></article>)}</section>
    <section className="admin-listings-controls">
      <label><Search size={14}/><input value={aptSearch} onChange={(event) => setAptSearch(event.target.value)} placeholder="Search apartments by name, location, or landlord"/></label>
      <select value={aptStatusFilter} onChange={(event) => setAptStatusFilter(event.target.value)} aria-label="Listing status"><option value="all">Listing Status: All</option><option value="published">Published</option><option value="pending">Pending Review</option><option value="rejected">Rejected</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option></select>
      <select value={aptSort} onChange={(event) => setAptSort(event.target.value)} aria-label="Sort apartments"><option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="name">Sort by: Name</option></select>
    </section>
    <section className="admin-listings-results">
      {filteredApts.map((apartment) => {
        const landlord = getLandlordForApt(apartment);
        const lowestRent = getLowestRoomRent(apartment);
        const roomPrices = (apartment.rooms ?? []).map((room) => Number(room.price) || 0).filter(Boolean);
        const highestRent = roomPrices.length ? Math.max(...roomPrices) : lowestRent;
        const image = apartment.image ?? apartment.images?.[0];
        const roomCount = apartment.rooms?.length ?? apartment.bedrooms ?? 0;
        const rentLabel = lowestRent === null ? "Price unavailable" : `P${lowestRent.toLocaleString("en-PH")}${highestRent && highestRent !== lowestRent ? ` - P${highestRent.toLocaleString("en-PH")}` : ""} / month`;
        return <article className="admin-listing-row" key={apartment.id}>
          {image ? <ImageWithFallback className="admin-listing-image" src={image} alt={apartment.title || "Apartment"}/> : <div className="admin-listing-placeholder"><Building2 size={26}/></div>}
          <div className="admin-listing-info"><strong>{apartment.title || "Untitled apartment"}</strong><p><MapPin size={11}/>{formatApartmentLocation(apartment, "Location not provided")}</p><b>{rentLabel}</b><small>Submitted by <em>{landlord?.name || "Not available"}</em></small><footer><span>{roomCount} Room{roomCount === 1 ? "" : "s"}/Units</span><span>Added {formatOptionalDate(apartment.createdAt ?? apartment.created_at, { month: "short", day: "numeric", year: "numeric" })}</span></footer></div>
          <div className="admin-listing-status"><small>Listing status</small><span className={statusClass(apartment)}>{getAdminListingLabel(apartment)}</span></div>
          <button type="button" onClick={() => navigate(`${apartmentDetailBasePath}/${apartment.id}`, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } })}><Eye size={13}/>Inspect</button>
        </article>;
      })}
      {filteredApts.length === 0 && <p className="admin-listings-empty">No apartments match the selected filters.</p>}
    </section>
  </div>;
}
