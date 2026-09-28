import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandlordSettingsPage } from "@/landlord/LandlordSettingsPage";

const mocks = vi.hoisted(() => ({
  fetchApartmentVerificationDocuments: vi.fn(),
}));

vi.mock("@/services/verificationDocumentsService", () => ({
  fetchApartmentVerificationDocuments: mocks.fetchApartmentVerificationDocuments,
}));

const permitDocument = {
  id: "doc-1",
  apartmentId: "apt-1",
  landlordId: "landlord-1",
  documentType: "mayors_business_permit",
  fileName: "mayors-permit-2026.jpg",
  mimeType: "image/jpeg",
  storagePath: "landlord-1/apt-1/mayors_business_permit-1.jpg",
  previewUrl: "https://storage.example.com/signed/permit.jpg",
};

const baseApartment = {
  id: "apt-1",
  title: "Santos Apartments",
  createdAt: "2026-09-01T00:00:00.000Z",
  features: {
    verification: {
      propertyName: "Santos Apartments",
      businessPermit: "BP-2026-00123",
      permitExpiry: "2027-03-31",
      tinNumber: "123-456-789-000",
    },
  },
};

const baseProps = {
  profile: { firstName: "Juan", lastName: "Cruz", middleInitial: "", mobile: "09171234567", email: "juan@example.com", avatar: "" },
  updateProfile: vi.fn(),
  savedProfile: {},
  handleUpdateProfile: vi.fn(),
  isUpdatingProfile: false,
  isUploadingProfilePhoto: false,
  profilePhotoInputRef: { current: null },
  handleProfilePhoto: vi.fn(),
  handleRemoveProfilePhoto: vi.fn(),
  passwordState: { current: "", new: "", confirm: "", showCurrent: false, showNew: false, showConfirm: false, isChanging: false },
  setPasswordState: vi.fn(),
  handlePasswordChange: vi.fn(),
  handleDeleteAccount: vi.fn(),
  myApartments: [],
  landlordProfile: null,
};

const renderSettings = (props = {}) => render(<LandlordSettingsPage {...baseProps} {...props} />);

describe("Landlord settings business permit card", () => {
  beforeEach(() => {
    mocks.fetchApartmentVerificationDocuments.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the empty state when no permit has been submitted", async () => {
    renderSettings();
    expect(screen.getByText("No business permit document has been submitted yet.")).toBeTruthy();
    expect(screen.getAllByText("Not provided").length).toBeGreaterThanOrEqual(3);
  });

  it("shows the permit image and details submitted with the property", async () => {
    mocks.fetchApartmentVerificationDocuments.mockResolvedValue([permitDocument]);
    renderSettings({ myApartments: [{ ...baseApartment, approvalStatus: "pending" }] });

    await waitFor(() => {
      expect(screen.getByText("mayors-permit-2026.jpg")).toBeTruthy();
    });
    const image = screen.getByAltText("Business permit document");
    expect(image.getAttribute("src")).toBe(permitDocument.previewUrl);
    expect(screen.getByText("Submitted for verification")).toBeTruthy();
    expect(screen.getByText("BP-2026-00123")).toBeTruthy();
    expect(screen.getByText("March 31, 2027")).toBeTruthy();
  });

  it("marks the permit as verified after admin approval", async () => {
    mocks.fetchApartmentVerificationDocuments.mockResolvedValue([permitDocument]);
    renderSettings({ myApartments: [{ ...baseApartment, approvalStatus: "approved" }] });

    await waitFor(() => {
      expect(screen.getByText("Verified — approved by admin")).toBeTruthy();
    });
  });

  it("falls back to the landlord profile permit number and expiry", async () => {
    mocks.fetchApartmentVerificationDocuments.mockResolvedValue([]);
    renderSettings({
      myApartments: [{ id: "apt-1", approvalStatus: "pending", features: {} }],
      landlordProfile: {
        business_permit_number: "BP-PROFILE-9",
        permit_expiry: "2028-01-15",
        verification_document_url: "https://storage.example.com/signed/profile-permit.png",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Business permit document")).toBeTruthy();
    });
    expect(screen.getByText("BP-PROFILE-9")).toBeTruthy();
    expect(screen.getByText("January 15, 2028")).toBeTruthy();
    expect(screen.getByText("Submitted for verification")).toBeTruthy();
  });
});
