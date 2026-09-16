import { Bell, Building2, Check, FileText, MoreVertical, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
function relativeTime(value) {
    if (!value)
        return "Recently";
    const elapsed = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.floor(elapsed / 60_000));
    if (minutes < 1)
        return "Just now";
    if (minutes < 60)
        return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)
        return `${days} ${days === 1 ? "day" : "days"} ago`;
    return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function notificationKind(item) {
    const type = (item.type ?? "").toLowerCase();
    const target = (item.action_target_type ?? "").toLowerCase();
    if (target === "report" || type.includes("report"))
        return "report";
    if (target === "apartment" || type.includes("apartment") || type.includes("availability"))
        return "apartment";
    return "system";
}
export function Notifications({ state }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { notifications, unreadCount, loading, markRead, markUnread, remove } = state;
    const [filter, setFilter] = useState("all");
    const [menuId, setMenuId] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const visible = useMemo(() => filter === "unread" ? notifications.filter((item) => item.read !== true) : notifications, [filter, notifications]);
    useEffect(() => {
        const reportId = new URLSearchParams(location.search).get("reportId");
        if (!reportId || selectedReport?.action_target_id === reportId)
            return;
        const reportNotification = notifications.find((item) => item.action_target_type === "report" && item.action_target_id === reportId);
        if (!reportNotification)
            return;
        setSelectedReport(reportNotification);
        if (reportNotification.id && reportNotification.read !== true)
            void markRead(reportNotification.id);
    }, [location.search, markRead, notifications, selectedReport?.action_target_id]);
    const openNotification = async (item) => {
        if (item.id && item.read !== true && !await markRead(item.id))
            toast.error("Notification could not be marked as read.");
        const kind = notificationKind(item);
        if (kind === "report") {
            setSelectedReport(item);
            return;
        }
        if (item.action_url?.startsWith("/"))
            navigate(item.action_url);
    };
    return <div className="tenant-notifications-container">
    <section className="tenant-notifications-section">
      <div className="tenant-notifications-panel"><h1 className="tenant-notifications-notifications">Notifications</h1><p className="tenant-notifications-text">Stay updated on your reports and apartment activity.</p></div>
    </section>

    <section className="tenant-notifications-section-2">
      <div className="tenant-notifications-row">
        <div className="tenant-notifications-notification-filter" role="tablist" aria-label="Notification filter">
          {["all", "unread"].map((value) => <button key={value} role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`tenant-notifications-button ${filter === value ? "tenant-notifications-button-2" : "tenant-notifications-button-3"}`}>{value}{value === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}</button>)}
        </div>
      </div>

      {loading ? <div className="tenant-notifications-panel-2">{[1, 2, 3].map((item) => <div key={item} className="tenant-notifications-panel-3"/>)}</div> : visible.length === 0 ? <div className="tenant-notifications-content"><span className="tenant-notifications-row-2"><Bell className="tenant-notifications-bell-icon-2"/></span><h2 className="tenant-notifications-you-re-all-caught-up">You're all caught up!</h2><p className="tenant-notifications-text-2">Updates about your reports and apartment activity will appear here.</p></div> : <div className="tenant-notifications-panel-4">{visible.map((item) => {
                const kind = notificationKind(item);
                const Icon = kind === "report" ? FileText : kind === "apartment" ? Building2 : ShieldCheck;
                const action = kind === "report" ? "View Report" : kind === "apartment" ? "View Apartment" : item.action_url ? "View Update" : null;
                return <article key={item.id} className={`tenant-notifications-article ${item.read !== true ? "tenant-notifications-article-2" : "tenant-notifications-article-3"}`}>
          <span className={`tenant-notifications-row-3 ${kind === "report" ? "tenant-notifications-span" : kind === "apartment" ? "tenant-notifications-span-2" : "tenant-notifications-span-3"}`}><Icon className="tenant-notifications-icon-icon"/></span>
          <button onClick={() => void openNotification(item)} className="tenant-notifications-button-4"><span className="tenant-notifications-row-4"><strong className="tenant-notifications-strong">{item.title || "AptFindr update"}</strong>{item.read !== true && <span className="tenant-notifications-unread" aria-label="Unread"/>}</span><span className="tenant-notifications-span-4">{item.message || "You have a new update."}</span><time className="tenant-notifications-time" dateTime={item.created_at ?? undefined}>{relativeTime(item.created_at ?? item.createdAt)}</time></button>
          {action && <Button variant="outline" onClick={() => void openNotification(item)} className="tenant-notifications-button-5">{action}</Button>}
          <div className="tenant-notifications-panel-5"><button aria-label="Notification options" onClick={() => setMenuId(menuId === item.id ? null : item.id ?? null)} className="tenant-notifications-notification-options"><MoreVertical className="tenant-notifications-more-vertical-icon"/></button>{menuId === item.id && <div className="tenant-notifications-card"><button onClick={async () => { if (item.id)
                    await (item.read === true ? markUnread(item.id) : markRead(item.id)); setMenuId(null); }} className="tenant-notifications-mark-as"><Check className="tenant-notifications-check-icon-2"/>Mark as {item.read === true ? "unread" : "read"}</button><button onClick={async () => { if (item.id && await remove(item.id))
                    toast.success("Notification removed.");
                else
                    toast.error("Notification could not be removed."); setMenuId(null); }} className="tenant-notifications-remove"><Trash2 className="tenant-notifications-trash2-icon"/>Remove</button></div>}</div>
        </article>;
            })}</div>}
    </section>

    {selectedReport && <section className="tenant-notifications-section-3" aria-live="polite"><div className="tenant-notifications-row-5"><div><p className="tenant-notifications-my-report-status">My report status</p><h2 className="tenant-notifications-heading">{selectedReport.title || "Report update"}</h2><p className="tenant-notifications-text-3">{selectedReport.message}</p><p className="tenant-notifications-updated">Updated {relativeTime(selectedReport.created_at ?? selectedReport.createdAt)}</p></div><button onClick={() => setSelectedReport(null)} className="tenant-notifications-close">Close</button></div></section>}
  </div>;
}
