import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real authService runs against a mocked Supabase client; the AuthContext
// methods the callback calls are mocked so each scenario controls the result.
const mocks = vi.hoisted(() => ({
    auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        exchangeCodeForSession: vi.fn(),
        signOut: vi.fn(async () => ({ error: null })),
    },
    profile: null,
    finishGoogleSignIn: vi.fn(),
    completeGoogleSignup: vi.fn(),
    logout: vi.fn(),
}));

vi.mock("@/services/supabaseClient", () => {
    const from = () => {
        const builder = {
            select: () => builder,
            eq: () => builder,
            insert: () => builder,
            update: () => builder,
            upsert: () => builder,
            maybeSingle: async () => ({ data: mocks.profile, error: null }),
            single: async () => ({ data: mocks.profile, error: null }),
            then: (resolve, reject) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
        };
        return builder;
    };
    return { supabase: { auth: mocks.auth, from, rpc: vi.fn() }, hasSupabaseConfig: true, fetchAuthSettings: vi.fn(async () => null) };
});
vi.mock("@/contexts/AuthContext", () => ({
    useAuth: () => ({ finishGoogleSignIn: mocks.finishGoogleSignIn, completeGoogleSignup: mocks.completeGoogleSignup, logout: mocks.logout }),
}));

const { AuthCallback } = await import("@/auth/AuthCallback");

const INTENT_KEY = "aptfindr:oauth-intent";
const base64Url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const sessionWith = (method, user = {}) => ({
    access_token: `${base64Url({ alg: "HS256" })}.${base64Url({ sub: "auth-1", amr: [{ method, timestamp: 1790000000 }] })}.sig`,
    user: { id: "auth-1", email: "juan@gmail.com", email_confirmed_at: "2026-09-27T08:00:00Z", app_metadata: { provider: method === "oauth" ? "google" : "email" }, user_metadata: {}, ...user },
});
const saveIntent = (intent = {}) => window.sessionStorage.setItem(INTENT_KEY, JSON.stringify({ provider: "google", intent: "signin", role: null, redirectTo: null, startedAt: Date.now(), ...intent }));

function LoginPage() {
    const location = useLocation();
    return <p>LOGIN PAGE {location.state?.message ?? ""}</p>;
}

function renderCallback(url = "/auth/callback") {
    // The callback reads window.location (Supabase puts tokens/errors there).
    window.history.replaceState({}, "", url);
    const router = createMemoryRouter([
        { path: "/auth/callback", element: <AuthCallback /> },
        { path: "/login", element: <LoginPage /> },
        { path: "/browse", element: <p>BROWSE PAGE</p> },
        { path: "/dashboard", element: <p>DASHBOARD PAGE</p> },
        { path: "/apartment/:id", element: <p>APARTMENT PAGE</p> },
    ], { initialEntries: ["/auth/callback"] });
    render(<RouterProvider router={router} />);
    return router;
}

beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.profile = null;
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    vi.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
});

