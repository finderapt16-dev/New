import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  refreshApartments: vi.fn(),
  fetchPropertyDraft: vi.fn(),
  savePropertyDraft: vi.fn(),
  deletePropertyDraft: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "landlord-1", role: "landlord", name: "Test Landlord" } }),
}));
vi.mock("@/contexts/ApartmentsContext", () => ({
  useApartmentsContext: () => ({ refreshApartments: mocks.refreshApartments }),
}));
vi.mock("@/services/propertyDraftService", () => ({
  fetchPropertyDraft: mocks.fetchPropertyDraft,
  savePropertyDraft: mocks.savePropertyDraft,
  deletePropertyDraft: mocks.deletePropertyDraft,
}));
vi.mock("@/services/verificationDocumentsService", () => ({
  VERIFICATION_DOCUMENT_TYPES: [
    { key: "mayors_business_permit", label: "Mayor’s / Business Permit" },
    { key: "proof_of_ownership", label: "Proof of Ownership or Authority" },
    { key: "business_registration", label: "Business Registration" },
    { key: "barangay_clearance", label: "Barangay Clearance" },
    { key: "additional_supporting_documents", label: "Additional Supporting Documents" },
  ],
  uploadVerificationDocuments: vi.fn(),
  validateVerificationFile: vi.fn(() => null),
}));
vi.mock("@/data/apartments", () => ({
  apartmentFormValuesFromApartment: vi.fn(() => ({})),
  createApartment: vi.fn(),
  deleteApartment: vi.fn(),
  fetchApartmentWithImages: vi.fn(),
  resolveAppUserId: vi.fn(),
  uploadApartmentImage: vi.fn(),
}));
vi.mock("@/services/supabaseClient", () => ({ supabase: { from: vi.fn() } }));
vi.mock("@/landlord/PropertyLocationPicker", () => ({
  PropertyLocationPicker: ({ onLocationChange, onMapAddressChange }) => (
    <>
      <button type="button" onClick={() => onLocationChange(10.72, 122.562)}>
        Choose map point
      </button>
      <button
        type="button"
        onClick={() => {
          onLocationChange(10.7201, 122.5621, "map");
          onMapAddressChange?.("Luna Street, Nabitasan, La Paz, Iloilo City", {
            lat: 10.7201,
            lng: 122.5621,
            label: "Luna Street, Nabitasan, La Paz, Iloilo City",
            barangay: "Nabitasan",
            street: "Luna Street",
          });
        }}
      >
        Pin exact location
      </button>
    </>
  ),
}));
vi.mock("@/components/MultiImageUploader", () => ({
  MultiImageUploader: ({ onImagesChange }) => (
    <button
      type="button"
      onClick={() => onImagesChange([{
        id: "photo-1",
        url: "blob:test-photo",
        file: new File(["photo"], "property.png", { type: "image/png" }),
        isPrimary: true,
      }])}
    >
      Upload a test photo
    </button>
  ),
}));

import { AddApartment } from "@/landlord/AddApartment";

describe("Add Property wizard", () => {
  beforeEach(() => {
    mocks.fetchPropertyDraft.mockResolvedValue(null);
    mocks.savePropertyDraft.mockResolvedValue(undefined);
    mocks.deletePropertyDraft.mockResolvedValue(undefined);
    Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  });

  afterEach(() => cleanup());

  it("shows the four reference steps and carries the landlord through the form", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AddApartment /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Add Property", level: 1 })).toBeInTheDocument();
    const addPropertyButtons = screen.getAllByRole("button", { name: "Add Property" });
    expect(addPropertyButtons).toHaveLength(2);
    expect(addPropertyButtons.every((button) => button.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Property Information", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Upload a test photo" }));
    await user.type(screen.getByLabelText(/Property Name/), "Sunset Residences");
    await user.type(screen.getByLabelText("Description *"), "A comfortable apartment near the university.");
    expect(screen.queryByLabelText(/Minimum Price/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Maximum Price/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("heading", { name: "Location Details" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Barangay *"), "Nabitasan");
    await user.type(screen.getByLabelText("Street *"), "Luna St.");
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "10.72" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "122.562" } });
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("heading", { name: "Amenities & House Rules" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Water" }));
    await user.click(screen.getByRole("button", { name: "Students Only" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("heading", { name: "Property Verification" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Sunset Residences")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Luna St\., Brgy\. Nabitasan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("fills the barangay and street fields from the pinned map location", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AddApartment /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Upload a test photo" }));
    await user.type(screen.getByLabelText(/Property Name/), "Pin Drop Residences");
    await user.type(screen.getByLabelText("Description *"), "Located exactly where the map pin was dropped.");
    await user.click(screen.getByRole("button", { name: "Next" }));

    const barangayInput = screen.getByLabelText("Barangay *");
    const streetInput = screen.getByLabelText("Street *");
    expect(barangayInput).toHaveValue("");
    expect(streetInput).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Pin exact location" }));

    expect(barangayInput).toHaveValue("Nabitasan");
    expect(streetInput).toHaveValue("Luna Street");
    expect(screen.getByText(/Auto-filled from the pinned map location/)).toBeInTheDocument();
  });

  it("keeps a hand-typed street when the pin resolves a different one", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AddApartment /></MemoryRouter>);

    await user.click(screen.getByRole("button", { name: "Upload a test photo" }));
    await user.type(screen.getByLabelText(/Property Name/), "Typed Address Residences");
    await user.type(screen.getByLabelText("Description *"), "The landlord typed the street by hand.");
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.type(screen.getByLabelText("Street *"), "My Own Street");
    await user.click(screen.getByRole("button", { name: "Pin exact location" }));

    expect(screen.getByLabelText("Street *")).toHaveValue("My Own Street");
    expect(screen.getByLabelText("Barangay *")).toHaveValue("Nabitasan");

    await user.click(screen.getByRole("button", { name: "Use pin address" }));

    expect(screen.getByLabelText("Street *")).toHaveValue("Luna Street");
  });
});
