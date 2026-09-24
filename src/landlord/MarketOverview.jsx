import "./MarketOverview.css";
import { CalendarDays, Check, Eye, Heart, MapPin, Menu, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchFavoritesForApartments, fetchNotifications, fetchViewActivityForApartments } from "@/services/dashboardSupabaseService";
import { fetchRatingsForApartments } from "@/services/apartmentRatingsService";
import { supabase } from "@/services/supabaseClient";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getApartmentImageUrl } from "@/utils/images";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";

const TRENDS = [
  { id: "views", label: "Most Viewed" },
  { id: "favorites", label: "Most Favorited" },
  { id: "ratings", label: "Highest Rated" },
];
const apartmentIdFrom = row => row.apartment_id ?? row.apartmentId;
const propertyImage = apartment => getApartmentImageUrl(apartment);
const isInPeriod = (row, period) => {
  const rawDate = row.viewed_at ?? row.view_date ?? row.updated_at ?? row.created_at ?? row.createdAt;
  const date = new Date(rawDate);
  if (!rawDate || Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "thisMonth") return date >= thisMonth;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return date >= lastMonth && date < thisMonth;
};
const priceRange = apartment => {
  const prices = (apartment.rooms ?? []).map(room => Number(room.price)).filter(price => price > 0);
  const fallback = Number(apartment.price ?? apartment.monthlyRent ?? apartment.monthly_rent);
  if (!prices.length && fallback > 0) prices.push(fallback);
  if (!prices.length) return "Price not available";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const peso = value => `₱${value.toLocaleString("en-PH")}`;
  return `${peso(min)}${max === min ? "" : ` - ${peso(max)}`} / month`;
};
const sortByMetric = metric => (a, b) =>
  metric(b) - metric(a) ||
  String(a.apartment.title ?? "").localeCompare(String(b.apartment.title ?? "")) ||
  String(a.apartment.id).localeCompare(String(b.apartment.id));

