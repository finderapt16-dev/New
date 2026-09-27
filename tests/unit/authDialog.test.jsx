import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn(), resend: vi.fn(), reset: vi.fn(), google: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ login: mocks.login, signup: mocks.signup, user: null }) }));
vi.mock("@/services/authService", () => ({
    resendSignupVerification: (...args) => mocks.resend(...args),
    requestPasswordResetEmail: (...args) => mocks.reset(...args),
    isTenantRole: (role) => role === "tenant",
    signInWithGoogle: (...args) => mocks.google(...args),
}));

const { AuthDialog } = await import("@/auth/AuthDialog");

const renderDialog = (defaultView = "login", redirectTo = null) => {
    const router = createMemoryRouter([
        { path: "/", element: <AuthDialog defaultView={defaultView} open onOpenChange={() => {}} redirectTo={redirectTo} /> },
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

        expect(await screen.findByText(/choose your role to continue/i)).toBeInTheDocument();
        expect(screen.queryByText("OLD SIGNUP PAGE")).not.toBeInTheDocument();
    });

    it("returns to the floating sign-in view from the signup form screen", async () => {
        renderDialog("signup");

        expect(await screen.findByText(/choose your role to continue/i)).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: /tenant/i }));
        await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

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

    it("offers Continue with Google on the sign-in view", async () => {
        mocks.google.mockReturnValue(new Promise(() => {}));
        renderDialog("login", "/apartment/apt-7");

        expect(screen.getByRole("button", { name: /^sign in$/i }).compareDocumentPosition(
            screen.getByRole("button", { name: /continue with google/i }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // The dialog still opens on the username field, as before the Google button existed.
        expect(screen.getByLabelText(/^username/i)).toHaveFocus();
        await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));

        expect(mocks.google).toHaveBeenCalledWith({ intent: "signin", role: null, redirectTo: "/apartment/apt-7" });
        const busyButton = screen.getByRole("button", { name: /connecting to google/i });
        expect(busyButton).toBeDisabled();
        expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    });

    it("offers Continue with Google on the create-account view and passes the chosen role", async () => {
        mocks.google.mockReturnValue(new Promise(() => {}));
        renderDialog("signup");

        expect(screen.queryByRole("button", { name: /with google/i })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: /landlord/i }));
        await userEvent.click(screen.getByRole("button", { name: /sign up with google/i }));

        expect(mocks.google).toHaveBeenCalledWith({ intent: "signup", role: "landlord", redirectTo: null });
    });

    it("places Google below Create Account after choosing Tenant", async () => {
        mocks.google.mockReturnValue(new Promise(() => {}));
        renderDialog("signup");
        expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: /tenant/i }));
        const google = screen.getByRole("button", { name: /sign up with google/i });
        expect(screen.getByRole("button", { name: /^create account$/i }).compareDocumentPosition(google)
            & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        await userEvent.click(google);
        expect(mocks.google).toHaveBeenCalledWith({ intent: "signup", role: "tenant", redirectTo: null });
        expect(mocks.signup).not.toHaveBeenCalled();
    });

    it("places Google above the landlord wizard so it stays visible after choosing Landlord", async () => {
        mocks.google.mockReturnValue(new Promise(() => {}));
        renderDialog("signup");
        expect(screen.queryByRole("button", { name: /with google/i })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: /landlord/i }));
        const google = screen.getByRole("button", { name: /sign up with google/i });

        // Google comes before the wizard's step content ("Personal Information")
        // instead of below the whole multi-step form, where it would be buried.
        const personalHeading = screen.getByRole("heading", { name: /personal information/i });
        expect(google.compareDocumentPosition(personalHeading)
            & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        // ...and before the wizard's Continue button, right under the role cards.
        const wizardContinue = screen.getByRole("button", { name: /^continue$/i });
        expect(google.compareDocumentPosition(wizardContinue)
            & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

        await userEvent.click(google);
        expect(mocks.google).toHaveBeenCalledWith({ intent: "signup", role: "landlord", redirectTo: null });
        expect(mocks.signup).not.toHaveBeenCalled();
    });

    it("shows why Google sign-in could not start and lets the user retry", async () => {
        mocks.google.mockRejectedValueOnce(new Error("Continue with Google isn't available right now. Please use the form below instead."));
        renderDialog("login");

        await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));

        expect(await screen.findByText(/continue with google isn't available right now/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /continue with google/i })).toBeEnabled();
    });
});
