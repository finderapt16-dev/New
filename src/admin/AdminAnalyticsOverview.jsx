import { BarChart3, CalendarDays, Eye, Heart, Home, RefreshCw, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchAdminAnalyticsData } from "@/services/dashboardSupabaseService";
import { supabase } from "@/services/supabaseClient";
const MANILA = "Asia/Manila";
function dateKey(value) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: MANILA, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
    const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}
const utc = (key) => Date.parse(`${key}T00:00:00.000Z`);
function bucketsFor(period) {
    const today = utc(dateKey(new Date()));
    const start = today - (period - 1) * 86_400_000;
    const end = today;
    const days = period;
    const size = days <= 7 ? 1 : days <= 30 ? 3 : 7;
    const result = [];
    for (let offset = 0; offset < days; offset += size) {
        const bucketStart = start + offset * 86_400_000;
        result.push({ key: new Date(bucketStart).toISOString(), label: new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short", day: "numeric" }).format(bucketStart), start: bucketStart, end: Math.min(end + 86_399_999, bucketStart + size * 86_400_000 - 1) });
    }
    return result;
}
function inBucket(value, bucket) { if (!value)
    return false; const time = utc(dateKey(value)); return time >= bucket.start && time <= bucket.end; }
const percent = (value, total) => total ? Math.round(value / total * 100) : 0;
const peso = (value) => `₱${Math.round(value).toLocaleString("en-PH")}`;
function Trend({ buckets, first, second, label }) {
    const w = 620, h = 150, l = 16, r = 10, t = 12, b = 27, max = Math.max(1, ...first, ...second);
    const x = (i) => l + (i / Math.max(1, buckets.length - 1)) * (w - l - r), y = (v) => t + (1 - v / max) * (h - t - b);
    const points = (values) => values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
    return <svg viewBox={`0 0 ${w} ${h}`} className="admin-analytics-overview-svg-icon" role="img" aria-label={label}>{[0, .5, 1].map(q => <line key={q} x1={l} x2={w - r} y1={t + q * (h - t - b)} y2={t + q * (h - t - b)} className="admin-analytics-trend-grid"/>)}<polyline className="admin-analytics-trend-primary" points={points(first)}/><polyline className="admin-analytics-trend-secondary" points={points(second)}/>{buckets.map((bucket, index) => <text key={bucket.key} x={x(index)} y={h - 7} textAnchor="middle" className="admin-analytics-overview-text">{buckets.length > 8 && index % 2 ? "" : bucket.label}</text>)}</svg>;
}
function Panel({ title, subtitle, className = "", children }) { return <article className={`admin-analytics-overview-article ${className}`}><h3 className="admin-analytics-overview-heading">{title}</h3><p className="admin-analytics-overview-text-2">{subtitle}</p>{children}</article>; }
function Metric({ label, value, tone = "default", icon }) { return <div className={`admin-analytics-overview-card admin-analytics-tone-${tone}`}>{icon && <span className="admin-analytics-metric-icon">{icon}</span>}<strong className="admin-analytics-overview-strong">{value.toLocaleString()}</strong><span className="admin-analytics-overview-span">{label}</span></div>; }
function Row({ label, value, total, tone, compact = false }) { return <div><div className={`admin-analytics-overview-row ${compact ? "admin-analytics-overview-panel" : "admin-analytics-overview-panel-2"}`}><span>{label}</span><strong>{value} ({percent(value, total)}%)</strong></div><progress className={`${compact ? "admin-analytics-overview-panel-3" : "admin-analytics-overview-panel-4"} admin-analytics-progress admin-analytics-progress-${tone}`} value={value} max={Math.max(total, 1)}/></div>; }
export function AdminAnalyticsOverview() {
    const [data, setData] = useState(null), [period, setPeriod] = useState(30);
    const [loading, setLoading] = useState(true), [error, setError] = useState(null);
    const active = useRef(false), queued = useRef(false), mounted = useRef(true);
    const load = useCallback(async () => { if (active.current) {
        queued.current = true;
        return;
    } active.current = true; setLoading(true); setError(null); try {
        const next = await fetchAdminAnalyticsData();
        if (mounted.current)
            setData(next);
    }
    catch (cause) {
        if (mounted.current)
            setError(cause instanceof Error ? cause.message : "Analytics could not be refreshed.");
    }
    finally {
        active.current = false;
        if (mounted.current)
            setLoading(false);
        if (queued.current && mounted.current) {
            queued.current = false;
            void load();
        }
    } }, []);
    useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [load]);
    useEffect(() => { let timer = null; const refresh = () => { if (timer)
        clearTimeout(timer); timer = setTimeout(() => void load(), 180); }; const channel = supabase.channel("admin-analytics-sync").on("postgres_changes", { event: "*", schema: "public", table: "apartments" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "apartment_views" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, refresh).on("postgres_changes", { event: "*", schema: "public", table: "apartment_ratings" }, refresh).on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_users" }, refresh).subscribe(); return () => { if (timer)
        clearTimeout(timer); void supabase.removeChannel(channel); }; }, [load]);
    const a = useMemo(() => {
        const buckets = bucketsFor(period);
        const apartments = (data?.apartments ?? []).filter(item => !item.deleted_at && !item.is_archived), ids = new Set(apartments.map(item => item.id));
        const submitted = buckets.map(bucket => apartments.filter(item => inBucket(item.created_at, bucket)).length), published = buckets.map(bucket => apartments.filter(item => inBucket(item.published_at, bucket)).length);
        const views = (data?.views ?? []).filter(item => ids.has(item.apartment_id) && buckets.some(bucket => inBucket(item.viewed_at, bucket))), favorites = (data?.favorites ?? []).filter(item => ids.has(item.apartment_id) && buckets.some(bucket => inBucket(item.created_at, bucket)));
        const viewTrend = buckets.map(bucket => views.filter(item => inBucket(item.viewed_at, bucket)).reduce((sum, item) => sum + Math.max(0, Number(item.view_count) || 0), 0)), favoriteTrend = buckets.map(bucket => favorites.filter(item => inBucket(item.created_at, bucket)).length);
        const currentListings = apartments.filter(item => item.is_published && item.approval_status === "approved" && item.status === "available"), rooms = currentListings.flatMap(item => item.apartment_rooms ?? []), available = rooms.filter(room => (room.status ?? (room.is_occupied ? "occupied" : "available")) === "available" && !room.is_occupied), rents = available.map(room => Number(room.rent)).filter(rent => Number.isFinite(rent) && rent > 0);
        const listing = [apartments.filter(x => x.is_published).length, apartments.filter(x => !x.is_published && x.approval_status === "pending").length, apartments.filter(x => !x.is_published && !["pending", "rejected"].includes(x.approval_status ?? "")).length, apartments.filter(x => !x.is_published && x.approval_status === "rejected").length];
        const landlords = data?.users ?? [], category = (item) => { if (item.is_verified)
            return 0; const values = [item.status, item.verification_status, item.landlord_status].map(v => String(v ?? "").toLowerCase()); if (values.includes("rejected"))
            return 2; if (values.some(v => ["pending", "unverified", "under_review"].includes(v)))
            return 1; return 3; }, verification = [0, 1, 2, 3].map(index => landlords.filter(item => category(item) === index).length);
        const ratings = (data?.ratings ?? []).filter(item => ids.has(item.apartment_id) && Number(item.rating) >= 1 && Number(item.rating) <= 5);
        return { buckets, apartments, submitted, published, views: viewTrend.reduce((x, y) => x + y, 0), favorites: favorites.length, viewTrend, favoriteTrend, available: available.length, rents, listing, landlords, verification, ratings };
    }, [data, period]);
    const average = a.ratings.length ? a.ratings.reduce((sum, item) => sum + Number(item.rating), 0) / a.ratings.length : 0, distribution = [5, 4, 3, 2, 1].map(star => a.ratings.filter(item => Number(item.rating) === star).length);
    return <section className="admin-analytics-overview-section">
    <div className="admin-analytics-overview-content"><div><div className="admin-analytics-overview-row-2"><BarChart3 className="admin-analytics-overview-bar-chart3-icon"/><h2 className="admin-analytics-overview-descriptive-analytics">Descriptive Analytics</h2></div><p className="admin-analytics-overview-text-3">Descriptive insights based on recorded AptFindr platform activity.</p></div><div className="admin-analytics-overview-card-2">{[7, 30, 90].map(days => <button key={days} onClick={() => setPeriod(days)} className={`admin-analytics-overview-days ${period === days ? "admin-analytics-overview-days-2" : "admin-analytics-overview-days-3"}`}>{days} Days</button>)}<Button variant="ghost" size="sm" disabled={loading} onClick={() => void load()} className="admin-analytics-overview-button"><RefreshCw className={`admin-analytics-overview-refresh-cw-icon ${loading ? "admin-analytics-overview-refresh-cw-icon-2" : ""}`}/></Button></div></div>
    {loading && !data ? <div className="admin-analytics-overview-loading-analytics"><RefreshCw className="admin-analytics-overview-refresh-cw-icon-3"/>Loading analytics...</div> : !data && error ? <div className="admin-analytics-overview-card-3">{error}</div> : <>{error && <p className="admin-analytics-overview-existing-analytics-remain-visible">{error} Existing analytics remain visible.</p>}<div className="admin-analytics-overview-grid">
      <Panel title="Listing Activity" subtitle="Selected period" className="admin-analytics-overview-panel-6"><div className="admin-analytics-overview-grid-2"><Metric label="Submitted Listings" value={a.submitted.reduce((x, y) => x + y, 0)} tone="primary"/><Metric label="Published Listings" value={a.published.reduce((x, y) => x + y, 0)} tone="success"/></div><Legend first="Submitted" second="Published"/><Trend buckets={a.buckets} first={a.submitted} second={a.published} label="Listing activity trend"/></Panel>
      <Panel title="Availability & Price Range" subtitle="Current database state" className="admin-analytics-overview-panel-7"><div className="admin-analytics-overview-panel-8"><Home className="admin-analytics-overview-home-icon"/><strong className="admin-analytics-overview-strong-2">{a.available}</strong><span className="admin-analytics-overview-available-rooms">Available Rooms</span></div><div className="admin-analytics-overview-grid-3"><Small label="Lowest Rent" value={a.rents.length ? peso(Math.min(...a.rents)) : "—"}/><Small label="Highest Rent" value={a.rents.length ? peso(Math.max(...a.rents)) : "—"}/></div></Panel>
      <Panel title="Tenant Engagement" subtitle="Selected period" className="admin-analytics-overview-panel-9"><div className="admin-analytics-overview-grid-2"><Metric label="Apartment Views" value={a.views} tone="primary" icon={<Eye className="admin-analytics-overview-eye-icon"/>}/><Metric label="Favorites Added" value={a.favorites} icon={<Heart className="admin-analytics-overview-heart-icon"/>}/></div><Legend first="Views" second="Favorites"/><Trend buckets={a.buckets} first={a.viewTrend} second={a.favoriteTrend} label="Tenant engagement trend"/></Panel>
      <Panel title="Verification Status" subtitle="Current landlord state" className="admin-analytics-overview-panel-9"><div className="admin-analytics-overview-row-3"><div className="admin-analytics-overview-card-4"><strong>{percent(a.verification[0], a.landlords.length)}%</strong></div><div className="admin-analytics-overview-panel-10">{["Verified", "Pending", "Rejected", "Incomplete"].map((label, index) => <Row key={label} label={label} value={a.verification[index]} total={a.landlords.length} tone={["success", "warning", "danger", "muted"][index]}/>)}</div></div><p className="admin-analytics-overview-verification-rate">Verification Rate <strong className="admin-analytics-overview-strong-3">{percent(a.verification[0], a.landlords.length)}%</strong></p></Panel>
      <Panel title="Listing Status" subtitle="Current apartment state" className="admin-analytics-overview-panel-9"><div className="admin-analytics-overview-panel-11">{["Published", "Pending Review", "Unpublished", "Rejected"].map((label, index) => <Row key={label} label={label} value={a.listing[index]} total={a.apartments.length} tone={["success", "warning", "warning", "danger"][index]}/>)}</div></Panel>
      <Panel title="Rating Overview" subtitle="All-time · secondary metric" className="admin-analytics-overview-panel-9"><div className="admin-analytics-overview-grid-4"><div><div className="admin-analytics-overview-row-2"><strong className="admin-analytics-overview-strong-4">{average ? average.toFixed(1) : "—"}</strong><Star className="admin-analytics-overview-star-icon"/></div><p className="admin-analytics-overview-total-ratings">{a.ratings.length} total ratings</p></div><div className="admin-analytics-overview-panel-12">{distribution.map((count, index) => <Row key={index} label={`${5 - index} Stars`} value={count} total={a.ratings.length} tone="rating" compact/>)}</div></div></Panel>
    </div><p className="admin-analytics-overview-text-4"><CalendarDays className="admin-analytics-overview-calendar-days-icon"/>Archived and deleted apartments are excluded. Availability, pricing, verification, and listing status are current-state metrics.</p></>}
  </section>;
}
function Legend({ first, second }) { return <div className="admin-analytics-overview-row-4"><span><i className="admin-analytics-overview-i"/>{first}</span><span><i className="admin-analytics-overview-i-2"/>{second}</span></div>; }
function Small({ label, value }) { return <div><span className="admin-analytics-overview-span-3">{label}</span><strong className="admin-analytics-overview-strong-5">{value}</strong></div>; }
