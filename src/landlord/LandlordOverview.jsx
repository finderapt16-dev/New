import "./LandlordOverview.css";
import { Eye, Heart, Star, MapPin, Plus, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getRoomStatus } from "@/landlord/landlordStatus";

export const LandlordOverview = ({
  myApartments,
  user,
  isLoadingApartments,
  aptViews,
  aptFavs,
  ratingSummary,
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
}) => {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const firstName = user?.name?.trim().split(/\s+/)[0] || "Landlord";

  const totalViews = myApartments.reduce(
    (sum, apartment) => sum + Number(aptViews(apartment.id) || 0),
    0
  );

  const totalFavorites = myApartments.reduce(
    (sum, apartment) => sum + Number(aptFavs(apartment.id) || 0),
    0
  );

  const ratingValues = myApartments
    .map((apartment) => ratingSummary?.byApartment?.get(apartment.id))
    .filter(Boolean);

  const totalRatingCount = ratingValues.reduce(
    (sum, item) => sum + (item.count || 0),
    0
  );

  const averageRating = totalRatingCount
    ? ratingValues.reduce(
        (sum, item) => sum + item.average * item.count,
        0
      ) / totalRatingCount
    : 0;

  return (
    <div className="ld-simple-dashboard">
      <header className="ld-simple-heading">
        <h1>
          {greeting}, {firstName}
        </h1>
        <p>Manage your properties, rooms, and availability in one place.</p>
      </header>

      <section className="ld-performance-card">
        <div className="ld-section-title">
          <h2>Listing Performance</h2>
          <p>Track your listing performance and tenant interest.</p>
        </div>

        <div className="ld-performance-grid">
          <div className="ld-metric">
            <span><Eye size={16} /> Listing Views</span>
            <strong>{totalViews}</strong>
            <small>Current total</small>
          </div>

          <div className="ld-metric">
            <span><Star size={16} /> Ratings</span>
            <strong>{averageRating ? averageRating.toFixed(1) : "—"}</strong>
            <small>{totalRatingCount} rating{totalRatingCount === 1 ? "" : "s"}</small>
          </div>

          <div className="ld-metric">
            <span><Heart size={16} /> Favorites</span>
            <strong>{totalFavorites}</strong>
            <small>Current total</small>
          </div>

          <div className="ld-trend-card">
            <span>Listing activity</span>
            <svg viewBox="0 0 360 95" preserveAspectRatio="none">
              <polyline points="8,72 58,56 112,45 145,70 190,64 235,45 282,28 350,13" />
            </svg>
            <div className="ld-trend-axis">
              <span>Views</span>
              <span>Ratings</span>
              <span>Favorites</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ld-properties-card">
        <div className="ld-properties-header">
          <div>
            <h2>Your Properties</h2>
            <p>Manage your apartments, rooms, and availability.</p>
          </div>

          <Link to="/add-apartment" className="ld-add-button">
            <Plus size={15} /> Add Property
          </Link>
        </div>

        {isLoadingApartments ? (
          <div className="ld-empty">Loading properties...</div>
        ) : myApartments.length === 0 ? (
          <div className="ld-empty">
            <Building2 size={28} />
            <strong>No properties yet</strong>
            <span>Add your first property to get started.</span>
          </div>
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

              const startingRent = roomPrices.length
                ? Math.min(...roomPrices)
                : Number(apartment.price || 0);

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

                    <div className="ld-property-stats">
                      <div>
                        <b>{availableRooms}</b>
                        <span>room{availableRooms === 1 ? "" : "s"} available</span>
                      </div>

                      <div>
                        <span>Starting rent</span>
                        <b>
                          {startingRent
                            ? `₱${startingRent.toLocaleString()}/month`
                            : "Not set"}
                        </b>
                      </div>
                    </div>
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

                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleTogglePublication(
                            apartment.id,
                            apartment.isPublished === false
                          )
                        }
                      >
                        {apartment.isPublished === false ? "Publish" : "Unpublish"}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        disabled={deletingApartmentId === apartment.id}
                        onClick={() => void handleDeleteApartment(apartment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
