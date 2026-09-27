import { expect, test } from "@playwright/test";

// "Continue with Google" end to end. The real app, router, AuthContext,
// authService and supabase-js run in the browser; only the Supabase boundary is
// replaced. GoTrue's /authorize answers like the real implicit OAuth flow: it
// redirects back to /auth/callback with the session in the URL fragment.
const SUPABASE = "https://aptfindr-room-tests.supabase.co";
const AUTH_ID = "55555555-5555-4555-8555-555555555555";
const PROFILE_ID = "66666666-6666-4666-8666-666666666666";
const STORAGE_KEY = "sb-aptfindr-room-tests-auth-token";

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const accessToken = (method, expiresAt) => `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: AUTH_ID, aud: "authenticated", role: "authenticated", exp: expiresAt, amr: [{ method, timestamp: expiresAt - 3600 }] })}.test-only-signature`;
const sessionFragment = (method) => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const values = { access_token: accessToken(method, expiresAt), expires_at: String(expiresAt), expires_in: "3600", refresh_token: "test-refresh-token", token_type: "bearer" };
    if (method === "oauth")
        values.provider_token = "google-provider-token";
    else
        values.type = "signup";
    return new URLSearchParams(values).toString();
};

async function mockSupabaseAuth(page, { googleEnabled = true, profile = null, provider = "google", authorizeError = null } = {}) {
    const state = { profile, authorizeUrls: [], logins: [], rpcCalls: [], logouts: 0 };
    const authUser = {
        id: AUTH_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "juan.delacruz@gmail.com",
        email_confirmed_at: "2026-09-27T08:00:00Z",
        app_metadata: { provider, providers: [provider] },
        user_metadata: provider === "google"
            ? { full_name: "Juan Dela Cruz", name: "Juan Dela Cruz", email: "juan.delacruz@gmail.com", email_verified: true }
            : { username: "juan_tenant", role: "tenant" },
        identities: [],
        created_at: "2026-09-27T08:00:00Z",
    };
    await page.route(`${SUPABASE}/**`, async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();
        const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
        if (url.pathname === "/auth/v1/settings")
            return json({ external: { google: googleEnabled, email: true }, disable_signup: false, mailer_autoconfirm: false });
        if (url.pathname === "/auth/v1/authorize") {
            state.authorizeUrls.push(url);
            const back = new URL(url.searchParams.get("redirect_to"));
            back.hash = authorizeError ? new URLSearchParams(authorizeError).toString() : sessionFragment("oauth");
            return route.fulfill({ status: 302, headers: { location: back.toString() } });
        }
        if (url.pathname === "/auth/v1/user")
            return json(authUser);
        if (url.pathname === "/auth/v1/logout") {
            state.logouts += 1;
            return route.fulfill({ status: 204 });
        }
        if (url.pathname.startsWith("/auth/"))
            return json({ message: `Unexpected auth call ${url.pathname}` }, 400);
        const table = url.pathname.split("/rest/v1/")[1];
        if (table === "rpc/fn_complete_oauth_signup") {
            const body = request.postDataJSON();
            state.rpcCalls.push(body);
            state.profile = {
                id: PROFILE_ID, auth_id: AUTH_ID, username: "juan_delacruz", email: authUser.email,
                name: body.p_name || "Juan Dela Cruz", role: body.p_role,
                status: body.p_role === "landlord" ? "pending" : "active", is_verified: body.p_role !== "landlord",
                email_verified: true, verification_status: "email_verified", signup_source: "google",
                mobile: body.p_mobile, address: body.p_address, permit_number: body.p_permit_number,
            };
            return json(state.profile);
        }
        if (table?.startsWith("rpc/"))
            return json(null);
        if (table === "logins" && method === "POST") {
            state.logins.push(request.postDataJSON());
            return route.fulfill({ status: 201, body: "" });
        }
        if (method === "GET" || method === "HEAD") {
            const rows = (table === "app_users" && state.profile ? [state.profile] : []).filter((row) => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(row[key]) === value.slice(3)));
            return json(request.headers().accept?.includes("vnd.pgrst.object") ? rows[0] ?? null : rows);
        }
        return json([], 201);
    });
    await page.routeWebSocket(`${SUPABASE.replace("https", "wss")}/realtime/**`, (socket) => {
        socket.onMessage((message) => {
            try {
                const event = JSON.parse(String(message));
                if (Array.isArray(event)) {
                    const [joinRef, ref, topic, , payload] = event;
                    socket.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: payload?.config ? { postgres_changes: [] } : {} }]));
                }
            }
            catch { /* No live realtime server is contacted by the test. */ }
        });
    });
    return state;
}

const existingTenant = { id: PROFILE_ID, auth_id: AUTH_ID, username: "juan_tenant", email: "juan.delacruz@gmail.com", name: "Juan Dela Cruz", role: "tenant", status: "active", is_verified: true };

