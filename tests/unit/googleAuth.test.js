import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = {
    getSession: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
};
const rpcMock = vi.fn();
const settingsMock = vi.fn();
const db = { profileByAuthId: null, profileByEmail: null, inserts: [], writes: [] };

const fromMock = vi.fn((table) => {
    const filters = {};
    const result = () => {
        if (table === "app_users" && "auth_id" in filters)
            return { data: db.profileByAuthId, error: null };
        if (table === "app_users" && "email" in filters)
            return { data: db.profileByEmail, error: null };
        return { data: null, error: null };
    };
    const builder = {
        select: () => builder,
        eq: (column, value) => {
            filters[column] = value;
            return builder;
        },
        insert: (payload) => {
            db.inserts.push({ table, payload });
            return builder;
        },
        update: (payload) => {
            db.writes.push({ table, payload });
            return builder;
        },
        upsert: (payload) => {
            db.writes.push({ table, payload });
            return builder;
        },
        maybeSingle: async () => result(),
        single: async () => result(),
        then: (resolve, reject) => Promise.resolve({ data: null, error: null }).then(resolve, reject),
    };
    return builder;
});

vi.mock("@/services/supabaseClient", () => ({
    supabase: { auth: authMock, from: fromMock, rpc: rpcMock },
    hasSupabaseConfig: true,
    fetchAuthSettings: (...args) => settingsMock(...args),
}));

const { clearOAuthIntent, completeOAuthSignup, describeGoogleSignInError, getCurrentAuthenticatedUser, getPostSignInPath, getSafeRedirectPath, isOAuthSession, readOAuthIntent, resolveOAuthSignIn, signInWithGoogle, } = await import("@/services/authService");

const INTENT_KEY = "aptfindr:oauth-intent";
const base64Url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const fakeJwt = (claims) => `${base64Url({ alg: "HS256", typ: "JWT" })}.${base64Url(claims)}.signature`;

const googleUser = (overrides = {}) => ({
    id: "auth-google-1",
    email: "juan.delacruz@gmail.com",
    email_confirmed_at: "2026-09-27T08:00:00Z",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "Juan Dela Cruz", name: "Juan Dela Cruz", avatar_url: "https://lh3.googleusercontent.com/a/photo" },
    ...overrides,
});

const sessionFor = (user, method = "oauth") => ({
    access_token: fakeJwt({ sub: user.id, amr: [{ method, timestamp: 1790000000 }] }),
    user,
});

const tenantRow = { id: "user-1", auth_id: "auth-google-1", name: "Juan Dela Cruz", email: "juan.delacruz@gmail.com", username: "juan_delacruz", role: "tenant", status: "active", is_verified: true };

beforeEach(() => {
    vi.clearAllMocks();
    db.profileByAuthId = null;
    db.profileByEmail = null;
    db.inserts = [];
    db.writes = [];
    window.sessionStorage.clear();
    settingsMock.mockResolvedValue({ external: { google: true, email: true } });
    authMock.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: "https://project.supabase.co/auth/v1/authorize?provider=google" }, error: null });
    vi.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("signInWithGoogle", () => {
    it("starts Supabase Google OAuth back to /auth/callback and remembers the intent", async () => {
        await signInWithGoogle({ intent: "signup", role: "Landlord", redirectTo: "/apartment/apt-7" });

        expect(authMock.signInWithOAuth).toHaveBeenCalledWith({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: { prompt: "select_account" },
            },
        });
        expect(readOAuthIntent()).toMatchObject({ provider: "google", intent: "signup", role: "landlord", redirectTo: "/apartment/apt-7" });
    });

    it("never stores an off-site return address", async () => {
        await signInWithGoogle({ intent: "signin", redirectTo: "//evil.example/steal" });

        expect(readOAuthIntent()).toMatchObject({ intent: "signin", role: null, redirectTo: null });
    });

    it("explains a disabled Google provider instead of leaving the page", async () => {
        settingsMock.mockResolvedValue({ external: { google: false, email: true } });

        await expect(signInWithGoogle({ intent: "signin" })).rejects.toThrow(/isn't available right now/i);
        expect(authMock.signInWithOAuth).not.toHaveBeenCalled();
        expect(readOAuthIntent()).toBeNull();
        expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/Sign In \/ Providers → Google/));
    });

    it("still tries Supabase when the provider settings cannot be read", async () => {
        settingsMock.mockResolvedValue(null);

        await signInWithGoogle({ intent: "signin" });

        expect(authMock.signInWithOAuth).toHaveBeenCalledTimes(1);
    });

    it("reports a failed start and forgets the intent", async () => {
        authMock.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: null }, error: { message: "boom", status: 500 } });

        await expect(signInWithGoogle({ intent: "signin" })).rejects.toThrow("Google sign-in could not be started. Please try again.");
        expect(window.sessionStorage.getItem(INTENT_KEY)).toBeNull();
    });
});

