import { matchesRoomCapacity } from "@/tenant/roomCapacity";
import { Preferences } from "./Preferences";
import { Bath, Bed, Building2, ChevronLeft, ChevronRight, Eye, Grid2X2, Heart, LocateFixed, Map, MapPin, RefreshCw, Search, SlidersHorizontal, Square, TriangleAlert } from "lucide-react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ApartmentRatingSummary } from "@/components/ApartmentRatingSummary";
import { MapView } from "@/components/MapView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { isTenantRole } from "@/services/authService";
import { getTimeBasedGreeting } from "@/tenant/tenantGreeting";
import { fetchApartmentRatings, subscribeToApartmentRatings, summarizeApartmentRatings } from "@/services/apartmentRatingsService";
import { useFavorites } from "@/tenant/useFavorites";
import { defaultTenantPreferences, fetchApartmentViews, fetchFavorites as fetchDashboardFavorites, fetchTenantPreferences, saveTenantPreferences } from "@/services/dashboardSupabaseService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getApartmentImageUrl, getImageUrl } from "@/utils/images";
import { getAvailableRoomCount, isTenantVisibleApartment } from "@/utils/listingVisibility";
import { DEFAULT_LA_PAZ_MAP_CENTER, hasValidApartmentCoordinates } from "@/utils/mapCoordinates";
import { hasMeaningfulPreferences, rankApartments } from "@/tenant/rankingEngine";
import { geocodeLocationWithinLaPaz, GeocodingError } from "@/services/geocodingService";
import { findNearbyApartments, formatDistance, parseNearbySearchIntent } from "@/tenant/geospatialSearch";
import { toast } from "sonner";
import { MarketOverview } from "@/landlord/MarketOverview";
import { MobileNavigation } from "@/tenant/MobileNavigation";
import { Sidebar } from "@/tenant/Sidebar";
import { useTenantNotifications } from "@/tenant/useTenantNotifications";
const STATUS_LABEL = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
};
const STATUS_CLASS = {
    available: "apartment-browse-badge-3",
    occupied: "apartment-browse-badge-4",
    maintenance: "apartment-browse-badge-5",
};
const parseMoneyValue = (value) => {
    if (typeof value === "number") {
        return Number.isFinite(value) && value > 0 ? value : null;
    }
    if (typeof value === "string") {
        const normalized = value.replace(/[^\d.-]/g, "");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    return null;
};
const getAvailableRoomPrices = (apartment) => (apartment.rooms ?? [])
        .filter((room) => {
        const status = room.status ?? (room.isOccupied ? "occupied" : "available");
        return status === "available" && room.isOccupied !== true;
    })
        .map((room) => parseMoneyValue(room.price))
        .filter((price) => price !== null);
const getAvailableApartmentPrice = (apartment) => {
    const roomPrices = getAvailableRoomPrices(apartment);
    if (roomPrices.length > 0)
        return Math.min(...roomPrices);
    return parseMoneyValue(apartment.price);
};
const getApartmentPriceLabel = (apartment) => {
    const prices = getAvailableRoomPrices(apartment);
    if (!prices.length && !apartment.rooms?.length) {
        const fallback = parseMoneyValue(apartment.price);
        if (fallback !== null) prices.push(fallback);
    }
    if (!prices.length) return "Price not available";
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const format = (value) => `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
    return `${low === high ? format(low) : `${format(low)}–${format(high)}`}/month`;
};
const getApartmentPublishedTime = (apartment) => {
    const candidates = [apartment.publishedAt, apartment.updatedAt, apartment.createdAt, apartment.availableDate];
    for (const value of candidates) {
        if (!value)
            continue;
        const timestamp = new Date(value).getTime();
        if (!Number.isNaN(timestamp))
            return timestamp;
    }
    return Number.NEGATIVE_INFINITY;
};
const compareOptionalNumber = (left, right, direction) => {
    if (left === null && right === null)
        return 0;
    if (left === null)
        return 1;
    if (right === null)
        return -1;
    return direction === "asc" ? left - right : right - left;
};
const shuffleApartments = (items) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[i],
        ];
    }
    return shuffled;
};
function BrowseContent() {
    const { user } = useAuth();
    if (user?.role === "landlord") {
        return <MarketOverview />;
    }
    return <TenantBrowse />;
}
function TenantBrowse() {
    const { unreadCount } = useTenantNotifications();
    const [searchParams] = useSearchParams();
    const { user, users } = useAuth();
    const { apartments: allApartments, isLoading: apartmentsLoading, isRefreshing: apartmentsRefreshing, error: apartmentsError, refreshApartments, } = useApartmentsContext();
    const { isFavorite, toggleFavorite, updatingFavoriteIds } = useFavorites();
    const urlSearchQuery = searchParams.get("search")?.trim() || "";
    const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
    const [roomCapacity, setRoomCapacity] = useState(defaultTenantPreferences.roomCapacity || "any");
    const [sortBy, setSortBy] = useState(defaultTenantPreferences.sortBy || "recommended");
    const [browseMode, setBrowseMode] = useState("all");
    const [shuffleVersion, setShuffleVersion] = useState(0);
    const [viewMode, setViewMode] = useState("grid");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);
    const [viewRows, setViewRows] = useState([]);
    const [favoriteRows, setFavoriteRows] = useState([]);
    const [ratingRows, setRatingRows] = useState([]);
    const [ratingsLoading, setRatingsLoading] = useState(true);
    const [preferencesOpen, setPreferencesOpen] = useState(searchParams.get("preferences") === "open");
    const [savedPreferences, setSavedPreferences] = useState(defaultTenantPreferences);
    const hasPersonalizationPreferences = isTenantRole(user?.role) && hasMeaningfulPreferences(savedPreferences);
    const [activeNearbySearch, setActiveNearbySearch] = useState(null);
    const [nearbySearchLoading, setNearbySearchLoading] = useState(false);
    const [nearbySearchError, setNearbySearchError] = useState("");
    const geocodeRequest = useRef(0);
    const geocodeController = useRef(null);
    useEffect(() => {
        let mounted = true;
        if (!user?.id)
            return;
        const tenantId = user.id;
        void fetchTenantPreferences(tenantId)
            .then((preferences) => {
            if (!mounted || !preferences)
                return;
            setSavedPreferences(preferences);
            setSortBy(preferences.sortBy || "recommended");
            setRoomCapacity(preferences.roomCapacity);
        })
            .catch(() => {
            if (!mounted)
                return;
            toast.error("Unable to load saved browse preferences.");
        });
        return () => {
            mounted = false;
        };
    }, [user?.id, urlSearchQuery]);
    useEffect(() => () => geocodeController.current?.abort(), []);
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, roomCapacity, sortBy, browseMode, itemsPerPage, savedPreferences]);
    useEffect(() => {
        let mounted = true;
        const loadRankingData = () => Promise.all([fetchApartmentViews(), fetchDashboardFavorites(), fetchApartmentRatings()])
            .then(([views, favorites, ratings]) => {
            if (!mounted)
                return;
            setViewRows(views);
            setFavoriteRows(favorites);
            setRatingRows(ratings);
            setRatingsLoading(false);
        })
            .catch(() => {
            if (!mounted)
                return;
            setViewRows([]);
            setFavoriteRows([]);
            setRatingRows([]);
            setRatingsLoading(false);
        });
        void loadRankingData();
        const unsubscribe = subscribeToApartmentRatings(() => { void loadRankingData(); });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);
    const isApartmentAvailable = isTenantVisibleApartment;
    const getAvailableRooms = getAvailableRoomCount;
    const getViewCount = (apartmentId) => viewRows
        .filter((view) => (view.apartment_id ?? view.apartmentId) === apartmentId)
        .reduce((total, view) => total + Math.max(0, Number(view.view_count) || 0), 0);
    const getFavoriteCount = (apartmentId) => favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === apartmentId).length;
    const viewLabel = (count) => `${count.toLocaleString()} ${count === 1 ? "view" : "views"}`;
    const landlordById = useMemo(() => new globalThis.Map(users.filter((row) => row.id).map((row) => [row.id, row])), [users]);
    const ratingSummary = useMemo(() => summarizeApartmentRatings(ratingRows), [ratingRows]);
    const getLandlord = (apartment) => apartment.landlordId ? landlordById.get(apartment.landlordId) : undefined;
    const isVerifiedListing = (apartment) => {
        if (typeof apartment.landlordVerified === "boolean")
            return apartment.landlordVerified;
        const landlord = getLandlord(apartment);
        return landlord?.isVerified === true;
    };
    const getVerificationStatus = (apartment) => {
        return isVerifiedListing(apartment) ? "verified" : "pending";
    };
    const nearbyIntent = useMemo(() => parseNearbySearchIntent(searchQuery), [searchQuery]);
    const updateSearchQuery = (value) => {
        geocodeController.current?.abort();
        geocodeRequest.current += 1;
        setSearchQuery(value);
        setActiveNearbySearch(null);
        setNearbySearchError("");
        setNearbySearchLoading(false);
    };
    const submitSearch = async (event) => {
        event.preventDefault();
        const intent = parseNearbySearchIntent(searchQuery);
        if (!intent) {
            setActiveNearbySearch(null);
            setNearbySearchError("");
            return;
        }
        geocodeController.current?.abort();
        const controller = new AbortController();
        geocodeController.current = controller;
        const request = ++geocodeRequest.current;
        setNearbySearchLoading(true);
        setNearbySearchError("");
        setActiveNearbySearch(null);
        try {
            const location = await geocodeLocationWithinLaPaz(intent.target, controller.signal);
            if (request === geocodeRequest.current)
                setActiveNearbySearch({ target: intent.target, location });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError")
                return;
            if (request === geocodeRequest.current)
                setNearbySearchError(error instanceof GeocodingError ? error.message : "Unable to search that location.");
        }
        finally {
            if (request === geocodeRequest.current)
                setNearbySearchLoading(false);
        }
    };
    const randomizedApartments = useMemo(() => shuffleApartments(allApartments), [allApartments, shuffleVersion]);
    const filteredApartments = useMemo(() => {
        const filtered = randomizedApartments.filter((apt) => {
            if (apt.isPublished === false)
                return false;
            if (!isApartmentAvailable(apt))
                return false;
            if (!matchesRoomCapacity(apt, roomCapacity)) return false;
            if (searchQuery && !nearbyIntent) {
                const query = searchQuery.toLowerCase();
                const matchesSearch = apt.title.toLowerCase().includes(query) ||
                    apt.city.toLowerCase().includes(query) ||
                    apt.address.toLowerCase().includes(query) ||
                    apt.description.toLowerCase().includes(query) ||
                    apt.amenities.some((amenity) => amenity.toLowerCase().includes(query));
                if (!matchesSearch)
                    return false;
            }
            return true;
        });
        if (nearbyIntent && nearbySearchError)
            return [];
        if (activeNearbySearch)
            return findNearbyApartments(filtered, activeNearbySearch.location);
        if (browseMode === "suggested" && !hasPersonalizationPreferences)
            return [];
        const getSuggestedApartments = () => {
            if (!isTenantRole(user?.role))
                return [];
            const preferences = {
                minBudget: savedPreferences.minBudget,
                minBedrooms: savedPreferences.minBedrooms,
                ownBathroom: savedPreferences.ownBathroom,
                hasSavedPreferences: savedPreferences.hasSavedPreferences,
                maxBudget: savedPreferences.saveBudgetPreferences
                    ? savedPreferences.maxBudget || undefined
                    : undefined,
                preferredArea: savedPreferences.recommendationLocation
                    ? savedPreferences.preferredArea || undefined
                    : undefined,
                roomCapacity: savedPreferences.roomCapacity,
                petFriendly: savedPreferences.petFriendly,
                parking: savedPreferences.parking,
                furnished: savedPreferences.furnished,
                wifi: savedPreferences.wifi,
                ac: savedPreferences.ac,
                laundryArea: savedPreferences.laundryArea,
                recommendationLocation: savedPreferences.recommendationLocation,
                saveBudgetPreferences: savedPreferences.saveBudgetPreferences,
            };
            if (!hasMeaningfulPreferences(preferences))
                return [];
            const apartmentViewCounts = new globalThis.Map();
            viewRows.forEach((row) => {
                const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
                if (apartmentId) {
                    apartmentViewCounts.set(apartmentId, (apartmentViewCounts.get(apartmentId) ?? 0) + (Number(row.view_count) || 1));
                }
            });
            const apartmentFavoriteCounts = new globalThis.Map();
            favoriteRows.forEach((row) => {
                const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
                if (apartmentId) {
                    apartmentFavoriteCounts.set(apartmentId, (apartmentFavoriteCounts.get(apartmentId) ?? 0) + 1);
                }
            });
            const summary = summarizeApartmentRatings(ratingRows);
            return rankApartments(filtered, preferences, {
                apartmentViewCounts,
                apartmentFavoriteCounts,
                apartmentRatingStats: summary.byApartment,
                platformAverageRating: summary.platformAverage,
            });
        };
        // ALL APARTMENTS
        // Database-backed tenant-visible listings in randomized order.
        if (browseMode === "all") {
            return filtered;
        }
        // POPULAR
        // Engagement only: views + favorites. No WRA here.
        if (browseMode === "popular") {
            return [...filtered]
                .filter((apartment) => getViewCount(apartment.id) > 0 ||
                getFavoriteCount(apartment.id) > 0)
                .sort((a, b) => {
                const aEngagement = getViewCount(a.id) + getFavoriteCount(a.id) * 2;
                const bEngagement = getViewCount(b.id) + getFavoriteCount(b.id) * 2;
                return (bEngagement - aEngagement ||
                    getApartmentPublishedTime(b) - getApartmentPublishedTime(a));
            });
        }
        // SUGGESTED
        // The only browse mode that uses the Weighted Ranking Algorithm.
        if (browseMode === "suggested") {
            return getSuggestedApartments();
        }
        return filtered;
    }, [
        randomizedApartments,
        roomCapacity,
        searchQuery,
        nearbyIntent,
        nearbySearchError,
        activeNearbySearch,
        browseMode,
        user?.role,
        viewRows,
        favoriteRows,
        ratingRows,
        savedPreferences,
        hasPersonalizationPreferences,
    ]);
    const totalPages = Math.max(1, Math.ceil(filteredApartments.length / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * itemsPerPage;
    const paginatedApartments = filteredApartments.slice(pageStart, pageStart + itemsPerPage);
    const activeFilterCount = [savedPreferences.preferredArea?.trim(), savedPreferences.minBedrooms !== "any", roomCapacity !== "any", savedPreferences.saveBudgetPreferences, ...["petFriendly", "parking", "ownBathroom", "wifi", "ac", "laundryArea"].map(key => savedPreferences[key])].filter(Boolean).length;
    const mappedApartmentCount = filteredApartments.filter((apartment) => hasValidApartmentCoordinates(apartment.lat, apartment.lng)).length;
    const tenantGreeting = getTimeBasedGreeting(user?.name);
    const hasActiveApartmentFilters = Boolean(searchQuery.trim() || activeNearbySearch || activeFilterCount > 0);
    const mapCenter = DEFAULT_LA_PAZ_MAP_CENTER;
    const resetFilters = () => {
        setSearchQuery("");
        setSavedPreferences({ ...defaultTenantPreferences });
        setRoomCapacity("any");
        setSortBy("recommended");
    };
    const saveBrowsePreferences = async (draft) => {
        if (!user?.id) throw new Error("Please sign in to save preferences.");
        const saved = await saveTenantPreferences(user.id, { ...draft, sortBy });
        if (!saved) throw new Error("Unable to save preferences. Please try again.");
        setSavedPreferences(saved);
        setRoomCapacity(saved.roomCapacity);
        toast.success("Preferences saved for recommendations.");
        setPreferencesOpen(false);
    };
    const renderFilterTrigger = (floating = false) => (<DialogTrigger asChild>
      <Button type="button" className={floating ? "apartment-browse-button" : "apartment-browse-button-2"} variant={floating ? "default" : "outline"}>
        <SlidersHorizontal className={floating ? "apartment-browse-sliders-horizontal-icon" : "apartment-browse-sliders-horizontal-icon-2"}/>
        {!floating && `Preferences${activeFilterCount ? ` (${activeFilterCount})` : ""}`}
      </Button>
    </DialogTrigger>);
    const renderFilterContent = () => <Preferences open={preferencesOpen} preferences={savedPreferences} onSave={saveBrowsePreferences} />;
    const ApartmentsCard = ({ apartment }) => {
        const status = apartment.status ?? "available";
        const availableRooms = getAvailableRooms(apartment);
        const locationText = formatApartmentLocation(apartment);
        const favorite = isFavorite(apartment.id);
        const favoriteUpdating = updatingFavoriteIds.includes(apartment.id);
        const imageUrl = getApartmentImageUrl(apartment);
        const viewCount = getViewCount(apartment.id);
        return (<article className="apartment-browse-article">
        <div className="apartment-browse-panel-5">
          {imageUrl ? (<ImageWithFallback src={imageUrl} alt={apartment.title} className="apartment-browse-image-with-fallback"/>) : (<div className="apartment-browse-row-6">
              <Building2 className="apartment-browse-building2-icon"/>
            </div>)}
          <div className="apartment-browse-content-2">
            {activeNearbySearch && apartment.distanceMeters !== undefined && <Badge className="apartment-browse-badge">{formatDistance(apartment.distanceMeters)}</Badge>}
            <Badge className={`apartment-browse-badge-2 ${STATUS_CLASS[status] ?? STATUS_CLASS.available}`}>{STATUS_LABEL[status] ?? "Available"}</Badge>
            {isVerifiedListing(apartment) && <VerifiedBadge label="Verified Listing" className="apartment-browse-verified-badge"/>}
            {apartment.petFriendly && <Badge className="apartment-browse-pet-friendly">Pet Friendly</Badge>}
          </div>
          <button type="button" title={favorite ? "Remove from favorites" : "Add to favorites"} disabled={favoriteUpdating} onClick={() => void toggleFavorite(apartment.id)} className={`apartment-browse-button-6 ${favorite ? "apartment-browse-button-7" : "apartment-browse-button-8"}`}>
            {favoriteUpdating ? <RefreshCw className="apartment-browse-refresh-cw-icon"/> : <Heart className="apartment-browse-heart-icon" fill={favorite ? "currentColor" : "none"}/>}
          </button>
        </div>
        <div className="apartment-browse-panel-6">
          <div className="apartment-browse-row-7">
            <div className="apartment-browse-panel-7">
              <h2 className="apartment-browse-heading">{apartment.title}</h2>
              <ApartmentRatingSummary stats={ratingSummary.byApartment.get(apartment.id)} isLoading={ratingsLoading} className="apartment-browse-apartment-rating-summary"/>
              <p className="apartment-browse-text-3"><MapPin className="apartment-browse-map-pin-icon"/>{locationText}</p>
            </div>
            <div className="apartment-browse-panel-8">
              <p className="apartment-browse-view-room-prices">{getApartmentPriceLabel(apartment)}</p>
              <p className="apartment-browse-text-4"><Eye className="apartment-browse-eye-icon"/>{viewLabel(viewCount)}</p>
            </div>
          </div>
          <div className="apartment-browse-grid-5">
            <Metric icon={Building2} label="rooms" value={availableRooms.toLocaleString()}/>
            <Metric icon={Bed} label="bed" value={apartment.bedrooms.toLocaleString()}/>
            <Metric icon={Bath} label="bath" value={apartment.bathrooms.toLocaleString()}/>
            <Metric icon={Square} label="sqft" value={Number(apartment.sqft || 0).toLocaleString()}/>
          </div>
          <Button asChild variant="outline" className="apartment-browse-button-9">
            <Link to={`/apartment/${apartment.id}`}>
              <Eye className="apartment-browse-eye-icon-2"/>
              View Details
            </Link>
          </Button>
        </div>
      </article>);
    };
    return (<Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
      <div className="tenant-browse">
      <MobileNavigation active="apartments" unreadCount={unreadCount}/>
      <div className="apartment-browse-row-8">
        <div className="apartment-browse-panel-9"><Sidebar active="apartments" unreadCount={unreadCount}/></div>

        <main className="app-shell-main">
          <div className="app-shell-content app-shell-content-mobile-nav">
            <form onSubmit={submitSearch} className="apartment-browse-form">
              <div className="apartment-browse-grid-6">
                <div className="apartment-browse-panel-10">
                  <Search className="apartment-browse-search-icon"/>
                  <input value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} placeholder="Search apartments or try near ISAT U" className="apartment-browse-input-2"/>
                </div>
                {renderFilterTrigger()}
              </div>
              {nearbySearchLoading && <p className="apartment-browse-finding-nearby-apartments">Finding nearby apartments…</p>}
              {nearbySearchError && <p className="apartment-browse-text-5">{nearbySearchError}</p>}
            </form>

            <section className="apartment-browse-section-3">
              <div className="apartment-browse-panel-11">
                <p className="apartment-browse-text-6">{tenantGreeting}</p>
              
                <h1 className="apartment-browse-available-apartments">Available Apartments</h1>
                <p className="apartment-browse-text-7">{activeNearbySearch ? `${filteredApartments.length} apartments within 500 m of ${activeNearbySearch.target} · nearest first` : `${filteredApartments.length} ${filteredApartments.length === 1 ? "apartment" : "apartments"} found in La Paz`}</p>
              </div>
            </section>

            <section className="apartment-browse-section-4">
              {!activeNearbySearch && <div className="apartment-browse-row-9">
                <BrowseButton label="All Apartments" active={browseMode === "all"} onClick={() => {
                if (browseMode !== "all") {
                    setShuffleVersion((current) => current + 1);
                }
                setBrowseMode("all");
            }}/>
                <BrowseButton label="Popular" active={browseMode === "popular"} onClick={() => setBrowseMode("popular")}/>
                <BrowseButton label="Recommended" active={browseMode === "suggested"} onClick={() => setBrowseMode("suggested")}/>
              </div>}
              <div className="apartment-browse-grid-7">
                <button onClick={() => setViewMode("grid")} className={`apartment-browse-grid-8 ${viewMode === "grid" ? "apartment-browse-grid-9" : "apartment-browse-grid-10"}`}><Grid2X2 className="apartment-browse-grid2-x2-icon"/>Grid</button>
                <button onClick={() => setViewMode("map")} className={`apartment-browse-map ${viewMode === "map" ? "apartment-browse-map-2" : "apartment-browse-map-3"}`}><Map className="apartment-browse-map-icon"/>Map</button>
              </div>
            </section>

            <section className="apartment-browse-section-5">
              {apartmentsRefreshing && allApartments.length > 0 && (<div className="apartment-browse-refreshing-latest-apartment-data">
                  <RefreshCw className="apartment-browse-refresh-cw-icon-2" aria-hidden="true"/>
                  Refreshing latest apartment data...
                </div>)}
              {apartmentsLoading && allApartments.length === 0 ? (<div className="apartment-browse-loading-apartments" aria-label="Loading apartments">
                  {Array.from({ length: 6 }).map((_, index) => (<div key={index} className="apartment-browse-card-3">
                      <div className="apartment-browse-panel-13"/>
                      <div className="apartment-browse-panel-14">
                        <div className="apartment-browse-panel-15"/>
                        <div className="apartment-browse-panel-16"/>
                        <div className="apartment-browse-panel-17"/>
                      </div>
                    </div>))}
                </div>) : apartmentsError && allApartments.length === 0 ? (<div className="apartment-browse-card-4">
                  <TriangleAlert className="apartment-browse-triangle-alert-icon"/>
                  <p>{apartmentsError}</p>
                  <Button variant="outline" onClick={() => void refreshApartments()} className="apartment-browse-try-again">
                    Try Again
                  </Button>
                </div>) : filteredApartments.length === 0 ? (<div className="apartment-browse-card-5">
                  <LocateFixed className="apartment-browse-locate-fixed-icon"/>
                  <h2 className="apartment-browse-no-apartments-found">{browseMode === "suggested" && !activeNearbySearch && !hasPersonalizationPreferences ? "Set your preferences first" : "No apartments found"}</h2>
                  <p className="apartment-browse-text-8">{browseMode === "suggested" && !activeNearbySearch && !hasPersonalizationPreferences ? "Save your preferences to see apartments suggested for you." : activeNearbySearch ? "No available apartments were found within 500 meters of this location." : "Try adjusting your search, filters, or preferences to discover other available apartments."}</p>
                  {browseMode === "suggested" && !activeNearbySearch && !hasPersonalizationPreferences && <Button onClick={() => setPreferencesOpen(true)}>Set Preferences</Button>}
                  {hasActiveApartmentFilters && <Button onClick={resetFilters} className="apartment-browse-reset-search-amp-filters">Reset Search &amp; Filters</Button>}
                </div>) : viewMode === "grid" ? (<>
                  <div className="apartment-browse-grid-11">
                    {paginatedApartments.map((apartment) => (<ApartmentsCard key={apartment.id} apartment={apartment}/>))}
                  </div>
                  <Pagination currentPage={safePage} totalPages={totalPages} totalItems={filteredApartments.length} pageStart={pageStart} pageCount={paginatedApartments.length} itemsPerPage={itemsPerPage} setCurrentPage={setCurrentPage} setItemsPerPage={setItemsPerPage}/>
                </>) : (<div className="apartment-browse-card-6">
                  <div className="apartment-browse-shown-on-map">
                    {mappedApartmentCount.toLocaleString()} {mappedApartmentCount === 1 ? "apartment" : "apartments"} shown on map
                    {mappedApartmentCount < filteredApartments.length && <span className="apartment-browse-span-2">Some listings could not be placed on the map.</span>}
                  </div>
                  <MapView lat={mapCenter.lat} lng={mapCenter.lng} zoom={12} apartments={filteredApartments.map((apt) => ({
                id: apt.id,
                title: apt.title,
                price: getAvailableApartmentPrice(apt) ?? 0,
                lat: apt.lat,
                lng: apt.lng,
                bedrooms: apt.bedrooms,
                bathrooms: apt.bathrooms,
                image: apt.image ? getImageUrl(apt.image) : undefined,
                location: formatApartmentLocation(apt),
                availableRooms: getAvailableRooms(apt),
                status: apt.status ?? "available",
                isVerified: isVerifiedListing(apt),
                verificationStatus: getVerificationStatus(apt),
                availabilityStatus: isApartmentAvailable(apt) ? "available" : "unavailable",
                markerStatus: "available",
            }))} emptyMessage="No apartments found on the map. Try another search."/>
                </div>)}
            </section>
          </div>
        </main>
      </div>
      </div>
      {renderFilterContent()}
    </Dialog>);
}
function Metric({ icon: Icon, value, label }) {
    return (<div className="apartment-browse-row-10">
      <Icon className="apartment-browse-icon-icon"/>
      <span className="apartment-browse-span-3">{value}</span>
      <span className="apartment-browse-span-4">{label}</span>
    </div>);
}
function BrowseButton({ label, active, onClick }) {
    return (<button type="button" onClick={onClick} aria-pressed={active} className={`apartment-browse-button-10 ${active ? "apartment-browse-button-11" : "apartment-browse-button-12"}`}>
      {label}
    </button>);
}
function Pagination({ currentPage, totalPages, totalItems, pageStart, pageCount, itemsPerPage, setCurrentPage, setItemsPerPage, }) {
    const visiblePageCount = Math.min(5, totalPages);
    const firstVisiblePage = Math.min(Math.max(1, currentPage - Math.floor(visiblePageCount / 2)), Math.max(1, totalPages - visiblePageCount + 1));
    const visiblePages = Array.from({ length: visiblePageCount }, (_, index) => firstVisiblePage + index);
    return (<div className="apartment-browse-content-3">
      <p className="apartment-browse-showing">
        Showing {totalItems === 0 ? 0 : pageStart + 1} to {pageStart + pageCount} of {totalItems} apartments
      </p>
      <div className="apartment-browse-row-14">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="apartment-browse-button-13">
          <ChevronLeft className="apartment-browse-chevron-left-icon"/>
        </button>
        {visiblePages.map((page) => (<button key={page} onClick={() => setCurrentPage(page)} className={`apartment-browse-button-14 ${currentPage === page ? "apartment-browse-button-15" : "apartment-browse-button-16"}`}>
              {page}
            </button>))}
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="apartment-browse-button-13">
          <ChevronRight className="apartment-browse-chevron-right-icon"/>
        </button>
        <select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value))} className="apartment-browse-select">
          <option value={6}>Show: 6 per page</option>
          <option value={9}>Show: 9 per page</option>
          <option value={12}>Show: 12 per page</option>
        </select>
      </div>
    </div>);
}
export function Apartments() {
    return <BrowseContent />;
}
