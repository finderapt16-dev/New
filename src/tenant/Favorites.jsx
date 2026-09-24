import { Bath, Bed, Bookmark, Building2, ChevronRight, Eye, Heart, MapPin, Search, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { listFavoriteApartments } from "@/data/apartments";
import { useFavorites } from "@/tenant/useFavorites";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getImageUrl } from "@/utils/images";
import { MobileNavigation } from "@/tenant/MobileNavigation";
import { Sidebar } from "@/tenant/Sidebar";
import { useTenantNotifications } from "@/tenant/useTenantNotifications";
import { getAvailableRoomCount, isTenantVisibleApartment, getAvailableRoomCount as getAvailableRooms } from "@/utils/listingVisibility";
import { ApartmentRatingSummary } from "@/components/ApartmentRatingSummary";
import { EmptyState } from "@/tenant/EmptyState";
const STATUS_LABEL = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
};
const STATUS_CLASS = {
    available: "favorites-badge-2",
    occupied: "favorites-badge-3",
    maintenance: "favorites-badge-4",
};
export function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { refreshFavorites, toggleFavorite } = useFavorites();
    const { unreadCount } = useTenantNotifications();
    const { apartments } = useApartmentsContext();
    const [favoriteApartments, setFavoriteApartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!user?.id) {
                setFavoriteApartments([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const apartments = await listFavoriteApartments(user.id);
                if (active) {
                    setFavoriteApartments(apartments.filter((apt) => (isTenantVisibleApartment(apt) &&
                        !(user.role === "landlord" && apt.landlordId === user.id))));
                }
            }
            catch (error) {
                console.error("Failed to load favorite apartments:", error);
                if (active)
                    setFavoriteApartments([]);
            }
            finally {
                if (active)
                    setIsLoading(false);
            }
        };
        void load();
        void refreshFavorites();
        return () => {
            active = false;
        };
    }, [apartments, user?.id, user?.role, refreshFavorites]);
    const getAvailableRooms = getAvailableRoomCount;
    const visibleFavorites = useMemo(() => {
        return [...favoriteApartments].sort((a, b) => {
            const aDate = new Date(a.favoritedAt || 0).getTime();
            const bDate = new Date(b.favoritedAt || 0).getTime();

            return bDate - aDate;
        });
    }, [favoriteApartments]);
    const favoriteCount = favoriteApartments.length;
    const removeFavorite = async (apartmentId) => {
        if (!user?.id)
            return;
        setRemovingId(apartmentId);
        try {
            await toggleFavorite(apartmentId);
            await refreshFavorites();
            const apartments = await listFavoriteApartments(user.id);
            setFavoriteApartments(apartments.filter((apt) => (isTenantVisibleApartment(apt) &&
                !(user.role === "landlord" && apt.landlordId === user.id))));
        }
        finally {
            setRemovingId(null);
        }
    };
    if (user?.role === "admin") {
        return <Navigate to="/dashboard" replace/>;
    }
    const FavoriteCard = ({ apartment }) => {
        const status = apartment.status ?? "available";
        const availableRooms = getAvailableRooms(apartment);
        const images = [apartment.image, ...(apartment.images ?? [])].filter(Boolean);
        const location = formatApartmentLocation(apartment);
        return (<article className="favorites-article">
        <div className="favorites-panel">
          <div className="favorites-panel-3">
            {images[0] ? (<img src={getImageUrl(images[0])} alt={apartment.title} className="favorites-image"/>) : (<div className="favorites-row">
                <Building2 className="favorites-building2-icon"/>
              </div>)}
          </div>
          <div className="favorites-content">
            {apartment.landlordVerified === true && <VerifiedBadge label="Verified Listing" className="favorites-verified-badge"/>}
            {apartment.petFriendly && <Badge className="favorites-pet-friendly">Pet Friendly</Badge>}
            <Badge className={`favorites-badge ${STATUS_CLASS[status] ?? STATUS_CLASS.available}`}>{STATUS_LABEL[status] ?? "Available"}</Badge>
          </div>
          <button onClick={() => void removeFavorite(apartment.id)} disabled={removingId === apartment.id} className="favorites-remove-from-favorites" aria-label="Remove from favorites">
            <Heart className="favorites-heart-icon"/>
          </button>
        </div>

        <div className="favorites-content-2">
          <div className="favorites-content-3">
            <div className="favorites-panel-4">
              <h2 className="favorites-heading">{apartment.title}</h2>
              <div className="favorites-row-2">
                <MapPin className="favorites-map-pin-icon"/>
                <span>{location}</span>
              </div>
            </div>
            <div className="favorites-panel-5">
              <p className="favorites-view-room-prices">View room prices</p>
            </div>
          </div>

          <div className="favorites-grid">
            <InfoPill icon={Bookmark} value={availableRooms.toLocaleString()} label={availableRooms === 1 ? "Room" : "Rooms"} tone="tenant-tone-brand"/>
            <InfoPill icon={Bed} value={apartment.rooms?.length ? apartment.rooms.length.toLocaleString() : apartment.bedrooms.toLocaleString()} label={apartment.rooms?.length ? "Room count" : "Beds"} tone="tenant-tone-brand"/>
            <InfoPill icon={Bath} value={apartment.bathrooms.toLocaleString()} label={apartment.bathrooms === 1 ? "Bath" : "Baths"} tone="tenant-tone-brand"/>
            <InfoPill icon={Square} value={Number(apartment.sqft || 0).toLocaleString()} label="Sqft" tone="tenant-tone-brand"/>
          </div>

          {apartment.description && (<p className="favorites-text">{apartment.description}</p>)}

          <div className="favorites-content-4">
            <Button asChild variant="outline" className="favorites-button">
              <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/favorites", backLabel: "Back to Favorites" }}>
                <Eye className="favorites-eye-icon"/>
                View Details
              </Link>
            </Button>
            <Button variant="outline" disabled={removingId === apartment.id} onClick={() => void removeFavorite(apartment.id)} className="favorites-button-2">
              <Trash2 className="favorites-trash2-icon"/>
              {removingId === apartment.id ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </article>);
    };
    return (<div className="tenant-browse app-shell">
      <MobileNavigation active="favorites" unreadCount={unreadCount}/>
      <div className="app-shell-frame">
        <aside className="app-shell-sidebar">
          <Sidebar active="favorites" unreadCount={unreadCount}/>
        </aside>

        <main className="app-shell-main">
          <div className="app-shell-content app-shell-content-mobile-nav">
            <section className="tenant-favorites-hero">
              <div className="favorites-panel-9">
               
                <h1 className="favorites-your-favorites">Your Favorites</h1>
                <p className="favorites-text-4">
                  {favoriteCount > 0 ? `${favoriteCount.toLocaleString()} ${favoriteCount === 1 ? "apartment" : "apartments"} saved for later` : "Save apartments you like and return to them anytime."}
                </p>
              </div>
            </section>

            <section className="favorites-section-2">
              {isLoading ? (<div className="favorites-loading-favorites">
                  Loading favorites...
                </div>) : favoriteCount === 0 ? (<div className="favorites-card-2">
                  <div className="favorites-card-3">
                    <Heart className="favorites-heart-icon-3"/>
                  </div>
                  <h2 className="favorites-no-favorites-yet">No favorites yet</h2>
                  <p className="favorites-text-5">Save apartments you like and they'll appear here.</p>
                  <Button onClick={() => navigate("/browse")} className="favorites-browse-apartments">
                    Browse Apartments
                    <ChevronRight className="favorites-chevron-right-icon-2"/>
                  </Button>
                </div>) : (<div className="favorites-grid-3">
                  {visibleFavorites.map((apartment) => (<FavoriteCard key={apartment.id} apartment={apartment}/>))}
                </div>)}
            </section>

            {favoriteCount > 0 && <section className="favorites-section-3">
              <span className="favorites-card-5">
                <Building2 className="favorites-building2-icon-2"/>
              </span>
              <div className="favorites-panel-7">
                <h2 className="favorites-explore-more-apartments">Explore more apartments</h2>
                <p className="favorites-text-6">Find more places you'll love and add to your favorites.</p>
              </div>
              <Button onClick={() => navigate("/browse")} className="favorites-browse-apartments-2">
                Browse Apartments
                <ChevronRight className="favorites-chevron-right-icon-2"/>
              </Button>
            </section>}
          </div>
        </main>
      </div>
    </div>);
}
function InfoPill({ icon: Icon, value, label, tone, }) {
    return (<div className="favorites-row-5">
      <span className={`favorites-row-6 ${tone}`}>
        <Icon className="favorites-icon-icon-2"/>
      </span>
      <div>
        <p className="favorites-text-7">{value}</p>
        <p className="favorites-text-8">{label}</p>
      </div>
    </div>);
}

