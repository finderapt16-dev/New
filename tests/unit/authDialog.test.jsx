import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn(), resend: vi.fn(), reset: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ login: mocks.login, signup: mocks.signup, user: null }) }));
vi.mock("@/services/authService", () => ({
    resendSignupVerification: (...args) => mocks.resend(...args),
    requestPasswordResetEmail: (...args) => mocks.reset(...args),
    isTenantRole: (role) => role === "tenant",
}));

const { AuthDialog } = await import("@/auth/AuthDialog");

const renderDialog = (defaultView = "login") => {
    const router = createMemoryRouter([
        { path: "/", element: <AuthDialog defaultView={defaultView} open onOpenChange={() => {}} /> },
        { path: "/signup", element: <p>OLD SIGNUP PAGE</p> },
        { path: "/login", element: <p>OLD LOGIN PAGE</p> },
        { path: "/forgot-password", element: <p>OLD FORGOT PAGE</p> },
    ], { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);
    return router;
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("floating auth dialog", () => {
    it("opens the floating signup view when Create account is clicked (no page navigation)", async () => {
        renderDialog("login");

        expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));

        expect(await screen.findByText(/choose your account type/i)).toBeInTheDocument();
        expect(screen.queryByText("OLD SIGNUP PAGE")).not.toBeInTheDocument();
    });

    it("returns to the floating sign-in view from signup", async () => {
        renderDialog("signup");

        expect(await screen.findByText(/choose your account type/i)).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: /sign in here/i }));

        expect(await screen.findByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
        expect(screen.queryByText("OLD LOGIN PAGE")).not.toBeInTheDocument();
    });

    it("opens the floating forgot-password view and back", async () => {
        renderDialog("login");

        await userEvent.click(screen.getByRole("button", { name: /forgot password/i }));

        expect(await screen.findByText(/registered email address/i)).toBeInTheDocument();
        expect(screen.queryByText("OLD FORGOT PAGE")).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: /back to sign in/i }));

        expect(await screen.findByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    });

    it("shows the signup result inside the floating sign-in view after registration", async () => {
        mocks.signup.mockResolvedValue({
            success: true,
            signup: { requiresEmailVerification: true, emailConfirmation: { state: "sent" } },
        });
        renderDialog("signup");

        await userEvent.click(await screen.findByRole("button", { name: /tenant/i }));
        await userEvent.type(screen.getByLabelText(/^username/i), "tenant_one");
        await userEvent.type(screen.getByLabelText(/email address/i), "tenant@example.com");
        await userEvent.type(screen.getByLabelText(/^password/i), "password123");
        await userEvent.type(screen.getByLabelText(/^confirm password/i), "password123");
        await userEvent.click(screen.getByRole("checkbox"));
        await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));

        expect(await screen.findByText(/verification link was sent to tenant@example\.com/i)).toBeInTheDocument();
        expect(screen.queryByText("OLD LOGIN PAGE")).not.toBeInTheDocument();
    });
});