describe("/auth/callback after Continue with Google", () => {
    it("shows the duplicate-signup message and offers Sign In instead of opening a dashboard", async () => {
        saveIntent({ intent: "signup", role: "tenant" });
        mocks.auth.getSession.mockResolvedValue({ data: { session: sessionWith("oauth") }, error: null });
        mocks.finishGoogleSignIn.mockRejectedValue(new Error(
            "An account with this email already exists. Please sign in instead.",
        ));
        renderCallback("/auth/callback#access_token=token&token_type=bearer&provider_token=google");

        expect(await screen.findByText("An account with this email already exists. Please sign in instead.")).toBeInTheDocument();
        expect(screen.queryByText("BROWSE PAGE")).not.toBeInTheDocument();
        expect(screen.queryByText("DASHBOARD PAGE")).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole("link", { name: "Return to Sign In" }));
        expect(await screen.findByText(/LOGIN PAGE/)).toBeInTheDocument();
    });

    it("keeps an existing user signed in and opens their home page", async () => {
        saveIntent();
        mocks.auth.getSession.mockResolvedValue({ data: { session: sessionWith("oauth") }, error: null });
        mocks.finishGoogleSignIn.mockResolvedValue({ status: "signed_in", user: { id: "user-1", role: "tenant" } });

        renderCallback("/auth/callback#access_token=token&token_type=bearer&provider_token=google");

        expect(await screen.findByText("BROWSE PAGE")).toBeInTheDocument();
        expect(mocks.finishGoogleSignIn).toHaveBeenCalledTimes(1);
        expect(mocks.auth.signOut).not.toHaveBeenCalled();
        expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
        expect(window.sessionStorage.getItem(INTENT_KEY)).toBeNull();
    });

    it("returns to the page that asked for sign-in", async () => {
        saveIntent({ redirectTo: "/apartment/apt-7" });
        mocks.auth.getSession.mockResolvedValue({ data: { session: sessionWith("oauth") }, error: null });
        mocks.finishGoogleSignIn.mockResolvedValue({ status: "signed_in", user: { id: "user-1", role: "tenant" } });

        renderCallback();

        expect(await screen.findByText("APARTMENT PAGE")).toBeInTheDocument();
    });

    it("recognises a Google session even when the saved intent is gone", async () => {
        mocks.auth.getSession.mockResolvedValue({ data: { session: sessionWith("oauth") }, error: null });
        mocks.finishGoogleSignIn.mockResolvedValue({ status: "signed_in", user: { id: "user-2", role: "landlord" } });

        renderCallback();

        expect(await screen.findByText("DASHBOARD PAGE")).toBeInTheDocument();
        expect(mocks.auth.signOut).not.toHaveBeenCalled();
    });

    it("explains a failed Google sign-in and offers a way back", async () => {
        saveIntent();

        renderCallback("/auth/callback#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user");

        expect(await screen.findByRole("heading", { name: /google sign-in unsuccessful/i })).toBeInTheDocument();
        expect(screen.getByText(/couldn't create your AptFindr account with Google yet/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /return to sign in/i })).toHaveAttribute("href", "/login");
        expect(mocks.finishGoogleSignIn).not.toHaveBeenCalled();
        expect(window.sessionStorage.getItem(INTENT_KEY)).toBeNull();
    });

    it("shows the reason when the account cannot be loaded", async () => {
        saveIntent();
        mocks.auth.getSession.mockResolvedValue({ data: { session: sessionWith("oauth") }, error: null });
        mocks.finishGoogleSignIn.mockRejectedValue(new Error("This account has been deactivated. Contact an administrator."));

        renderCallback();

        expect(await screen.findByText(/this account has been deactivated/i)).toBeInTheDocument();
    });
});

describe("finishing a first-time Google sign-up", () => {
    const needsProfile = { status: "needs_profile", account: { email: "juan@gmail.com", name: "Juan Dela Cruz", avatarUrl: "" } };

    beforeEach(() => {
        mocks.auth.getSession.mockResolvedValue({ data: { session: sessionWith("oauth") }, error: null });
        mocks.finishGoogleSignIn.mockResolvedValue(needsProfile);
    });

    it("creates a tenant account after the terms are accepted", async () => {
        saveIntent({ intent: "signup" });
        mocks.completeGoogleSignup.mockResolvedValue({ id: "user-9", role: "tenant" });
        renderCallback();

        expect(await screen.findByRole("heading", { name: /finish setting up your account/i })).toBeInTheDocument();
        expect(screen.getByText("juan@gmail.com")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));
        expect(await screen.findByText(/choose tenant or landlord/i)).toBeInTheDocument();

        await userEvent.click(screen.getByRole("radio", { name: /tenant/i }));
        await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));
        expect(await screen.findByText(/must agree to the terms of use and privacy policy/i)).toBeInTheDocument();
        expect(mocks.completeGoogleSignup).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole("checkbox"));
        await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));

        expect(await screen.findByText("BROWSE PAGE")).toBeInTheDocument();
        expect(mocks.completeGoogleSignup).toHaveBeenCalledWith({ role: "tenant", name: null, mobile: null, address: null, permitNumber: null, termsAccepted: true, landlordVerificationAccepted: false });
        expect(mocks.auth.signOut).not.toHaveBeenCalled();
        expect(window.sessionStorage.getItem(INTENT_KEY)).toBeNull();
    });

    it("pre-selects the role chosen on the sign-up form and collects landlord details", async () => {
        saveIntent({ intent: "signup", role: "landlord" });
        mocks.completeGoogleSignup.mockResolvedValue({ id: "user-10", role: "landlord" });
        renderCallback();

        expect(await screen.findByRole("radio", { name: /landlord/i })).toBeChecked();
        const fullName = screen.getByLabelText(/full name/i);
        expect(fullName).toHaveValue("Juan Dela Cruz");
        expect(screen.getByText(/landlord account starts as pending/i)).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText(/mobile number/i), "09171234567");
        await userEvent.type(screen.getByLabelText(/home address/i), "Brgy. Baldoza, La Paz");
        await userEvent.click(screen.getByRole("checkbox"));
        await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));
        expect(await screen.findByText("Business permit number is required.")).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText(/^business permit number/i), "BP-2025-778");
        await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));

        expect(await screen.findByText("DASHBOARD PAGE")).toBeInTheDocument();
        expect(mocks.completeGoogleSignup).toHaveBeenCalledWith({
            role: "landlord",
            name: "Juan Dela Cruz",
            mobile: "09171234567",
            address: "Brgy. Baldoza, La Paz",
            permitNumber: "BP-2025-778",
            termsAccepted: true,
            landlordVerificationAccepted: true,
        });
    });

    it("keeps the form open with the server's message when creation fails", async () => {
        saveIntent({ intent: "signup", role: "tenant" });
        mocks.completeGoogleSignup.mockRejectedValue(new Error("An AptFindr account already uses this email. Sign in with your username and password instead."));
        renderCallback();

        await userEvent.click(await screen.findByRole("checkbox"));
        await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));

        expect(await screen.findByText(/already uses this email/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^create account$/i })).toBeEnabled();
    });

    it("can be cancelled, which signs the Google session out", async () => {
        saveIntent({ intent: "signup" });
        renderCallback();

        await userEvent.click(await screen.findByRole("button", { name: /cancel and sign out/i }));

        expect(mocks.logout).toHaveBeenCalledTimes(1);
        expect(await screen.findByText(/LOGIN PAGE/)).toBeInTheDocument();
        expect(window.sessionStorage.getItem(INTENT_KEY)).toBeNull();
    });
});