export const FavoritesOverview = ({ favoriteApartments, visibleFavoriteApartments, favoriteFilter, setFavoriteFilter, favoriteSort, setFavoriteSort, favoriteView, setFavoriteView, removingFavoriteId, removeFavorite, ratingSummary, ratingsLoading, navigate, }) => (<div className="favorites-section-container">
    <section className="favorites-section-section">
      <div className="favorites-section-content">
        <div className="favorites-section-card">
          <Heart className="favorites-section-heart-icon"/>
        </div>
        <div>
          <h1 className="favorites-section-your-favorites">Your Favorites</h1>
          <p className="favorites-section-apartments-you-ve-saved-for-later">Apartments you've saved for later</p>
        </div>
      </div>
      <div className="favorites-section-panel"/>
      <div className="favorites-section-panel-2"/>
    </section>

    <section className="favorites-section-section-2">
      <div className="favorites-section-row">
        <span className="favorites-section-row-2">
          <Heart className="favorites-section-heart-icon"/>
        </span>
        <div>
          <p className="favorites-section-total-favorites">Total Favorites</p>
          <p className="favorites-section-text">{favoriteApartments.length.toLocaleString()}</p>
          <p className="favorites-section-text-2">{favoriteApartments.length === 1 ? "apartment saved" : "apartments saved"}</p>
        </div>
      </div>
      <div className="favorites-section-row-3">
        <span className="favorites-section-row-4">
          <Bookmark className="favorites-section-bookmark-icon"/>
        </span>
        <div>
          <p className="favorites-section-save-for-later">Save for later</p>
          <p className="favorites-section-text-3">Compare and revisit real listings you saved from Browse and Apartment Details.</p>
        </div>
      </div>
    </section>

   

    {favoriteApartments.length === 0 ? (<EmptyState icon={Heart} message="No favorites yet. Browse apartments to save listings." actionLabel="Browse Apartments" action={() => navigate("/browse")}/>) : visibleFavoriteApartments.length === 0 ? (<div className="favorites-section-card-2">
        <Search className="favorites-section-search-icon"/>
        <h2 className="favorites-section-no-favorites-match-this-filter">No favorites match this filter</h2>
        <Button variant="outline" onClick={() => setFavoriteFilter("all")} className="favorites-section-show-all-favorites">Show All Favorites</Button>
      </div>) : (<div className={favoriteView === "grid" ? "favorites-section-grid-2" : "favorites-section-panel-3"}>
        {visibleFavoriteApartments.map((apartment) => (<FavoriteApartmentCard key={apartment.id} apartment={apartment} favoriteView={favoriteView} removingFavoriteId={removingFavoriteId} removeFavorite={removeFavorite} ratingSummary={ratingSummary} ratingsLoading={ratingsLoading}/>))}
      </div>)}

    <section className="favorites-section-section-4">
      <span className="favorites-section-row-5">
        <Building2 className="favorites-section-building2-icon"/>
      </span>
      <div className="favorites-section-panel-4">
        <h2 className="favorites-section-explore-more-apartments">Explore more apartments</h2>
        <p className="favorites-section-text-4">Find more places you'll love and add to your favorites.</p>
      </div>
      <Button onClick={() => navigate("/browse")} className="favorites-section-browse-apartments">
        Browse Apartments
        <ChevronRight className="favorites-section-chevron-right-icon"/>
      </Button>
    </section>
  </div>);
