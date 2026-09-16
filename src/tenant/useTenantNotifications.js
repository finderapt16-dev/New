import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { deleteNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, } from "@/services/dashboardSupabaseService";
import { supabase } from "@/services/supabaseClient";
export function useTenantNotifications(enabled = true) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        if (!enabled || !user?.id) {
            setNotifications([]);
            setLoading(false);
            return;
        }
        const rows = await fetchNotifications(user.id);
        setNotifications(rows.filter((row) => row.user_id === user.id && row.is_deleted !== true));
        setLoading(false);
    }, [enabled, user?.id]);
    useEffect(() => {
        setLoading(true);
        void refresh();
        if (!enabled || !user?.id)
            return;
        const channel = supabase
            .channel(`tenant-notifications-${user.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => void refresh())
            .subscribe();
        return () => { void supabase.removeChannel(channel); };
    }, [enabled, refresh, user?.id]);
    const unreadCount = useMemo(() => notifications.filter((notification) => notification.read !== true).length, [notifications]);
    const markRead = useCallback(async (id) => {
        if (!user?.id)
            return false;
        const updated = await markNotificationRead(id, user.id);
        if (!updated)
            return false;
        setNotifications((current) => current.map((item) => item.id === id ? updated : item));
        return true;
    }, [user?.id]);
    const markUnread = useCallback(async (id) => {
        if (!user?.id)
            return false;
        const updated = await markNotificationUnread(id, user.id);
        if (!updated)
            return false;
        setNotifications((current) => current.map((item) => item.id === id ? updated : item));
        return true;
    }, [user?.id]);
    const markAllRead = useCallback(async () => {
        if (!user?.id)
            return false;
        const changed = await markAllNotificationsRead(user.id);
        if (unreadCount > 0 && changed === 0)
            return false;
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
        return true;
    }, [unreadCount, user?.id]);
    const remove = useCallback(async (id) => {
        if (!user?.id || !await deleteNotification(id, user.id))
            return false;
        setNotifications((current) => current.filter((item) => item.id !== id));
        return true;
    }, [user?.id]);
    return { notifications, unreadCount, loading, refresh, markRead, markUnread, markAllRead, remove };
}
