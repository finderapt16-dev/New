import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = {
    signUp: vi.fn(),
    resend: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
};

const queryResult = { data: null, error: { message: "mocked query" } };
const fromMock = vi.fn(() => {
    const builder = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        upsert: () => builder,
        eq: () => builder,
        single: async () => queryResult,
        maybeSingle: async () => queryResult,
        then: (resolve) => resolve(queryResult),
    };
    return builder;
});

vi.mock("@/services/supabaseClient", () => ({
    supabase: { auth: authMock, from: fromMock },
    hasSupabaseConfig: true,
}));

const { resendSignupVerification, signupUser } = await import("@/services/authService");

const baseInput = {
    name: "tenant-one",
    username: "tenant_one",
    email: "Tenant@Example.com",
    password: "password123",
    role: "tenant",
    termsAccepted: true,
};

function signUpResponse(user, session = null) {
    return {
        data: {
            user: {
                id: "auth-1",
                email: "tenant@example.com",
                email_confirmed_at: null,
                confirmation_sent_at: null,
                identities: [{ id: "identity-1" }],
                user_metadata: { role: "tenant" },
                ...user,
            },
            session,
        },
        error: null,
    };
}

beforeEach(() => {
    authMock.signUp.mockReset();
    authMock.resend.mockReset();
    authMock.signOut.mockClear();
    fromMock.mockClear();
});

describe("signup confirmation email reporting", () => {
    it("flags the account when Supabase records no confirmation email", async () => {
        authMock.signUp.mockResolvedValue(signUpResponse({}));

        const result = await signupUser(baseInput);

        expect(result.accountCreated).toBe(true);
        expect(result.requiresEmailVerification).toBe(true);
        expect(result.emailConfirmation.state).toBe("not_sent");
    });

    it("reports a sent email when Supabase records confirmation_sent_at", async () => {
        authMock.signUp.mockResolvedValue(signUpResponse({
            confirmation_sent_at: "2026-01-01T00:00:00Z",
        }));

        const result = await signupUser(baseInput);

        expect(result.emailConfirmation.state).toBe("sent");
        expect(result.emailConfirmation.sentAt).toBe("2026-01-01T00:00:00Z");
    });

    it("detects that email confirmation is disabled when signup returns a session", async () => {
        authMock.signUp.mockResolvedValue(signUpResponse({}, { access_token: "token" }));

        const result = await signupUser(baseInput);

        expect(result.emailConfirmation.state).toBe("disabled");
        expect(result.requiresEmailVerification).toBe(true);
    });

    it("marks an already registered address without resending the email", async () => {
        authMock.signUp.mockResolvedValue(signUpResponse({ identities: [] }));

        const result = await signupUser(baseInput);

        expect(result.existingAccount).toBe(true);
        expect(result.emailConfirmation.state).toBe("existing_account");
    });

    it("builds the confirmation link from the current origin", async () => {
        authMock.signUp.mockResolvedValue(signUpResponse({
            confirmation_sent_at: "2026-01-01T00:00:00Z",
        }));

        await signupUser(baseInput);

        const [request] = authMock.signUp.mock.calls[0];
        expect(request.email).toBe("tenant@example.com");
        expect(request.options.emailRedirectTo).toBe(`${window.location.origin}/auth/callback`);
    });
});

describe("resendSignupVerification", () => {
    async function resendWith(error) {
        authMock.resend.mockResolvedValue({ data: { user: null }, error });
        return resendSignupVerification("Tenant@Example.com");
    }

    it("asks for a custom SMTP setup when the address is not authorized", async () => {
        await expect(resendWith({
            status: 400,
            code: "email_not_authorized",
            message: "Email address not authorized",
        })).rejects.toThrow(/custom SMTP/i);
    });

    it("explains the wait when the mail rate limit is hit", async () => {
        await expect(resendWith({
            status: 429,
            code: "over_email_send_rate_limit",
            message: "email rate limit exceeded",
        })).rejects.toThrow(/Wait a few minutes/i);
    });

    it("normalizes the address and reuses the callback redirect", async () => {
        authMock.resend.mockResolvedValue({ data: { user: null }, error: null });

        await resendSignupVerification(" Tenant@Example.com ");

        const [request] = authMock.resend.mock.calls[0];
        expect(request.type).toBe("signup");
        expect(request.email).toBe("tenant@example.com");
        expect(request.options.emailRedirectTo).toBe(`${window.location.origin}/auth/callback`);
    });

    it("rejects an empty address before calling Supabase", async () => {
        await expect(resendSignupVerification("   ")).rejects.toThrow(/valid email/i);
        expect(authMock.resend).not.toHaveBeenCalled();
    });
});
