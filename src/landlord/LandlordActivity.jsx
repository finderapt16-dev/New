import "./LandlordActivity.css";
import { Calendar, Clock, Eye, Heart, Star, TrendingUp } from "lucide-react";
import { PropertyActivityEmptyIllustration } from "@/landlord/PropertyActivityEmptyIllustration";
export const LandlordActivity = ({ activityRange, landlordViewRows, landlordFavoriteRows, ratingRows, propertyIds, myApartments, getViewWeight, setActivityRange, isLoadingApartments, isLoadingActivityData, }) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const rangeStart = activityRange === "today"
        ? todayStart
        : activityRange === "7d"
            ? weekStart
            : activityRange === "30d"
                ? monthStart
                : null;
    const isInSelectedRange = (value) => {
        if (rangeStart === null)
            return true;
        if (!value)
            return false;
        const timestamp = new Date(value).getTime();
        return !Number.isNaN(timestamp) && timestamp >= rangeStart;
    };
    const rangedViews = landlordViewRows.filter((view) => isInSelectedRange(view.viewed_at));
    const rangedFavorites = landlordFavoriteRows.filter((favorite) => isInSelectedRange(favorite.created_at));
    const ratingTimestamp = (rating) => rating.updated_at || rating.created_at;
    const rangedRatings = ratingRows.filter((rating) => propertyIds.has(rating.apartment_id) && isInSelectedRange(ratingTimestamp(rating)));
    const findProperty = (apartmentId) => myApartments.find((apartment) => apartment.id === apartmentId);
    const recentActivity = [
        ...rangedViews.map((view) => {
            const apartmentId = view.apartment_id ?? view.apartmentId ?? "";
            const count = getViewWeight(view);
            return { id: `view-${view.id ?? `${apartmentId}-${view.viewed_at}`}`, timestamp: view.viewed_at ?? "", title: `${count.toLocaleString()} new ${count === 1 ? "view" : "views"}`, property: findProperty(apartmentId)?.title || "Untitled property", icon: Eye };
        }).filter((item) => item.title !== "0 new views"),
        ...rangedFavorites.map((favorite) => {
            const apartmentId = favorite.apartment_id ?? favorite.apartmentId ?? "";
            return { id: `favorite-${favorite.id ?? `${apartmentId}-${favorite.created_at}`}`, timestamp: favorite.created_at ?? "", title: "Added to Favorites", property: findProperty(apartmentId)?.title || "Untitled property", icon: Heart };
        }),
        ...rangedRatings.map((rating) => ({ id: `rating-${rating.id}`, timestamp: ratingTimestamp(rating), title: `Received a ${rating.rating}-star rating`, property: findProperty(rating.apartment_id)?.title || "Untitled property", icon: Star })),
    ].filter((item) => item.timestamp).sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
    const summaryCards = [
        { label: "Views", value: rangedViews.reduce((total, view) => total + getViewWeight(view), 0), help: "Property views", icon: Eye },
        { label: "Favorites", value: rangedFavorites.length, help: "Times tenants saved your properties", icon: Heart },
        { label: "Ratings", value: rangedRatings.length, help: "Ratings received", icon: Star },
    ];
    return (<div className="activity-section-container">
      <header className="activity-section-header">
        <div className="activity-section-row"><span className="activity-section-row-2"><TrendingUp className="activity-section-trending-up-icon"/></span><div><p className="activity-section-activity">Activity</p><h1 className="activity-section-property-activity">Property Activity</h1><p className="activity-section-text">See how tenants interact with your properties.</p></div></div>
        <label className="activity-section-label"><Calendar className="activity-section-calendar-icon"/><select value={activityRange} onChange={(event) => setActivityRange(event.target.value)} className="activity-section-select"><option value="today">Today</option><option value="7d">This Week</option><option value="30d">This Month</option><option value="all">All Time</option></select></label>
      </header>

      <section className="activity-section-section">
        {summaryCards.map(({ label, value, help, icon: Icon }) => <div key={label} className="activity-section-card"><div className="activity-section-row"><span className="activity-section-row-3"><Icon className="activity-section-icon-icon"/></span><span className="activity-section-span">{label}</span></div><strong className="activity-section-strong">{value.toLocaleString()}</strong><span className="activity-section-span-2">{help}</span></div>)}
      </section>

      <section className="activity-section-section-2">
        <div className="activity-section-panel"><div className="activity-section-row"><span className="activity-section-row-4"><Clock className="activity-section-clock-icon"/></span><div><h2 className="activity-section-recent-activity">Recent Activity</h2><p className="activity-section-text-2">The latest tenant interactions during the selected period.</p></div></div></div>

        <div className="activity-section-panel-2">
          {isLoadingApartments || isLoadingActivityData ? (<div className="activity-section-row-5"><Clock className="activity-section-clock-icon-2"/></div>) : recentActivity.length === 0 ? (<div className="activity-section-card-2"><PropertyActivityEmptyIllustration /><h3 className="activity-section-no-activity-yet">No activity yet</h3><p className="activity-section-text-3">Tenant views, favorites, and ratings will appear here.</p></div>) : (<div className="activity-section-panel-3">
              {recentActivity.map(({ id, timestamp, title, property, icon: Icon }) => <article key={id} className="activity-section-article"><span className="activity-section-row-6"><Icon className="activity-section-icon-icon-2"/></span><div className="activity-section-panel-4"><h3 className="activity-section-heading">{title}</h3><p className="activity-section-text-4">{property}</p><time className="activity-section-time">{new Date(timestamp).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time></div></article>)}
            </div>)}
        </div>
      </section>
    </div>);
};
