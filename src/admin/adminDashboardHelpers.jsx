import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, Building2, Flag, LayoutDashboard, RefreshCw, Shield, Users } from "lucide-react";
export const NAV_MAIN = [
    { icon: LayoutDashboard, label: "Dashboard", section: "overview" },
    { icon: Bell, label: "Notifications", section: "notifications" },
    { icon: Users, label: "Landlords", section: "landlords" },
    { icon: Building2, label: "Apartments", section: "apartments" },
    { icon: Flag, label: "Reports", section: "reports" },
    { icon: AlertTriangle, label: "Appeals", section: "appeals" },
];
export const NAV_ACCOUNT = [
    { icon: Shield, label: "Settings", section: "admininfo" },
];
export const SEVERITY_LABEL = {
    low: { label: "Low", class: "admin-status-approved" },
    med: { label: "Medium", class: "admin-status-review" },
    high: { label: "High", class: "admin-status-rejected" },
};
export const VIOLATION_TYPES = [
    "Inaccurate listing information",
    "Fraudulent / scam listing",
    "Misleading photos",
    "Price manipulation",
    "Unresponsive to inquiries",
    "Safety hazard",
    "Permit non-compliance",
    "Other",
];
export const NOTICE_TYPES = [
    "Formal warning – first offense",
    "Final warning – second offense",
    "Listing temporarily suspended",
    "Account suspended pending review",
    "Permit re-verification required",
];
export const ADMIN_DASHBOARD_SECTIONS = new Set(["overview", "notifications", "landlords", "apartments", "reports", "appeals", "admininfo"]);
export const isAdminModule = (value) => ADMIN_DASHBOARD_SECTIONS.has(value);
export function toAdminProfileState(source) {
    const name = String(source?.name ?? "").trim();
    const [firstName = "", ...lastNameParts] = name.split(/\s+/).filter(Boolean);
    const dashboardSource = source;
    const authSource = source;
    return {
        firstName,
        lastName: lastNameParts.join(" "),
        email: String(source?.email ?? ""),
        mobile: String(dashboardSource?.mobile ?? dashboardSource?.mobileNumber ?? authSource?.mobileNumber ?? authSource?.mobile ?? ""),
        bio: String(dashboardSource?.bio ?? authSource?.bio ?? ""),
        avatar: String(dashboardSource?.avatar_url ?? authSource?.avatar ?? ""),
        department: String(dashboardSource?.department ?? authSource?.department ?? ""),
        adminLevel: String(dashboardSource?.admin_level ?? dashboardSource?.adminLevel ?? authSource?.adminLevel ?? ""),
    };
}
export function formatOptionalDate(value, options) {
    if (!value)
        return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "—";
    return date.toLocaleDateString("en-PH", options);
}
export function text(value, fallback = "") {
    return value && value.length > 0 ? value : fallback;
}
export const getLandlordVerificationStatus = (landlord) => {
    if (!landlord)
        return "Missing";
    const explicitStatus = String(landlord.landlord_status ?? landlord.verification_status ?? landlord.status ?? "").trim();
    if (landlord.isVerified === true || landlord.is_verified === true)
        return "Verified";
    if (explicitStatus.length > 0) {
        const normalized = explicitStatus.toLowerCase();
        if (["pending", "unverified", "under_review"].includes(normalized))
            return "Pending Review";
        return normalized.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
    }
    return "Incomplete";
};
export const canPublishForLandlord = (landlord) => (landlord?.isVerified ?? landlord?.is_verified) === true && !["pending", "unverified", "rejected", "suspended", "disabled"].includes(String(landlord?.landlord_status ?? landlord?.verification_status ?? landlord?.status ?? "").trim().toLowerCase());
export function activityTimestamp(value) {
    return typeof value === "string" && value.length > 0 ? value : "";
}
export function toEvidenceItem(row) {
    const fileUrl = text(row?.file_url);
    if (!fileUrl)
        return null;
    const fileType = row?.file_type === "document" || row?.file_type === "screenshot" ? row.file_type : "image";
    return {
        id: text(row?.id, fileUrl),
        fileName: text(row?.file_name, "Evidence file"),
        fileUrl,
        fileType,
        mimeType: text(row?.mime_type, "image/jpeg"),
        fileSize: typeof row?.file_size === "number" ? row.file_size : undefined,
        uploadedBy: text(row?.uploaded_by),
        uploadedAt: text(row?.uploaded_at),
    };
}
export function SectionHeading({ title, description, action, actionLabel = "View all", }) {
    return (<div className="admin-dashboard-helpers-row">
      <div>
        <h2 className="admin-dashboard-helpers-heading">{title}</h2>
        <p className="admin-dashboard-helpers-text">{description}</p>
      </div>
      {action && <button onClick={action} className="admin-dashboard-helpers-button">{actionLabel}</button>}
    </div>);
}
export function OverviewEmpty({ icon: Icon, text: message }) {
    return (<div className="admin-dashboard-helpers-card">
      <Icon className="admin-dashboard-helpers-icon-icon"/>
      <p className="admin-dashboard-helpers-text-2">{message}</p>
    </div>);
}
export function NotificationEmpty({ title, message, onRefresh, refreshing, }) {
    return (<div className="admin-dashboard-helpers-content">
      <span className="admin-dashboard-helpers-row-2">
        <Bell className="admin-dashboard-helpers-bell-icon"/>
      </span>
      <h3 className="admin-dashboard-helpers-heading-2">{title}</h3>
      <p className="admin-dashboard-helpers-text-3">{message}</p>
      {onRefresh && <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="admin-dashboard-helpers-refresh">
        <RefreshCw className={`admin-dashboard-helpers-refresh-cw-icon ${refreshing ? "admin-dashboard-helpers-refresh-cw-icon-2" : ""}`}/>Refresh
      </Button>}
    </div>);
}
export function ArchiveEmpty({ kind, icon: Icon }) {
    return (<div className="admin-dashboard-helpers-content-2">
      <div className="admin-dashboard-helpers-row-3" aria-hidden="true">
        <div className="admin-dashboard-helpers-card-2"/>
        <div className="admin-dashboard-helpers-card-3"/>
        <span className="admin-dashboard-helpers-card-4"><Icon className="admin-dashboard-helpers-icon-icon-2"/></span>
      </div>
      <h3 className="admin-dashboard-helpers-no-archived">No archived {kind}</h3>
      <p className="admin-dashboard-helpers-will-appear-here">{kind === "notifications" ? "Notifications you archive" : `Archived ${kind}`} will appear here.</p>
    </div>);
}
export function SettingsSectionTitle({ icon: Icon, tone, title, description, }) {
    return (<div className="admin-dashboard-helpers-row-4">
      <span className={`admin-dashboard-helpers-row-5 ${tone}`}><Icon className="admin-dashboard-helpers-icon-icon-3"/></span>
      <div><h3 className="admin-dashboard-helpers-heading-3">{title}</h3><p className="admin-dashboard-helpers-text-4">{description}</p></div>
    </div>);
}
export function SettingsField({ label, wide = false, children }) {
    return <label className={`admin-dashboard-helpers-label ${wide ? "admin-dashboard-helpers-label-2" : ""}`}><span className="admin-dashboard-helpers-span">{label}</span>{children}</label>;
}
