import "./LandlordOverview.css";
import { useState } from "react";
import { CalendarDays, Eye, Heart, Star, MapPin, Plus, Building2, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getRoomStatus } from "@/landlord/landlordStatus";

const rowDate = (row, fields) => {
  const value = fields.map((field) => row?.[field]).find(Boolean);
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const percentChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};
const chartPoints = (values) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return values.map((value, index) => {
    const x = 8 + (index * 306) / Math.max(values.length - 1, 1);
    const y = 71 - ((value - min) / range) * 53;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
};

export const LandlordOverview = ({
  myApartments,
  user,
  isLoadingApartments,
  aptViews,
  aptFavs,
  ratingSummary,
  viewRows = [],
  favoriteRows = [],
  ratingRows = [],
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
}) => {
  const [performancePeriod, setPerformancePeriod] = useState("thisMonth");
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const firstName = user?.name?.trim().split(/\s+/)[0] || "Landlord";

  const totalViews = myApartments.reduce(
    (sum, apartment) => sum + Number(aptViews(apartment.id) || 0),
    0
  );

  const totalFavorites = myApartments.reduce(
    (sum, apartment) => sum + Number(aptFavs(apartment.id) || 0),
    0
  );

  const ratingValues = myApartments
    .map((apartment) => ratingSummary?.byApartment?.get(apartment.id))
    .filter(Boolean);

  const totalRatingCount = ratingValues.reduce(
    (sum, item) => sum + (item.count || 0),
    0
  );

  const averageRating = totalRatingCount
    ? ratingValues.reduce(
        (sum, item) => sum + item.average * item.count,
        0
      ) / totalRatingCount
    : 0;

  const now = new Date();
  const monthOffset = performancePeriod === "lastMonth" ? -1 : 0;
  const periodStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  const comparisonStart = new Date(now.getFullYear(), now.getMonth() + monthOffset - 1, 1);
  const comparisonEnd = periodStart;
  const bucketCount = 5;
  const dayLabels = Array.from({ length: bucketCount }, (_, index) => `W${index + 1}`);
  const inRange = (date, start, end) => date && date >= start && date < end;
  const bucketRows = (rows, fields, valueForRow = () => 1) => {
    const values = Array(bucketCount).fill(0);
    rows.forEach((row) => {
      const date = rowDate(row, fields);
      if (!inRange(date, periodStart, periodEnd)) return;
      const bucket = Math.min(Math.floor((date.getDate() - 1) / 7), bucketCount - 1);
      values[bucket] += valueForRow(row);
    });
    return values;
  };
  const periodValue = (rows, fields, start, end, valueForRow = () => 1) => rows.reduce((total, row) => {
    const date = rowDate(row, fields);
    return inRange(date, start, end) ? total + valueForRow(row) : total;
  }, 0);
  const viewValues = bucketRows(viewRows, ["viewed_at", "viewedAt"], (row) => Math.max(0, Number(row.view_count) || 1));
  const favoriteValues = bucketRows(favoriteRows, ["created_at", "createdAt"]);
  const ratingDailyTotals = bucketRows(ratingRows, ["updated_at", "created_at"], (row) => Number(row.rating) || 0);
  const ratingDailyCounts = bucketRows(ratingRows, ["updated_at", "created_at"]);
  const ratingValuesByDay = ratingDailyTotals.map((total, index) => ratingDailyCounts[index] ? total / ratingDailyCounts[index] : 0);
  const currentViews = viewValues.reduce((sum, value) => sum + value, 0);
  const currentFavorites = favoriteValues.reduce((sum, value) => sum + value, 0);
  const currentRatingCount = ratingDailyCounts.reduce((sum, value) => sum + value, 0);
  const currentRatingAverage = currentRatingCount ? ratingDailyTotals.reduce((sum, value) => sum + value, 0) / currentRatingCount : 0;
  const previousViews = periodValue(viewRows, ["viewed_at", "viewedAt"], comparisonStart, comparisonEnd, (row) => Math.max(0, Number(row.view_count) || 1));
  const previousFavorites = periodValue(favoriteRows, ["created_at", "createdAt"], comparisonStart, comparisonEnd);
  const previousRatingTotal = periodValue(ratingRows, ["updated_at", "created_at"], comparisonStart, comparisonEnd, (row) => Number(row.rating) || 0);
  const previousRatingCount = periodValue(ratingRows, ["updated_at", "created_at"], comparisonStart, comparisonEnd);
  const previousRatingAverage = previousRatingCount ? previousRatingTotal / previousRatingCount : 0;
  const performanceMetrics = [
    { label: "Listing views", value: currentViews, icon: Eye, values: viewValues, change: percentChange(currentViews, previousViews) },
    { label: "Ratings", value: currentRatingAverage ? currentRatingAverage.toFixed(1) : "0", icon: Star, values: ratingValuesByDay, change: percentChange(currentRatingAverage, previousRatingAverage) },
    { label: "Favorites", value: currentFavorites, icon: Heart, values: favoriteValues, change: percentChange(currentFavorites, previousFavorites) },
  ];

  return (
    <div className="ld-simple-dashboard">
      <header className="ld-simple-heading">
        <h1>
          {greeting}, {firstName}
        </h1>
        <p>Manage your properties, rooms, and availability in one place.</p>
      </header>

      <section className="ld-performance-card">
        <div className="ld-performance-heading">
          <div className="ld-section-title"><h2>Listing Performance</h2><p>Track your listing performance and tenant interest.</p></div>
          <label className="ld-performance-period"><CalendarDays size={15}/><select value={performancePeriod} onChange={(event) => setPerformancePeriod(event.target.value)} aria-label="Listing performance period"><option value="thisMonth">This Month</option><option value="lastMonth">Last Month</option></select></label>
        </div>

        <div className="ld-performance-grid ld-performance-grid-modern">
          {performanceMetrics.map(({ label, value, icon: Icon, values, change }) => (
            <article className="ld-metric" key={label}>
              <div className="ld-metric-topline">
                <span className="ld-metric-icon"><Icon size={20} strokeWidth={2} /></span>
                <span className="ld-metric-label">{label}</span>
              </div>
              <strong>{value}</strong>
              <div className="ld-metric-footer">
                <span className={`ld-metric-change ${change < 0 ? "is-negative" : ""}`}><TrendingUp size={11} /> {change > 0 ? "+" : ""}{change}%</span>
                <small>vs Previous Month</small>
              </div>
              <svg className="ld-metric-chart" viewBox="0 0 322 82" preserveAspectRatio="none" aria-hidden="true"><polyline points={chartPoints(values)} /></svg>
              <div className="ld-trend-axis" aria-hidden="true">{dayLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
            </article>
          ))}
        </div>
        <div className="ld-performance-grid ld-legacy-performance">
          <div className="ld-metric">
            <span><Eye size={16} /> Listing Views</span>
            <strong>{totalViews}</strong>
            <small>Current total</small>
          </div>

          <div className="ld-metric">
            <span><Star size={16} /> Ratings</span>
            <strong>{averageRating ? averageRating.toFixed(1) : "—"}</strong>
            <small>{totalRatingCount} rating{totalRatingCount === 1 ? "" : "s"}</small>
          </div>

          <div className="ld-metric">
            <span><Heart size={16} /> Favorites</span>
            <strong>{totalFavorites}</strong>
            <small>Current total</small>
          </div>

          <div className="ld-trend-card">
            <span>Listing activity</span>
            <svg viewBox="0 0 360 95" preserveAspectRatio="none">
              <polyline points="8,72 58,56 112,45 145,70 190,64 235,45 282,28 350,13" />
            </svg>
            <div className="ld-trend-axis">
              <span>Views</span>
              <span>Ratings</span>
              <span>Favorites</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ld-properties-card">
        <div className="ld-properties-header">
          <div>
            <h2>Your Properties</h2>
            <p>Manage your apartments, rooms, and availability.</p>
          </div>

          <Link to="/add-apartment" className="ld-add-button">
            <Plus size={15} /> Add Property
          </Link>
        </div>

        {isLoadingApartments ? (
          <div className="ld-empty">Loading properties...</div>
        ) : myApartments.length === 0 ? (
          <div className="ld-empty">
            <Building2 size={28} />
            <strong>No properties yet</strong>
            <span>Add your first property to get started.</span>
          </div>
        ) : (
          <div className="ld-property-list">
            {myApartments.map((apartment) => {
              const availableRooms =
                apartment.rooms?.filter(
                  (room) => getRoomStatus(room) === "available"
                ).length ?? 0;

              const roomPrices = (apartment.rooms || [])
                .map((room) =>
                  Number(room.price || room.monthlyRent || room.rent)
                )
                .filter((price) => Number.isFinite(price) && price > 0);

              const startingRent = roomPrices.length
                ? Math.min(...roomPrices)
                : Number(apartment.price || 0);

              return (
                <article className="ld-property-row" key={apartment.id}>
                  <div className="ld-property-image">
                    {apartment.image ? (
                      <img src={apartment.image} alt={apartment.title || "Property"} />
                    ) : (
                      <span>Property Photo</span>
                    )}
                  </div>

                  <div className="ld-property-info">
                    <h3>{apartment.title || "Untitled property"}</h3>

                    <p>
                      <MapPin size={12} />
                      {formatApartmentLocation(apartment, "Address unavailable")}
                    </p>

                    <span
                      className={
                        apartment.isPublished === false
                          ? "ld-status draft"
                          : "ld-status"
                      }
                    >
                      {apartment.isPublished === false ? "Unpublished" : "Published"}
                    </span>

                    <div className="ld-property-stats">
                      <div>
                        <b>{availableRooms}</b>
                        <span>room{availableRooms === 1 ? "" : "s"} available</span>
                      </div>

                      <div>
                        <span>Starting rent</span>
                        <b>
                          {startingRent
                            ? `₱${startingRent.toLocaleString()}/month`
                            : "Not set"}
                        </b>
                      </div>
                    </div>
                  </div>

                  <div className="ld-property-actions">
                    <Link
                      to={`/apartment/${apartment.id}`}
                      state={{
                        returnTo: "/dashboard?section=overview",
                        backLabel: "Back to My Properties",
                      }}
                      className="ld-view-property-action"
                    >
                      View Property
                    </Link>

                    <Link
                      to={`/landlord/properties/${apartment.id}/rooms`}
                      className="ld-primary-action"
                    >
                      Manage Rooms
                    </Link>

                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleTogglePublication(
                            apartment.id,
                            apartment.isPublished === false
                          )
                        }
                      >
                        {apartment.isPublished === false ? "Publish" : "Unpublish"}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        disabled={deletingApartmentId === apartment.id}
                        onClick={() => void handleDeleteApartment(apartment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
