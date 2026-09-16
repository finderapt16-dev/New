import { Star } from "lucide-react";
export function ApartmentRatingSummary({ stats, isLoading = false, className = "" }) {
    if (isLoading) {
        return <span className={`apartment-rating-loading ${className}`} aria-label="Loading apartment rating"/>;
    }
    if (!stats || stats.count < 1) {
        return <span className={`apartment-rating-empty ${className}`}>No ratings yet</span>;
    }
    const ratingLabel = `${stats.average.toFixed(1)} (${stats.count.toLocaleString()} ${stats.count === 1 ? "rating" : "ratings"})`;
    return (<span className={`apartment-rating-summary ${className}`} aria-label={`${ratingLabel} from tenants`}>
      <Star className="apartment-rating-star" aria-hidden="true"/>
      <span className="apartment-rating-label">{ratingLabel}</span>
    </span>);
}
