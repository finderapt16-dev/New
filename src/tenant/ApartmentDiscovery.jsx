import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bath, Bed, Heart, Loader2, MapPin, Sparkles, Square, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/tenant/useFavorites";
import { isTenantRole } from "@/services/authService";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getImageUrl } from "@/utils/images";
import { Card, CardContent } from "@/components/ui/card";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ApartmentRatingSummary } from "@/components/ApartmentRatingSummary";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { EmptyState } from "@/tenant/EmptyState";
export const SuggestedSection = ({ hasPersonalizationPreferences, preferencesLoading, suggestedApartments, ratingSummary, ratingsLoading, navigate, }) => (<div className="suggested-page">
    <section className="suggested-hero">
      <div className="suggested-section-panel">
        <div className="suggested-section-card">
          <Sparkles className="suggested-section-sparkles-icon"/>
          {hasPersonalizationPreferences ? "Based on Your Preferences" : "Apartment Listings"}
        </div>
        <h2 className="suggested-section-heading">{hasPersonalizationPreferences ? "Recommended for You" : "Find Apartments for You"}</h2>
        <p className="suggested-section-text">{hasPersonalizationPreferences ? "Apartment suggestions based on your preferences." : "Set your preferences to receive personalized apartment suggestions."}</p>
      </div>
    </section>
    <div className="suggested-section-row">
      <Button onClick={() => navigate("/browse")} variant="outline" className="suggested-section-browse-all">View Apartments</Button>
    </div>
    {preferencesLoading ? (<div className="suggested-section-card-2"><Loader2 className="suggested-section-loader2-icon"/></div>) : !hasPersonalizationPreferences ? (<EmptyState icon={Sparkles} message="Set your preferences to receive personalized apartment suggestions." actionLabel="Set Preferences" action={() => navigate("/browse?preferences=open")}/>) : suggestedApartments.length > 0 ? (<div className="suggested-section-grid">
        {suggestedApartments.map((apartment) => (<div key={apartment.id} className="suggested-card">
            <Badge className="suggested-section-suggested">Recommended</Badge>
            <ApartmentCard apartment={apartment} ratingStats={ratingSummary.byApartment.get(apartment.id)} ratingsLoading={ratingsLoading} detailState={{ returnTo: "/dashboard?section=suggested", backLabel: "Back to Recommended" }}/>
          </div>))}
      </div>) : (<EmptyState icon={Sparkles} message="No apartments currently match your preferences." actionLabel="Adjust Preferences" action={() => navigate("/browse?preferences=open")}/>)}
  </div>);
export const PopularSection = ({ popularApartments, ratingSummary, ratingsLoading, navigate, }) => (<div className="popular-page">
    <section className="popular-hero">
      <div className="popular-section-panel">
        <div className="popular-section-trending-choices">
          <TrendingUp className="popular-section-trending-up-icon"/>
          Trending Choices
        </div>
        <h2 className="popular-section-popular-apartments">Popular Apartments</h2>
        <p className="popular-section-text">Explore apartments receiving more interest from AptFindr users through views and favorites.</p>
      </div>
    </section>
    <div className="popular-section-row">
      <Button onClick={() => navigate("/browse")} variant="outline" className="popular-section-browse-all">View Apartments</Button>
    </div>
    {popularApartments.length > 0 ? (<div className="popular-section-grid">
        {popularApartments.map((apartment) => (<div key={apartment.id} className="popular-card">
            <Badge className="popular-section-popular">Popular</Badge>
            <ApartmentCard apartment={apartment} ratingStats={ratingSummary.byApartment.get(apartment.id)} ratingsLoading={ratingsLoading} detailState={{ returnTo: "/dashboard?section=popular", backLabel: "Back to Popular" }}/>
          </div>))}
      </div>) : (<EmptyState icon={TrendingUp} message="No popular apartments available right now."/>)}
  </div>);
const STATUS_BADGE = {
    available: "apartment-card-badge",
    occupied: "apartment-card-badge-2",
    maintenance: "apartment-card-badge-3",
};
const STATUS_LABEL = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
};
export function ApartmentCard({ apartment, detailState, ratingStats, ratingsLoading }) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const { user, users } = useAuth();
    const favorite = isFavorite(apartment.id);
    const isOwnListing = user?.role === "landlord" && apartment.landlordId === user.id;
    const showFavoriteButton = isTenantRole(user?.role) && !isOwnListing;
    const landlord = apartment.landlordId ? users.find((entry) => entry.id === apartment.landlordId) : undefined;
    const verifiedLandlord = apartment.landlordVerified ?? landlord?.isVerified === true;
    const locationText = formatApartmentLocation(apartment);
    const imageUrl = getImageUrl(apartment.image || apartment.images?.[0] || "");
    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(apartment.id);
    };
    return (<Link to={`/apartment/${apartment.id}`} state={detailState}>
      <Card className="apartment-card-enter">
        <div className="apartment-card-panel">
          {imageUrl ? <ImageWithFallback src={imageUrl} alt={apartment.title} className="apartment-card-image-with-fallback"/> : <div className="apartment-card-image-unavailable">Image unavailable</div>}
          <div className="apartment-card-overlay"/>
          {showFavoriteButton && (<Button variant="ghost" size="icon" className={`apartment-card-button ${favorite ? "apartment-card-button-2" : ""}`} onClick={handleFavoriteClick} aria-label={favorite ? "Remove from favorites" : "Add to favorites"}>
              <Heart className={`apartment-card-heart-icon ${favorite ? "apartment-card-heart-icon-2" : ""}`} fill={favorite ? "currentColor" : "none"}/>
            </Button>)}
          <div className="apartment-card-badges-enter">
            {verifiedLandlord && (<VerifiedBadge label="Verified Listing" className="apartment-card-verified-badge"/>)}
            {apartment.petFriendly && (<Badge className="apartment-card-pet-friendly">Pet Friendly</Badge>)}
            <Badge className={`${STATUS_BADGE[apartment.status ?? "available"]} apartment-card-badge-4`}>
              {STATUS_LABEL[apartment.status ?? "available"]}
            </Badge>
          </div>
        </div>
        <CardContent className="apartment-card-card-content">
          <div className="apartment-card-row">
            <div className="apartment-card-panel-2">
              <h3 className="apartment-card-heading">{apartment.title}</h3>
              <ApartmentRatingSummary stats={ratingStats} isLoading={ratingsLoading} className="apartment-card-apartment-rating-summary"/>
              <div className="apartment-card-row-2">
                <MapPin className="apartment-card-map-pin-icon"/>
                <span>{locationText}</span>
              </div>
            </div>
            <div className="apartment-card-panel-3">
              <p className="apartment-card-view-room-prices">View room prices</p>
            </div>
          </div>
          <div className="apartment-card-row-3">
            <div className="apartment-card-row-4">
              <Bed className="apartment-card-bed-icon"/>
              <span>{apartment.bedrooms} bed</span>
            </div>
            <div className="apartment-card-row-4">
              <Bath className="apartment-card-bath-icon"/>
              <span>{apartment.bathrooms} bath</span>
            </div>
            <div className="apartment-card-row-4">
              <Square className="apartment-card-square-icon"/>
              <span>{apartment.sqft} sqft</span>
            </div>
          </div>

        </CardContent>
      </Card>
    </Link>);
}
