import { EvidenceViewer } from "@/admin/EvidenceViewer";
import "./AdminReports.css";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canArchiveReportStatus } from "@/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { Archive, ArrowLeft, Bell, Building2, Calendar, CheckCheck, CheckCircle2, Clock, Eye, Flag, Mail, Phone, RotateCcw, Search, Trash2, User as UserIcon, X, XCircle } from "lucide-react";
import { ArchiveEmpty, formatOptionalDate, OverviewEmpty, SEVERITY_LABEL, text } from './adminDashboardHelpers';
export function AdminReports({ reports, reportArchiveView, archivedReports, reportSearch, allApartments, reportStatusFilter, reportTypeFilter, reportSort, selectedReport, selectedReportDetails, setSelectedReport, setActiveSection, unreadNotifsCount, setViewingUserProfile, navigate, apartmentDetailBasePath, portalBasePath, selectedReportEvidence, resolveReport, setDismissReportModal, setCaseAction, setReportSearch, setReportStatusFilter, setReportTypeFilter, setReportSort, setReportArchiveView, dismissReportModal, dismissReport, viewingUserProfile, }) {
    const pending = reports.filter((r) => r.status === "pending");
    const resolved = reports.filter((r) => r.status === "resolved");
    const dismissed = reports.filter((r) => r.status === "dismissed");
    const reportSource = reportArchiveView ? archivedReports : reports;
    const reportTypes = Array.from(new Set(reportSource.map((report) => String(report.issueType ?? report.issue_type ?? report.category ?? "").trim()).filter(Boolean))).sort();
    const normalizedSearch = reportSearch.trim().toLowerCase();
    const getReportApartment = (report) => allApartments.find((apartment) => apartment.id === (report.apartmentId ?? report.apartment_id));
    const getReportApartmentTitle = (report) => report.apartment_title ?? report.apartment ?? getReportApartment(report)?.title ?? report.apartment_id ?? "Apartment unavailable";
    const getReporterLabel = () => "Anonymous Tenant";
    const visibleReports = reportSource
        .filter((report) => {
        const type = String(report.issueType ?? report.issue_type ?? report.category ?? "");
        const matchesStatus = reportArchiveView || reportStatusFilter === "all" || report.status === reportStatusFilter;
        const matchesType = reportTypeFilter === "all" || type === reportTypeFilter;
        const matchesSearch = !normalizedSearch || [getReportApartmentTitle(report), type, report.details, report.id]
            .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesStatus && matchesType && matchesSearch;
    })
        .sort((left, right) => {
        const leftTime = new Date(left.submittedAt ?? left.submitted_at ?? 0).getTime();
        const rightTime = new Date(right.submittedAt ?? right.submitted_at ?? 0).getTime();
        return reportSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
    const currentDate = new Date().toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    if (selectedReport) {
        const reportApartment = selectedReportDetails?.apartment ?? getReportApartment(selectedReport);
        const landlord = selectedReportDetails?.landlord;
        const reporterName = "Anonymous Tenant";
        const reporterRole = "Tenant";
        const issueType = String(selectedReport.issueType ?? selectedReport.issue_type ?? selectedReport.category ?? "Report type not specified");
        const apartmentName = selectedReport.apartment_title ?? selectedReport.apartment ?? reportApartment?.title;
        const statusClass = selectedReport.status === "resolved" ? "admin-tone-success-badge admin-status-border-success" : selectedReport.status === "dismissed" ? "admin-tone-muted-icon admin-status-border-muted" : "admin-status-pending";
        const sectionClass = "admin-reports-section";
        const sectionTitleClass = "admin-reports-1-reported-issue";
        return (<div className="admin-reports-container">
        <div className="admin-reports-row">
          <button onClick={() => setSelectedReport(null)} className="admin-reports-back-to-reports"><ArrowLeft className="admin-reports-arrow-left-icon"/>Back to Reports</button>
          <div className="admin-reports-row-2">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-reports-button"><Bell className="admin-reports-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-reports-span">{unreadNotifsCount}</span>}</button>
            <div className="admin-reports-card"><Calendar className="admin-reports-calendar-icon"/>{currentDate}</div>
          </div>
        </div>

        <header className="admin-reports-header">
          <div className="admin-reports-row-3">
            <span className="admin-reports-row-4"><Flag className="admin-reports-flag-icon"/></span>
            <div><h1 className="admin-reports-report-details">Report Details</h1><p className="admin-reports-text">Review the reported issue, related records, and submitted evidence.</p></div>
          </div>
        </header>
        <div className="admin-reports-row-5"><span className={`admin-reports-card-2 ${statusClass}`}>{selectedReport.status || "Pending"}</span><span className="admin-reports-submitted">Submitted {formatOptionalDate(selectedReport.submittedAt ?? selectedReport.submitted_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>

        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>1. Reported Issue</h2>
          <div className="admin-reports-grid">
            <div><p className="admin-reports-issue-type">Issue Type</p><p className="admin-reports-text-2">{issueType}</p></div>
            <div><p className="admin-reports-issue-description">Issue Description</p><p className="admin-reports-text-3">{selectedReport.details || "No description provided."}</p></div>
          </div>
        </section>

        <div className="admin-reports-grid-2">
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>2. Reported By</h2>
            <div className="admin-reports-row-6"><span className="admin-reports-row-7">AT</span><div className="admin-reports-panel"><p className="admin-reports-text-4">{reporterName}</p><p className="admin-reports-text-5">{reporterRole}</p></div></div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>3. Reported Apartment</h2>
            {reportApartment || apartmentName ? <><div className="admin-reports-row-8"><span className="admin-reports-row-9">{reportApartment?.image ? <ImageWithFallback src={reportApartment.image} alt={apartmentName || "Reported apartment"} className="admin-reports-image-with-fallback"/> : <Building2 className="admin-reports-building2-icon"/>}</span><div className="admin-reports-panel-2"><p className="admin-reports-text-7">{apartmentName || "Apartment unavailable"}</p>{reportApartment && <p className="admin-reports-text-8">{formatApartmentLocation(reportApartment) || "Location not provided"}</p>}</div></div><Button variant="outline" disabled={!reportApartment?.id} onClick={() => { if (reportApartment?.id) {
            setSelectedReport(null);
            navigate(`${apartmentDetailBasePath}/${reportApartment.id}`, { state: { returnTo: `${portalBasePath}?section=reports`, backLabel: "Back to Reports" } });
        } }} className="admin-reports-view-apartment"><Eye className="admin-reports-eye-icon"/>View Apartment</Button></> : <div className="admin-reports-panel-3"><p className="admin-reports-apartment-unavailable">Apartment unavailable</p><p className="admin-reports-text-9">The linked apartment information is currently unavailable.</p></div>}
          </section>
        </div>

        {landlord && <section className={sectionClass}><h2 className={sectionTitleClass}>4. Property Owner</h2><div className="admin-reports-content"><span className="admin-reports-row-10">{landlord.name?.[0]?.toUpperCase() || "L"}</span><div className="admin-reports-panel"><p className="admin-reports-text-4">{landlord.name}</p>{landlord.email && <p className="admin-reports-text-10"><Mail className="admin-reports-mail-icon-2"/>{landlord.email}</p>}{landlord.mobile && <p className="admin-reports-text-11"><Phone className="admin-reports-phone-icon"/>{landlord.mobile}</p>}</div><Button variant="outline" onClick={() => setViewingUserProfile(landlord)} className="admin-reports-view-landlord"><UserIcon className="admin-reports-user-icon-icon-2"/>View Landlord</Button></div></section>}

        <section className={sectionClass}><h2 className={sectionTitleClass}>5. Evidence ({selectedReportEvidence.length})</h2><div className="admin-reports-panel-3"><EvidenceViewer evidence={selectedReportEvidence} title="Submitted Evidence"/></div></section>

        <section className={sectionClass}><h2 className={sectionTitleClass}>6. Admin Decision</h2>{!reportArchiveView && selectedReport.status === "pending" ? <><p className="admin-reports-text-12">Verify the report before it becomes visible to the landlord, or dismiss it.</p><div className="admin-reports-grid-3"><Button onClick={() => resolveReport(text(selectedReport.id))} className="admin-reports-resolve-report"><CheckCheck className="admin-reports-check-check-icon"/>Verify Report</Button><Button variant="outline" onClick={() => setDismissReportModal({ reportId: text(selectedReport.id), reason: "" })} className="admin-reports-dismiss-report"><XCircle className="admin-reports-xcircle-icon"/>Dismiss Report</Button></div></> : <div className="admin-reports-panel-4"><p className="admin-reports-this-report-has-been">This report has been <span className="admin-reports-span-5">{selectedReport.status}</span> on {formatOptionalDate(selectedReport.resolved_at, { month: "short", day: "numeric" })}.</p>{!reportArchiveView && canArchiveReportStatus(selectedReport.status) && <Button variant="outline" onClick={() => setCaseAction({ type: "archive-report", id: text(selectedReport.id), label: selectedReport.apartment || text(selectedReport.id) })} className="admin-reports-archive"><Archive className="admin-reports-archive-icon"/>Archive</Button>}</div>}</section>
      </div>);
    }
    return (<div className="admin-reports-panel-11">
      <div className="admin-reports-container">
        <header className="admin-reports-header-2">
          <div className="admin-reports-row-15">
            <span className="admin-reports-card-4"><Flag className="admin-reports-flag-icon-2"/></span>
            <div><h1 className="admin-reports-reports">Reports</h1><p className="admin-reports-review-and-manage-reported-issues">Review and manage reported issues.</p></div>
          </div>
          <div className="admin-reports-row-16">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-reports-button-2"><Bell className="admin-reports-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-reports-span">{unreadNotifsCount}</span>}</button>
            <div className="admin-reports-card-5"><Calendar className="admin-reports-calendar-icon"/>{currentDate}</div>
          </div>
        </header>

        <section className="admin-reports-section-2">
          {[
            { label: "Pending Reports", value: pending.length, note: "Awaiting review", icon: Clock },
            { label: "Resolved Reports", value: resolved.length, note: "Successfully resolved", icon: CheckCircle2 },
            { label: "Dismissed Reports", value: dismissed.length, note: "No action required", icon: XCircle },
        ].map(({ label, value, note, icon: Icon }) => (<div key={label} className="admin-reports-card-6"><span className="admin-reports-row-17"><Icon className="admin-reports-icon-icon"/></span><span><span className="admin-reports-span-11">{value}</span><span className="admin-reports-span-12">{label}</span><span className="admin-reports-span-13">{note}</span></span></div>))}
        </section>

        <section className="admin-reports-section-3">
          <label className="admin-reports-label"><Search className="admin-reports-search-icon"/><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search reports by apartment, type, or ID" className="admin-reports-input"/></label>
          <select value={reportStatusFilter} onChange={(event) => setReportStatusFilter(event.target.value)} disabled={reportArchiveView} className="admin-reports-select"><option value="all">Status: All</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select>
          <select value={reportTypeFilter} onChange={(event) => setReportTypeFilter(event.target.value)} className="admin-reports-select-2"><option value="all">Type: All</option>{reportTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <select value={reportSort} onChange={(event) => setReportSort(event.target.value)} className="admin-reports-select-2"><option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option></select>
          <button onClick={() => setReportArchiveView((current) => !current)} className={`admin-reports-button-3 ${reportArchiveView ? "admin-reports-button-4" : "admin-reports-button-5"}`}><Archive className="admin-reports-archive-icon-2"/>{reportArchiveView ? "Current Reports" : `Archived (${archivedReports.length})`}</button>
        </section>

        <section className="admin-reports-section-4">
          {reportArchiveView && archivedReports.length === 0 ? (<ArchiveEmpty kind="reports" icon={Flag}/>) : !reportArchiveView && reports.length === 0 ? (<div className="admin-reports-content-2"><span className="admin-reports-row-18"><Flag className="admin-reports-flag-icon-3"/></span><h3 className="admin-reports-no-reports-submitted-yet">No reports submitted yet.</h3><p className="admin-reports-text-16">Reports submitted by tenants will appear here for review.</p></div>) : visibleReports.length === 0 ? (<OverviewEmpty icon={Search} text="No reports match the selected filters."/>) : (<div className="admin-reports-panel-12">
              {visibleReports.map((report) => {
                const apartment = getReportApartment(report);
                const severity = SEVERITY_LABEL[report.severity ?? "med"] ?? SEVERITY_LABEL.med;
                const reporterLabel = getReporterLabel(report);
                const reporterIsId = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(reporterLabel);
                const statusClass = report.status === "resolved" ? "admin-reports-span-2" : report.status === "dismissed" ? "admin-reports-span-3" : "admin-reports-span-4";
                return (<article key={report.id} onClick={() => setSelectedReport(report)} className="admin-reports-article">
                    <div className="admin-reports-row-19">
                      <span className="admin-reports-row-20">{apartment?.image ? <ImageWithFallback src={apartment.image} alt={apartment.title} className="admin-reports-image-with-fallback"/> : <Flag className="admin-reports-flag-icon-4"/>}</span>
                      <div className="admin-reports-panel-2"><p className="admin-reports-apartment">Apartment</p><h3 className="admin-reports-heading">{getReportApartmentTitle(report)}</h3>{apartment && <p className="admin-reports-text-17">{formatApartmentLocation(apartment) || "Location not provided"}</p>}</div>
                    </div>
                    <div className="admin-reports-panel-2"><p className="admin-reports-reported-issue">Reported issue</p><p className="admin-reports-text-18">{String(report.issueType ?? report.issue_type ?? report.category ?? "Report type not specified")}</p><p className="admin-reports-text-19">{report.details || "No description provided."}</p></div>
                    <div className="admin-reports-panel-2"><p className="admin-reports-reported-by">Reported by</p><p className={`admin-reports-text-20 ${reporterIsId ? "admin-reports-text-21" : "admin-reports-text-22"}`}>{reporterLabel}</p><p className="admin-reports-text-23">{reporterIsId ? "Reporter ID" : report.reporter_role ?? report.role ?? "Role unavailable"}</p></div>
                    <div><p className="admin-reports-submitted-2">Submitted</p><p className="admin-reports-text-24">{formatOptionalDate(report.submittedAt ?? report.submitted_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                    <div className="admin-reports-panel-2"><div className="admin-reports-row-21"><span className={`admin-reports-card-7 ${statusClass}`}>{report.status || "Pending"}</span><span className={`admin-reports-card-8 ${severity.class}`}>{severity.label}</span></div>
                    <div className="admin-reports-grid-4" onClick={(event) => event.stopPropagation()}>
                      <Button size="sm" onClick={() => setSelectedReport(report)} className="admin-reports-review-report"><Eye className="admin-reports-eye-icon-2"/>Review Report</Button>
                      {reportArchiveView ? <><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "restore-report", id: text(report.id), label: getReportApartmentTitle(report) })} className="admin-reports-restore"><RotateCcw className="admin-reports-rotate-ccw-icon"/>Restore</Button><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "delete-report", id: text(report.id), label: getReportApartmentTitle(report) })} className="admin-reports-delete"><Trash2 className="admin-reports-trash2-icon"/>Delete</Button></> : <><Button size="sm" variant="outline" disabled={!apartment?.id} onClick={() => apartment?.id && navigate(`${apartmentDetailBasePath}/${apartment.id}`, { state: { returnTo: `${portalBasePath}?section=reports`, backLabel: "Back to Reports" } })} className="admin-reports-view-apartment-2"><Building2 className="admin-reports-building2-icon-2"/>View Apartment</Button>{canArchiveReportStatus(report.status) && <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "archive-report", id: text(report.id), label: getReportApartmentTitle(report) })} className="admin-reports-archive-2"><Archive className="admin-reports-archive-icon-3"/>Archive</Button>}</>}
                    </div></div>
                  </article>);
            })}
            </div>)}
        </section>
      </div>

      {dismissReportModal && (<div className="admin-reports-overlay" onClick={() => setDismissReportModal(null)}>
          <div className="admin-reports-overlay-2"/>
          <div className="admin-reports-card-12" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-reports-dismiss-report-2">Dismiss Report</h3>
            <p className="admin-reports-text-28">
              Why are you dismissing this report? (Optional)
            </p>
            <textarea value={dismissReportModal.reason} onChange={(e) => setDismissReportModal({ ...dismissReportModal, reason: e.target.value })} placeholder="e.g., Investigation inconclusive, False complaint, Already resolved by landlord..." className="admin-reports-textarea" rows={4}/>
            <div className="admin-reports-row-25">
              <Button variant="outline" onClick={() => setDismissReportModal(null)} className="admin-reports-cancel">
                Cancel
              </Button>
              <Button onClick={() => {
                if (dismissReportModal.reportId) {
                    dismissReport(dismissReportModal.reportId, dismissReportModal.reason || undefined);
                }
            }} className="admin-reports-confirm-dismissal">
                Confirm Dismissal
              </Button>
            </div>
          </div>
        </div>)}

      {viewingUserProfile && (<div className="admin-reports-overlay" onClick={() => setViewingUserProfile(null)}>
          <div className="admin-reports-overlay-2"/>
          <div className="admin-reports-card-13" onClick={(e) => e.stopPropagation()}>
            <div className="admin-reports-row-26">
              <h3 className="admin-reports-user-profile">User Profile</h3>
              <button onClick={() => setViewingUserProfile(null)} className="admin-reports-button-6">
                <X className="admin-reports-x-icon"/>
              </button>
            </div>
            <div className="admin-reports-panel-17">
              <div className="admin-reports-row-3">
                <div className="admin-reports-row-27">
                  {viewingUserProfile.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="admin-reports-text-29">{viewingUserProfile.name}</p>
                  <p className="admin-reports-text-30">{viewingUserProfile.role}</p>
                </div>
              </div>
              <div className="admin-reports-panel-18">
                <div>
                  <p className="admin-reports-email">Email</p>
                  <p className="admin-reports-text-31">{viewingUserProfile.email}</p>
                </div>
                {viewingUserProfile.mobile && (<div>
                    <p className="admin-reports-phone">Phone</p>
                    <p className="admin-reports-text-31">{viewingUserProfile.mobile}</p>
                  </div>)}
                {typeof viewingUserProfile.address === "string" && viewingUserProfile.address.length > 0 && (<div>
                    <p className="admin-reports-address">Address</p>
                    <p className="admin-reports-text-31">{viewingUserProfile.address}</p>
                  </div>)}
                {viewingUserProfile.is_verified !== undefined && (<div>
                    <p className="admin-reports-verification">Verification</p>
                    <Badge className={`admin-reports-badge ${viewingUserProfile.is_verified ? "admin-reports-badge-2" : "admin-reports-badge-3"}`}>
                      {viewingUserProfile.is_verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>)}
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
