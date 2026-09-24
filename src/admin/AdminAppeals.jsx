import "./AdminAppeals.css";
import { canArchiveAppealStatus, updateAppealStatus } from "@/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { AlertTriangle, Archive, Building2, ChevronLeft, Eye, Facebook, FileText, Flag, Globe, Image as ImageIcon, Mail, Pencil, Phone, RotateCcw, Search, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatOptionalDate, text } from "./adminDashboardHelpers";

// The statuses the backend / landlord side already understand. To add one, add a row here
// (and make sure your `appeals.status` column + landlord notifications accept it).
const STATUS_OPTIONS = [
    { value: "under_review", label: "Under Review" },
    { value: "needs_information", label: "Request more Info" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Denied" },
    { value: "dismissed", label: "Dismissed" },
];
const STATUS_LABEL = { needs_information: "Needs Info", rejected: "Denied" };
const STATUS_TONE = {
    pending: "apl-status--pending",
    under_review: "apl-status--review",
    needs_information: "apl-status--info",
    approved: "apl-status--approved",
    rejected: "apl-status--rejected",
    dismissed: "apl-status--dismissed",
};
const statusLabel = (status) => {
    const key = String(status || "pending").toLowerCase();
    return STATUS_LABEL[key] ?? key.replace(/_/g, " ");
};
const shortDate = { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" };

// User-typed links must never become javascript:/data: hrefs.
const safeHttpUrl = (value) => (/^https?:\/\//i.test(String(value ?? "").trim()) ? String(value).trim() : "");
// Turns whatever the landlord typed as contact info into { kind, label, href }.
const describeContact = (value) => {
    const raw = String(value).trim();
    if (/facebook\.com|fb\.com|fb\.me|m\.me/i.test(raw)) {
        const href = safeHttpUrl(raw) || safeHttpUrl(`https://${raw.replace(/^\/+/, "")}`);
        return { kind: "facebook", label: raw, href };
    }
    if (/^https?:\/\//i.test(raw))
        return { kind: "link", label: raw, href: safeHttpUrl(raw) };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))
        return { kind: "email", label: raw, href: `mailto:${raw}` };
    return { kind: "phone", label: raw, href: "" };
};

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
    const archiveAction = (type, appeal) => setCaseAction({ type, id: text(appeal.id), label: appeal.reason || text(appeal.id) });
    // ─────────────────────────────── DETAIL VIEW (Review Appeal) ───────────────────────────────
    if (selectedAppeal) {
        const landlord = landlordMap.get(selectedAppeal.landlord_id ?? "");
        const context = getAppealContext(selectedAppeal);
        const kindLabel = context.violation?.mode === "notice" ? "Notice" : "Violation";
        const appealType = selectedAppeal.report_id ? "Report Appeal" : selectedAppeal.violation_id ? `${kindLabel} Appeal` : "General Appeal";
        const apartmentName = context.apartment?.title || String(context.source?.apartment_title ?? "Apartment unavailable");
        const relatedTitle = selectedAppeal.report_id
            ? `Report: ${String(context.report?.issueType ?? context.report?.issue_type ?? context.report?.category ?? apartmentName)}`
            : selectedAppeal.violation_id
                ? `${kindLabel}: ${apartmentName}`
                : String(context.source?.related_label ?? "Unavailable");
        const relatedId = selectedAppeal.report_id || selectedAppeal.violation_id || "";
        const statusTone = STATUS_TONE[String(selectedAppeal.status ?? "pending").toLowerCase()] ?? STATUS_TONE.pending;

        // Contact info the landlord typed in the appeal form (facebook link / email / phone / anything)
        const contactValue = String(getAppealMetadata(selectedAppeal, "contact")?.value ?? "").trim();
        const contact = contactValue ? describeContact(contactValue) : null;

        const evidenceDocuments = (selectedAppeal.supporting_docs ?? []).map((doc, index) => {
            const document = typeof doc === "object" && doc !== null && !Array.isArray(doc) ? doc : null;
            if (document && document.kind !== "evidence")
                return null;
            const url = typeof doc === "string" ? doc : String(document?.file_url ?? document?.url ?? "");
            const name = String(document?.file_name ?? document?.name ?? `Supporting evidence ${index + 1}`);
            return { url: safeHttpUrl(url), name };
        }).filter(Boolean);

        const goBack = () => {
            setSelectedAppeal(null);
            setAppealResponse("");
            setAppealStatus("under_review");
        };
        const openApartment = () => navigate(`${apartmentDetailBasePath}/${context.apartmentId}`, { state: { returnTo: `${portalBasePath}?section=appeals`, backLabel: "Back to Appeals" } });

        return (<div className="apl-page">
      <div>
        <button type="button" className="apl-back" onClick={goBack}><ChevronLeft size={13}/>Back to Appeals</button>
        <h1 className="apl-title apl-title--detail">Review Appeal</h1>
        <p className="apl-subtitle">Review the appeal, related case, supporting evidence, and administrative decision.</p>
      </div>

      {/* Appeal details: reason + related record (not in the mock, but the admin needs the reason to decide) */}
      <section className="apl-panel">
        <div className="apl-summary__top">
          <span className="apl-pill">{appealType}</span>
          <span className={`apl-status ${statusTone}`}>{statusLabel(selectedAppeal.status)}</span>
          <span className="apl-muted">Submitted {formatOptionalDate(selectedAppeal.submitted_at ?? selectedAppeal.created_at, shortDate)}</span>
        </div>
        <div className="apl-summary__grid">
          <div className="apl-field">
            <span className="apl-field__label">Related record</span>
            <span className="apl-field__value">{relatedTitle}</span>
            {relatedId && <span className="apl-field__sub apl-field__sub--link">Record ID: {relatedId}</span>}
            {context.apartment && <span className="apl-field__sub">{formatApartmentLocation(context.apartment) || "Location not provided"}</span>}
            <div className="apl-inline-actions">
              {context.report && <button type="button" className="apl-btn apl-btn--ghost" onClick={() => { setSelectedReport(context.report); setActiveSection("reports"); }}><Eye size={12}/>View Report</button>}
              {context.apartmentId && <button type="button" className="apl-btn apl-btn--ghost" onClick={openApartment}><Building2 size={12}/>View Apartment</button>}
            </div>
          </div>
          <div className="apl-field">
            <span className="apl-field__label">Reason for appeal</span>
            <span className="apl-field__value apl-field__value--wrap">{selectedAppeal.reason || "—"}</span>
            {selectedAppeal.description && <>
                <span className="apl-field__label apl-field__label--gap">Landlord&apos;s explanation</span>
                <span className="apl-field__value apl-field__value--wrap apl-field__value--normal">{selectedAppeal.description}</span>
              </>}
          </div>
        </div>
      </section>

      <div className="apl-two-col">
        <section className="apl-panel apl-panel--tall">
          <h2 className="apl-panel__title">1. Appeal Submitted By</h2>
          <div className="apl-person">
            <span className="apl-person__name">{landlord?.name || "Landlord unavailable"}</span>
            <div className="apl-person__contacts">
              {contact && <div className="apl-contact">
                  <span className={`apl-contact__icon apl-contact__icon--${contact.kind}`}>{contact.kind === "facebook" ? <Facebook size={16}/> : contact.kind === "email" ? <Mail size={16}/> : contact.kind === "link" ? <Globe size={16}/> : <Phone size={16}/>}</span>
                  {contact.href ? <a className="apl-contact__text apl-contact__text--link" href={contact.href} target="_blank" rel="noreferrer noopener">{contact.label}</a> : <span className="apl-contact__text">{contact.label}</span>}
                </div>}
              {landlord?.email && (!contact || contact.label.toLowerCase() !== String(landlord.email).toLowerCase()) && <div className="apl-contact">
                  <span className="apl-contact__icon apl-contact__icon--email"><Mail size={16}/></span>
                  <span className="apl-contact__text">{landlord.email}</span>
                </div>}
              {landlord?.mobile && <div className="apl-contact">
                  <span className="apl-contact__icon apl-contact__icon--phone"><Phone size={16}/></span>
                  <span className="apl-contact__text">{landlord.mobile}</span>
                </div>}
            </div>
          </div>
        </section>

        <section className="apl-panel apl-panel--tall">
          <h2 className="apl-panel__title">2. Supporting Evidence</h2>
          {evidenceDocuments.length > 0 ? (<div className="apl-evidence-list">
              {evidenceDocuments.map((document, index) => {
                const inner = (<>
                  <span className="apl-evidence__name">{document.name}</span>
                  <span className="apl-evidence__sub">Submitted with evidence</span>
                  <span className="apl-evidence__icon"><ImageIcon size={16}/></span>
                </>);
                return document.url
                    ? <a key={`${document.url}-${index}`} className="apl-evidence apl-evidence--link" href={document.url} target="_blank" rel="noreferrer noopener" title="Open evidence">{inner}</a>
                    : <div key={`${document.name}-${index}`} className="apl-evidence">{inner}</div>;
              })}
            </div>) : (<div className="apl-evidence apl-evidence--empty"><span className="apl-evidence__sub">No supporting evidence submitted.</span></div>)}
        </section>
      </div>

      <section className="apl-panel apl-decision">
        <h2 className="apl-panel__title">3. Admin Decision</h2>
        <div className="apl-decision__body">
          {selectedAppeal.admin_response && <div className="apl-previous">
              <span className="apl-field__label">Previous response{selectedAppeal.reviewed_at ? ` · ${formatOptionalDate(selectedAppeal.reviewed_at, shortDate)}` : ""}</span>
              <p className="apl-previous__text">{selectedAppeal.admin_response}</p>
            </div>}

          <span className="apl-label">Update Status</span>
          <div className="apl-status-grid" role="group" aria-label="Update status">
            {STATUS_OPTIONS.map(({ value, label }) => (<button key={value} type="button" disabled={appealArchiveView} aria-pressed={appealStatus === value} onClick={() => setAppealStatus(value)} className={`apl-status-btn${appealStatus === value ? " is-active" : ""}`}>{label}</button>))}
          </div>

          <label className="apl-label" htmlFor="apl-response">Admin Response Message</label>
          <div className="apl-textarea-wrap">
            <textarea id="apl-response" disabled={appealArchiveView} value={appealResponse} onChange={(event) => setAppealResponse(event.target.value)} placeholder="Enter your decision and explanation..." className="apl-textarea" rows={2}/>
            <Pencil size={15} className="apl-textarea__icon"/>
          </div>

          <button type="button" className="apl-save" disabled={appealArchiveView} onClick={handleUpdateAppealStatus}>Save Appeal Decision</button>
          {!appealArchiveView && canArchiveAppealStatus(selectedAppeal.status) && (<button type="button" className="apl-btn apl-btn--ghost apl-archive" onClick={() => archiveAction("archive-appeal", selectedAppeal)}><Archive size={12}/>Archive this appeal</button>)}
        </div>
      </section>
    </div>);
    }

    // ─────────────────────────────── LIST VIEW ───────────────────────────────
    const stats = [
        { label: "Active Appeals", value: pendingAppealCount, note: "Awaiting Admin review", icon: AlertTriangle },
        { label: "Report Appeals", value: reportAppealCount, note: "Related to reports", icon: Flag },
        { label: "Violation Appeals", value: violationAppealCount, note: "Related to violations", icon: ShieldAlert },
    ];
    const noAppealsAtAll = (appealArchiveView ? archivedAppeals : appeals).length === 0;
    return (<div className="apl-page">
      <header className="apl-header">
        <div>
          <h1 className="apl-title">Appeals</h1>
          <p className="apl-subtitle">Review and manage landlord appeals.</p>
        </div>
        <div className="apl-date">{currentDate}</div>
      </header>

      <section className="apl-stats" aria-label="Appeal summary">
        {stats.map(({ label, value, note, icon: Icon }) => (<div key={label} className="apl-stat">
            <span className="apl-stat__icon"><Icon size={16} strokeWidth={1.8}/></span>
            <div className="apl-stat__body">
              <strong className="apl-stat__value">{value}</strong>
              <span className="apl-stat__label">{label}</span>
              <span className="apl-stat__note">{note}</span>
            </div>
          </div>))}
      </section>

      <section className="apl-filters">
        <label className="apl-search">
          <Search size={15} className="apl-search__icon"/>
          <input type="text" value={appealSearch} onChange={(event) => setAppealSearch(event.target.value)} placeholder="Search appeals by landlord, reason, email, or ID" className="apl-search__input"/>
        </label>
        <select value={appealTypeFilter} onChange={(event) => setAppealTypeFilter(event.target.value)} className="apl-select apl-select--type" aria-label="Filter by type">
          <option value="all">Type: All Appeals</option>
          <option value="report">Type: Report Appeals</option>
          <option value="violation">Type: Violation Appeals</option>
          <option value="general">Type: General Appeals</option>
        </select>
        <select value={appealSort} onChange={(event) => setAppealSort(event.target.value)} className="apl-select apl-select--sort" aria-label="Sort appeals">
          <option value="newest">Sort by: Newest</option>
          <option value="oldest">Sort by: Oldest</option>
        </select>
      </section>

      {appealArchiveView && <div className="apl-archive-bar">
          <span>Viewing archived appeals</span>
          <button type="button" className="apl-link-btn" onClick={() => setAppealArchiveView(false)}>Back to active appeals</button>
        </div>}

      <section className="apl-card">
        {noAppealsAtAll ? (<div className="apl-empty">
            <span className="apl-empty__icon">{appealArchiveView ? <FileText size={20}/> : <AlertTriangle size={20}/>}</span>
            <h3 className="apl-empty__title">{appealArchiveView ? "No archived appeals" : "No appeals submitted."}</h3>
            <p className="apl-empty__text">{appealArchiveView ? "Archived appeals will appear here." : "Landlord appeals will appear here when submitted."}</p>
          </div>) : visibleAppeals.length === 0 ? (<div className="apl-empty">
            <span className="apl-empty__icon"><Search size={20}/></span>
            <h3 className="apl-empty__title">No appeals match the selected filters.</h3>
            <p className="apl-empty__text">Try a different search or filter.</p>
          </div>) : (<div className="apl-list">
                {visibleAppeals.map((appeal) => {
                    const landlord = landlordMap.get(appeal.landlord_id ?? "");
                    const context = getAppealContext(appeal);
                    const kindLabel = context.violation?.mode === "notice" ? "Notice" : "Violation";
                    const type = appeal.report_id ? "Report Appeal" : appeal.violation_id ? `${kindLabel} Appeal` : "General Appeal";
                    const apartmentName = context.apartment?.title || String(context.source?.apartment_title ?? "Unavailable");
                    const relatedRecord = appeal.report_id ? `Report: ${apartmentName}` : appeal.violation_id ? `${kindLabel}: ${apartmentName}` : String(context.source?.related_label ?? "Unavailable");
                    const recordId = appeal.report_id ? `Report ID: ${appeal.report_id}` : appeal.violation_id ? `Record ID: ${appeal.violation_id}` : "";
                    const reason = appeal.reason || appeal.description || "No appeal reason provided.";
                    const tone = STATUS_TONE[String(appeal.status ?? "pending").toLowerCase()] ?? STATUS_TONE.pending;
                    const landlordName = landlord?.name || "Landlord unavailable";
                    return (<article key={appeal.id} className="apl-listing" onClick={() => setSelectedAppeal(appeal)}>
                      <div className="apl-landlord">
                        <span className="apl-landlord__name">{landlordName}</span>
                        <span className="apl-landlord__meta">{landlord?.email || "Contact unavailable"}</span>
                        {landlord?.mobile && <span className="apl-landlord__meta apl-landlord__phone"><Phone size={10}/>{landlord.mobile}</span>}
                      </div>
                      <div className="apl-listing__fact"><span className="apl-listing__mobile-label">Appeal type</span><strong><span className="apl-pill">{type}</span></strong></div>
                      <div className="apl-listing__fact"><span className="apl-listing__mobile-label">Related record</span><strong title={relatedRecord}>{relatedRecord}</strong>{recordId && <small title={recordId}>{recordId}</small>}</div>
                      <div className="apl-listing__fact"><span className="apl-listing__mobile-label">Reason</span><strong title={reason}>{reason}</strong></div>
                      <div className="apl-listing__status"><span className="apl-listing__mobile-label">Appeal status</span><strong><span className={`apl-status ${tone}`}>{statusLabel(appeal.status)}</span></strong></div>
                      <time className="apl-listing__date">{formatOptionalDate(appeal.submitted_at ?? appeal.created_at, shortDate)}</time>
                      <div className="apl-listing__actions" onClick={(event) => event.stopPropagation()}>
                          <button type="button" className="apl-btn apl-btn--primary" onClick={() => setSelectedAppeal(appeal)}>Review Appeal</button>
                          {appealArchiveView ? (<>
                              <button type="button" className="apl-btn apl-btn--ghost" onClick={() => archiveAction("restore-appeal", appeal)}><RotateCcw size={12}/>Restore</button>
                              <button type="button" className="apl-btn apl-btn--danger" onClick={() => archiveAction("delete-appeal", appeal)}><Trash2 size={12}/>Delete</button>
                            </>) : canArchiveAppealStatus(appeal.status) && (<button type="button" className="apl-btn apl-btn--ghost" onClick={() => archiveAction("archive-appeal", appeal)}><Archive size={12}/>Archive</button>)}
                      </div>
                    </article>);
                })}
          </div>)}
      </section>
    </div>);
}
