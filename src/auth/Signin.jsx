import { AuthField } from "./AuthField";
import { AppLogo } from "@/components/AppLogo";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isTenantRole, resendSignupVerification } from "@/services/authService";
import { AlertCircle, BadgeCheck, CheckCircle2, Eye, EyeOff, Home, Key, UserRound, MapPin, ShieldCheck, } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./signin.css";
export function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState("");
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const requestedRedirect = new URLSearchParams(location.search).get("redirect");
    const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : "/dashboard";
    const signupPath = requestedRedirect
        ? `/signup?redirect=${encodeURIComponent(redirectTo)}`
        : "/signup";
    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            if (typeof location.state.verificationEmail === "string")
                setVerificationEmail(location.state.verificationEmail);
            window.history.replaceState({}, document.title);
        }
    }, [location]);
    useEffect(() => {
        if (resendCooldown <= 0)
            return;
        const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [resendCooldown]);
    const resendVerification = async () => {
        if (!verificationEmail || resending || resendCooldown > 0)
            return;
        setResending(true);
        setError("");
        try {
            await resendSignupVerification(verificationEmail);
            setSuccessMessage("Verification email requested. Check your inbox and spam folder.");
            setResendCooldown(60);
        }
        catch (resendError) {
            console.error("Unable to resend verification email:", resendError);
            setError(resendError instanceof Error ? resendError.message : "Unable to resend the verification email. Please try again later.");
        }
        finally {
            setResending(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const result = await login({ username, password });
            if (result.success) {
                const hasRequestedRedirect = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//");
                navigate(hasRequestedRedirect ? redirectTo : result.user?.role === "admin" ? "/admin" : isTenantRole(result.user?.role) ? "/browse" : "/dashboard", { replace: true });
            }
            else {
                const message = result.error || "Invalid username or password.";
                setError(message);
            }
        }
        catch {
            setError("Unable to sign in. Check your connection and try again.");
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="auth-palette login-page">

      <div className="auth-visual-panel login-visual-panel">
        <div className="login-background">
          <ImageWithFallback src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=960" alt="Modern apartment in La Paz" className="auth-background-image login-background-image"/>
          <div className="auth-background-overlay login-background-overlay"/>
        </div>

        <div className="login-visual-content">
          <Link to="/" className="login-brand">
            <AppLogo className="login-brand-logo"/>
            <div>
              <span className="login-brand-name">AptFindr</span>
              <p className="login-brand-location">La Paz, Iloilo City</p>
            </div>
          </Link>

          <div className="login-introduction">
            <div>
              <h2 className="login-visual-title">
                Continue to<br />
                <span className="login-visual-accent">
                  AptFindr
                </span>
              </h2>
              <p className="login-visual-description">
                Sign in to browse apartments or manage your property listings.
              </p>
            </div>
          </div>

          <div className="auth-benefits login-benefits">
            {[
            { icon: BadgeCheck, text: "Review landlord verification status" },
            { icon: ShieldCheck, text: "Check available rooms and listing details" },
            { icon: MapPin, text: "Compare apartment locations on the map" },
        ].map(({ icon: Icon, text }) => (<div key={text} className="login-benefit">
                <div className="login-benefit-symbol">
                  <Icon className="login-benefit-icon"/>
                </div>
                <span className="login-benefit-text">{text}</span>
              </div>))}
          </div>

        </div>
      </div>

      <div className="login-content">

        <div className="login-mobile-header">
          <Link to="/" className="login-mobile-brand">
            <AppLogo className="login-mobile-logo"/>
            <span className="login-mobile-brand-name">AptFindr</span>
          </Link>
          <Link to={signupPath} className="login-signup-link">
            Create account
          </Link>
        </div>

        <div className="login-form-container">
          <div className="auth-form-shell login-form-shell">

            <div className="login-form-heading">
              <h1 className="login-title">Sign in to AptFindr</h1>
            </div>

            <>
              {successMessage && (<div className="login-message">
                  <Alert className="login-success-alert">
                    <CheckCircle2 className="login-success-icon"/>
                    <AlertDescription className="login-success-text">{successMessage}</AlertDescription>
                  </Alert>
                  {verificationEmail && <button type="button" disabled={resending || resendCooldown > 0} onClick={() => void resendVerification()} className="login-resend-link">{resending ? "Sending..." : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend Verification Email"}</button>}
                </div>)}
            </>

            <>
              {error && (<div className="login-message">
                  <Alert variant="destructive" className="login-error-alert">
                    <AlertCircle className="login-error-icon"/>
                    <AlertDescription className="login-error-text">{error}</AlertDescription>
                  </Alert>
                </div>)}
            </>

            <form onSubmit={handleSubmit} className="login-form">

              <div>
                <div className="login-form-fields">
                  <AuthField id="username" label="Username" value={username} onChange={setUsername} required icon={<UserRound className="login-icon-small"/>}/>

                  <div className="login-password-field">
                    <AuthField id="password" label="Password" type={showPass ? "text" : "password"} value={password} onChange={setPassword} required icon={<Key className="login-icon-small"/>} suffix={<button type="button" onClick={() => setShowPass(!showPass)} className="auth-password-toggle login-password-toggle" aria-label={showPass ? "Hide password" : "Show password"}>
                          {showPass ? <EyeOff className="login-icon-small"/> : <Eye className="login-icon-small"/>}
                        </button>}/>
                    <div className="login-recovery-link-row">
                      <Link to="/forgot-password" className="login-recovery-link">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="login-submit-button">
                {loading ? (<>
                    <div className="login-spinner"/>
                    Signing in...
                  </>) : (<>
                    Sign In
                  </>)}
              </Button>

              <p className="login-signup-prompt">Don't have an account? <Link to={signupPath} className="login-create-link">Create account</Link></p>

              <Link to="/" className="login-home-link">
                <Home className="login-icon-small"/>
                Back to Home
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>);
}
