import { Check, Clock3, Search, UserRound, X } from "lucide-react";
import { formatOptionalDate, text } from "./adminDashboardHelpers";

const submittedPropertyFor = (landlord, apartments) => apartments
  .filter((apartment) => text(apartment.landlordId ?? apartment.landlord_id) === text(landlord.id))
  .sort((left, right) => new Date(right.createdAt ?? right.created_at ?? 0).getTime() - new Date(left.createdAt ?? left.created_at ?? 0).getTime())[0] ?? null;

const statusKey = (landlord, apartments) => {
  const property = submittedPropertyFor(landlord, apartments);
  if (!property) return "pending";
  if (property.isPublished ?? property.is_published) return "verified";
  const status = String(property.approvalStatus ?? property.approval_status ?? "").toLowerCase();
  return status === "rejected" ? "rejected" : "pending";
};

const reviewStatusLabel = (status) => status === "verified" ? "Published" : status === "rejected" ? "Needs Changes" : "Pending Review";

export function AdminLandlordVerification({ landlords, apartments = [], search, setSearch, statusFilter, setStatusFilter, onSelect }) {
  const rows = landlords.filter((landlord) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [landlord.name, landlord.email, landlord.mobile, landlord.mobileNumber, landlord.permitNumber, landlord.permit_number]
      .some((value) => String(value ?? "").toLowerCase().includes(needle));
    return matchesSearch && (statusFilter === "all" || statusKey(landlord, apartments) === statusFilter);
  });
  const counts = {
    total: landlords.length,
    pending: landlords.filter((item) => statusKey(item, apartments) === "pending").length,
    verified: landlords.filter((item) => statusKey(item, apartments) === "verified").length,
    rejected: landlords.filter((item) => statusKey(item, apartments) === "rejected").length,
  };
  const metrics = [
    { label: "Total Landlords", value: counts.total, note: "Registered landlord accounts", icon: UserRound, tone: "total" },
    { label: "Pending Review", value: counts.pending, note: "Listing needs an admin decision", icon: Clock3, tone: "pending" },
    { label: "Published", value: counts.verified, note: "Latest listing is visible", icon: Check, tone: "verified" },
    { label: "Needs Changes", value: counts.rejected, note: "Listing needs landlord updates", icon: X, tone: "rejected" },
  ];

  return <div className="admin-verification-page">
    <header className="admin-verification-header"><h1>Landlord Verification</h1><p>Review the landlord account and current listing review status.</p></header>
    <div className="admin-verification-filters">
      <label><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search landlords"/></label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Listing review status"><option value="all">All Status</option><option value="pending">Pending Review</option><option value="verified">Published</option><option value="rejected">Needs Changes</option></select>
    </div>
    <section className="admin-verification-metrics">{metrics.map(({ label, value, note, icon: Icon, tone }) => <article key={label}><span className={`is-${tone}`}><Icon size={17}/></span><strong>{value} {label}</strong><small>{note}</small></article>)}</section>
    <section className="admin-verification-list">
      {rows.map((landlord) => {
        const status = statusKey(landlord, apartments);
        return <article key={landlord.id} className="admin-verification-row">
          <div className="admin-verification-person"><span>{landlord.name?.[0]?.toUpperCase() ?? "L"}</span><div><strong>{landlord.name || "Unnamed landlord"}</strong><small>{landlord.email || "No email provided"}</small></div></div>
          <p className="admin-verification-field"><span>Contact</span>{landlord.mobile ?? landlord.mobileNumber ?? "Not provided"}</p>
          <p className="admin-verification-field"><span>Registered</span>{formatOptionalDate(landlord.created_at, { month: "short", day: "numeric", year: "numeric" })}</p>
          <p className="admin-verification-field"><span>Permit</span>{landlord.permitNumber ?? landlord.permit_number ?? "Not provided"}</p>
          <div className="admin-verification-state"><span>Listing status</span><strong><span className={`admin-verification-status is-${status}`}>{reviewStatusLabel(status)}</span></strong></div>
          <button type="button" onClick={() => onSelect(landlord)}>View Verification</button>
        </article>;
      })}
      {rows.length === 0 && <p className="admin-verification-empty">No landlords match the selected filters.</p>}
    </section>
  </div>;
}
