import "./MyProperties.css";
import { MyPropertyCard } from "@/landlord/MyPropertyCard";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, Clock, LayoutGrid, List, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { getApartmentStatus } from "@/landlord/landlordStatus";
export const MyProperties = ({ myApartments, setPropertyFilter, propertyFilter, propertySort, setPropertySort, setPropertyViewMode, propertyViewMode, isLoadingApartments, paginatedApartments, ratingSummary, ratingsLoading, openViewers, aptViews, openFavoriters, aptFavs, setEditingApartment, handleTogglePublication, deletingApartmentId, handleDeleteApartment, filteredApartments, safePropertyPage, propertiesPerPage, setPropertyPage, propertyPageCount, setPropertiesPerPage, }) => {
    const availablePropertiesCount = myApartments.filter((apartment) => getApartmentStatus(apartment) === "available").length;
    return (<div className="properties-section-container">
      <header className="properties-section-header">
        <div className="properties-section-row">
          <span className="properties-section-row-2"><Building2 className="properties-section-building2-icon"/></span>
          <div><p className="properties-section-my-properties">My Properties</p><h1 className="properties-section-your-listings">Your Listings</h1><p className="properties-section-text">Manage rooms, publication, and listing performance.</p></div>
        </div>
        <Link to="/add-apartment"><Button className="properties-section-add-property"><Plus className="properties-section-plus-icon"/>Add Property</Button></Link>
      </header>

      <section className="properties-section-section">
        <div className="properties-section-row-3">
          <button type="button" onClick={() => setPropertyFilter("all")} className={`properties-section-all-units ${propertyFilter === "all" ? "properties-section-all-units-2" : "properties-section-all-units-3"}`}><LayoutGrid className="properties-section-layout-grid-icon"/>All Units <span className={`properties-section-span ${propertyFilter === "all" ? "properties-section-span-2" : "properties-section-span-3"}`}>{myApartments.length}</span></button>
          <button type="button" onClick={() => setPropertyFilter("available")} className={`properties-section-available ${propertyFilter === "available" ? "properties-section-available-2" : "properties-section-available-3"}`}><span className="properties-section-available-4"/>Available <span className={`properties-section-span ${propertyFilter === "available" ? "properties-section-span-2" : "properties-section-span-3"}`}>{availablePropertiesCount}</span></button>
        </div>
        <div className="properties-section-content">
          <label className="properties-section-label"><span className="properties-section-sort-by">Sort by</span><select value={propertySort} onChange={(event) => setPropertySort(event.target.value)} className="properties-section-select"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option><option value="price-high">Price: High</option><option value="price-low">Price: Low</option></select></label>
          <div className="properties-section-card"><button type="button" title="Grid view" onClick={() => setPropertyViewMode("grid")} className={`properties-section-button ${propertyViewMode === "grid" ? "properties-section-button-2" : "properties-section-button-3"}`}><LayoutGrid className="properties-section-layout-grid-icon-2"/></button><button type="button" title="List view" onClick={() => setPropertyViewMode("list")} className={`properties-section-button ${propertyViewMode === "list" ? "properties-section-button-2" : "properties-section-button-3"}`}><List className="properties-section-list-icon"/></button></div>
        </div>
      </section>

      {isLoadingApartments ? (<div className="properties-section-card-2"><Clock className="properties-section-clock-icon"/></div>) : myApartments.length === 0 ? (<div className="properties-section-card-3"><span className="properties-section-row-4"><Building2 className="properties-section-building2-icon-2"/></span><h2 className="properties-section-no-properties-yet">No properties yet</h2><p className="properties-section-text-2">You haven&apos;t added any properties yet.</p><Link to="/add-apartment"><Button className="properties-section-add-your-first-property"><Plus className="properties-section-plus-icon"/>Add Your First Property</Button></Link></div>) : paginatedApartments.length === 0 ? (<div className="properties-section-card-4"><Search className="properties-section-search-icon"/><h2 className="properties-section-no-matching-properties">No matching properties</h2><p className="properties-section-text">Try selecting a different availability filter.</p><Button variant="outline" onClick={() => setPropertyFilter("all")} className="properties-section-show-all-units">Show All Units</Button></div>) : (<div className={propertyViewMode === "grid" ? "properties-section-grid" : "properties-section-panel"}>
          {paginatedApartments.map((apartment) => (<MyPropertyCard key={apartment.id} apartment={apartment} propertyViewMode={propertyViewMode} ratingSummary={ratingSummary} ratingsLoading={ratingsLoading} openViewers={openViewers} aptViews={aptViews} openFavoriters={openFavoriters} aptFavs={aptFavs} setEditingApartment={setEditingApartment} handleTogglePublication={handleTogglePublication} deletingApartmentId={deletingApartmentId} handleDeleteApartment={handleDeleteApartment}/>))}
        </div>)}

      {filteredApartments.length > 0 && <footer className="properties-section-footer"><span>Showing {(safePropertyPage - 1) * propertiesPerPage + 1}-{Math.min(safePropertyPage * propertiesPerPage, filteredApartments.length)} of {filteredApartments.length} properties</span><div className="properties-section-row-5"><button type="button" title="Previous page" disabled={safePropertyPage <= 1} onClick={() => setPropertyPage(Math.max(1, safePropertyPage - 1))} className="properties-section-button-4"><ChevronRight className="properties-section-chevron-right-icon"/></button><span className="properties-section-row-6">{safePropertyPage}</span><button type="button" title="Next page" disabled={safePropertyPage >= propertyPageCount} onClick={() => setPropertyPage(Math.min(propertyPageCount, safePropertyPage + 1))} className="properties-section-button-4"><ChevronRight className="properties-section-chevron-right-icon-2"/></button><label className="properties-section-label-2"><span>Per page</span><select value={propertiesPerPage} onChange={(event) => setPropertiesPerPage(Number(event.target.value))} className="properties-section-select-2"><option value={6}>6</option><option value={10}>10</option><option value={20}>20</option></select></label></div></footer>}
    </div>);
};