const FavoriteApartmentCard = ({ apartment, favoriteView, removingFavoriteId, removeFavorite, ratingSummary, ratingsLoading, }) => {
    const status = apartment.status ?? "available";
    const statusClass = {
        available: "favorite-apartment-card-badge-2",
        occupied: "favorite-apartment-card-badge-3",
        maintenance: "favorite-apartment-card-badge-4",
    };
    const statusLabel = {
        available: "Available",
        occupied: "Occupied",
        maintenance: "Under Maintenance",
    };
    const availableRooms = getAvailableRooms(apartment);
    const images = [apartment.image, ...(apartment.images ?? [])].filter(Boolean);
    const locationLabel = formatApartmentLocation(apartment);
    return (<article className={`favorite-apartment-card-article ${favoriteView === "list" ? "favorite-apartment-card-article-2" : ""}`}>
      <div className="favorite-apartment-card-panel">
        <div className={favoriteView === "list" ? "favorite-apartment-card-panel-2" : "favorite-apartment-card-panel-3"}>
          {images[0] ? (<img src={getImageUrl(images[0])} alt={apartment.title} className="favorite-apartment-card-image"/>) : (<div className="favorite-apartment-card-row">
              <Building2 className="favorite-apartment-card-building2-icon"/>
            </div>)}
        </div>
        <div className="favorite-apartment-card-content">
          <VerifiedBadge label="Verified Listing" className="favorite-apartment-card-verified-badge"/>
          {apartment.petFriendly && <Badge className="favorite-apartment-card-pet-friendly">Pet Friendly</Badge>}
          <Badge className={`favorite-apartment-card-badge ${statusClass[status] ?? statusClass.available}`}>{statusLabel[status] ?? "Available"}</Badge>
        </div>
        <button onClick={() => void removeFavorite(apartment.id)} disabled={removingFavoriteId === apartment.id} className="favorite-apartment-card-remove-from-favorites" aria-label="Remove from favorites">
          <Heart className="favorite-apartment-card-heart-icon"/>
        </button>
        {images.length > 1 && (<div className="favorite-apartment-card-grid">
            {images.slice(1, 5).map((image, index) => (<div key={`${image}-${index}`} className="favorite-apartment-card-panel-4">
                <img src={getImageUrl(image)} alt={`${apartment.title} ${index + 2}`} className="favorite-apartment-card-image"/>
              </div>))}
          </div>)}
      </div>

      <div className="favorite-apartment-card-content-2">
        <div className="favorite-apartment-card-content-3">
          <div className="favorite-apartment-card-panel-5">
            <h2 className="favorite-apartment-card-heading">{apartment.title}</h2>
            <ApartmentRatingSummary stats={ratingSummary.byApartment.get(apartment.id)} isLoading={ratingsLoading} className="favorite-apartment-card-apartment-rating-summary"/>
            <div className="favorite-apartment-card-row-2">
              <MapPin className="favorite-apartment-card-map-pin-icon"/>
              <span>{locationLabel}</span>
            </div>
          </div>
          <div className="favorite-apartment-card-panel-6">
            <p className="favorite-apartment-card-view-room-prices">View room prices</p>
          </div>
        </div>

        <div className="favorite-apartment-card-grid-2">
          <SavedInfoPill icon={Bookmark} value={availableRooms.toLocaleString()} label={availableRooms === 1 ? "Room" : "Rooms"} tone="tenant-tone-brand-muted"/>
          <SavedInfoPill icon={Bed} value={apartment.rooms?.length ? apartment.rooms.length.toLocaleString() : apartment.bedrooms.toLocaleString()} label={apartment.rooms?.length ? "Room count" : "Beds"} tone="tenant-tone-rose"/>
          <SavedInfoPill icon={Bath} value={apartment.bathrooms.toLocaleString()} label={apartment.bathrooms === 1 ? "Bath" : "Baths"} tone="tenant-tone-purple"/>
          <SavedInfoPill icon={Square} value={Number(apartment.sqft || 0).toLocaleString()} label="Sqft" tone="tenant-tone-sky"/>
        </div>

        {apartment.description && (<p className="favorite-apartment-card-text">{apartment.description}</p>)}

        <div className="favorite-apartment-card-content-4">
          <Button asChild variant="outline" className="favorite-apartment-card-button">
            <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/dashboard?section=favorites", backLabel: "Back to Favorites" }}>
              <Eye className="favorite-apartment-card-eye-icon"/>
              View Details
            </Link>
          </Button>
          <Button variant="outline" disabled={removingFavoriteId === apartment.id} onClick={() => void removeFavorite(apartment.id)} className="favorite-apartment-card-button-2">
            <Trash2 className="favorite-apartment-card-trash2-icon"/>
            {removingFavoriteId === apartment.id ? "Removing..." : "Remove"}
          </Button>
        </div>
      </div>
    </article>);
};
const SavedInfoPill = ({ icon: Icon, value, label, tone, }) => (<div className="info-pill-row">
    <span className={`info-pill-row-2 ${tone}`}>
      <Icon className="info-pill-icon-icon"/>
    </span>
    <div>
      <p className="info-pill-text">{value}</p>
      <p className="info-pill-text-2">{label}</p>
    </div>
  </div>);
