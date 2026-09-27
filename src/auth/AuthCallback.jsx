import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clearOAuthIntent, describeGoogleSignInError, exchangeAuthCode, getAuthSession, getAuthUser, getCurrentAuthenticatedUser, getPostSignInPath, isOAuthSession, readOAuthIntent, signOutAuthSession } from "@/services/authService";
import { CompleteGoogleSignup } from "./CompleteGoogleSignup";
import "./auth_callback.css";

const INVALID_LINK_MESSAGE = "This verification link is invalid or has expired. Request a new verification email and try again.";

/**
 * Supabase reports results in the query string (?code=…, ?error=…) or, for
 * the implicit flow, in the URL fragment (#access_token=… / #error=…).
 */
function readCallbackParams() {
    const params = new URLSearchParams(window.location.search);
    const fragment = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    new URLSearchParams(fragment).forEach((value, key) => {
        if (!params.has(key))
            params.set(key, value);
    });
    return params;
}

async function readSession() {
    try {
        const { data } = await getAuthSession();
        return data?.session ?? null;
    }
    catch {
        return null;
    }
}

/**
 * Both "Continue with Google" and the email confirmation link return here.
 * A Google attempt is recognised by the intent saved when the button was
 * clicked, or by the session itself having been created through OAuth.
 */
function detectFlow({ hasError, hasCode, intent, session }) {
    if (hasError)
        return intent ? "google" : "email";
    if (session)
        return isOAuthSession(session) ? "google" : "email";
    if (hasCode)
        return "email";
    return intent ? "google" : "email";
}

async function resolveGoogleSignIn({ params, hasError, intent, finishGoogleSignIn }) {
    if (hasError) {
        clearOAuthIntent();
        return { status: "error", flow: "google", message: describeGoogleSignInError(params) };
    }
    try {
        const result = await finishGoogleSignIn();
        if (result.status === "needs_profile") {
            return { status: "complete-profile", flow: "google", account: result.account, intent };
        }
        clearOAuthIntent();
        return { status: "navigate", to: getPostSignInPath(result.user, intent?.redirectTo) };
    }
    catch (error) {
        console.error("Google sign-in could not be completed:", error);
        clearOAuthIntent();
        return {
            status: "error",
            flow: "google",
            message: error instanceof Error && error.message ? error.message : "Google sign-in could not be completed. Please try again.",
        };
    }
}

// Email confirmation links: confirm, then sign out so the person signs in
// with their username and password (unchanged behaviour).
async function resolveEmailVerification(params) {
    const callbackError = params.get("error_description") || params.get("error");
    if (callbackError) {
        console.error("Email verification callback was rejected:", callbackError);
        return { status: "error", flow: "email", message: INVALID_LINK_MESSAGE };
    }
    const code = params.get("code");
    if (code) {
        const { error: exchangeError } = await exchangeAuthCode(code);
        if (exchangeError) {
            console.error("Email verification callback failed:", exchangeError);
            return { status: "error", flow: "email", message: INVALID_LINK_MESSAGE };
        }
    }
    const { data, error: userError } = await getAuthUser();
    if (userError || !data.user?.email_confirmed_at) {
        if (userError)
            console.error("Unable to confirm verified user:", userError);
        return { status: "error", flow: "email", message: "Email verification could not be confirmed. Request a new verification email and try again." };
    }
    try {
        const profile = await getCurrentAuthenticatedUser();
        if (!profile)
            throw new Error("The verified account profile is not available.");
        await signOutAuthSession();
        return { status: "navigate", to: "/login", state: { message: "Email verified successfully. You can now sign in." } };
    }
    catch (profileError) {
        console.error("Email was verified but profile recovery failed:", profileError);
        await signOutAuthSession();
        return { status: "navigate", to: "/login", state: { message: "Email verified. Sign in to finish loading your profile." } };
    }
}

export function AuthCallback() {
    const navigate = useNavigate();
    const { finishGoogleSignIn, completeGoogleSignup, logout } = useAuth();
    const [view, setView] = useState(() => ({ status: "loading", flow: readOAuthIntent() ? "google" : "email" }));
    const startedRef = useRef(false);
    const mountedRef = useRef(false);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    useEffect(() => {
        // Run once: the code, the tokens and the saved intent are single-use.
        if (startedRef.current)
            return;
        startedRef.current = true;
        void (async () => {
            const params = readCallbackParams();
            const intent = readOAuthIntent();
            const hasError = params.has("error") || params.has("error_description");
            const session = hasError ? null : await readSession();
            const flow = detectFlow({ hasError, hasCode: params.has("code"), intent, session });
            if (mountedRef.current)
                setView((current) => (current.status === "loading" ? { ...current, flow } : current));
            const outcome = flow === "google"
                ? await resolveGoogleSignIn({ params, hasError, intent, finishGoogleSignIn })
                : await resolveEmailVerification(params);
            if (!mountedRef.current)
                return;
            if (outcome.status === "navigate") {
                navigate(outcome.to, { replace: true, state: outcome.state });
                return;
            }
            setView(outcome);
        })();
    }, [finishGoogleSignIn, navigate]);
    const handleCompleteSignup = async (details) => {
        await completeGoogleSignup(details);
        clearOAuthIntent();
        // Email registration ends at the sign-in page; Google registration now
        // does too. The profile exists, but the person signs in explicitly —
        // with Google — instead of being dropped straight into the app.
        logout();
        if (mountedRef.current)
            navigate("/login", {
                replace: true,
                state: { message: "Account created successfully. Use Continue with Google to sign in." },
            });
    };
    const handleCancelSignup = () => {
        clearOAuthIntent();
        logout();
        navigate("/login", { replace: true });
    };
    if (view.status === "complete-profile") {
        return (<main className="auth-status-page auth-callback-page">
        <CompleteGoogleSignup account={view.account} initialRole={view.intent?.role ?? null} onSubmit={handleCompleteSignup} onCancel={handleCancelSignup}/>
      </main>);
    }
    const isGoogle = view.flow === "google";
    return (<main className="auth-status-page">
      <section className="auth-status-card" aria-live="polite">
        {view.status === "error" ? (<>
            <h1 className="auth-status-title">{isGoogle ? "Google sign-in unsuccessful" : "Verification unsuccessful"}</h1>
            <p className="auth-status-description">{view.message}</p>
            <Link to="/login" className="auth-status-login-link">Return to Sign In</Link>
            {isGoogle && <Link to="/signup" className="auth-status-login-link">Create an account</Link>}
          </>) : (<>
            <h1 className="auth-status-title">{isGoogle ? "Signing you in" : "Verifying your email"}</h1>
            <p className="auth-status-description">
              {isGoogle ? "Please wait while AptFindr finishes signing you in with Google." : "Please wait while AptFindr confirms your email address."}
            </p>
          </>)}
      </section>
    </main>);
}
