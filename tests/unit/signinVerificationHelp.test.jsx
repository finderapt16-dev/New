import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resend: vi.fn(), login: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ login: mocks.login }) }));
vi.mock("@/services/authService", () => ({
    resendSignupVerification: (...args) => mocks.resend(...args),
    isTenantRole: (role) => role === "tenant",
}));

const { Login } = await import("@/auth/Signin");

const renderLogin = () => {
    const router = createMemoryRouter([{ path: "/login", element: <Login /> }], { initialEntries: ["/login"] });
    render(<RouterProvider router={router} />);
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.resend.mockResolvedValue(undefined);
});

describe("sign-in verification help", () => {
    it("sends a fresh confirmation link for the typed address", async () => {
        renderLogin();

        await userEvent.click(screen.getByRole("button", { name: /didn't receive a verification email/i }));
        await userEvent.type(screen.getByLabelText(/verification email address/i), "tenant@example.com");
        await userEvent.click(screen.getByRole("button", { name: /send link/i }));

        await waitFor(() => expect(mocks.resend).toHaveBeenCalledWith("tenant@example.com"));
        expect(await screen.findByText(/verification email requested for tenant@example.com/i)).toBeInTheDocument();
    });

    it("opens itself when sign-in is blocked by an unverified email", async () => {
        mocks.login.mockResolvedValue({ success: false, error: "Please verify your account before signing in." });
        renderLogin();

        await userEvent.type(screen.getByLabelText(/^Username/), "tenant_one");
        await userEvent.type(screen.getByLabelText(/^Password/), "password123");
        await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

        expect(await screen.findByText(/enter the email address you registered with/i)).toBeInTheDocument();
    });
});
