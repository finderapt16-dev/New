import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
    useAuth: () => ({ user: null }),
}));

vi.mock("@/contexts/ApartmentsContext", () => ({
    useApartmentsContext: () => ({
        apartments: [],
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

const { Landing } = await import("@/landing/Landing");

const renderLanding = () => {
    const router = createMemoryRouter([
        { path: "/", element: <Landing /> },
        { path: "/login", element: <p>OLD LOGIN PAGE</p> },
        { path: "/signup", element: <p>OLD SIGNUP PAGE</p> },
        { path: "/browse", element: <p>BROWSE PAGE</p> },
    ], { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);
    return router;
};

describe("landing floating auth", () => {
    it("opens the floating sign-in when searching while logged out", async () => {
        renderLanding();

        await userEvent.type(screen.getByPlaceholderText(/search by area/i), "Lapaz");
        await userEvent.click(screen.getByRole("button", { name: /^search$/i }));

        expect(await screen.findByLabelText(/^username/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
        expect(screen.queryByText("OLD LOGIN PAGE")).not.toBeInTheDocument();
        // Still on the landing page behind the dialog.
        expect(screen.getByPlaceholderText(/search by area/i)).toBeInTheDocument();
    });

    it("opens the floating sign-in when Browse is clicked while logged out", async () => {
        renderLanding();

        await userEvent.click(screen.getByRole("link", { name: /^browse$/i }));

        expect(await screen.findByLabelText(/^username/i)).toBeInTheDocument();
        expect(screen.queryByText("OLD LOGIN PAGE")).not.toBeInTheDocument();
        expect(screen.queryByText("BROWSE PAGE")).not.toBeInTheDocument();
    });

    it("opens the floating signup from the empty-state landlord CTA", async () => {
        renderLanding();

        await userEvent.click(screen.getByRole("link", { name: /list your property/i }));

        expect(await screen.findByText(/choose your role to continue/i)).toBeInTheDocument();
        expect(screen.queryByText("OLD SIGNUP PAGE")).not.toBeInTheDocument();
    });
});