describe("OAuth intent and redirect helpers", () => {
    it("ignores an intent older than 30 minutes", () => {
        window.sessionStorage.setItem(INTENT_KEY, JSON.stringify({ provider: "google", intent: "signin", startedAt: Date.now() - 31 * 60 * 1000 }));

        expect(readOAuthIntent()).toBeNull();
    });

    it("sanitises a tampered intent", () => {
        window.sessionStorage.setItem(INTENT_KEY, JSON.stringify({ provider: "google", intent: "hack", role: "admin", redirectTo: "https://evil.example", startedAt: Date.now() }));

        expect(readOAuthIntent()).toMatchObject({ intent: "signin", role: null, redirectTo: null });
        clearOAuthIntent();
        expect(window.sessionStorage.getItem(INTENT_KEY)).toBeNull();
    });

    it("only accepts same-site paths", () => {
        expect(getSafeRedirectPath("/browse?city=iloilo")).toBe("/browse?city=iloilo");
        expect(getSafeRedirectPath("//evil.example")).toBeNull();
        expect(getSafeRedirectPath("/\\evil.example")).toBeNull();
        expect(getSafeRedirectPath("https://evil.example")).toBeNull();
        expect(getSafeRedirectPath(null)).toBeNull();
    });

    it("sends each role to the same place as the sign-in form", () => {
        expect(getPostSignInPath({ role: "tenant" })).toBe("/browse");
        expect(getPostSignInPath({ role: "landlord" })).toBe("/dashboard");
        expect(getPostSignInPath({ role: "admin" })).toBe("/admin");
        expect(getPostSignInPath({ role: "tenant" }, "/apartment/apt-7")).toBe("/apartment/apt-7");
        expect(getPostSignInPath({ role: "tenant" }, "//evil.example")).toBe("/browse");
    });

    it("recognises sessions created by Google from the access token", () => {
        expect(isOAuthSession(sessionFor(googleUser(), "oauth"))).toBe(true);
        expect(isOAuthSession(sessionFor(googleUser(), "otp"))).toBe(false);
        expect(isOAuthSession(sessionFor(googleUser(), "password"))).toBe(false);
        expect(isOAuthSession({ access_token: "not-a-jwt" })).toBe(false);
        expect(isOAuthSession(null)).toBe(false);
    });
});