test("an existing account signs in with Google from the sign-in view and stays signed in", async ({ page }) => {
    const supabase = await mockSupabaseAuth(page, { profile: existingTenant });
    await page.goto("/login");
    await expect(page.getByLabel(/^Username/)).toBeFocused();

    await page.getByRole("button", { name: "Continue with Google" }).click();

    await expect(page).toHaveURL(/\/browse$/);
    await expect(page.getByRole("heading", { name: "Available Apartments" })).toBeVisible();
    // Still signed in once every background refresh has settled.
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/browse$/);
    const authorize = supabase.authorizeUrls[0];
    expect(authorize.searchParams.get("provider")).toBe("google");
    expect(authorize.searchParams.get("redirect_to")).toMatch(/\/auth\/callback$/);
    expect(authorize.searchParams.get("prompt")).toBe("select_account");
    expect(supabase.logouts).toBe(0);
    expect(supabase.logins).toContainEqual(expect.objectContaining({ user_id: PROFILE_ID, auth_id: AUTH_ID, event: "sign_in", metadata: { provider: "google" } }));
    expect(await page.evaluate((key) => Boolean(localStorage.getItem(key)), STORAGE_KEY)).toBe(true);
    expect(await page.evaluate(() => sessionStorage.getItem("aptfindr:oauth-intent"))).toBeNull();
});

test("a new landlord continues with Google from Create account and finishes their profile", async ({ page }) => {
    const supabase = await mockSupabaseAuth(page);
    await page.goto("/signup");

    await page.getByRole("button", { name: /Landlord/ }).first().click();
    await page.getByRole("button", { name: "Sign Up with Google" }).click();

    await expect(page.getByRole("heading", { name: "Finish setting up your account" })).toBeVisible();
    await expect(page.getByText("juan.delacruz@gmail.com")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Landlord/ })).toBeChecked();
    await expect(page.getByLabel(/^Full Name/)).toHaveValue("Juan Dela Cruz");
    await page.getByLabel(/^Mobile Number/).fill("09171234567");
    await page.getByLabel(/^Home Address/).fill("Brgy. Baldoza, La Paz, Iloilo City");
    await page.getByLabel(/^Business Permit Number/).fill("BP-2025-778");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();

    // Registration ends signed out at the sign-in page, matching email
    // registration — the person signs in explicitly with Google afterwards.
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Account created successfully. Use Continue with Google to sign in.")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login$/);
    expect(supabase.rpcCalls).toEqual([{
        p_role: "landlord",
        p_terms_accepted: true,
        p_landlord_verification_accepted: true,
        p_name: "Juan Dela Cruz",
        p_mobile: "09171234567",
        p_address: "Brgy. Baldoza, La Paz, Iloilo City",
        p_permit_number: "BP-2025-778",
    }]);
    expect(supabase.logouts).toBe(1);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    expect(supabase.logins).toContainEqual(expect.objectContaining({ user_id: PROFILE_ID, metadata: { provider: "google", signup: true } }));
});

test("a new tenant can finish a Google sign-up started from the sign-in view", async ({ page }) => {
    const supabase = await mockSupabaseAuth(page);
    await page.goto("/login");

    await page.getByRole("button", { name: "Continue with Google" }).click();
    // People click the whole Tenant card; the radio inside it is visually hidden.
    await page.getByText("Browse apartments").click();
    await expect(page.getByRole("radio", { name: /Tenant/ })).toBeChecked();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Account created successfully. Use Continue with Google to sign in.")).toBeVisible();
    expect(supabase.rpcCalls).toEqual([expect.objectContaining({ p_role: "tenant", p_terms_accepted: true, p_landlord_verification_accepted: false, p_permit_number: null })]);
    expect(supabase.logouts).toBe(1);
});

test("cancelling the account setup signs the Google session out", async ({ page }) => {
    const supabase = await mockSupabaseAuth(page);
    await page.goto("/login");

    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.getByRole("button", { name: "Cancel and sign out" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => supabase.logouts).toBe(1);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    expect(supabase.rpcCalls).toEqual([]);
});

test("a Google provider that is turned off is explained without leaving the page", async ({ page }) => {
    const supabase = await mockSupabaseAuth(page, { googleEnabled: false });
    await page.goto("/login");

    await page.getByRole("button", { name: "Continue with Google" }).click();

    await expect(page.getByText("Continue with Google isn't available right now. Please use the form below instead.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(supabase.authorizeUrls).toHaveLength(0);
});

test("a failed Google sign-in lands on a clear error instead of a blank page", async ({ page }) => {
    await mockSupabaseAuth(page, { authorizeError: { error: "server_error", error_code: "unexpected_failure", error_description: "Database error saving new user" } });
    await page.goto("/login");

    await page.getByRole("button", { name: "Continue with Google" }).click();

    await expect(page.getByRole("heading", { name: "Google sign-in unsuccessful" })).toBeVisible();
    await expect(page.getByText(/couldn't create your AptFindr account with Google yet/)).toBeVisible();
    await page.getByRole("link", { name: "Return to Sign In" }).click();
    await expect(page).toHaveURL(/\/login$/);
});

test("email confirmation links still verify, sign out and return to sign-in", async ({ page }) => {
    const supabase = await mockSupabaseAuth(page, { provider: "email", profile: existingTenant });

    await page.goto(`/auth/callback#${sessionFragment("otp")}`);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Email verified successfully. You can now sign in.")).toBeVisible();
    await expect.poll(() => supabase.logouts).toBeGreaterThan(0);
    expect(supabase.logins).toEqual([]);
});
