import "./LandlordNotifications.css";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Clock, Eye, Flag, Home, LayoutGrid, Mail, MailOpen, Megaphone, MoreVertical, Search, ShieldCheck, Trash2 } from "lucide-react";
import { PropertyNotificationEmptyIllustration } from "@/landlord/PropertyNotificationEmptyIllustration";
export const LandlordNotifications = ({ notifications, notifSearch, notifCategory, notifSort, isMarkingAllNotifs, markAllLandlordNotificationsRead, setNotifCategory, setNotifSearch, setNotifSort, isLoadingNotifications, handleNotificationClick, setOpenNotifMenuId, openNotifMenuId, toggleNotifReadStatus, deletingNotifId, deleteNotif, landlordAppeals, getAppealMetadata, }) => {
    const isNotificationRead = (notification) => (notification.read ?? notification.is_read) === true;
    const getNotificationCategory = (notification) => {
        const payload = notification.payload;
        const explicitCategory = String(payload?.category ?? payload?.notification_category ?? "").toLowerCase();
        if (["report", "reports", "violation", "appeal"].includes(explicitCategory))
            return "reports";
        if (["verification", "permit"].includes(explicitCategory))
            return "verification";
        if (["apartment", "apartments", "property", "listing"].includes(explicitCategory))
            return "apartments";
        if (explicitCategory === "system")
            return "system";
        const targetType = String(notification.action_target_type ?? payload?.action_target_type ?? "").toLowerCase();
        if (["apartment", "property", "room", "listing"].includes(targetType))
            return "apartments";
        const value = `${notification.type ?? ""} ${notification.title ?? ""} ${notification.message ?? ""} ${payload?.action ?? ""}`.toLowerCase();
        if (value.includes("report") || value.includes("violation") || value.includes("appeal") || value.includes("notice") || notification.type === "admin_message")
            return "reports";
        if (value.includes("verif") || value.includes("permit"))
            return "verification";
        if (["apartment", "property", "listing", "room", "favorite", "view", "application", "inquiry", "tenant"].some((keyword) => value.includes(keyword)))
            return "apartments";
        return "system";
    };
    const getCategoryMeta = (category) => {
        if (category === "reports")
            return { label: "Reports", icon: Flag, tone: "landlord-tone-report-icon", badge: "landlord-tone-report-badge" };
        if (category === "verification")
            return { label: "Verification", icon: ShieldCheck, tone: "landlord-tone-success-icon", badge: "landlord-tone-success-badge" };
        if (category === "apartments")
            return { label: "Apartments", icon: Home, tone: "landlord-tone-info-icon", badge: "landlord-tone-info-badge" };
        return { label: "System", icon: Megaphone, tone: "landlord-tone-muted", badge: "landlord-tone-brand-badge" };
    };
    const unreadCount = notifications.filter((notification) => !isNotificationRead(notification)).length;
    const categoryCounts = {
        reports: notifications.filter((notification) => getNotificationCategory(notification) === "reports").length,
        verification: notifications.filter((notification) => getNotificationCategory(notification) === "verification").length,
    };
    const visibleNotifications = notifications
        .filter((notification) => {
        const query = notifSearch.trim().toLowerCase();
        const matchesSearch = !query || `${notification.title ?? ""} ${notification.message ?? ""} ${notification.type ?? ""}`.toLowerCase().includes(query);
        const read = isNotificationRead(notification);
        const category = getNotificationCategory(notification);
        const matchesCategory = notifCategory === "all" || (notifCategory === "unread" ? !read : category === notifCategory);
        return matchesSearch && matchesCategory;
    })
        .sort((left, right) => {
        const leftTime = new Date(left.created_at ?? left.createdAt ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? right.createdAt ?? 0).getTime();
        return notifSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
    const tabs = [
        { key: "all", label: "All", count: notifications.length, icon: LayoutGrid },
        { key: "unread", label: "Unread", count: unreadCount, icon: Mail },
        { key: "reports", label: "Reports", count: categoryCounts.reports, icon: Flag },
        { key: "verification", label: "Verification", count: categoryCounts.verification, icon: ShieldCheck },
    ];
    const getActionLabel = (notification, category) => {
        const value = `${notification.type ?? ""} ${notification.action_target_type ?? ""}`.toLowerCase();
        if (value.includes("appeal"))
            return "View Appeal";
        if (category === "reports")
            return "View Report";
        if (category === "apartments" || value.includes("property") || value.includes("apartment"))
            return "View Property";
        return null;
    };
    return (<div className="notifications-section-container">
      <header className="notifications-section-header">
        <div><h1 className="notifications-section-notifications">Notifications</h1><p className="notifications-section-text">Stay updated about your account and properties.</p></div>
        <Button variant="outline" disabled={unreadCount === 0 || isMarkingAllNotifs} onClick={() => void markAllLandlordNotificationsRead()} className="notifications-section-button"><CheckCheck className="notifications-section-check-check-icon"/>{isMarkingAllNotifs ? "Updating..." : "Mark all as read"}</Button>
      </header>

      <div className="notifications-section-card"><span className="notifications-section-row"><Bell className="notifications-section-bell-icon"/></span><div><strong className="notifications-section-strong">{unreadCount}</strong><p className="notifications-section-text-2">{unreadCount === 1 ? "Unread notification" : "Unread notifications"}</p></div></div>

      <section className="notifications-section-section"><div className="notifications-section-row-2">{tabs.map(({ key, label, count, icon: Icon }) => <button key={key} onClick={() => setNotifCategory(key)} className={`notifications-section-button-2 ${notifCategory === key ? "notifications-section-button-3" : "notifications-section-button-4"}`}><Icon className="notifications-section-icon-icon"/>{label}{typeof count === "number" && count > 0 && <span className={`notifications-section-span ${notifCategory === key ? "notifications-section-span-2" : "notifications-section-span-3"}`}>{count}</span>}</button>)}</div></section>

      <div>
        <section className="notifications-section-section-2">
          <div className="notifications-section-grid"><div className="notifications-section-panel"><Search className="notifications-section-search-icon"/><input value={notifSearch} onChange={(event) => setNotifSearch(event.target.value)} placeholder="Search notifications" className="notifications-section-input"/></div><label className="notifications-section-label"><select aria-label="Sort notifications" value={notifSort} onChange={(event) => setNotifSort(event.target.value)} className="notifications-section-sort-notifications"><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label></div>
          {isLoadingNotifications ? <div className="notifications-section-card-2"><Clock className="notifications-section-clock-icon"/></div> : <>
          {visibleNotifications.length > 0 ? <div className="notifications-section-card-3">{visibleNotifications.map((notification, index) => { const read = isNotificationRead(notification); const category = getNotificationCategory(notification); const meta = getCategoryMeta(category); const Icon = meta.icon; const actionLabel = getActionLabel(notification, category); const notificationId = notification.id ?? `notification-${index}`; const createdAt = notification.created_at ?? notification.createdAt; return <article key={notificationId} className={`notifications-section-article ${read ? "notifications-section-article-2" : "notifications-section-article-3"}`}>{!read && <span className="notifications-section-span-4"/>}<span className="notifications-section-row-3"><Icon className="notifications-section-icon-icon-2"/></span><div className="notifications-section-panel-2"><h3 className="notifications-section-heading">{notification.title || notification.type || "Notification"}</h3><p className="notifications-section-text-3">{notification.message || "No additional details were provided."}</p><div className="notifications-section-row-4"><time className="notifications-section-time">{createdAt ? new Date(createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Time unavailable"}</time>{actionLabel && <button onClick={() => void handleNotificationClick(notification)} className="notifications-section-button-5">{actionLabel}</button>}</div></div>{notification.id && <div className="notifications-section-panel"><button title="Notification actions" onClick={() => setOpenNotifMenuId(openNotifMenuId === notification.id ? null : notification.id)} className="notifications-section-button-6"><MoreVertical className="notifications-section-more-vertical-icon"/></button>{openNotifMenuId === notification.id && <div className="notifications-section-card-4"><button onClick={() => void handleNotificationClick(notification)} className="notifications-section-open-notification"><Eye className="notifications-section-eye-icon"/>Open notification</button><button onClick={() => void toggleNotifReadStatus(notification.id, read)} className="notifications-section-button-7">{read ? <Mail className="notifications-section-mail-icon"/> : <MailOpen className="notifications-section-mail-open-icon"/>}{read ? "Mark unread" : "Mark read"}</button><button disabled={deletingNotifId === notification.id} onClick={() => void deleteNotif(notification.id)} className="notifications-section-delete"><Trash2 className="notifications-section-trash2-icon"/>Delete</button></div>}</div>}</article>; })}</div> : notifications.length === 0 ? <div className="notifications-section-card-5"><PropertyNotificationEmptyIllustration /><h2 className="notifications-section-you-re-all-caught-up">You're all caught up.</h2><p className="notifications-section-text">Important updates about your account and properties will appear here.</p></div> : <div className="notifications-section-card-6"><Search className="notifications-section-search-icon-2"/><h2 className="notifications-section-heading">{notifCategory === "reports" ? "No report notifications." : notifCategory === "verification" ? "No verification notifications." : "No matching notifications"}</h2>{notifCategory === "all" || notifCategory === "unread" ? <p className="notifications-section-try-changing-your-search-or-filter">Try changing your search or filter.</p> : null}</div>}
          </>}
          <div className="notifications-section-card-7">
            <div className="notifications-section-panel-3"><h2 className="notifications-section-appeal-history">Appeal History</h2><p className="notifications-section-text-4">View your submitted appeals and administrator decisions.</p></div>
            {landlordAppeals.length === 0 ? <p className="notifications-section-no-appeals-submitted-yet">No appeals submitted yet.</p> : <div className="notifications-section-panel-4">{landlordAppeals.map((appeal) => { const source = getAppealMetadata(appeal, "source"); const submittedAt = appeal.submitted_at ?? appeal.created_at; const relatedNotification = notifications.find((notification) => String(notification.payload?.appeal_id ?? "") === appeal.id); return <article key={appeal.id} className="notifications-section-article-4"><div className="notifications-section-panel-5"><h3 className="notifications-section-heading-2">{String(source?.apartment_title ?? source?.related_label ?? appeal.reason ?? "Appeal")}</h3><p className="notifications-section-text-5">{appeal.reason || "Related issue"}</p>{submittedAt && <time className="notifications-section-submitted">Submitted {new Date(submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</time>}{appeal.admin_response && <p className="notifications-section-administrator">Administrator: {appeal.admin_response}</p>}</div><div className="notifications-section-row-5"><span className="notifications-section-span-5">{String(appeal.status ?? "pending").replace(/_/g, " ")}</span>{relatedNotification && <button onClick={() => void handleNotificationClick(relatedNotification)} className="notifications-section-view-appeal">View Appeal</button>}</div></article>; })}</div>}
          </div>
        </section>
      </div>
    </div>);
};
