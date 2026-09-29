import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MyProperties } from "@/landlord/MyProperties";
import { PropertyGuidelines } from "@/landlord/PropertyGuidelines";

describe("Landlord Overview new landlord empty state", () => {
  const defaultProps = {
    myApartments: [],
    user: { id: "user-1", name: "Karl Deo L. Abela", email: "karl.abela@gmail.com" },
    isLoadingApartments: false,
    aptViews: () => 0,
    aptFavs: () => 0,
    ratingSummary: { byApartment: new Map() },
    viewRows: [],
    favoriteRows: [],
    ratingRows: [],
    handleTogglePublication: vi.fn(),
    deletingApartmentId: null,
    handleDeleteApartment: vi.fn(),
  };

  const renderOverview = (props = {}) => {
    let currentPath = "/dashboard";
    const router = createMemoryRouter(
      [
        { path: "/dashboard", element: <MyProperties {...defaultProps} {...props} /> },
        { path: "/add-apartment", element: <div>Add Apartment Page</div> },
      ],
      { initialEntries: ["/dashboard"] }
    );

    const result = render(<RouterProvider router={router} />);
    return { ...result, router };
  };

  it("shows header card and empty state when a landlord is new with no properties", () => {
    renderOverview();

    // Top Card
    expect(screen.getByRole("heading", { name: "Landlord Dashboard", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Monitor your property and tenant engagement.")).toBeInTheDocument();

    // Your Properties Card
    expect(screen.getByRole("heading", { name: "Your Properties", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Manage your apartments, rooms, and availability.")).toBeInTheDocument();

    // Empty state contents
    expect(screen.getByRole("heading", { name: "Add your first property", level: 3 })).toBeInTheDocument();
    expect(
      screen.getByText("Create an apartment listing to start managing your availability in aptfindr.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Property/i })).toBeInTheDocument();
    expect(screen.getByText("Property listings are reviewed before publication.")).toBeInTheDocument();

    // Performance section should NOT be visible when landlord has no properties
    expect(screen.queryByText("Listing Performance")).not.toBeInTheDocument();
  });

  it("opens the Apartment Listing Guidelines modal when clicking Add Property", async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole("button", { name: /Add Property/i }));

    expect(screen.getByRole("heading", { name: "Apartment Listing Guidelines" })).toBeInTheDocument();
    expect(
      screen.getByText("Review AptFindr's requirements for maintaining a valid and accurate listing.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Please follow these guidelines to ensure your apartment listing complies with AptFindr's verification requirements."
      )
    ).toBeInTheDocument();

    // All 6 guidelines should be listed
    expect(screen.getByText("Accurate Apartment Information")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Apartment name, address, unit configuration, prices, and amenities must be factual and kept up to date."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Valid Permit Information")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Required business permit documents and ownership records must be valid and correspond to the listed apartment."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Accurate Unit Availability")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Units marked as Available, Occupied, or Under Maintenance should reflect their true structural status down the database schema."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Apartment Photos")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Uploaded photos should accurately represent the interior unit layouts and exterior building facade (Max 5 photo limit applies)."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Pricing Transparency")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Rental prices shown on the active listing should match the actual monthly baseline costs of the available units."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Listing Compliance")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Apartment profiles must comply with AptFindr's community rules and pass administrative moderator review before publication."
      )
    ).toBeInTheDocument();

    // Button to proceed
    expect(screen.getByRole("button", { name: "Accept & Proceed to Form" })).toBeInTheDocument();
  });

  it("navigates to /add-apartment when accepting guidelines", async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole("button", { name: /Add Property/i }));
    await user.click(screen.getByRole("button", { name: "Accept & Proceed to Form" }));

    expect(screen.getByText("Add Apartment Page")).toBeInTheDocument();
  });

  it("closes the modal when clicking close button", async () => {
    const user = userEvent.setup();
    renderOverview();

    await user.click(screen.getByRole("button", { name: /Add Property/i }));
    expect(screen.getByRole("heading", { name: "Apartment Listing Guidelines" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close guidelines" }));
    expect(screen.queryByRole("heading", { name: "Apartment Listing Guidelines" })).not.toBeInTheDocument();
  });

  it("shows performance metrics and properties list when landlord has properties", () => {
    const property = {
      id: "apt-1",
      title: "Luna Boarding House",
      address: "La Paz, Iloilo City",
      isPublished: true,
      price: 3500,
      rooms: [{ id: "r-1", status: "available", price: 3500 }],
    };

    renderOverview({ myApartments: [property] });

    expect(screen.getByText("Listing Performance")).toBeInTheDocument();
    expect(screen.getByText("Luna Boarding House")).toBeInTheDocument();
    expect(screen.queryByText("Add your first property")).not.toBeInTheDocument();
  });
});
