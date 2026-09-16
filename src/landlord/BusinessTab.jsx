import "./BusinessTab.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsField as Field, SettingsSectionTitle as SectionTitle, SettingsInput, SettingsSelect } from "@/landlord/SettingsFormFields";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { Building2, MapPin, Plus, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
export const BusinessTab = ({ business, setB, myApartments, allRooms, availableCount, setEditingApartment, setBusiness, savedBusiness, handleSaveBusiness, }) => (<div className="business-tab-panel">
    <div className="business-tab-card">
      <SectionTitle icon="🏢" title="Business Information" subtitle="Information that applies to your landlord business"/>
      <Field label="Business / Trade Name" hint="Leave blank to use your personal name">
        <SettingsInput value={business.businessName} onChange={(e) => setB("businessName", e.target.value)} placeholder="e.g. Santos Apartments"/>
      </Field>
      <div className="business-tab-grid">
        <Field label="Business Type">
          <SettingsSelect value={business.businessType} onChange={(e) => setB("businessType", e.target.value)}>
            <option value="sole_proprietor">Sole Proprietor</option>
            <option value="partnership">Partnership</option>
            <option value="corporation">Corporation / OPC</option>
          </SettingsSelect>
        </Field>
        <Field label="Years in Operation">
          <SettingsInput type="number" min="0" value={business.yearsActive} onChange={(e) => setB("yearsActive", e.target.value)} placeholder="e.g. 5"/>
        </Field>
      </div>
      <Field label="BIR TIN" hint="Tax Identification Number, if applicable">
        <SettingsInput value={business.taxId} onChange={(e) => setB("taxId", e.target.value)} placeholder="XXX-XXX-XXX-000"/>
      </Field>
    </div>

    <div className="business-tab-card">
      <SectionTitle icon="🏘️" title="Property Portfolio" subtitle="Calculated automatically from your registered properties and rooms"/>
      <div className="business-tab-grid-2">
        {[
        { label: "Properties", value: myApartments.length },
        { label: "Total Rooms", value: allRooms.length },
        { label: "Available Rooms", value: availableCount },
    ].map((item) => <div key={item.label} className="business-tab-card-2"><p className="business-tab-text">{item.label}</p><p className="business-tab-text-2">{item.value}</p></div>)}
      </div>
    </div>

    <div className="business-tab-card">
      <SectionTitle icon="📄" title="Property Verification & Permits" subtitle="Manage permit and verification information for each of your properties."/>
      {myApartments.length === 0 ? (<div className="business-tab-card-3">
          <Building2 className="business-tab-building2-icon"/><h3 className="business-tab-no-properties-yet">No properties yet</h3><p className="business-tab-text-3">Add a property first to manage its permit and verification information.</p>
          <Link to="/add-apartment"><Button className="business-tab-add-property"><Plus className="business-tab-plus-icon"/>Add Property</Button></Link>
        </div>) : (<div className="business-tab-card-4">
          {myApartments.map((apartment) => {
            const featureRecord = apartment.features && !Array.isArray(apartment.features) ? apartment.features : {};
            const propertyVerification = featureRecord.verification && typeof featureRecord.verification === "object" && !Array.isArray(featureRecord.verification) ? featureRecord.verification : {};
            const permit = typeof propertyVerification.businessPermit === "string" ? propertyVerification.businessPermit : "";
            const expiry = typeof propertyVerification.permitExpiry === "string" ? propertyVerification.permitExpiry : "";
            const status = apartment.approvalStatus === "approved" ? "Verified" : apartment.approvalStatus === "rejected" ? "Rejected" : "Pending Verification";
            return <div key={apartment.id} className="business-tab-grid-3"><div className="business-tab-panel-2"><p className="business-tab-text-4">{apartment.title || "Untitled property"}</p><p className="business-tab-text-5"><MapPin className="business-tab-map-pin-icon"/>{formatApartmentLocation(apartment, "Address unavailable")}</p></div><div><p className="business-tab-verification-status">Verification Status</p><Badge className="business-tab-badge">{status}</Badge></div><div><p className="business-tab-business-permit-no">Business Permit No.</p><p className="business-tab-text-6">{permit || "Not provided"}</p><p className="business-tab-expiry">Expiry: {expiry ? new Date(`${expiry}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "Not provided"}</p></div><Button variant="outline" onClick={() => setEditingApartment(apartment)} className="business-tab-view-update-permit">View / Update Permit</Button></div>;
        })}
        </div>)}
    </div>

    <div className="business-tab-content">
      <Button variant="outline" onClick={() => setBusiness(savedBusiness)} className="business-tab-reset-changes"><RotateCcw className="business-tab-rotate-ccw-icon"/>Reset Changes</Button>
      <Button onClick={handleSaveBusiness} className="business-tab-save-business-details">Save Business Details</Button>
    </div>
  </div>);
