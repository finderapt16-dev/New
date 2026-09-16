import { ArrowRight, Bath, Bed, Loader2, MapPin } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { getApartmentImageUrl } from "@/utils/images";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Button } from "@/components/ui/button";
const PREVIEW_LIMIT = 8;
function getRandomApartments(apartments) {
    const shuffled = [...apartments];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[i],
        ];
    }
    return shuffled.slice(0, PREVIEW_LIMIT);
}
function PreviewCard({ apartment, onApartmentClick, }) {
    return (<div className="landing-preview-wrapper">
      <Link to={`/apartment/${apartment.id}`} onClick={onApartmentClick} className="landing-preview-card">
        <div className="landing-preview-image-wrap">
          <ImageWithFallback src={getApartmentImageUrl(apartment)} alt={apartment.title} className="landing-preview-image"/>

          {apartment.landlordVerified === true && (<VerifiedBadge label="Verified Landlord" className="landing-preview-verified"/>)}

          {apartment.petFriendly && (<span className="landing-preview-pet">Pet friendly</span>)}
        </div>

        <div className="landing-preview-body">
          <div className="landing-preview-heading">
            <h3 className="landing-preview-title">{apartment.title}</h3>
            <p className="landing-preview-price">View prices</p>
          </div>

          <div className="landing-preview-location">
            <MapPin className="landing-preview-location-icon"/>
            <span className="landing-preview-address">
              {[apartment.city, apartment.state].filter(Boolean).join(", ") ||
            apartment.address ||
            "La Paz, Iloilo"}
            </span>
          </div>

          <article className="landing-preview-details">
            <span className="landing-preview-detail">
              <Bed className="landing-preview-detail-icon"/>
              {apartment.bedrooms} bed
            </span>

            <span className="landing-preview-detail">
              <Bath className="landing-preview-detail-icon"/>
              {apartment.bathrooms} bath
            </span>

            {apartment.sqft > 0 && (<span className="landing-preview-area">
                {apartment.sqft} sqft
              </span>)}
          </article>
        </div>
      </Link>
    </div>);
}
function PreviewSkeleton() {
    return (<div className="landing-preview-skeleton">
      <div className="landing-skeleton-image"/>

      <div className="landing-skeleton-body">
        <span className="landing-skeleton-title"/>
        <div className="landing-skeleton-location"/>
        <div className="landing-skeleton-details"/>
      </div>
    </div>);
}
export function LandingApartmentPreview({ onBrowseClick, }) {
    const { apartments, isLoading, error } = useApartmentsContext();
    const publishedApartments = useMemo(() => apartments.filter(isTenantVisibleApartment), [apartments]);
    const previewApartments = useMemo(() => getRandomApartments(publishedApartments), [publishedApartments]);
    if (isLoading) {
        return (<section className="landing-listings-section">
        <div className="landing-listings-container">
          <div className="landing-section-heading">
            <h2 className="landing-listings-title">
              Available Apartment Listings
            </h2>

            <p className="landing-listings-loading">
              <Loader2 className="landing-loading-icon"/>
              Loading apartment records...
            </p>
          </div>

          <div className="landing-skeleton-grid">
            {Array.from({ length: PREVIEW_LIMIT }).map((_, index) => (<PreviewSkeleton key={index}/>))}
          </div>
        </div>
      </section>);
    }
    if (previewApartments.length === 0) {
        return null;
    }
    return (<section className="landing-listings-section">
      <div className="landing-section-container">
        <section className="landing-listings-heading">
          <div className="landing-listings-copy">
            <h2 className="landing-section-title">
              Available Apartments in La Paz
            </h2>

            <p className="landing-listings-description">
              {publishedApartments.length}{" "}
              {publishedApartments.length === 1 ? "listing" : "listings"}{" "}
              available now. Open a card to review photos, rent details,
              location, amenities, and landlord information.
              {error ? " Some listings may be unavailable." : ""}
            </p>
          </div>

          <Link to="/browse" onClick={onBrowseClick} className="landing-listings-link">
            <Button className="landing-listings-button">
              {publishedApartments.length > PREVIEW_LIMIT
            ? `View all ${publishedApartments.length} listings`
            : "Browse all listings"}

              <ArrowRight className="landing-icon-small"/>
            </Button>
          </Link>
        </section>

        <div className="landing-listings-grid">
          {previewApartments.map((apartment) => (<PreviewCard key={apartment.id} apartment={apartment} onApartmentClick={onBrowseClick}/>))}
        </div>
      </div>
    </section>);
}
export function LandingListingsSection({ onBrowseClick, }) {
    const { apartments, isLoading } = useApartmentsContext();
    const hasPublishedApartments = useMemo(() => apartments.some(isTenantVisibleApartment), [apartments]);
    if (isLoading || hasPublishedApartments) {
        return <LandingApartmentPreview onBrowseClick={onBrowseClick}/>;
    }
    return <LandingListingsPlaceholder onBrowseClick={onBrowseClick}/>;
}
export function LandingListingsPlaceholder({ onBrowseClick, }) {
    return (<section className="landing-placeholder-section">
      <div className="landing-listings-container">
        <div className="landing-section-heading">
          <h2 className="landing-listings-title">
            Explore Apartment Listings
          </h2>

          <p className="landing-placeholder-description">
            No published apartments yet. Landlords can submit apartment and
            permit information for admin review.
          </p>
        </div>

        <div className="landing-placeholder-grid">
          <article className="landing-placeholder-card" onClick={onBrowseClick} onKeyDown={(e) => e.key === "Enter" &&
            onBrowseClick(e)} role="button" tabIndex={0}>
            <ImageWithFallback src="https://images.unsplash.com/photo-1654506012740-09321c969dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGFydG1lbnQlMjBpbnRlcmlvciUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzcyMTg1Njk0fDA&ixlib=rb-4.1.0&q=80&w=1080" alt="Apartment interior example" className="landing-placeholder-image"/>

            <div className="landing-placeholder-overlay"/>

            <div className="landing-placeholder-content">
              <h3 className="landing-placeholder-title">
                Apartment information
              </h3>

              <p className="landing-placeholder-copy">
                Photos, amenities, rent, availability, and landlord details
              </p>

              <span className="landing-placeholder-link">
                Browse listings
                <ArrowRight className="landing-placeholder-arrow"/>
              </span>
            </div>
          </article>

          <div className="landing-placeholder-card" onClick={onBrowseClick} onKeyDown={(e) => e.key === "Enter" &&
            onBrowseClick(e)} role="button" tabIndex={0}>
            <ImageWithFallback src="https://images.unsplash.com/photo-1754298994778-514e0a285479?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9wZXJ0eSUyMG1hcCUyMGxvY2F0aW9uJTIwcGlufGVufDF8fHx8MTc3MjE5MjMzOHww&ixlib=rb-4.1.0&q=80&w=1080" alt="Map location example" className="landing-placeholder-image"/>

            <div className="landing-placeholder-overlay"/>

            <div className="landing-placeholder-content">
              <h3 className="landing-placeholder-title">
                GIS map browsing
              </h3>

              <p className="landing-placeholder-copy">
                Compare apartment locations within La Paz before visiting
              </p>

              <span className="landing-placeholder-link">
                Open map view
                <ArrowRight className="landing-placeholder-arrow"/>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>);
}
