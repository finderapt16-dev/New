import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apartments: [] }));

vi.mock("@/contexts/AuthContext", () => ({
    useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/ApartmentsContext", () => ({
    useApartmentsContext: () => ({
        apartments: mocks.apartments,
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastUpdatedAt: null,
        refreshApartments: vi.fn(),
    }),
}));

vi.mock("@/services/dashboardSupabaseService", () => ({
    fetchApartmentViews: async () => [],
}));

const { LandingListingsSection } = await import("@/landing/LandingApartmentPreview");

const renderSection = () => {
    const router = createMemoryRouter(
        [{ path: "/", element: <LandingListingsSection /> }],
        { initialEntries: ["/"] },
    );

    return render(<RouterProvider router={router} />);
};

beforeEach(() => {
    mocks.apartments = [];
});

describe("landing listings empty state", () => {
    it("shows a real empty state when no apartment is published", () => {
        const { container } = renderSection();

        expect(screen.getByText(/no apartments listed yet/i)).toBeInTheDocument();
        expect(screen.getByText(/apartment listings/i)).toBeInTheDocument();

        // No stock photography, no remote placeholder image, no broken img.
        expect(container.querySelectorAll("img")).toHaveLength(0);
        expect(container.innerHTML).not.toMatch(/unsplash/i);
    });

    it("offers landlords a way to submit a property", () => {
        renderSection();

        expect(screen.getByRole("link", { name: /list your property/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /browse listings/i })).toBeInTheDocument();
    });

    it("renders real listings once a property is published", () => {
        mocks.apartments = [
            {
                id: "apt-1",
                title: "Sunrise Boarding House",
                address: "Jalito St.",
                city: "Iloilo City",
                status: "available",
                landlordVerified: true,
                isPublished: true,
                approvalStatus: "approved",
                isArchived: false,
                deletedAt: null,
                availableDate: "2020-01-01",
                rooms: [{ price: 4500, status: "available" }],
            },
        ];

        renderSection();

        expect(screen.getByText("Sunrise Boarding House")).toBeInTheDocument();
        expect(screen.queryByText(/no apartments listed yet/i)).not.toBeInTheDocument();
    });
});