describe("/auth/callback for email confirmation links (unchanged)", () => {
    it("confirms the email, signs out and asks the user to sign in", async () => {
        const emailSession = sessionWith("otp", { app_metadata: { provider: "email" } });
        mocks.auth.exchangeCodeForSession.mockResolvedValue({ data: { session: emailSession }, error: null });
        mocks.auth.getUser.mockResolvedValue({ data: { user: emailSession.user }, error: null });
        mocks.auth.getSession
            .mockResolvedValueOnce({ data: { session: null }, error: null })
            .mockResolvedValue({ data: { session: emailSession }, error: null });
        mocks.profile = { id: "user-3", auth_id: "auth-1", email: "juan@gmail.com", username: "juan_t", role: "tenant", status: "active" };

        renderCallback("/auth/callback?code=email-code");

        expect(await screen.findByText(/Email verified successfully\. You can now sign in\./)).toBeInTheDocument();
        expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith("email-code");
        expect(mocks.auth.signOut).toHaveBeenCalled();
        expect(mocks.finishGoogleSignIn).not.toHaveBeenCalled();
    });

    it("treats a session from an email link as email verification", async () => {
        const emailSession = sessionWith("otp", { app_metadata: { provider: "email" } });
        mocks.auth.getSession.mockResolvedValue({ data: { session: emailSession }, error: null });
        mocks.auth.getUser.mockResolvedValue({ data: { user: emailSession.user }, error: null });
        mocks.profile = { id: "user-3", auth_id: "auth-1", email: "juan@gmail.com", username: "juan_t", role: "tenant", status: "active" };

        renderCallback("/auth/callback#access_token=token&type=signup");

        expect(await screen.findByText(/Email verified successfully/)).toBeInTheDocument();
        expect(mocks.auth.signOut).toHaveBeenCalled();
        expect(mocks.finishGoogleSignIn).not.toHaveBeenCalled();
    });

    it("reports an expired email link from the URL fragment", async () => {
        renderCallback("/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");

        expect(await screen.findByRole("heading", { name: /verification unsuccessful/i })).toBeInTheDocument();
        expect(screen.getByText(/this verification link is invalid or has expired/i)).toBeInTheDocument();
        expect(mocks.finishGoogleSignIn).not.toHaveBeenCalled();
    });

    it("uses AptFindr (not the old name) while verifying", async () => {
        mocks.auth.getUser.mockReturnValue(new Promise(() => { }));

        renderCallback("/auth/callback#access_token=token&type=signup");

        await waitFor(() => expect(screen.getByText(/please wait while AptFindr confirms your email address/i)).toBeInTheDocument());
        expect(screen.queryByText(/RentIloilo/)).not.toBeInTheDocument();
    });
});