describe("describeGoogleSignInError", () => {
    const message = (query) => describeGoogleSignInError(new URLSearchParams(query));

    it("maps the Supabase errors people can actually hit", () => {
        expect(message("error=access_denied")).toMatch(/cancelled/i);
        expect(message("error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user")).toMatch(/couldn't create your AptFindr account with Google/i);
        expect(message("error=access_denied&error_code=signup_disabled&error_description=Signups+not+allowed+for+this+instance")).toMatch(/can't be created right now/i);
        expect(message("error=access_denied&error_code=provider_email_needs_verification&error_description=Unverified+email+with+google")).toMatch(/confirm the email address/i);
        expect(message("error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+parameter+missing")).toMatch(/expired/i);
        expect(message("error=server_error&error_description=Something+else")).toBe("Google sign-in could not be completed. Please try again.");
    });

    it("tells administrators which SQL script unblocks new Google accounts", () => {
        message("error=server_error&error_description=Database+error+saving+new+user");

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("google_oauth_signup.sql"));
    });
});

describe("resolveOAuthSignIn", () => {
    it("signs in an existing AptFindr account and records the Google login", async () => {
        authMock.getSession.mockResolvedValue({ data: { session: sessionFor(googleUser()) }, error: null });
        db.profileByAuthId = tenantRow;

        const result = await resolveOAuthSignIn();

        expect(result).toMatchObject({ status: "signed_in", user: { id: "user-1", role: "tenant", username: "juan_delacruz" } });
        expect(db.inserts).toContainEqual({ table: "logins", payload: expect.objectContaining({ user_id: "user-1", auth_id: "auth-google-1", event: "sign_in", success: true, metadata: { provider: "google" } }) });
        expect(authMock.signOut).not.toHaveBeenCalled();
    });

    it.each([
        ["tenant", "profileByAuthId"],
        ["landlord", "profileByAuthId"],
        ["tenant", "profileByEmail"],
        ["landlord", "profileByEmail"],
    ])("rejects %s Google signup when an account exists by %s", async (role, lookup) => {
        await signInWithGoogle({ intent: "signup", role });
        authMock.getSession.mockResolvedValue({ data: { session: sessionFor(googleUser()) }, error: null });
        db[lookup] = tenantRow;

        await expect(resolveOAuthSignIn()).rejects.toThrow(
            "An account with this email already exists. Please sign in instead.",
        );
        expect(authMock.signOut).toHaveBeenCalledTimes(1);
        expect(readOAuthIntent()).toBeNull();
        expect(db.inserts).toHaveLength(0);
        expect(db.writes).toHaveLength(0);
        expect(rpcMock).not.toHaveBeenCalled();
    });

    it.each(["tenant", "landlord"])("allows explicit Google signup for %s", async (role) => {
        await signInWithGoogle({ intent: "signup", role });
        authMock.getSession.mockResolvedValue({ data: { session: sessionFor(googleUser()) }, error: null });

        const result = await resolveOAuthSignIn();

        expect(result).toEqual({
            status: "needs_profile",
            account: { email: "juan.delacruz@gmail.com", name: "Juan Dela Cruz", avatarUrl: "https://lh3.googleusercontent.com/a/photo" },
        });
        expect(db.inserts.filter((entry) => entry.table === "app_users")).toHaveLength(0);
        expect(authMock.signOut).not.toHaveBeenCalled();
    });

    it.each([
        { intent: "signin", role: null },
        null,
        { intent: "signup", role: null },
        { intent: "signup", role: "tenant", startedAt: Date.now() - 31 * 60 * 1000 },
    ])("rejects unregistered sign-in without a valid signup intent: %j", async (intent) => {
        if (intent) {
            window.sessionStorage.setItem(INTENT_KEY, JSON.stringify({
                provider: "google", startedAt: Date.now(), ...intent,
            }));
        }
        authMock.getSession.mockResolvedValue({ data: { session: sessionFor(googleUser()) }, error: null });

        await expect(resolveOAuthSignIn()).rejects.toThrow("No AptFindr account is linked to this Google email. Create an account first.");
        expect(authMock.signOut).toHaveBeenCalledTimes(1);
        expect(readOAuthIntent()).toBeNull();
        expect(db.inserts).toHaveLength(0);
    });

    it("signs a deactivated account back out", async () => {
        authMock.getSession.mockResolvedValue({ data: { session: sessionFor(googleUser()) }, error: null });
        db.profileByAuthId = { ...tenantRow, status: "disabled" };

        await expect(resolveOAuthSignIn()).rejects.toThrow(/deactivated/i);
        expect(authMock.signOut).toHaveBeenCalledTimes(1);
    });

    it("fails clearly when Google did not leave a session", async () => {
        authMock.getSession.mockResolvedValue({ data: { session: null }, error: null });

        await expect(resolveOAuthSignIn()).rejects.toThrow("Google sign-in could not be completed. Please try again.");
    });
});

describe("app start-up with an unfinished Google sign-up", () => {
    it("treats the person as signed out but keeps the Supabase session", async () => {
        authMock.getSession.mockResolvedValue({ data: { session: sessionFor(googleUser()) }, error: null });

        await expect(getCurrentAuthenticatedUser()).resolves.toBeNull();
        expect(authMock.signOut).not.toHaveBeenCalled();
        expect(db.inserts.filter((entry) => entry.table === "app_users")).toHaveLength(0);
    });
});

describe("completeOAuthSignup", () => {
    it("creates a tenant profile through the database function", async () => {
        rpcMock.mockResolvedValue({ data: { ...tenantRow, signup_source: "google" }, error: null });

        const user = await completeOAuthSignup({ role: "tenant", termsAccepted: true, mobile: "ignored", permitNumber: "ignored" });

        expect(rpcMock).toHaveBeenCalledWith("fn_complete_oauth_signup", {
            p_role: "tenant",
            p_terms_accepted: true,
            p_landlord_verification_accepted: false,
            p_name: null,
            p_mobile: null,
            p_address: null,
            p_permit_number: null,
        });
        expect(user).toMatchObject({ id: "user-1", role: "tenant" });
        expect(db.inserts).toContainEqual({ table: "logins", payload: expect.objectContaining({ user_id: "user-1", metadata: { provider: "google", signup: true } }) });
    });

    it("sends trimmed landlord details", async () => {
        rpcMock.mockResolvedValue({ data: [{ ...tenantRow, role: "landlord", status: "pending", is_verified: false }], error: null });

        const user = await completeOAuthSignup({ role: "landlord", termsAccepted: true, landlordVerificationAccepted: true, name: " Maria Santos ", mobile: " 09171234567 ", address: " La Paz, Iloilo ", permitNumber: " BP-2025-778 " });

        expect(rpcMock).toHaveBeenCalledWith("fn_complete_oauth_signup", {
            p_role: "landlord",
            p_terms_accepted: true,
            p_landlord_verification_accepted: true,
            p_name: "Maria Santos",
            p_mobile: "09171234567",
            p_address: "La Paz, Iloilo",
            p_permit_number: "BP-2025-778",
        });
        expect(user).toMatchObject({ role: "landlord", status: "pending" });
    });

    it("validates before calling the database", async () => {
        await expect(completeOAuthSignup({ role: "admin", termsAccepted: true })).rejects.toThrow(/Choose Tenant or Landlord/);
        await expect(completeOAuthSignup({ role: "tenant", termsAccepted: false })).rejects.toThrow(/Terms of Use and Privacy Policy/);
        await expect(completeOAuthSignup({ role: "landlord", termsAccepted: true, landlordVerificationAccepted: true, name: "Maria", mobile: "0917", address: "La Paz", permitNumber: "  " })).rejects.toThrow("Business permit number is required.");
        expect(rpcMock).not.toHaveBeenCalled();
    });

    it("explains a missing database function", async () => {
        rpcMock.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Could not find the function public.fn_complete_oauth_signup" } });

        await expect(completeOAuthSignup({ role: "tenant", termsAccepted: true })).rejects.toThrow(/isn't fully set up yet/i);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("google_oauth_signup.sql"));
    });

    it("shows messages written by the database function as-is", async () => {
        rpcMock.mockResolvedValue({ data: null, error: { code: "P0001", message: "An AptFindr account already uses this email. Sign in with your username and password instead." } });

        await expect(completeOAuthSignup({ role: "tenant", termsAccepted: true })).rejects.toThrow("An AptFindr account already uses this email. Sign in with your username and password instead.");
    });

    it("hides unexpected database errors", async () => {
        rpcMock.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } });

        await expect(completeOAuthSignup({ role: "tenant", termsAccepted: true })).rejects.toThrow("We could not finish creating your account. Please try again.");
    });
});
