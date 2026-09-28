import "./PropertyEngagement.css";
import { useMemo, useState } from "react";
import { CalendarDays, Eye, Heart, Star, TrendingDown, TrendingUp } from "lucide-react";

const DAY_MS = 86400000;
const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const rowTimestamp = (row, fields) => {
  for (const field of fields) {
    const value = row?.[field];
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }
  return null;
};
const percentChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};
const chartPoints = (values) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = 6 + (index * 308) / Math.max(values.length - 1, 1);
      const y = 80 - ((value - min) / range) * 68;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

const METRIC_DEFS = [
  {
    id: "views",
    label: "Views",
    icon: Eye,
    tone: "views",
    fields: ["viewed_at", "view_date", "created_at"],
    weight: (row) => Math.max(0, Number(row.view_count) || 1),
    emptyTitle: "No views yet",
    emptyText: "Views will appear here once tenants start viewing your property.",
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: Heart,
    tone: "favorites",
    fields: ["created_at"],
    weight: () => 1,
    emptyTitle: "No favorites yet",
    emptyText: "Favorites will appear here once tenants start saving your property.",
  },
  {
    id: "ratings",
    label: "Average Rating",
    icon: Star,
    tone: "rating",
    fields: ["updated_at", "created_at"],
    weight: (row) => Number(row.rating) || 0,
    emptyTitle: "No ratings yet",
    emptyText: "Ratings will appear here once tenants start reviewing your property.",
  },
];

// Per-property engagement panel: views, favorites, and average rating for the
// selected period, with the change compared to the previous period. One card
// is rendered per property the landlord owns.
export function PropertyEngagement({ apartment, viewRows = [], favoriteRows = [], ratingRows = [] }) {
  const [period, setPeriod] = useState("thisMonth");
  const title = apartment.title || "Untitled property";

  const metrics = useMemo(() => {
    const apartmentId = apartment.id;
    const scopedRows = {
      views: viewRows.filter((row) => (row.apartment_id ?? row.apartmentId) === apartmentId),
      favorites: favoriteRows.filter((row) => (row.apartment_id ?? row.apartmentId) === apartmentId),
      ratings: ratingRows.filter((row) => (row.apartment_id ?? row.apartmentId) === apartmentId),
    };

    const today = dayStart(new Date());
    const offset = period === "lastMonth" ? -1 : 0;
    const windowStart = new Date(today.getFullYear(), today.getMonth() + offset, 1).getTime();
    const windowEnd = new Date(today.getFullYear(), today.getMonth() + offset + 1, 1).getTime();
    const previousStart = new Date(today.getFullYear(), today.getMonth() + offset - 1, 1).getTime();
    const days = Math.round((windowEnd - windowStart) / DAY_MS);
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(windowStart); date.setDate(date.getDate() + index);
      const start = date.getTime();
      const next = new Date(date); next.setDate(next.getDate() + 1);
      const label = days > 7
        ? (index % 5 === 0 || index === days - 1 ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "")
        : date.toLocaleDateString("en-US", { weekday: "short" });
      return { start, end: next.getTime(), label };
    });
    const inWindow = (time, start, end) => time !== null && time >= start && time < end;

    return METRIC_DEFS.map((definition) => {
      const rows = scopedRows[definition.id];
      const timestampOf = (row) => rowTimestamp(row, definition.fields);
      const values = buckets.map((bucket) => rows.reduce(
        (total, row) => (inWindow(timestampOf(row), bucket.start, bucket.end) ? total + definition.weight(row) : total),
        0,
      ));
      const currentRows = rows.filter((row) => inWindow(timestampOf(row), windowStart, windowEnd));
      const previousRows = rows.filter((row) => inWindow(timestampOf(row), previousStart, windowStart));
      const sum = (list) => list.reduce((total, row) => total + definition.weight(row), 0);
      // Views/favorites total the raw counts; ratings report the window average.
      const currentTotal = definition.id === "ratings" && currentRows.length ? sum(currentRows) / currentRows.length : sum(currentRows);
      const previousTotal = definition.id === "ratings" && previousRows.length ? sum(previousRows) / previousRows.length : sum(previousRows);
      const change = percentChange(currentTotal, previousTotal);
      const display = definition.id === "ratings"
        ? (currentRows.length ? currentTotal.toFixed(1) : "0")
        : String(Math.round(currentTotal));
      return {
        ...definition,
        values,
        labels: buckets.map((bucket) => bucket.label),
        hasData: currentRows.length > 0,
        display,
        change,
      };
    });
  }, [apartment.id, period, favoriteRows, ratingRows, viewRows]);

  const changeLabel = "previous month";

  return (
    <section className="pe-card">
      <header className="pe-header">
        <div>
          <h2>{title} — Property Engagement</h2>
          <p>See how tenants are engaging with this property.</p>
        </div>
        <label className="pe-period">
          <CalendarDays size={14} />
          <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label={`Engagement period for ${title}`}>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>
        </label>
      </header>

      <div className="pe-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const neutral = metric.change === 0;
          const down = metric.change < 0;
          return (
            <article className="pe-metric" key={metric.id}>
              <div className="pe-metric-head">
                <span className={`pe-chip ${metric.tone}`}><Icon size={17} /></span>
                <strong className="pe-value">{metric.display}</strong>
                <span className="pe-label">{metric.label}</span>
              </div>

              <div className="pe-chart">
                {metric.hasData ? (
                  <svg viewBox="0 0 320 90" preserveAspectRatio="none" aria-hidden="true">
                    <polyline className={metric.tone} points={chartPoints(metric.values)} />
                  </svg>
                ) : (
                  <div className="pe-empty">
                    <strong>{metric.emptyTitle}</strong>
                    <span>{metric.emptyText}</span>
                  </div>
                )}
              </div>

              <div className="pe-axis" aria-hidden="true">
                {metric.labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
              </div>

              <footer className={`pe-foot ${neutral ? "is-neutral" : down ? "is-down" : "is-up"}`}>
                {neutral ? <TrendingUp size={12} /> : down ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                {neutral ? "No change compared to " : `${metric.change > 0 ? "+" : ""}${metric.change}% compared to `}
                {changeLabel}
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
