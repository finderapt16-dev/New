import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateBusinessPermitModal } from "@/landlord/UpdateBusinessPermitModal";

const mocks = vi.hoisted(() => ({
  uploadVerificationDocuments: vi.fn(),
  updateApartment: vi.fn(),
  updateLandlordPermitProfile: vi.fn(),
}));

vi.mock("@/services/verificationDocumentsService", () => ({
  uploadVerificationDocuments: mocks.uploadVerificationDocuments,
  VERIFICATION_DOCUMENT_TYPES: [
    { key: "mayors_business_permit", label: "Mayor’s / Business Permit" },
    { key: "proof_of_ownership", label: "Proof of Ownership or Authority" },
    { key: "business_registration", label: "Business Registration" },
    { key: "barangay_clearance", label: "Barangay Clearance" },
    { key: "additional_supporting_documents", label: "Additional Supporting Documents" },
  ],
}));
vi.mock("@/data/apartments", () => ({
  updateApartment: mocks.updateApartment,
}));
vi.mock("@/services/dashboardSupabaseService", () => ({
  updateLandlordPermitProfile: mocks.updateLandlordPermitProfile,
}));

const apartment = {
  id: "apt-1",
  title: "Santos Apartments",
  landlordId: "landlord-1",
  price: 0,
  bedrooms: 0,
  bathrooms: 0,
  sqft: 500,
  address: "123 Street",
  city: "Iloilo City",
  state: "Iloilo",
  zip: "5000",
  images: ["https://example.com/a.jpg"],
  description: "",
  amenities: [],
  availableDate: "2026-09-01",
  petFriendly: false,
  parking: false,
  furnished: false,
  utilities: [],
  lat: 10.72,
  lng: 122.56,
  features: { verification: { businessPermit: "BP-OLD-1", permitExpiry: "2026-01-01" } },
  approvalStatus: "pending",
  createdAt: "2026-09-01T00:00:00.000Z",
};

const renderModal = (props = {}) => render(
  <UpdateBusinessPermitModal
    apartments={[apartment]}
    initialPermitNumber="BP-OLD-1"
    initialExpiryDate="2026-01-01"
    actorUserId="landlord-1"
    onSaved={vi.fn()}
    onClose={vi.fn()}
    {...props}
  />
);

describe("Update Business Permit modal", () => {
  beforeEach(() => {
    mocks.uploadVerificationDocuments.mockReset().mockResolvedValue(undefined);
    mocks.updateApartment.mockReset().mockResolvedValue(undefined);
    mocks.updateLandlordPermitProfile.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the form per the design", () => {
    renderModal();
    expect(screen.getByText("Update Business Permit")).toBeTruthy();
    expect(screen.getByText("Drag and drop files here or click to browse")).toBeTruthy();
    expect(screen.getByText("JPG, JPEG, or PNG • Max 5MB • Up to 5 files")).toBeTruthy();
    expect(screen.getByLabelText("Permit Number").value).toBe("BP-OLD-1");
    expect(screen.getByLabelText("Expiry Date").value).toBe("2026-01-01");
  });

  it("saves permit details and shows the success modal", async () => {
    const onSaved = vi.fn();
    renderModal({ onSaved });

    fireEvent.change(screen.getByLabelText("Permit Number"), { target: { value: "BP-2026-9999" } });
    fireEvent.change(screen.getByLabelText("Expiry Date"), { target: { value: "2027-12-31" } });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Permit Details Submitted")).toBeTruthy();
    });
    expect(mocks.updateApartment).toHaveBeenCalledTimes(1);
    expect(mocks.updateLandlordPermitProfile).toHaveBeenCalledWith("landlord-1", {
      permitNumber: "BP-2026-9999",
      permitExpiry: "2027-12-31",
    });
    expect(onSaved).toHaveBeenCalled();
    expect(screen.getByText(/currently under review by our administration team/)).toBeTruthy();
  });

  it("uploads selected files to the verification slots before saving", async () => {
    const file = new File(["permit"], "permit.jpg", { type: "image/jpeg" });
    renderModal();

    fireEvent.change(screen.getByLabelText("Upload business permit files"), { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText("permit.jpg")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(mocks.uploadVerificationDocuments).toHaveBeenCalledWith(
        "apt-1",
        "landlord-1",
        [{ type: "mayors_business_permit", file }]
      );
    });
  });

  it("requires the permit number before submitting", async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Permit Number"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => {
      expect(screen.getByText("Update Business Permit")).toBeTruthy();
    });
    expect(mocks.updateApartment).not.toHaveBeenCalled();
  });
});
