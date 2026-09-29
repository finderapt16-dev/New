import "./MyProperties.css";
import { useEffect, useState } from "react";
import { Plus, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LandlordEmptyIllustration } from "@/landlord/LandlordEmptyIllustration";
import { MyPropertyCard } from "@/landlord/MyPropertyCard";
import { PropertyEngagement } from "@/landlord/PropertyEngagement";
import { PropertyGuidelines } from "@/landlord/PropertyGuidelines";

export const MyProperties = ({
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
                {myApartments.map((apartment) => (
                  <MyPropertyCard
                    key={apartment.id}
                    apartment={apartment}
                    aptViews={aptViews}
                    aptFavs={aptFavs}
                    ratingSummary={ratingSummary}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    handleTogglePublication={handleTogglePublication}
                    deletingApartmentId={deletingApartmentId}
                    handleDeleteApartment={handleDeleteApartment}
                  />
                ))}
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
        <PropertyGuidelines
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
