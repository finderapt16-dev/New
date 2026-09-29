import { Eye, Heart, MapPin, MoreHorizontal, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { formatApartmentLocation } from "@/utils/apartmentLocation";

export function MyPropertyCard({
  apartment,
  aptViews,
  aptFavs,
  ratingSummary,
  openMenuId,
  setOpenMenuId,
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
}) {
  const roomPrices = (apartment.rooms || [])
    .map((room) => Number(room.price || room.monthlyRent || room.rent))
    .filter((price) => Number.isFinite(price) && price > 0);
  const minRent = roomPrices.length
    ? Math.min(...roomPrices)
    : Number(apartment.price || 0);
  const maxRent = roomPrices.length ? Math.max(...roomPrices) : minRent;
  const views = Number(aptViews ? aptViews(apartment.id) : 0);
  const favs = Number(aptFavs ? aptFavs(apartment.id) : 0);
  const rating = ratingSummary?.byApartment?.get(apartment.id);
  const displayRating = rating?.count
    ? rating.average.toFixed(1)
    : apartment.rating && Number(apartment.rating) > 0
      ? Number(apartment.rating).toFixed(1)
      : "0";
  const imageSrc =
    apartment.image ||
    (Array.isArray(apartment.images) && apartment.images.length > 0
      ? apartment.images[0]
      : null);
  const isPublished = apartment.isPublished !== false;

  return (
    <article className="ld-property-row" key={apartment.id}>
      <div className="ld-property-image">
        {imageSrc ? (
          <img src={imageSrc} alt={apartment.title || "Property"} />
        ) : (
          <div className="ld-property-no-image">
            <span>Property Photo</span>
          </div>
        )}
      </div>

      <div className="ld-property-info">
        <div className="ld-property-title-row">
          <h3>{apartment.title || "Untitled property"}</h3>
          <span
            className={
              isPublished
                ? "ld-status ld-status-published"
                : "ld-status ld-status-unpublished"
            }
          >
            {isPublished ? "Published" : "Unpublished"}
          </span>
        </div>
        <p className="ld-property-location">
          <MapPin size={13} className="ld-pin-icon" />
          <span>{formatApartmentLocation(apartment, "Address unavailable")}</span>
        </p>
        <p className="ld-price-range">
          {minRent
            ? `₱${minRent.toLocaleString()} – ₱${maxRent.toLocaleString()} / month`
            : "Rent not set"}
        </p>
      </div>

      <div className="ld-property-stats-wrap">
        <div className="ld-col-divider" />
        <div className="ld-stat-col">
          <Eye size={18} className="ld-stat-icon ld-stat-views" />
          <span className="ld-stat-value">{views}</span>
          <span className="ld-stat-label">Views</span>
        </div>
        <div className="ld-col-divider" />
        <div className="ld-stat-col">
          <Heart size={18} className="ld-stat-icon ld-stat-favs" />
          <span className="ld-stat-value">{favs}</span>
          <span className="ld-stat-label">Favorites</span>
        </div>
        <div className="ld-col-divider" />
        <div className="ld-stat-col">
          <Star size={18} className="ld-stat-icon ld-stat-rating" />
          <span className="ld-stat-value">{displayRating}</span>
          <span className="ld-stat-label">Average Rating</span>
        </div>
      </div>

      <div className="ld-col-divider" />
      <div className="ld-property-actions-col">
        <div className="ld-more">
          <button
            type="button"
            className="ld-more-btn"
            aria-label="More options"
            onClick={(event) => {
              event.stopPropagation();
              setOpenMenuId(openMenuId === apartment.id ? null : apartment.id);
            }}
          >
            <MoreHorizontal size={18} />
          </button>
          {openMenuId === apartment.id && (
            <div className="ld-more-menu" role="menu">
              <button
                type="button"
                className="ld-menu-action-btn"
                role="menuitem"
                onClick={() => {
                  setOpenMenuId(null);
                  void handleTogglePublication?.(
                    apartment.id,
                    apartment.isPublished === false,
                  );
                }}
              >
                {apartment.isPublished === false ? "Publish" : "Unpublish"}
              </button>
              <button
                type="button"
                className="ld-menu-delete-btn"
                role="menuitem"
                disabled={deletingApartmentId === apartment.id}
                onClick={() => {
                  setOpenMenuId(null);
                  void handleDeleteApartment?.(apartment.id);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <div className="ld-action-buttons">
          <Link
            to={`/apartment/${apartment.id}`}
            state={{
              returnTo: "/dashboard?section=overview",
              backLabel: "Back to My Properties",
            }}
            className="ld-btn-outline"
          >
            View Property
          </Link>
          <Link
            to={`/landlord/properties/${apartment.id}/rooms`}
            className="ld-btn-outline"
          >
            Manage Rooms
          </Link>
        </div>
      </div>
    </article>
  );
}
