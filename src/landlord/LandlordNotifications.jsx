import "./LandlordNotifications.css";
import { MoreVertical } from "lucide-react";

function isNotificationRead(notification) {
    return (notification.read ?? notification.is_read) === true;
}

function relativeTime(value) {
    if (!value) return "Recently";
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Recently";

    const elapsed = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;

    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
}

export function LandlordNotifications({
    notifications = [],
    notifCategory,
    isMarkingAllNotifs,
    markAllLandlordNotificationsRead,
    setNotifCategory,
    isLoadingNotifications,
    handleNotificationClick,
    setOpenNotifMenuId,
    openNotifMenuId,
    setNotificationReadStatus,
    deletingNotifId,
    deleteNotif,
}) {
    const unreadCount = notifications.filter((notification) => !isNotificationRead(notification)).length;
    const activeFilter = notifCategory === "unread" ? "unread" : "all";
    const visibleNotifications = [...notifications]
        .sort((left, right) => {
            const leftTime = new Date(left.created_at ?? left.createdAt ?? 0).getTime();
            const rightTime = new Date(right.created_at ?? right.createdAt ?? 0).getTime();
            return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
        })
        .filter((notification) => activeFilter === "all" || !isNotificationRead(notification));

    return (
        <section className="landlord-notifications" aria-labelledby="landlord-notifications-title">
            <header className="landlord-notifications-header">
                <div>
                    <h1 id="landlord-notifications-title">Notifications</h1>
                    <p>Stay updated about your properties, reports, and account activity.</p>
                </div>
            </header>

            <div className="landlord-notifications-toolbar">
                <div className="landlord-notifications-tabs" role="tablist" aria-label="Notification filter">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeFilter === "all"}
                        className={`landlord-notifications-tab ${activeFilter === "all" ? "is-active" : ""}`}
                        onClick={() => setNotifCategory("all")}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeFilter === "unread"}
                        className={`landlord-notifications-tab ${activeFilter === "unread" ? "is-active" : ""}`}
                        onClick={() => setNotifCategory("unread")}
                    >
                        Unread <span className="landlord-notifications-count">{unreadCount}</span>
                    </button>
                </div>
                <button
                    type="button"
                    disabled={unreadCount === 0 || isMarkingAllNotifs}
                    onClick={() => void markAllLandlordNotificationsRead()}
                    className="landlord-notifications-mark-all"
                >
                    {isMarkingAllNotifs ? "Updating…" : "Mark all as read"}
                </button>
            </div>

            {isLoadingNotifications ? (
                <div className="landlord-notifications-list" role="status" aria-label="Loading notifications">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div className="landlord-notifications-skeleton" key={index}>
                            <span />
                            <div><i /><i /></div>
                        </div>
                    ))}
                </div>
            ) : visibleNotifications.length > 0 ? (
                <div className="landlord-notifications-list">
                    {visibleNotifications.map((notification, index) => {
                        const read = isNotificationRead(notification);
                        const notificationId = notification.id;
                        const title = notification.title || notification.type || "Notification";
                        const createdAt = notification.created_at ?? notification.createdAt;
                        const menuId = notificationId ? `landlord-notification-menu-${notificationId}` : undefined;

                        return (
                            <article
                                key={notificationId ?? `notification-${index}`}
                                className={`landlord-notifications-item ${read ? "is-read" : "is-unread"}`}
                            >
                                <span className="landlord-notifications-avatar" aria-hidden="true" />
                                <button
                                    type="button"
                                    className="landlord-notifications-open"
                                    aria-label={`Open notification: ${title}`}
                                    onClick={() => {
                                        setOpenNotifMenuId(null);
                                        void handleNotificationClick(notification);
                                    }}
                                >
                                    <strong>{title}</strong>
                                    <span>{notification.message || "No additional details were provided."}</span>
                                </button>
                                <time
                                    className="landlord-notifications-time"
                                    dateTime={createdAt ? String(createdAt) : undefined}
                                >
                                    {relativeTime(createdAt)}
                                </time>
                                {notificationId && (
                                    <div className="landlord-notifications-actions">
                                        <button
                                            type="button"
                                            className="landlord-notifications-options"
                                            aria-label={`Notification options: ${title}`}
                                            aria-haspopup="menu"
                                            aria-expanded={openNotifMenuId === notificationId}
                                            aria-controls={menuId}
                                            onClick={() => setOpenNotifMenuId(openNotifMenuId === notificationId ? null : notificationId)}
                                        >
                                            <MoreVertical aria-hidden="true" />
                                        </button>
                                        {openNotifMenuId === notificationId && (
                                            <div id={menuId} className="landlord-notifications-menu" role="menu">
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => void setNotificationReadStatus(notificationId, false, read)}
                                                >
                                                    Mark as unread
                                                </button>
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    onClick={() => void setNotificationReadStatus(notificationId, true, read)}
                                                >
                                                    Mark as read
                                                </button>
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    className="is-delete"
                                                    disabled={deletingNotifId === notificationId}
                                                    onClick={() => void deleteNotif(notificationId)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="landlord-notifications-empty">
                    <h2>{activeFilter === "unread" ? "You're all caught up." : "No notifications yet."}</h2>
                    <p>Updates about your properties, reports, and account activity will appear here.</p>
                </div>
            )}
        </section>
    );
}
