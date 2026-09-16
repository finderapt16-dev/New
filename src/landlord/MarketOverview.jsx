import "./MarketOverview.css";
import { Building2, CalendarDays, Eye, Heart, MapPin, Menu, Star, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApartmentViews, fetchFavorites, fetchNotifications } from "@/services/dashboardSupabaseService";
import { fetchApartmentRatings } from "@/services/apartmentRatingsService";
import { getApartmentImageUrl } from "@/utils/images";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";

const rowApartmentId = (row) => row.apartment_id ?? row.apartmentId;
const rowDate = (row) => row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt;

function getPeriodStart(period) {
  const now = new Date();
  if (period === "last7") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(now.getDate() + mondayOffset);
  if (period === "lastWeek") {
    const previousMonday = new Date(thisMonday);
    previousMonday.setDate(previousMonday.getDate() - 7);
    return previousMonday;
  }
  return thisMonday;
}

function isInPeriod(row, period) {
  const value = rowDate(row);
  if (!value) return period === "thisWeek";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = getPeriodStart(period);
  if (period !== "lastWeek") return date >= start;
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

export function MarketOverview() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { apartments = [], isLoading } = useApartmentsContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState("thisWeek");
  const [views, setViews] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchApartmentViews(),
      fetchFavorites(),
      fetchApartmentRatings(),
      user?.id ? fetchNotifications(user.id) : Promise.resolve([]),
    ]).then(([viewRows, favoriteRows, ratingRows, notifications]) => {
      if (!active) return;
      setViews(viewRows ?? []);
      setFavorites(favoriteRows ?? []);
      setRatings(ratingRows ?? []);
      setUnreadNotifications((notifications ?? []).filter((item) => !(item.read ?? item.is_read)).length);
    }).catch((error) => console.error("Unable to load market trends:", error));
    return () => { active = false; };
  }, [user?.id]);

  const rankedProperties = useMemo(() => {
    const visible = apartments.filter(isTenantVisibleApartment);
    return visible.map((apartment) => {
      const periodViews = views.filter((row) => rowApartmentId(row) === apartment.id && isInPeriod(row, period));
      const periodFavorites = favorites.filter((row) => rowApartmentId(row) === apartment.id && isInPeriod(row, period));
      const periodRatings = ratings.filter((row) => rowApartmentId(row) === apartment.id && isInPeriod(row, period));
      const viewCount = periodViews.reduce((sum, row) => sum + Math.max(0, Number(row.view_count ?? 1) || 0), 0);
      const favoriteCount = periodFavorites.length;
      const ratingCount = periodRatings.length;
      const ratingAverage = ratingCount
        ? periodRatings.reduce((sum, row) => sum + Number(row.rating || 0), 0) / ratingCount
        : 0;
      return { apartment, viewCount, favoriteCount, ratingCount, ratingAverage };
    }).sort((a, b) =>
      b.viewCount - a.viewCount ||
      b.favoriteCount - a.favoriteCount ||
      b.ratingCount - a.ratingCount ||
      b.ratingAverage - a.ratingAverage
    );
  }, [apartments, views, favorites, ratings, period]);

  const SidebarContent = () => (
    <LandlordSidebar
      user={user}
      verified={user?.isVerified}
      activeSection="market"
      unreadNotifications={unreadNotifications}
      onSectionChange={(section) => navigate(`/dashboard?section=${section}`)}
      onClose={() => setSidebarOpen(false)}
      onLogout={() => { logout?.(); navigate("/"); }}
    />
  );

  return (
    <div className="app-shell landlord-shell landlord-market-trends">
      <div className="app-shell-frame">
        <aside className="app-shell-sidebar"><SidebarContent /></aside>
        {sidebarOpen && <div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <aside className={`app-sidebar-drawer ${sidebarOpen ? "is-open" : ""}`}>
          <button title="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close"><X /></button>
          <SidebarContent />
        </aside>
        <button title="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger"><Menu /></button>

        <main className="app-shell-main">
          <div className="market-trends-page">
            <header className="market-trends-header">
              <div>
                <h1>Market Trends</h1>
                <p>Discover the most popular apartment listings based on tenant engagement across AptFindr.</p>
              </div>
              <label className="market-period-select">
                <CalendarDays size={16} />
                <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                  <option value="thisWeek">This Week</option>
                  <option value="lastWeek">Last Week</option>
                  <option value="last7">Last 7 Days</option>
                </select>
              </label>
            </header>

            <section className="market-trends-intro">
              <span className="market-trends-icon"><Building2 size={20} /></span>
              <div><h2>Top Performing Properties</h2><p>Properties are ranked using recorded tenant engagement: views, favorites, and ratings.</p></div>
            </section>

            <section className="market-trends-list">
              {isLoading ? <div className="market-trends-empty">Loading market trends...</div> : rankedProperties.length === 0 ? (
                <div className="market-trends-empty"><TrendingUp size={28} /><strong>No market data yet</strong><span>Published properties will appear here when engagement is recorded.</span></div>
              ) : rankedProperties.map(({ apartment, viewCount, favoriteCount, ratingCount, ratingAverage }) => (
                <article className="market-trend-property" key={apartment.id}>
                  <div className="market-property-main">
                    <div className="market-property-image">
                      {getApartmentImageUrl(apartment) ? <ImageWithFallback src={getApartmentImageUrl(apartment)} alt={apartment.title || "Property"} /> : <Building2 size={34} />}
                    </div>
                    <div className="market-property-copy">
                      <h3>{apartment.title || "Untitled property"}</h3>
                      <p className="market-property-location"><MapPin size={13} />{formatApartmentLocation(apartment, "Location unavailable")}</p>
                      <div className="market-property-tags"><span>Published</span><span>Tenant engagement</span></div>
                      <p className="market-property-description">{apartment.description || "Apartment listing available in La Paz, Iloilo City."}</p>
                    </div>
                  </div>

                  <div className="market-property-metrics">
                    <div className="market-metric"><Eye size={24} /><strong>{viewCount}</strong><span>Views</span></div>
                    <div className="market-metric"><Heart size={24} /><strong>{favoriteCount}</strong><span>Favorites</span></div>
                    <div className="market-metric"><Star size={24} /><strong>{ratingCount}</strong><span>Ratings</span>{ratingCount > 0 && <small>{ratingAverage.toFixed(1)} avg.</small>}</div>
                  </div>

                  <button className="market-view-details" onClick={() => navigate(`/landlord/market/${apartment.id}`)}>View Details</button>
                </article>
              ))}
            </section>

            <p className="market-trends-note">Engagement data is based on tenant views, favorites, and ratings recorded during the selected period. Ratings are counted as submitted rating records.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
