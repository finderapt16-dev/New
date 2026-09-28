import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LandlordOverview } from "@/landlord/LandlordOverview";

describe("Landlord Your Properties design matching image", () => {
  const sampleApartments = [
    {
      id: "apt-1",
      title: "a",
      address: "nabitasan",
      city: "La Paz",
      state: "Iloilo City",
      zip: "5000",
      isPublished: false,
      price: 1000,
      image: "https://example.com/a.jpg",
      rooms: [{ id: "r-1", status: "available", price: 1000 }],
    },
    {
      id: "apt-2",
      title: "baho",
      address: "nabitasan",
      city: "La Paz",
      state: "Iloilo City",
      zip: "5000",
      isPublished: false,
      price: 555,
      image: "https://example.com/baho.jpg",
      rooms: [{ id: "r-2", status: "available", price: 555 }],
    },
    {
      id: "apt-3",
      title: "luna",
      address: "luna",
      city: "La Paz",
      state: "Iloilo City",
      zip: "5000",
      isPublished: true,
      price: 2000,
      image: "https://example.com/luna.jpg",
      rooms: [
        { id: "r-3a", status: "available", price: 2000 },
        { id: "r-3b", status: "available", price: 4989 },
      ],
    },
  ];

  const defaultProps = {
    myApartments: sampleApartments,
    user: { id: "user-1", name: "Test Landlord", email: "landlord@example.com" },
    isLoadingApartments: false,
    aptViews: (id) => (id === "apt-3" ? 44 : 0),
    aptFavs: (id) => (id === "apt-3" ? 2 : 0),
    ratingSummary: {
      byApartment: new Map([
        ["apt-1", { count: 0, average: 0 }],
        ["apt-2", { count: 0, average: 0 }],
        ["apt-3", { count: 1, average: 5.0 }],
      ]),
    },
    viewRows: [],
    favoriteRows: [],
    ratingRows: [],
    handleTogglePublication: vi.fn(),
    deletingApartmentId: null,
    handleDeleteApartment: vi.fn(),
    onAddProperty: vi.fn(),
  };

  const renderComponent = (props = {}) => {
    const router = createMemoryRouter(
      [
        {
          path: "/dashboard",
          element: <LandlordOverview {...defaultProps} {...props} />,
        },
        { path: "/apartment/:id", element: <div>Apartment Details</div> },
        { path: "/landlord/properties/:id/rooms", element: <div>Manage Rooms Page</div> },
      ],
      { initialEntries: ["/dashboard"] }
    );
    return render(<RouterProvider router={router} />);
  };

  it("renders the Your Properties section matching the reference image layout", () => {
    const { container } = renderComponent();

    // Header title and subtitle
    expect(screen.getByRole("heading", { name: "Your Properties", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText("Manage your apartments, rooms, and availability.")
    ).toBeInTheDocument();

    // All 3 properties are listed
    expect(screen.getByRole("heading", { name: "a", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "baho", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "luna", level: 3 })).toBeInTheDocument();

    // Published and Unpublished badges
    const unpublishedBadges = screen.getAllByText("Unpublished");
    expect(unpublishedBadges).toHaveLength(2);
    expect(unpublishedBadges[0]).toHaveClass("ld-status-unpublished");

    const publishedBadge = screen.getByText("Published");
    expect(publishedBadge).toBeInTheDocument();
    expect(publishedBadge).toHaveClass("ld-status-published");

    // Price ranges formatted with en-dash
    expect(screen.getAllByText("₱1,000 \u2013 ₱1,000 / month")).toHaveLength(1);
    expect(screen.getAllByText("₱555 \u2013 ₱555 / month")).toHaveLength(1);
    expect(screen.getAllByText("₱2,000 \u2013 ₱4,989 / month")).toHaveLength(1);

    // Stats values
    expect(screen.getByText("44")).toBeInTheDocument(); // Views for luna
    expect(screen.getByText("2")).toBeInTheDocument(); // Favorites for luna
    expect(screen.getByText("5.0")).toBeInTheDocument(); // Rating for luna

    // Vertical dividers exist
    const dividers = container.querySelectorAll(".ld-col-divider");
    expect(dividers.length).toBeGreaterThanOrEqual(12); // At least 4 per row * 3 rows

    // View Property and Manage Rooms outline links exist for each property
    const viewLinks = screen.getAllByRole("link", { name: "View Property" });
    expect(viewLinks).toHaveLength(3);
    expect(viewLinks[0]).toHaveClass("ld-btn-outline");

    const manageLinks = screen.getAllByRole("link", { name: "Manage Rooms" });
    expect(manageLinks).toHaveLength(3);
    expect(manageLinks[0]).toHaveClass("ld-btn-outline");
  });

  it("opens the dropdown menu matching the reference image (Publish/Unpublish and red Delete button)", async () => {
    const user = userEvent.setup();
    const handleTogglePublication = vi.fn();
    const handleDeleteApartment = vi.fn();

    renderComponent({ handleTogglePublication, handleDeleteApartment });

    // Find more options buttons
    const moreButtons = screen.getAllByRole("button", { name: "More options" });
    expect(moreButtons).toHaveLength(3);

    // Click more options for the first property ("a", unpublished)
    await user.click(moreButtons[0]);

    // Menu opens with "Publish" and "Delete"
    const publishBtn = screen.getByRole("menuitem", { name: "Publish" });
    const deleteBtn = screen.getByRole("menuitem", { name: "Delete" });

    expect(publishBtn).toBeInTheDocument();
    expect(publishBtn).toHaveClass("ld-menu-action-btn");

    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toHaveClass("ld-menu-delete-btn");

    // Click Publish
    await user.click(publishBtn);
    expect(handleTogglePublication).toHaveBeenCalledWith("apt-1", true);

    // Click more options again to test Delete
    await user.click(moreButtons[0]);
    const deleteBtnAgain = screen.getByRole("menuitem", { name: "Delete" });
    await user.click(deleteBtnAgain);
    expect(handleDeleteApartment).toHaveBeenCalledWith("apt-1");
  });

  it("shows Unpublish option for an already published property", async () => {
    const user = userEvent.setup();
    renderComponent();

    const moreButtons = screen.getAllByRole("button", { name: "More options" });
    // Click more options for the third property ("luna", published)
    await user.click(moreButtons[2]);

    expect(screen.getByRole("menuitem", { name: "Unpublish" })).toBeInTheDocument();
  });
});
