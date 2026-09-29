// =============================================================================
// AdminAnalyticsOverview — the admin "Dashboard / Overview" section.
//
// This is the landing view of the admin portal. It answers two questions at a
// glance — "how healthy is the marketplace right now?" and "who still needs a
// review decision?" — and then hands off to the Landlord Verification list for
// the actual per-landlord work.
//
// Everything here is derived from data AdminDashboard already has in memory, so
// the overview adds no extra queries and cannot drift out of sync with the rest
// of the portal. Styling lives in admin_pages.css (`.admin-analytics-*`).
// =============================================================================
import { AlertTriangle, Building2, CheckCircle2, Clock3, Flag, Gavel, UserRound } from "lucide-react";
import { useMemo } from "react";
import { getAdminListingState } from "@/admin/adminListingState";
import { AdminLandlordVerification } from "./AdminLandlordVerification";

// Order matters: this is the reading order of the status bar.
const LISTING_STATES = ["published", "pending", "unpublished", "rejected", "archived", "deleted"];
const LISTING_TONE = {
    published: "is-published",
    pending: "is-pending",
    unpublished: "is-unpublished",
    rejected: "is-rejected",
    archived: "is-archived",
    deleted: "is-deleted",
};
const LISTING_LABEL = {
    published: "Published",
    pending: "Pending review",
    unpublished: "Unpublished",
    rejected: "Needs changes",
    archived: "Archived",
    deleted: "Deleted",
};
const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;

export function AdminAnalyticsOverview({
    landlords = [],
    allApartments = [],
    violations = [],
    pendingReports = 0,
    activeAppealsCount = 0,
    unreadNotifsCount = 0,
    landlordSearch,
    setLandlordSearch,
    landlordStatusFilter,
    setLandlordStatusFilter,
    onSelectLandlord,
}) {
    const listingBreakdown = useMemo(() => {
        const counts = Object.fromEntries(LISTING_STATES.map((state) => [state, 0]));
        for (const apartment of allApartments) {
            const state = getAdminListingState(apartment);
            if (state in counts)
                counts[state] += 1;
        }
        const total = LISTING_STATES.reduce((sum, state) => sum + counts[state], 0);
        return { counts, total };
    }, [allApartments]);

    const activeViolations = useMemo(() => violations.filter((item) => item?.active !== false).length, [violations]);

    const metrics = [
        { label: "Total Landlords", value: landlords.length, note: "Registered landlord accounts", icon: UserRound, tone: "total" },
        { label: "Published Listings", value: listingBreakdown.counts.published, note: `${listingBreakdown.total} listings tracked`, icon: Building2, tone: "published" },
        { label: "Pending Review", value: listingBreakdown.counts.pending, note: "Awaiting an admin decision", icon: Clock3, tone: "pending" },
        { label: "Open Reports", value: pendingReports, note: "Submitted and not yet closed", icon: Flag, tone: "reports" },
        { label: "Open Appeals", value: activeAppealsCount, note: "Under review or needs info", icon: AlertTriangle, tone: "appeals" },
        { label: "Active Violations", value: activeViolations, note: "Recorded on landlord accounts", icon: Gavel, tone: "violations" },
    ];

    const attentionCount = listingBreakdown.counts.pending + pendingReports + activeAppealsCount;

    return (<div className="admin-analytics">
        <header className="admin-analytics-header">
            <div>
                <h1>Analytics Overview</h1>
                <p>Marketplace health and the review work waiting on this admin account.</p>
            </div>
            <span className={attentionCount > 0 ? "is-attention" : "is-clear"}>
                {attentionCount > 0
                    ? <><AlertTriangle />{plural(attentionCount, "item")} need attention</>
                    : <><CheckCircle2 />Nothing is waiting for review</>}
            </span>
        </header>

        <section className="admin-analytics-metrics">{metrics.map(({ label, value, note, icon: Icon, tone }) => (<article key={label}>
            <span className={`is-${tone}`}><Icon size={17}/></span>
            <div>
                <strong>{value}</strong>
                <b>{label}</b>
                <small>{note}</small>
            </div>
        </article>))}</section>

        <section className="admin-analytics-listings">
            <header>
                <h2>Listings by review status</h2>
                <small>{plural(listingBreakdown.total, "apartment")} under admin management</small>
            </header>
            {listingBreakdown.total === 0
                ? <p className="admin-analytics-empty">No apartment listings have been submitted yet.</p>
                : <>
                    <div className="admin-analytics-bar" role="presentation">{LISTING_STATES.filter((state) => listingBreakdown.counts[state] > 0).map((state) => (
                        <i
                            key={state}
                            className={LISTING_TONE[state]}
                            style={{ width: `${(listingBreakdown.counts[state] / listingBreakdown.total) * 100}%` }}
                        />
                    ))}</div>
                    <ul className="admin-analytics-legend">{LISTING_STATES.filter((state) => listingBreakdown.counts[state] > 0).map((state) => (
                        <li key={state}>
                            <span className={LISTING_TONE[state]}/>
                            <b>{LISTING_LABEL[state]}</b>
                            <strong>{listingBreakdown.counts[state]}</strong>
                        </li>
                    ))}</ul>
                </>}
        </section>

        {unreadNotifsCount > 0 && <p className="admin-analytics-notifications">{plural(unreadNotifsCount, "unread notification")} waiting in the Notifications section.</p>}

        <AdminLandlordVerification
            landlords={landlords}
            apartments={allApartments}
            search={landlordSearch}
            setSearch={setLandlordSearch}
            statusFilter={landlordStatusFilter}
            setStatusFilter={setLandlordStatusFilter}
            onSelect={onSelectLandlord}
        />
    </div>);
}
