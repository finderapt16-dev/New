import "./LandlordOverview.css";
import { useState } from "react";
import { Eye, Heart, Star, MapPin, Plus, MoreHorizontal, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getRoomStatus } from "@/landlord/landlordStatus";
import { LandlordEmptyIllustration } from "@/landlord/LandlordEmptyIllustration";
import { PropertyEngagement } from "@/landlord/PropertyEngagement";
import { ApartmentListingGuidelinesModal } from "@/landlord/ApartmentListingGuidelinesModal";

export const LandlordOverview = ({
  myApartments,
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

              <button
                type="button"
                onClick={handleOpenAddProperty}
                className="ld-add-button"
              >
                <Plus size={15} /> Add Property
              </button>
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

                  return (
                    <article className="ld-property-row" key={apartment.id}>
                      <div className="ld-property-image">
                        {apartment.image ? (
                          <img src={apartment.image} alt={apartment.title || "Property"} />
                        ) : (
                          <span>Property Photo</span>
                        )}
                      </div>

                      <div className="ld-property-info">
                        <h3>{apartment.title || "Untitled property"}</h3>

                        <p>
                          <MapPin size={12} />
                          {formatApartmentLocation(apartment, "Address unavailable")}
                        </p>

                        <span
                          className={
                            apartment.isPublished === false
                              ? "ld-status draft"
                              : "ld-status"
                          }
                        >
                          {apartment.isPublished === false ? "Unpublished" : "Published"}
                        </span>

                        <p className="ld-price-range">
                          {minRent ? `₱${minRent.toLocaleString()} – ₱${maxRent.toLocaleString()} / month` : "Rent not set"}
                        </p>
                      </div>

                      <div className="ld-row-stats">
                        <div><Eye size={20} className="v" /><b>{views}</b><span>Views</span></div>
                        <div><Heart size={20} className="f" /><b>{favs}</b><span>Favorites</span></div>
                        <div><Star size={20} className="r" /><b>{rating?.count ? rating.average.toFixed(1) : 0}</b><span>Average Rating</span></div>
                      </div>

                      <div className="ld-property-actions">
                        <Link
                          to={`/apartment/${apartment.id}`}
                          state={{
                            returnTo: "/dashboard?section=overview",
                            backLabel: "Back to My Properties",
                          }}
                          className="ld-view-property-action"
                        >
                          View Property
                        </Link>

                        <Link
                          to={`/landlord/properties/${apartment.id}/rooms`}
                          className="ld-primary-action"
                        >
                          Manage Rooms
                        </Link>

                        <div className="ld-more">
                          <button type="button" className="ld-more-btn" aria-label="More actions"
                            onClick={() => setOpenMenuId(openMenuId === apartment.id ? null : apartment.id)}>
                            <MoreHorizontal size={20} />
                          </button>
                          {openMenuId === apartment.id && (
                            <div className="ld-more-menu" onMouseLeave={() => setOpenMenuId(null)}>
                              <button type="button" onClick={() => { setOpenMenuId(null); void handleTogglePublication?.(apartment.id, apartment.isPublished === false); }}>
                                {apartment.isPublished === false ? "Publish" : "Unpublish"}
                              </button>
                              <button type="button" className="danger" disabled={deletingApartmentId === apartment.id}
                                onClick={() => { setOpenMenuId(null); void handleDeleteApartment?.(apartment.id); }}>
                                Delete
                              </button>
                            </div>
                          )}
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
