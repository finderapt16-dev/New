import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canArchiveAppealStatus, updateAppealStatus } from "@/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { AlertTriangle, Archive, ArrowLeft, Bell, Building2, Calendar, Eye, FileText, Flag, Mail, Phone, RotateCcw, Search, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ArchiveEmpty, formatOptionalDate, OverviewEmpty, text } from './adminDashboardHelpers';
export function AdminAppeals({ landlords, reports, archivedReports, violations, allApartments, appealSearch, appealArchiveView, archivedAppeals, appeals, appealTypeFilter, appealSort, selectedAppeal, user, appealStatus, appealResponse, setAppeals, setSelectedAppeal, setAppealResponse, setAppealStatus, setActiveSection, unreadNotifsCount, setSelectedReport, navigate, apartmentDetailBasePath, portalBasePath, setCaseAction, setAppealSearch, setAppealTypeFilter, setAppealSort, setAppealArchiveView, }) {
    const landlordMap = new Map();
    landlords.forEach((l) => {
        if (l.id)
            landlordMap.set(l.id, l);
    });
    const getAppealMetadata = (appeal, kind) => {
        const documents = Array.isArray(appeal.supporting_docs) ? appeal.supporting_docs : [];
        return [...documents].reverse().find((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && entry.kind === kind);
    };
    const getAppealContext = (appeal) => {
        const report = reports.find((item) => item.id === appeal.report_id) ?? archivedReports.find((item) => item.id === appeal.report_id);
        const violation = violations.find((item) => item.id === appeal.violation_id);
        const source = getAppealMetadata(appeal, "source");
        const apartmentId = String(report?.apartment_id ?? report?.apartmentId ?? violation?.apartment_id ?? source?.apartment_id ?? "");
        const apartment = allApartments.find((item) => item.id === apartmentId);
        return { report, violation, source, apartmentId, apartment };
    };
    const normalizedSearch = appealSearch.trim().toLowerCase();
    const appealSource = appealArchiveView ? archivedAppeals : appeals;
    const visibleAppeals = appealSource
        .filter((appeal) => {
        const landlord = landlordMap.get(appeal.landlord_id ?? "");
        const type = appeal.report_id ? "report" : appeal.violation_id ? "violation" : "general";
        const matchesType = appealTypeFilter === "all" || appealTypeFilter === type;
        const context = getAppealContext(appeal);
        const matchesSearch = !normalizedSearch || [landlord?.name, landlord?.email, appeal.reason, appeal.description, appeal.id, context.apartment?.title, context.source?.related_label]
            .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        return matchesType && matchesSearch;
    })
        .sort((left, right) => {
        const leftTime = new Date(left.submitted_at ?? left.created_at ?? 0).getTime();
        const rightTime = new Date(right.submitted_at ?? right.created_at ?? 0).getTime();
        return appealSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
    const reportAppealCount = appeals.filter((appeal) => Boolean(appeal.report_id)).length;
    const violationAppealCount = appeals.filter((appeal) => Boolean(appeal.violation_id)).length;
    const pendingAppealCount = appeals.filter((appeal) => appeal.status === "pending" || appeal.status === "under_review" || appeal.status === "needs_information").length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    const handleUpdateAppealStatus = async () => {
        if (!selectedAppeal?.id || !user?.id) {
            toast.error("Cannot update appeal - missing information");
            return;
        }
        if (["needs_information", "approved", "rejected", "dismissed"].includes(appealStatus) && !appealResponse.trim()) {
            toast.error("Please enter a message for the landlord.");
            return;
        }
        try {
            const updated = await updateAppealStatus(selectedAppeal.id, appealStatus, user.id, appealResponse.trim());
            if (updated) {
                toast.success(`Appeal marked as ${appealStatus.replace(/_/g, " ")}`);
                setAppeals((prev) => prev.map((a) => (a.id === selectedAppeal.id ? updated : a)));
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
            }
            else {
                toast.error("Failed to update appeal");
            }
        }
        catch (error) {
            console.error("Error updating appeal:", error);
            toast.error("Error updating appeal");
        }
    };
    if (selectedAppeal) {
        const landlord = landlordMap.get(selectedAppeal.landlord_id ?? "");
        const context = getAppealContext(selectedAppeal);
        const appealType = selectedAppeal.report_id ? "Report Appeal" : selectedAppeal.violation_id ? context.violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal" : "General Appeal";
        const evidenceDocuments = (selectedAppeal.supporting_docs ?? []).map((doc, index) => {
            const document = typeof doc === "object" && doc !== null && !Array.isArray(doc) ? doc : null;
            if (document && document.kind !== "evidence")
                return null;
            const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
            const name = String(document?.file_name ?? document?.name ?? `Supporting evidence ${index + 1}`);
            return { url, name };
        }).filter((document) => Boolean(document));
        const relatedReportTitle = context.report ? String(context.report.issueType ?? context.report.issue_type ?? context.report.category ?? context.report.apartment_title ?? "Related report") : "Report unavailable";
        const statusClass = selectedAppeal.status === "approved" ? "admin-tone-success-badge admin-status-border-success" : selectedAppeal.status === "rejected" || selectedAppeal.status === "dismissed" ? "admin-tone-muted-icon admin-status-border-muted" : "admin-status-pending";
        const sectionClass = "admin-appeals-section";
        const headingClass = "admin-appeals-1-appeal-submitted-by";
        return <div className="admin-appeals-container">
      <div className="admin-appeals-row"><button onClick={() => { setSelectedAppeal(null); setAppealResponse(""); setAppealStatus("under_review"); }} className="admin-appeals-back-to-appeals"><ArrowLeft className="admin-appeals-arrow-left-icon"/>Back to Appeals</button><div className="admin-appeals-row-2"><button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-appeals-button"><Bell className="admin-appeals-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-appeals-span">{unreadNotifsCount}</span>}</button><div className="admin-appeals-card"><Calendar className="admin-appeals-calendar-icon"/>{currentDate}</div></div></div>

      <header className="admin-appeals-header"><span className="admin-appeals-row-3"><Flag className="admin-appeals-flag-icon"/></span><div><h1 className="admin-appeals-review-appeal">Review Appeal</h1><p className="admin-appeals-text">Review the appeal, related case, supporting evidence, and administrative decision.</p></div></header>
      <div className="admin-appeals-row-4"><span className="admin-appeals-card-2">{appealType}</span><span className={`admin-appeals-card-3 ${statusClass}`}>{String(selectedAppeal.status || "Pending").replace(/_/g, " ")}</span><span className="admin-appeals-submitted">Submitted {formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>

      <section className={sectionClass}><h2 className={headingClass}>1. Appeal Submitted By</h2><div className="admin-appeals-row-5"><span className="admin-appeals-row-6">{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span><div className="admin-appeals-panel"><p className="admin-appeals-text-2">{landlord?.name || "Landlord unavailable"}</p>{landlord?.email && <p className="admin-appeals-text-3"><Mail className="admin-appeals-mail-icon"/>{landlord.email}</p>}{landlord?.mobile && <p className="admin-appeals-text-4"><Phone className="admin-appeals-phone-icon"/>{landlord.mobile}</p>}</div></div></section>

      <section className={sectionClass}><h2 className={headingClass}>2. Related Case</h2><div className="admin-appeals-grid"><div><p className="admin-appeals-appeal-type">Appeal Type</p><p className="admin-appeals-text-5">{appealType}</p><p className="admin-appeals-apartment">Apartment</p><p className="admin-appeals-text-5">{context.apartment?.title || String(context.source?.apartment_title ?? "Apartment unavailable")}</p>{context.apartment && <p className="admin-appeals-text-6">{formatApartmentLocation(context.apartment) || "Location not provided"}</p>}</div><div><p className="admin-appeals-text-7">{selectedAppeal.report_id ? "Related Report" : selectedAppeal.violation_id ? "Related Violation" : "Related Record"}</p><p className="admin-appeals-text-5">{selectedAppeal.report_id ? relatedReportTitle : selectedAppeal.violation_id ? context.violation?.mode === "notice" ? "Administrative notice" : "Administrative violation" : String(context.source?.related_label ?? "Unavailable")}</p>{(selectedAppeal.report_id || selectedAppeal.violation_id) && <p className="admin-appeals-record-id">Record ID: {selectedAppeal.report_id || selectedAppeal.violation_id}</p>}</div></div><div className="admin-appeals-row-7">{context.report && <Button variant="outline" onClick={() => { setSelectedReport(context.report); setActiveSection("reports"); }} className="admin-appeals-view-report"><Eye className="admin-appeals-eye-icon"/>View Report</Button>}{context.apartmentId && <Button variant="outline" onClick={() => navigate(`${apartmentDetailBasePath}/${context.apartmentId}`, { state: { returnTo: `${portalBasePath}?section=appeals`, backLabel: "Back to Appeals" } })} className="admin-appeals-view-apartment"><Building2 className="admin-appeals-building2-icon"/>View Apartment</Button>}</div></section>

      <section className={sectionClass}><h2 className={headingClass}>3. Appeal Reason</h2><div className="admin-appeals-panel-2"><p className="admin-appeals-reason">Reason</p><p className="admin-appeals-text-8">{selectedAppeal.reason || "—"}</p>{selectedAppeal.description && <div className="admin-appeals-panel-3"><p className="admin-appeals-landlord-apos-s-explanation">Landlord&apos;s Explanation</p><p className="admin-appeals-text-9">{selectedAppeal.description}</p></div>}</div></section>

      <section className={sectionClass}><h2 className={headingClass}>4. Supporting Evidence ({evidenceDocuments.length})</h2>{evidenceDocuments.length > 0 ? <div className="admin-appeals-panel-4">{evidenceDocuments.map((document, index) => <div key={`${document.url}-${index}`} className="admin-appeals-card-4"><span className="admin-appeals-row-8"><FileText className="admin-appeals-file-text-icon"/></span><div className="admin-appeals-panel-5"><p className="admin-appeals-text-10">{document.name}</p><p className="admin-appeals-submitted-evidence">Submitted evidence</p></div>{document.url && <a href={document.url} target="_blank" rel="noreferrer" className="admin-appeals-preview"><Eye className="admin-appeals-eye-icon-2"/>Preview</a>}</div>)}</div> : <p className="admin-appeals-no-supporting-evidence-submitted">No supporting evidence submitted.</p>}</section>

      <section className={sectionClass}><h2 className={headingClass}>5. Admin Decision</h2>{selectedAppeal.admin_response && <div className="admin-appeals-card-5"><div className="admin-appeals-row-9"><div><p className="admin-appeals-decision">Decision</p><span className={`admin-appeals-card-6 ${statusClass}`}>{String(selectedAppeal.status || "Pending").replace(/_/g, " ")}</span></div>{selectedAppeal.reviewed_at && <div><p className="admin-appeals-decision-date">Decision Date</p><p className="admin-appeals-text-11">{formatOptionalDate(selectedAppeal.reviewed_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>}</div><div className="admin-appeals-panel-6"><p className="admin-appeals-admin-response">Admin Response</p><p className="admin-appeals-text-12">{selectedAppeal.admin_response}</p></div></div>}
        <div className="admin-appeals-panel-2"><label className="admin-appeals-update-status">Update Status</label><div className="admin-appeals-grid-2">{["under_review", "needs_information", "approved", "rejected", "dismissed"].map((status) => <Button key={status} disabled={appealArchiveView} onClick={() => setAppealStatus(status)} className={`admin-appeals-button-2 ${appealStatus === status ? "admin-appeals-button-3" : "admin-appeals-button-4"}`}>{status === "under_review" ? "Under Review" : status === "needs_information" ? "Request Info" : status.charAt(0).toUpperCase() + status.slice(1)}</Button>)}</div></div>
        <div className="admin-appeals-panel-2"><label className="admin-appeals-admin-response-message">Admin Response Message</label><textarea disabled={appealArchiveView} value={appealResponse} onChange={(event) => setAppealResponse(event.target.value)} placeholder="Enter your decision and explanation..." className="admin-appeals-textarea"/></div>
        <div className="admin-appeals-row-7"><Button disabled={appealArchiveView} onClick={handleUpdateAppealStatus} className="admin-appeals-save-appeal-decision">Save Appeal Decision</Button><Button onClick={() => { setSelectedAppeal(null); setAppealResponse(""); setAppealStatus("under_review"); }} variant="outline" className="admin-appeals-cancel">Cancel</Button></div>{!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && <Button variant="outline" onClick={() => setCaseAction({ type: "archive-appeal", id: text(selectedAppeal.id), label: selectedAppeal.reason || text(selectedAppeal.id) })} className="admin-appeals-archive"><Archive className="admin-appeals-archive-icon"/>Archive</Button>}</section>
    </div>;
    }
    return ((selectedAppeal) => (<div className="admin-appeals-panel-7">
      <header className="admin-appeals-header-2">
        <div className="admin-appeals-row-10">
          <span className="admin-appeals-card-7"><Flag className="admin-appeals-flag-icon-2"/></span>
          <div><h1 className="admin-appeals-appeals">Appeals</h1><p className="admin-appeals-review-and-manage-landlord-appeals">Review and manage landlord appeals.</p></div>
        </div>
        <div className="admin-appeals-row-11">
          <button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-appeals-button-5"><Bell className="admin-appeals-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-appeals-span">{unreadNotifsCount}</span>}</button>
          <div className="admin-appeals-card-8"><Calendar className="admin-appeals-calendar-icon"/>{currentDate}</div>
        </div>
      </header>

      <div className="admin-appeals-panel-8">
        <div className="admin-appeals-row-2">
          <AlertTriangle className="admin-appeals-alert-triangle-icon"/>
          <h2 className="admin-appeals-appeal-management">
            Appeal Management ({appeals.length})
          </h2>
        </div>
      </div>

      {selectedAppeal ? (
        // Detail view
        <div className="admin-appeals-panel-9">
          <Button onClick={() => {
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
            }} variant="outline" className="admin-appeals-back-to-appeals-2">
            Back to Appeals
          </Button>

          <Card className="admin-appeals-card-9">
            <CardContent className="admin-appeals-card-content">
              {selectedAppeal.landlord_id && (<div className="admin-appeals-card-10">
                  <h3 className="admin-appeals-landlord-information">Landlord Information</h3>
                  {(() => {
                    const landlord = landlordMap.get(selectedAppeal.landlord_id);
                    return landlord ? (<div className="admin-appeals-panel-10">
                        <p><strong>Name:</strong> {landlord.name || "—"}</p>
                        <p><strong>Email:</strong> {landlord.email || "—"}</p>
                        <p><strong>Phone:</strong> {landlord.mobile || "—"}</p>
                      </div>) : (<p className="admin-appeals-landlord-record-unavailable">Landlord record unavailable.</p>);
                })()}
                </div>)}

              {(() => {
                const context = getAppealContext(selectedAppeal);
                const contact = getAppealMetadata(selectedAppeal, "contact");
                return <div className="admin-appeals-grid-3">
                  <div><p className="admin-appeals-apartment-2">Apartment</p><p className="admin-appeals-text-13">{context.apartment?.title || String(context.source?.apartment_title ?? "Unavailable")}</p>{context.apartmentId && <Button size="sm" variant="outline" onClick={() => navigate(`${apartmentDetailBasePath}/${context.apartmentId}`, { state: { returnTo: `${portalBasePath}?section=appeals`, backLabel: "Back to Appeals" } })} className="admin-appeals-open-apartment"><Eye className="admin-appeals-eye-icon-3"/>Open Apartment</Button>}</div>
                  <div><p className="admin-appeals-related-record">Related record</p><p className="admin-appeals-text-14">{selectedAppeal.violation_id ? `${context.violation?.mode === "notice" ? "Notice" : "Violation"}: ${selectedAppeal.violation_id}` : selectedAppeal.report_id ? `Report: ${selectedAppeal.report_id}` : String(context.source?.related_label ?? "Admin message")}</p>{context.report && <Button size="sm" variant="outline" onClick={() => { setSelectedReport(context.report); setActiveSection("reports"); }} className="admin-appeals-open-report"><Flag className="admin-appeals-flag-icon-3"/>Open Report</Button>}</div>
                  <div><p className="admin-appeals-contact-information">Contact information</p><p className="admin-appeals-text-14">{String(contact?.value ?? landlordMap.get(selectedAppeal.landlord_id ?? "")?.email ?? "Not provided")}</p></div>
                <div><p className="admin-appeals-submitted-2">Submitted</p><p className="admin-appeals-text-15">{formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                </div>;
            })()}

              <div className="admin-appeals-panel-11">
                <h3 className="admin-appeals-appeal-details">Appeal Details</h3>

                {selectedAppeal.report_id && (<div className="admin-appeals-card-11">
                    <Badge className="admin-appeals-report-appeal">Report Appeal</Badge>
                    <p className="admin-appeals-text-16">Linked report information is available to the review workflow.</p>
                  </div>)}

                {selectedAppeal.violation_id && (<div className="admin-appeals-card-12">
                    <Badge className="admin-appeals-badge">{getAppealContext(selectedAppeal).violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal"}</Badge>
                    <p className="admin-appeals-the-linked">The linked {getAppealContext(selectedAppeal).violation?.mode === "notice" ? "notice" : "violation"} is attached to this review.</p>
                  </div>)}

                <div>
                  <label className="admin-appeals-reason-for-appeal">Reason for Appeal</label>
                  <div className="admin-appeals-card-13">
                    {selectedAppeal.reason || "—"}
                  </div>
                </div>

                {selectedAppeal.description && (<div>
                    <label className="admin-appeals-description">Description</label>
                    <div className="admin-appeals-card-13">
                      {selectedAppeal.description}
                    </div>
                  </div>)}

                {selectedAppeal.supporting_docs && selectedAppeal.supporting_docs.some((doc) => typeof doc === "string" || (doc && typeof doc === "object" && !Array.isArray(doc) && doc.kind === "evidence")) && (<div>
                    <label className="admin-appeals-supporting-documents">Supporting Documents</label>
                    <div className="admin-appeals-panel-12">
                      {selectedAppeal.supporting_docs.map((doc, i) => {
                    const document = typeof doc === "object" && doc !== null ? doc : null;
                    if (document && document.kind !== "evidence")
                        return null;
                    const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
                    const name = String(document?.file_name ?? document?.name ?? `Supporting document ${i + 1}`);
                    return url ? (<a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer" className="admin-appeals-a">{name}</a>) : (<p key={i} className="admin-appeals-text-17">{name}</p>);
                })}
                    </div>
                  </div>)}

                <div className="admin-appeals-grid-4">
                  <div>
                    <p className="admin-appeals-submitted-3">Submitted</p>
                    <p className="admin-appeals-text-18">
                      {selectedAppeal.submitted_at
                ? new Date(selectedAppeal.submitted_at).toLocaleDateString("en-PH")
                : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="admin-appeals-status">Status</p>
                    <Badge className={`admin-appeals-badge-2 ${selectedAppeal.status === "pending"
                ? "admin-appeals-badge-3"
                : selectedAppeal.status === "under_review"
                    ? "admin-appeals-badge-4"
                    : selectedAppeal.status === "approved"
                        ? "admin-appeals-badge-5"
                        : "admin-appeals-badge-6"}`}>
                      {selectedAppeal.status?.toUpperCase() || "PENDING"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="admin-appeals-panel-13">
                <h3 className="admin-appeals-admin-response-2">Admin Response</h3>

                {selectedAppeal.admin_response && (<div className="admin-appeals-card-14">
                    <p className="admin-appeals-previous-response">Previous Response</p>
                    <p className="admin-appeals-text-19">{selectedAppeal.admin_response}</p>
                  </div>)}

                <div>
                  <label className="admin-appeals-update-status-2">Update Status</label>
                  <div className="admin-appeals-grid-5">
                    {["under_review", "needs_information", "approved", "rejected", "dismissed"].map((status) => (<Button key={status} disabled={appealArchiveView} onClick={() => setAppealStatus(status)} className={`admin-appeals-button-6 ${appealStatus === status
                    ? status === "under_review" ? "admin-appeals-button-7"
                        : status === "needs_information" ? "admin-appeals-button-8"
                            : status === "approved" ? "admin-appeals-button-9"
                                : status === "dismissed" ? "admin-appeals-button-10"
                                    : "admin-appeals-button-11"
                    : "admin-appeals-button-12"}`}>
                        {status === "under_review" ? "Under Review" : status === "needs_information" ? "Request Info" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>))}
                  </div>
                </div>

                <div>
                  <label className="admin-appeals-admin-response-message-2">Admin Response Message</label>
                  <textarea disabled={appealArchiveView} value={appealResponse} onChange={(e) => setAppealResponse(e.target.value)} placeholder="Enter your decision and explanation..." className="resize-vertical"/>
                </div>

                <div className="admin-appeals-row-12">
                  <Button disabled={appealArchiveView} onClick={handleUpdateAppealStatus} className="admin-appeals-save-appeal-decision-2">
                    Save Appeal Decision
                  </Button>
                  <Button onClick={() => {
                setSelectedAppeal(null);
                setAppealResponse("");
                setAppealStatus("under_review");
            }} variant="outline" className="admin-appeals-cancel-2">
                    Cancel
                  </Button>
                </div>
                {!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && (<Button variant="outline" onClick={() => setCaseAction({ type: "archive-appeal", id: text(selectedAppeal.id), label: selectedAppeal.reason || text(selectedAppeal.id) })} className="admin-appeals-archive-2">
                    <Archive className="admin-appeals-archive-icon-2"/>Archive
                  </Button>)}
              </div>
            </CardContent>
          </Card>
        </div>) : (
        // List view
        <div className="admin-appeals-container">
          <section className="admin-appeals-section-2">
            {[
                { label: "Active Appeals", value: pendingAppealCount, note: "Awaiting Admin review", icon: AlertTriangle },
                { label: "Report Appeals", value: reportAppealCount, note: "Related to reports", icon: Flag },
                { label: "Violation Appeals", value: violationAppealCount, note: "Related to violations", icon: ShieldAlert },
            ].map(({ label, value, note, icon: Icon }) => (<div key={label} className="admin-appeals-card-15"><span className="admin-appeals-row-13"><Icon className="admin-appeals-icon-icon"/></span><span><span className="admin-appeals-span-5">{value}</span><span className="admin-appeals-span-6">{label}</span><span className="admin-appeals-span-7">{note}</span></span></div>))}
          </section>

          <section className="admin-appeals-section-3">
            <label className="admin-appeals-label"><Search className="admin-appeals-search-icon"/><input value={appealSearch} onChange={(event) => setAppealSearch(event.target.value)} placeholder="Search appeals by landlord, reason, email, or ID" className="admin-appeals-input"/></label>
            <select value={appealTypeFilter} onChange={(event) => setAppealTypeFilter(event.target.value)} className="admin-appeals-select"><option value="all">Type: All Appeals</option><option value="report">Report Appeals</option><option value="violation">Violation Appeals</option><option value="general">General Appeals</option></select>
            <select value={appealSort} onChange={(event) => setAppealSort(event.target.value)} className="admin-appeals-select"><option value="newest">Sort by: Newest</option><option value="oldest">Sort by: Oldest</option></select>
          </section>

          <nav className="admin-appeals-nav">
            <button onClick={() => setAppealArchiveView(false)} className={`admin-appeals-active ${!appealArchiveView ? "admin-appeals-active-2" : "admin-appeals-active-3"}`}>Active <span className={`admin-appeals-span-8 ${!appealArchiveView ? "admin-appeals-span-9" : "admin-appeals-span-10"}`}>{appeals.length}</span></button>
            <button onClick={() => setAppealArchiveView(true)} className={`admin-appeals-archived ${appealArchiveView ? "admin-appeals-archived-2" : "admin-appeals-archived-3"}`}>Archived <span className={`admin-appeals-span-8 ${appealArchiveView ? "admin-appeals-span-9" : "admin-appeals-span-10"}`}>{archivedAppeals.length}</span></button>
          </nav>

          {appealArchiveView && archivedAppeals.length === 0 ? (<section className="admin-appeals-section-4"><ArchiveEmpty kind="appeals" icon={FileText}/></section>) : !appealArchiveView && appeals.length === 0 ? (<section className="admin-appeals-section-5"><span className="admin-appeals-row-14"><AlertTriangle className="admin-appeals-alert-triangle-icon-2"/></span><h3 className="admin-appeals-no-appeals-submitted">No appeals submitted.</h3><p className="admin-appeals-text-20">Landlord appeals will appear here when submitted.</p></section>) : visibleAppeals.length === 0 ? (<section className="admin-appeals-section-6"><OverviewEmpty icon={Search} text="No appeals match the selected filters."/></section>) : (<section className="admin-appeals-section-7">
              <div className="admin-appeals-grid-6"><span>Landlord</span><span>Appeal Type</span><span>Related Record</span><span>Reason</span><span>Status</span><span>Submitted</span><span>Actions</span></div>
              <div className="admin-appeals-panel-14">{visibleAppeals.map((appeal) => {
                    const landlord = landlordMap.get(appeal.landlord_id ?? "");
                    const context = getAppealContext(appeal);
                    const type = appeal.report_id ? "Report Appeal" : appeal.violation_id ? context.violation?.mode === "notice" ? "Notice Appeal" : "Violation Appeal" : "General Appeal";
                    const relatedRecord = appeal.report_id ? `Report: ${context.apartment?.title || String(context.source?.apartment_title ?? "Unavailable")}` : appeal.violation_id ? `${context.violation?.mode === "notice" ? "Notice" : "Violation"}: ${context.apartment?.title || "Unavailable"}` : String(context.source?.related_label ?? "Unavailable");
                    const statusClass = appeal.status === "approved" ? "admin-appeals-span-2" : appeal.status === "rejected" || appeal.status === "dismissed" ? "admin-appeals-span-3" : "admin-appeals-span-4";
                    return <article key={appeal.id} onClick={() => setSelectedAppeal(appeal)} className="admin-appeals-article">
                  <div className="admin-appeals-row-15">{landlord?.avatar_url ? <img src={landlord.avatar_url} alt="" className="admin-appeals-image"/> : <span className="admin-appeals-row-16">{landlord?.name?.[0]?.toUpperCase() ?? "L"}</span>}<div className="admin-appeals-panel"><p className="admin-appeals-landlord">Landlord</p><h3 className="admin-appeals-heading">{landlord?.name || "Landlord unavailable"}</h3><p className="admin-appeals-text-21">{landlord?.email || "Contact unavailable"}</p>{landlord?.mobile && <p className="admin-appeals-text-22"><Phone className="admin-appeals-phone-icon-2"/>{landlord.mobile}</p>}</div></div>
                  <div><p className="admin-appeals-appeal-type-2">Appeal Type</p><span className="admin-appeals-card-16">{type}</span></div>
                  <div className="admin-appeals-panel"><p className="admin-appeals-related-record-2">Related Record</p><p className="admin-appeals-text-23">{relatedRecord}</p>{(appeal.report_id || appeal.violation_id) && <p className="admin-appeals-text-24">{appeal.report_id ? `Report ID: ${appeal.report_id}` : `Record ID: ${appeal.violation_id}`}</p>}</div>
                  <div className="admin-appeals-panel"><p className="admin-appeals-reason-2">Reason</p><p className="admin-appeals-text-25">{appeal.reason || appeal.description || "No appeal reason provided."}</p></div>
                  <div><p className="admin-appeals-status-2">Status</p><span className={`admin-appeals-card-17 ${statusClass}`}>{String(appeal.status || "Pending").replace(/_/g, " ")}</span></div>
                  <div><p className="admin-appeals-submitted-4">Submitted</p><p className="admin-appeals-text-26">{formatOptionalDate(appeal.submitted_at ?? appeal.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                  <div className="admin-appeals-grid-7" onClick={(event) => event.stopPropagation()}>
                    <Button size="sm" onClick={() => setSelectedAppeal(appeal)} className="admin-appeals-review-appeal-2"><Eye className="admin-appeals-eye-icon-3"/>Review Appeal</Button>
                    {appealArchiveView ? <><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "restore-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })} className="admin-appeals-restore"><RotateCcw className="admin-appeals-rotate-ccw-icon"/>Restore</Button><Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "delete-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })} className="admin-appeals-delete-permanently"><Trash2 className="admin-appeals-trash2-icon"/>Delete Permanently</Button></> : canArchiveAppealStatus(appeal.status) && <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: "archive-appeal", id: text(appeal.id), label: appeal.reason || text(appeal.id) })} className="admin-appeals-archive-3"><Archive className="admin-appeals-archive-icon-3"/>Archive</Button>}
                  </div>
                </article>;
                })}</div>
            </section>)}
        </div>)}
    </div>))(selectedAppeal);
}
