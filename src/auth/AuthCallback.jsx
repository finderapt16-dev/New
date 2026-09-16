import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { exchangeAuthCode, getAuthUser, getCurrentAuthenticatedUser, signOutAuthSession } from "@/services/authService";
export function AuthCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        void (async () => {
            const params = new URLSearchParams(window.location.search);
            const callbackError = params.get("error_description") || params.get("error");
            if (callbackError) {
                console.error("Email verification callback was rejected:", callbackError);
                if (active)
                    setError("This verification link is invalid or has expired. Request a new verification email and try again.");
                return;
            }
            const code = params.get("code");
            if (code) {
                const { error: exchangeError } = await exchangeAuthCode(code);
                if (exchangeError) {
                    console.error("Email verification callback failed:", exchangeError);
                    if (active)
                        setError("This verification link is invalid or has expired. Request a new verification email and try again.");
                    return;
                }
            }
            const { data, error: userError } = await getAuthUser();
            if (userError || !data.user?.email_confirmed_at) {
                if (userError)
                    console.error("Unable to confirm verified user:", userError);
                if (active)
                    setError("Email verification could not be confirmed. Request a new verification email and try again.");
                return;
            }
            try {
                const profile = await getCurrentAuthenticatedUser();
                if (!profile)
                    throw new Error("The verified account profile is not available.");
                await signOutAuthSession();
                if (active)
                    navigate("/login", { replace: true, state: { message: "Email verified successfully. You can now sign in." } });
            }
            catch (profileError) {
                console.error("Email was verified but profile recovery failed:", profileError);
                await signOutAuthSession();
                if (active)
                    navigate("/login", { replace: true, state: { message: "Email verified. Sign in to finish loading your profile." } });
            }
        })();
        return () => { active = false; };
    }, [navigate]);
    return (<main className="auth-status-page">
      <section className="auth-status-card">
        {error ? (<>
            <h1 className="auth-status-title">Verification unsuccessful</h1>
            <p className="auth-status-description">{error}</p>
            <Link to="/login" className="auth-status-login-link">Return to Sign In</Link>
          </>) : (<>
            <h1 className="auth-status-title">Verifying your email</h1>
            <p className="auth-status-description">Please wait while RentIloilo confirms your email address.</p>
          </>)}
      </section>
    </main>);
}
