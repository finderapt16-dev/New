import { useEffect, useRef, useState } from "react";
import { signInWithGoogle } from "@/services/authService";

/** Google's multicolour "G" mark (Sign in with Google branding). */
export function GoogleLogo({ className }) {
    return (<svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>);
}

/**
 * "Continue with Google" for the sign-in and sign-up views. Supabase Auth
 * takes the browser to Google; /auth/callback finishes the sign-in (and asks
 * first-time users to choose Tenant or Landlord).
 */
export function GoogleAuthButton({ intent = "signin", role = null, redirectTo = null, onError, disabled = false }) {
    const [loading, setLoading] = useState(false);
    const inFlightRef = useRef(false);
    useEffect(() => {
        // Coming back with the browser's Back button can restore this page from
        // the back/forward cache while it still says "Connecting to Google…".
        const resetAfterBack = (event) => {
            if (!event.persisted)
                return;
            inFlightRef.current = false;
            setLoading(false);
        };
        window.addEventListener("pageshow", resetAfterBack);
        return () => window.removeEventListener("pageshow", resetAfterBack);
    }, []);
    const handleClick = async () => {
        if (inFlightRef.current)
            return;
        inFlightRef.current = true;
        setLoading(true);
        onError?.("");
        try {
            // On success the browser is already leaving for Google, so the
            // button stays busy until the page unloads.
            await signInWithGoogle({ intent, role, redirectTo });
        }
        catch (error) {
            inFlightRef.current = false;
            setLoading(false);
            onError?.(error instanceof Error && error.message ? error.message : "Google sign-in could not be started. Please try again.");
        }
    };
    return (<button type="button" className="auth-google-button" onClick={() => void handleClick()} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? <span className="auth-google-spinner" aria-hidden="true"/> : <GoogleLogo className="auth-google-logo"/>}
      <span>{loading ? "Connecting to Google…" : "Continue with Google"}</span>
    </button>);
}

/** An "or" divider and Google button shown below the primary form action. */
export function GoogleAuthOption({ dividerLabel, ...buttonProps }) {
    return (<div className="auth-google-option">
      <p className="auth-divider">{dividerLabel}</p>
      <GoogleAuthButton {...buttonProps}/>
    </div>);
}
