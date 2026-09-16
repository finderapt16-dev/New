import { getAdminAvailabilityLabel, getAdminListingLabel, getAdminListingState, getAdminRoomState, getLowestRoomRent } from "@/admin/adminListingState";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { AlertOctagon, BedDouble, Bell, BellRing, Building2, Calendar, Car, CheckCheck, CheckCircle2, Clock, Eye, FileText, Flag, MapPin, PawPrint, Search, ShieldCheck, Sofa, Wifi, X, XCircle } from "lucide-react";
import { canPublishForLandlord, formatOptionalDate, getLandlordVerificationStatus, OverviewEmpty, text } from './adminDashboardHelpers';
export function AdminApartments({ allApartments, getApartmentReportCount, setActiveSection, unreadNotifsCount, aptSearch, setAptSearch, aptStatusFilter, setAptStatusFilter, aptPropertyTypeFilter, setAptPropertyTypeFilter, aptSort, setAptSort, filteredApts, aptFilter, getLandlordForApt, setSelectedApt, navigate, apartmentDetailBasePath, portalBasePath, setAptFilter, violations, openViolationModal, selectedApt, reports, setSelectedLandlord, resolveReport, dismissReport, handleApproveAndPublishApartment, publishingApartmentId, }) {
    const reportedCount = allApartments.filter((a) => getApartmentReportCount(a.id) > 0).length;
    const availableCount = allApartments.filter((apartment) => getAdminListingState(apartment) === "published").length;
    const reviewCount = allApartments.filter((apartment) => getAdminListingState(apartment) === "pending").length;
    const propertyTypes = Array.from(new Set(allApartments.map((apartment) => apartment.propertyType).filter((value) => Boolean(value)))).sort();
    const currentDate = new Date().toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    return (<div className="admin-apartments-panel">
      <div className="admin-apartments-container">
        <header className="admin-apartments-header">
          <div className="admin-apartments-row">
            <span className="admin-apartments-card"><Building2 className="admin-apartments-building2-icon"/></span>
            <div><h1 className="admin-apartments-apartments">Apartments</h1><p className="admin-apartments-text">Review and manage apartment listings.</p></div>
          </div>
          <div className="admin-apartments-row-2">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-apartments-button"><Bell className="admin-apartments-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-apartments-span">{unreadNotifsCount}</span>}</button>
            <div className="admin-apartments-card-2"><Calendar className="admin-apartments-calendar-icon"/>{currentDate}</div>
          </div>
        </header>

        <section className="admin-apartments-section">
          {[
            { label: "Total Apartments", value: allApartments.length, note: "All listings", icon: Building2 },
            { label: "Published", value: availableCount, note: "Visible to tenants", icon: CheckCircle2 },
            { label: "Under Review", value: reviewCount, note: "Requires inspection", icon: Clock },
        ].map(({ label, value, note, icon: Icon }) => (<div key={label} className="admin-apartments-row-3"><span className="admin-apartments-row-4"><Icon className="admin-apartments-icon-icon"/></span><span className="admin-apartments-span-2"><span className="admin-apartments-span-3">{value}</span><span className="admin-apartments-span-4">{label}</span><span className="admin-apartments-span-5">{note}</span></span></div>))}
        </section>

        <section className="admin-apartments-section-2">
          <label className="admin-apartments-label">
            <Search className="admin-apartments-search-icon"/>
            <input value={aptSearch} onChange={(event) => setAptSearch(event.target.value)} placeholder="Search apartments by name, location, or landlord" className="admin-apartments-input"/>
          </label>
          <select value={aptStatusFilter} onChange={(event) => setAptStatusFilter(event.target.value)} className="admin-apartments-select"><option value="all">Listing Status: All</option><option value="published">Published</option><option value="pending">Pending Review</option><option value="rejected">Rejected</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option></select>
          <select value={aptPropertyTypeFilter} onChange={(event) => setAptPropertyTypeFilter(event.target.value)} className="admin-apartments-select"><option value="all">Property Type: All</option>{propertyTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <select value={aptSort} onChange={(event) => setAptSort(event.target.value)} className="admin-apartments-select"><option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="name">Sort by: Name</option></select>
        </section>

        {filteredApts.length === 0 ? (<div className="admin-apartments-card-3"><OverviewEmpty icon={Building2} text={aptFilter === "reported" ? "No reported apartments." : allApartments.length === 0 ? "No apartments have been added yet." : "No apartments match the selected filters."}/></div>) : (<section className="admin-apartments-section-3">
            {filteredApts.map((apartment) => {
                const landlord = getLandlordForApt(apartment);
                const reportCount = getApartmentReportCount(apartment.id);
                const status = getAdminListingLabel(apartment);
                const availability = getAdminAvailabilityLabel(apartment);
                const lowestRoomRent = getLowestRoomRent(apartment);
                const location = formatApartmentLocation(apartment);
                const roomCount = apartment.rooms?.length || apartment.bedrooms || 0;
                return (<article key={apartment.id} onClick={() => setSelectedApt(apartment)} className="admin-apartments-article">
                  <div className="admin-apartments-panel-2">
                    {apartment.image ? <ImageWithFallback src={apartment.image} alt={apartment.title} className="admin-apartments-image-with-fallback"/> : <div className="admin-apartments-row-5"><Building2 className="admin-apartments-building2-icon-2"/></div>}
                  </div>
                  <div className="admin-apartments-panel-3">
                    <h3 className="admin-apartments-heading">{apartment.title}</h3>
                    <p className="admin-apartments-text-2"><MapPin className="admin-apartments-map-pin-icon"/>{location || "Location not provided"}</p>
                    <p className="admin-apartments-submitted-by">Submitted by <span className="admin-apartments-span-6">{landlord?.name || "Not available"}</span></p>
                    <div className="admin-apartments-row-6">
                      <span className="admin-apartments-row-7"><BedDouble className="admin-apartments-bed-double-icon"/>{roomCount || 0} {roomCount === 1 ? "Room/Unit" : "Rooms/Units"}</span>
                      <span className="admin-apartments-row-7"><CheckCircle2 className="admin-apartments-check-circle2-icon"/>{availability}</span>
                      {lowestRoomRent !== null && <span className="admin-apartments-starting-at">Starting at ₱{lowestRoomRent.toLocaleString()}/month</span>}
                      <span className="admin-apartments-added"><Calendar className="admin-apartments-calendar-icon-2"/>Added {formatOptionalDate(apartment.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                  <div className="admin-apartments-row-8">
                    <div><p className="admin-apartments-listing-status">Listing Status</p><span className="admin-apartments-card-4"><ShieldCheck className="admin-apartments-shield-check-icon"/>{status}</span>{reportCount > 0 && <p className="admin-apartments-text-3"><Flag className="admin-apartments-flag-icon"/>{reportCount} {reportCount === 1 ? "report" : "reports"}</p>}</div>
                  </div>
                  <div className="admin-apartments-row-9">
                    <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); navigate(`${apartmentDetailBasePath}/${apartment.id}`, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } }); }} className="admin-apartments-inspect"><Eye className="admin-apartments-eye-icon"/>Inspect</Button>
                  </div>
                </article>);
            })}
          </section>)}
      </div>

      <div className="admin-apartments-panel-4">
        <div className="admin-apartments-row-10">
          <Building2 className="admin-apartments-building2-icon-3"/>
        </div>
        <div>
          <h2 className="admin-apartments-all-apartments">All Apartments</h2>
          <p className="admin-apartments-text-4">Browse, inspect, and take action on listings</p>
        </div>
      </div>

      <div className="admin-apartments-card-5">
        <Button variant={aptFilter === "all" ? "default" : "ghost"} size="sm" onClick={() => setAptFilter("all")} className={`admin-apartments-all ${aptFilter === "all"
            ? "admin-apartments-all-2"
            : "admin-apartments-all-3"}`}>
          <Building2 className="admin-apartments-building2-icon-4"/>
          All ({allApartments.length})
        </Button>
        <Button variant={aptFilter === "reported" ? "default" : "ghost"} size="sm" onClick={() => setAptFilter("reported")} className={`admin-apartments-reported ${aptFilter === "reported"
            ? "admin-apartments-reported-2"
            : "admin-apartments-reported-3"}`}>
          <Flag className="admin-apartments-flag-icon-2"/>
          Reported ({reportedCount})
        </Button>
      </div>

      <div className="admin-apartments-panel-5">
        <Search className="admin-apartments-search-icon-2"/>
        <input value={aptSearch} onChange={(e) => setAptSearch(e.target.value)} placeholder="Search by name or location…" className="admin-apartments-input-2"/>
      </div>

    <div className="admin-apartments-grid">
      {filteredApts.map((apt) => {
            const landlord = getLandlordForApt(apt);
            const aptViolations = violations.filter((v) => v.apartment_id === apt.id || (!v.apartment_id && v.apartmentTitle === apt.title));
            const aptReportCount = getApartmentReportCount(apt.id);
            const isAvailable = new Date(apt.availableDate) <= new Date();
            return (<div key={apt.id} className="admin-apartments-card-6" onClick={() => setSelectedApt(apt)}>
            <div className="admin-apartments-panel-6">
              {apt.images?.[0]
                    ? <img src={apt.images[0]} alt={apt.title} className="admin-apartments-image"/>
                    : <div className="admin-apartments-row-11"><Building2 className="admin-apartments-building2-icon-5"/></div>}
              <div className="admin-apartments-row-12">
                <span className={`admin-apartments-span-7 ${isAvailable ? "admin-apartments-span-8" : "admin-apartments-span-9"}`}>{isAvailable ? "Published" : "Occupied"}</span>
                {aptReportCount > 0 && (<span className="admin-apartments-row-13">
                    <Flag className="admin-apartments-flag-icon"/>{aptReportCount} {aptReportCount === 1 ? "Report" : "Reports"}
                  </span>)}
                {aptViolations.length > 0 && (<span className="admin-apartments-row-14">
                    <AlertOctagon className="admin-apartments-alert-octagon-icon"/>{aptViolations.length}
                  </span>)}
              </div>
              {landlord && (<div className="admin-apartments-row-15">
                  <div className="admin-apartments-row-16">
                    {landlord.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="admin-apartments-span-10">{landlord.name}</span>
                  {landlord.isVerified && <CheckCircle2 className="admin-apartments-check-circle2-icon-2"/>}
                </div>)}
            </div>
            <div className="admin-apartments-panel-7">
              <h3 className="admin-apartments-heading-2">{apt.title}</h3>
              <p className="admin-apartments-text-5">
                <MapPin className="admin-apartments-map-pin-icon-2"/>{apt.location}
              </p>
              <div className="admin-apartments-row-17">
                <span className="admin-apartments-span-11">₱{apt.price?.toLocaleString()}<span className="admin-apartments-mo">/mo</span></span>
                <div className="admin-apartments-row-18">
                  {apt.wifi && <span className="admin-apartments-card-7"><Wifi className="admin-apartments-wifi-icon"/></span>}
                  {apt.parking && <span className="admin-apartments-card-7"><Car className="admin-apartments-car-icon"/></span>}
                  {apt.petFriendly && <span className="admin-apartments-card-7"><PawPrint className="admin-apartments-paw-print-icon"/></span>}
                  {apt.furnished && <span className="admin-apartments-card-7"><Sofa className="admin-apartments-sofa-icon"/></span>}
                </div>
              </div>
              <div className="admin-apartments-row-19" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" onClick={() => setSelectedApt(apt)} className="admin-apartments-inspect-2">
                  <Eye className="admin-apartments-eye-icon-2"/>Inspect
                </Button>
                {landlord && <>
                  <Button size="sm" variant="outline" onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)} className="admin-apartments-violation">
                    <AlertOctagon className="admin-apartments-alert-octagon-icon-2"/>Violation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)} className="admin-apartments-notice">
                    <Bell className="admin-apartments-bell-icon-2"/>Notice
                  </Button>
                </>}
              </div>
            </div>
          </div>);
        })}
    </div>
    {filteredApts.length === 0 && (<div className="admin-apartments-panel-8">
        <Building2 className="admin-apartments-building2-icon-6"/>
        <p className="admin-apartments-no-apartments-found">No apartments found</p>
      </div>)}

    {selectedApt && (() => {
            const landlord = getLandlordForApt(selectedApt);
            const landlordVerificationStatus = getLandlordVerificationStatus(landlord);
            const landlordCanPublish = canPublishForLandlord(landlord);
            const publicationBlockedByLandlord = selectedApt.isPublished === false && !landlordCanPublish;
            const aptViolations = violations.filter((v) => v.apartment_id === selectedApt.id || (!v.apartment_id && v.apartmentTitle === selectedApt.title));
            const aptReports = reports.filter((r) => r.apartmentId === selectedApt.id && r.status === "pending");
            const isAvailable = new Date(selectedApt.availableDate) <= new Date();
            return (<div className="admin-apartments-overlay" onClick={() => setSelectedApt(null)}>
          <div className="admin-apartments-overlay-2"/>
          <div className="admin-apartments-card-8" onClick={(e) => e.stopPropagation()}>
            <div className="admin-apartments-panel-9">
              {selectedApt.images?.[0]
                    ? <ImageWithFallback src={selectedApt.images[0]} alt={selectedApt.title} className="admin-apartments-image-with-fallback-2"/>
                    : <div className="admin-apartments-row-11"><Building2 className="admin-apartments-building2-icon-7"/></div>}
              <button onClick={() => setSelectedApt(null)} className="admin-apartments-button-2">
                <X className="admin-apartments-x-icon"/>
              </button>
              <div className="admin-apartments-panel-10">
                <span className={`admin-apartments-span-12 ${isAvailable ? "admin-apartments-span-8" : "admin-apartments-span-13"}`}>
                  {isAvailable ? "Published" : "Occupied"}
                </span>
              </div>
            </div>
            <div className="admin-apartments-panel-11">
              <div>
                <h3 className="admin-apartments-heading-3">{selectedApt.title}</h3>
                <p className="admin-apartments-text-6">
                  <MapPin className="admin-apartments-map-pin-icon-3"/>{selectedApt.location}
                </p>
              </div>
              <div className="admin-apartments-grid-2">
                {[
                    { label: "Room Pricing", value: "See individual rooms" },
                    { label: "Bedrooms", value: selectedApt.bedrooms ?? "—" },
                    { label: "Bathrooms", value: selectedApt.bathrooms ?? "—" },
                    { label: "Available", value: new Date(selectedApt.availableDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) },
                ].map(({ label, value }) => (<div key={label} className="admin-apartments-card-9">
                    <p className="admin-apartments-text-7">{label}</p>
                    <p className="admin-apartments-text-8">{value}</p>
                  </div>))}
              </div>
              {selectedApt.description && (<div>
                  <p className="admin-apartments-description">Description</p>
                  <p className="admin-apartments-text-9">{selectedApt.description}</p>
                </div>)}
              <div>
                <p className="admin-apartments-amenities">Amenities</p>
                <div className="admin-apartments-row-20">
                  {[
                    { key: "wifi", icon: Wifi, label: "WiFi" },
                    { key: "parking", icon: Car, label: "Parking" },
                    { key: "petFriendly", icon: PawPrint, label: "Pet-friendly" },
                    { key: "furnished", icon: Sofa, label: "Furnished" },
                ].map(({ key, icon: Icon, label }) => (<span key={key} className={`admin-apartments-card-10 ${selectedApt[key] ? "admin-apartments-span-14" : "admin-apartments-span-15"}`}>
                      <Icon className="admin-apartments-icon-icon-2"/>{label}
                    </span>))}
                </div>
              </div>
              {Array.isArray(selectedApt.features) && selectedApt.features.length > 0 && (<div>
                  <p className="admin-apartments-features">Features</p>
                  <div className="admin-apartments-row-20">
                    {selectedApt.features.map((f, i) => (<span key={i} className="admin-apartments-card-11">
                        {f}
                      </span>))}
                  </div>
                </div>)}
              {(selectedApt.rooms?.length ?? 0) > 0 && (<div>
                  <p className="admin-apartments-rooms">
                    Rooms ({selectedApt.rooms?.length ?? 0})
                  </p>
                  <div className="admin-apartments-panel-12">
                    {(selectedApt.rooms ?? []).map((room, i) => {
                        const roomData = room;
                        const roomState = getAdminRoomState(roomData);
                        return (<div key={String(roomData.id ?? i)} className="admin-apartments-card-12">
                        <div className="admin-apartments-row-17">
                          <span className="admin-apartments-span-16">{String(roomData.type ?? "Room")}</span>
                          <span className={`admin-apartments-span-17 ${roomState === "occupied" ? "admin-apartments-span-18" : roomState === "maintenance" ? "admin-apartments-span-19" : "admin-apartments-span-20"}`}>
                            {roomState === "occupied" ? "Occupied" : roomState === "maintenance" ? "Under Maintenance" : "Available"}
                          </span>
                        </div>
                        <div className="admin-apartments-grid-3">
                          {[
                                { label: "Rent", value: `₱${Number(roomData.rent ?? 0).toLocaleString()}/mo` },
                                { label: "Size", value: `${String(roomData.sqft ?? "—")} sqft` },
                                { label: "Max Pax", value: `${String(roomData.maxOccupants ?? "—")}` },
                            ].map(({ label, value }) => (<div key={label} className="admin-apartments-card-13">
                              <p className="admin-apartments-text-10">{label}</p>
                              <p className="admin-apartments-text-11">{value}</p>
                            </div>))}
                        </div>
                        <div className="admin-apartments-row-21">
                          {Boolean(roomData.hasPrivateBath) && (<span className="admin-apartments-card-14">
                              {roomData.bathroomType === "en-suite" ? "Private en-suite bath" : "Private separate bath"}
                            </span>)}
                          {!Boolean(roomData.hasPrivateBath) && (<span className="admin-apartments-shared-bath">
                              Shared bath{roomData.sharedBathLocation ? ` (${String(roomData.sharedBathLocation)})` : ""}
                            </span>)}
                          {Boolean(roomData.hasAC) && (<span className="admin-apartments-air-conditioned">
                              Air conditioned
                            </span>)}
                        </div>
                      </div>);
                    })}
                  </div>
                </div>)}
              {landlord && (<div>
                  <p className="admin-apartments-landlord">Landlord</p>
                  <div className="admin-apartments-card-15">
                    <div className="admin-apartments-row-22">
                      {landlord.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="admin-apartments-panel-13">
                      <p className="admin-apartments-text-12">{landlord.name}</p>
                      <p className="admin-apartments-text-13">{landlord.email}</p>
                    </div>
                    {landlordCanPublish
                        ? <Badge className="admin-apartments-verified"><CheckCircle2 className="admin-apartments-check-circle2-icon-3"/>Verified</Badge>
                        : <Badge className="admin-apartments-badge"><Clock className="admin-apartments-clock-icon"/>{landlordVerificationStatus}</Badge>}
                  </div>
                  {publicationBlockedByLandlord && (<div className="admin-apartments-card-16">
                      <p className="admin-apartments-text-14">
                        This apartment cannot be published because the landlord has not been verified.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => {
                            setSelectedApt(null);
                            setSelectedLandlord(landlord);
                        }} className="admin-apartments-review-landlord-verification">
                        <FileText className="admin-apartments-file-text-icon"/>
                        Review Landlord Verification
                      </Button>
                    </div>)}
                </div>)}
              {aptReports.length > 0 && (<div>
                  <p className="admin-apartments-pending-reports">
                    <Flag className="admin-apartments-flag-icon-3"/>
                    Pending Reports ({aptReports.length})
                  </p>
                  <div className="admin-apartments-panel-12">
                    {aptReports.map((r) => (<div key={r.id} className="admin-apartments-card-17">
                        <div className="admin-apartments-row-23">
                          <div className="admin-apartments-row-24">
                            <Badge className="admin-apartments-badge-2">{r.issueType}</Badge>
                            <span className="admin-apartments-by">by {r.reporter} ({r.role})</span>
                          </div>
                          <span className="admin-apartments-span-21">
                            {formatOptionalDate(r.submittedAt ?? r.submitted_at, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <p className="admin-apartments-text-15">{r.details}</p>
                        {r.contact && (<p className="admin-apartments-contact">Contact: {r.contact}</p>)}
                        <div className="admin-apartments-row-25">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); resolveReport(text(r.id)); }} className="admin-apartments-resolve">
                            <CheckCheck className="admin-apartments-check-check-icon"/>Resolve
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); dismissReport(text(r.id)); }} className="admin-apartments-dismiss">
                            <XCircle className="admin-apartments-xcircle-icon"/>Dismiss
                          </Button>
                        </div>
                      </div>))}
                  </div>
                </div>)}
              {aptViolations.length > 0 && (<div>
                  <p className="admin-apartments-violations-on-this-listing">Violations on this Listing</p>
                  <div className="admin-apartments-panel-12">
                    {aptViolations.map((v) => (<div key={v.id} className="admin-apartments-card-18">
                        <AlertOctagon className="admin-apartments-alert-octagon-icon-3"/>
                        <div>
                          <p className="admin-apartments-text-16">{v.type}</p>
                          {v.message && <p className="admin-apartments-text-17">{v.message}</p>}
                          <p className="admin-apartments-text-18">{formatOptionalDate(v.issuedAt ?? v.issued_at)}</p>
                        </div>
                      </div>))}
                  </div>
                </div>)}
            </div>
              {landlord && (<div className="admin-apartments-row-26">
                {selectedApt.isPublished === false && (<Button onClick={() => void handleApproveAndPublishApartment(selectedApt)} disabled={publishingApartmentId === selectedApt.id || publicationBlockedByLandlord} className="admin-apartments-button-3">
                    <CheckCircle2 className="admin-apartments-check-circle2-icon-4"/>
                    {publishingApartmentId === selectedApt.id ? "Publishing..." : "Approve & Publish"}
                  </Button>)}
                <Button onClick={() => navigate(`${apartmentDetailBasePath}/${selectedApt.id}`, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } })} className="admin-apartments-full-inspection">
                  <Eye className="admin-apartments-eye-icon-3"/>Full Inspection
                </Button>
                <Button onClick={() => { setSelectedApt(null); openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title, undefined, selectedApt.id); }} className="admin-apartments-issue-violation">
                  <AlertOctagon className="admin-apartments-alert-octagon-icon-4"/>Issue Violation
                </Button>
                <Button variant="outline" onClick={() => { setSelectedApt(null); openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), selectedApt.title, undefined, selectedApt.id); }} className="admin-apartments-send-notice">
                  <BellRing className="admin-apartments-bell-ring-icon"/>Send Notice
                </Button>
              </div>)}
          </div>
        </div>);
        })()}
    </div>);
}
