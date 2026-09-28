import "./LandlordOverview.css";
import { useEffect, useState } from "react";
import { Eye, Heart, Star, MapPin, Plus, MoreHorizontal, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getRoomStatus } from "@/landlord/landlordStatus";
import { LandlordEmptyIllustration } from "@/landlord/LandlordEmptyIllustration";
import { PropertyEngagement } from "@/landlord/PropertyEngagement";
import { ApartmentListingGuidelinesModal } from "@/landlord/ApartmentListingGuidelinesModal";

export const LandlordOverview = ({
  myApartments = [],
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
  onAddProperty,
}) => {
  const navigate = useNavigate();
  const [internalGuidelinesOpen, setInternalGuidelinesOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close the dropdown menu if the user clicks outside
  useEffect(() => {
    if (!openMenuId) return;
    const handleOutsideClick = (event) => {
      if (!event.target.closest(".ld-more")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [openMenuId]);

  const handleOpenAddProperty = () => {
    if (onAddProperty) {
      onAddProperty();
    } else {
      setInternalGuidelinesOpen(true);
    }
  };

  const hasNoProperties = !isLoadingApartments && myApartments.length === 0;

  return (
    <div className="ld-simple-dashboard">
      <header className="ld-dashboard-header-card">
        <h1>Landlord Dashboard</h1>
        <p>Monitor your property and tenant engagement.</p>
      </header>

      {hasNoProperties ? (
        <section className="ld-properties-card ld-properties-card-empty">
          <div className="ld-properties-header-empty">
            <h2>Your Properties</h2>
            <p>Manage your apartments, rooms, and availability.</p>
          </div>

          <div className="ld-empty-state-container">
            <LandlordEmptyIllustration />
            <h3 className="ld-empty-state-title">Add your first property</h3>
            <p className="ld-empty-state-desc">
              Create an apartment listing to start managing your availability in aptfindr.
            </p>
            <button
              type="button"
              className="ld-empty-state-btn"
              onClick={handleOpenAddProperty}
            >
              <Plus size={16} /> Add Property
            </button>
            <div className="ld-empty-review-note">
              <Info size={15} />
              <span>Property listings are reviewed before publication.</span>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="ld-properties-card">
            <div className="ld-properties-header">
              <div>
                <h2>Your Properties</h2>
                <p>Manage your apartments, rooms, and availability.</p>
              </div>
            </div>

            {isLoadingApartments ? (
              <div className="ld-empty">Loading properties...</div>
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

                  const minRent = roomPrices.length ? Math.min(...roomPrices) : Number(apartment.price || 0);
                  const maxRent = roomPrices.length ? Math.max(...roomPrices) : minRent;
                  const views = Number(aptViews ? aptViews(apartment.id) : 0);
                  const favs = Number(aptFavs ? aptFavs(apartment.id) : 0);
                  const rating = ratingSummary?.byApartment?.get(apartment.id);
                  const displayRating = rating?.count
                    ? rating.average.toFixed(1)
                    : (apartment.rating && Number(apartment.rating) > 0
                      ? Number(apartment.rating).toFixed(1)
                      : "0");

                  const imageSrc =
                    apartment.image ||
                    (Array.isArray(apartment.images) && apartment.images.length > 0
                      ? apartment.images[0]
                      : null);

                  const isPublished = apartment.isPublished !== false;

                  return (
                    <article className="ld-property-row" key={apartment.id}>
                      {/* 1. Property Photo */}
                      <div className="ld-property-image">
                        {imageSrc ? (
                          <img src={imageSrc} alt={apartment.title || "Property"} />
                        ) : (
                          <div className="ld-property-no-image">
                            <span>Property Photo</span>
                          </div>
                        )}
                      </div>

                      {/* 2. Property Information */}
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
                            ? `₱${minRent.toLocaleString()} \u2013 ₱${maxRent.toLocaleString()} / month`
                            : "Rent not set"}
                        </p>
                      </div>

                      {/* Stats Section with Divider Lines */}
                      <div className="ld-property-stats-wrap">
                        <div className="ld-col-divider" />

                        {/* Views */}
                        <div className="ld-stat-col">
                          <Eye size={18} className="ld-stat-icon ld-stat-views" />
                          <span className="ld-stat-value">{views}</span>
                          <span className="ld-stat-label">Views</span>
                        </div>

                        <div className="ld-col-divider" />

                        {/* Favorites */}
                        <div className="ld-stat-col">
                          <Heart size={18} className="ld-stat-icon ld-stat-favs" />
                          <span className="ld-stat-value">{favs}</span>
                          <span className="ld-stat-label">Favorites</span>
                        </div>

                        <div className="ld-col-divider" />

                        {/* Average Rating */}
                        <div className="ld-stat-col">
                          <Star size={18} className="ld-stat-icon ld-stat-rating" />
                          <span className="ld-stat-value">{displayRating}</span>
                          <span className="ld-stat-label">Average Rating</span>
                        </div>
                      </div>

                      <div className="ld-col-divider" />

                      {/* 3. Actions Column */}
                      <div className="ld-property-actions-col">
                        <div className="ld-more">
                          <button
                            type="button"
                            className="ld-more-btn"
                            aria-label="More options"
                            onClick={(e) => {
                              e.stopPropagation();
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
                                    apartment.isPublished === false
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
                })}
              </div>
            )}
          </section>

          {/* One engagement panel per property (views / favorites / ratings). */}
          <div className="ld-engagement-stack">
            <span className="sr-only">Listing Performance</span>
            {myApartments.map((apartment) => (
              <PropertyEngagement
                key={apartment.id}
                apartment={apartment}
                viewRows={viewRows}
                favoriteRows={favoriteRows}
                ratingRows={ratingRows}
              />
            ))}
          </div>
        </>
      )}

      {!onAddProperty && (
        <ApartmentListingGuidelinesModal
          open={internalGuidelinesOpen}
          onClose={() => setInternalGuidelinesOpen(false)}
          onProceed={() => {
            setInternalGuidelinesOpen(false);
            navigate("/add-apartment");
          }}
        />
      )}
    </div>
  );
};