export function MarketOverview() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { apartments = [], isLoading } = useApartmentsContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState("thisMonth");
  const [trendType, setTrendType] = useState("views");
  const [views, setViews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const properties = useMemo(
    () => apartments.filter(apartment => isTenantVisibleApartment(apartment)),
    [apartments],
  );
  const propertyIds = useMemo(() => properties.map(property => property.id).filter(Boolean), [properties]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [viewRows, favoriteRows, ratingRows, notifications] = await Promise.all([
          propertyIds.length ? fetchViewActivityForApartments(propertyIds) : [],
          propertyIds.length ? fetchFavoritesForApartments(propertyIds) : [],
          propertyIds.length ? fetchRatingsForApartments(propertyIds) : [],
          user?.id ? fetchNotifications(user.id) : [],
        ]);
        if (!active) return;
        setViews(viewRows ?? []);
        setFavorites(favoriteRows ?? []);
        setRatings(ratingRows ?? []);
        setUnreadNotifications((notifications ?? []).filter(item => !(item.read ?? item.is_read)).length);
      } catch (error) {
        console.error("Unable to load market trends:", error);
      }
    };
    void load();
    const channel = supabase
      .channel(`landlord-market-trends-${user?.id ?? "guest"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_views" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_ratings" }, () => { void load(); })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [propertyIds.join(","), user?.id]);

  const entries = useMemo(() => properties.map(apartment => {
    const matches = rows => rows.filter(row => apartmentIdFrom(row) === apartment.id && isInPeriod(row, period));
    const propertyViews = matches(views);
    const propertyRatings = matches(ratings);
    const ratingCount = propertyRatings.length;
    return {
      apartment,
      views: propertyViews.reduce((total, row) => total + Math.max(0, Number(row.view_count) || 1), 0),
      favorites: matches(favorites).length,
      ratingCount,
      ratingAverage: ratingCount
        ? propertyRatings.reduce((total, row) => total + Number(row.rating || 0), 0) / ratingCount
        : null,
    };
  }), [favorites, period, properties, ratings, views]);

  const selectedTrend = useMemo(() => {
    if (trendType === "favorites") return {
      heading: "Most Favorited Apartments",
      description: "Properties are ranked by the number of tenant favorites.",
      column: "Favorites",
      empty: "No tenant favorites recorded yet.",
      value: item => item.favorites,
      renderValue: item => item.favorites,
    };
    if (trendType === "ratings") return {
      heading: "Highest Rated Apartments",
      description: "Properties are ranked by their average tenant rating.",
      column: "Ratings",
      empty: "No tenant ratings recorded yet.",
      value: item => item.ratingAverage ?? 0,
      renderValue: item => item.ratingCount ? <span className="market-rating"><Star size={15}/>{item.ratingAverage.toFixed(1)} <small>({item.ratingCount} ratings)</small></span> : <span className="market-no-rating">No ratings yet</span>,
    };
    return {
      heading: "Most Viewed Apartments",
      description: "Properties are ranked by the number of tenant views.",
      column: "Views",
      empty: "No tenant views recorded yet.",
      value: item => item.views,
      renderValue: item => item.views,
    };
  }, [trendType]);
  const rankedEntries = useMemo(() => [...entries].sort(sortByMetric(selectedTrend.value)), [entries, selectedTrend]);
  const SidebarContent = () => <LandlordSidebar
    user={user}
    verified={user?.isVerified}
    activeSection="market"
    unreadNotifications={unreadNotifications}
    onSectionChange={section => navigate(`/dashboard?section=${section}`)}
    onClose={() => setSidebarOpen(false)}
    onLogout={() => { logout?.(); navigate("/"); }}
  />;

  return <div className="app-shell landlord-shell landlord-market-trends">
    <div className="app-shell-frame">
      <aside className="app-shell-sidebar"><SidebarContent/></aside>
      {sidebarOpen && <div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}
      <aside className={`app-sidebar-drawer ${sidebarOpen ? "is-open" : ""}`}>
        <button title="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close"><X/></button>
        <SidebarContent/>
      </aside>
      <button title="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger"><Menu/></button>
      <main className="app-shell-main">
        <div className="market-trends-page">
          <header className="market-trends-header">
            <div><h1>Market Trends</h1><p>Discover the most popular apartment listings based on tenant engagement.</p></div>
          </header>
          {!isLoading && properties.length === 0 ? <div className="market-trends-empty">No properties available for Market Trends yet.</div> : <>
            <div className="market-trend-tabs" role="tablist" aria-label="Market trend type">
              {TRENDS.map(({ id, label }) => <button key={id} type="button" role="tab" aria-selected={trendType === id} className={`market-trend-tab ${trendType === id ? "is-active" : ""}`} onClick={() => setTrendType(id)}>{label}</button>)}
            </div>
            <section className="market-details">
              <header>
                <div><h2>Top Performing Properties</h2><p>These properties are based on recorded tenant engagement (views, favorites, and ratings) across all published listings in La Paz, Iloilo City.</p></div>
                <label className="market-period-select"><CalendarDays size={15}/>
                  <select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Performance period">
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                  </select>
                </label>
              </header>
              <div className="market-property-list">
                {rankedEntries.map(item => <article className="market-property-row" key={item.apartment.id}>
                  {propertyImage(item.apartment) ? <ImageWithFallback className="market-property-photo" src={propertyImage(item.apartment)} alt={item.apartment.title || "Apartment"}/> : <span className="market-property-photo market-property-image-placeholder"/>}
                  <div className="market-property-copy">
                    <div className="market-property-name"><strong>{item.apartment.title || "Untitled property"}</strong><span><Check size={10}/>Verified</span></div>
                    <p><MapPin size={12}/>{formatApartmentLocation(item.apartment, "Location unavailable")}</p>
                    <small>{priceRange(item.apartment)}</small>
                  </div>
                  <div className="market-stat"><Eye size={15}/><strong>{item.views}</strong><small>Views</small></div>
                  <div className="market-stat is-favorite"><Heart size={15}/><strong>{item.favorites}</strong><small>Favorites</small></div>
                  <div className="market-stat is-rating"><Star size={15}/><strong>{item.ratingAverage?.toFixed(1) ?? "—"}</strong><small>Average Rating</small></div>
                  <button className="market-view-details" onClick={() => navigate(`/landlord/market/${item.apartment.id}`)}>View Details</button>
                </article>)}
              </div>
            </section>
          </>}
        </div>
      </main>
    </div>
  </div>;
}
