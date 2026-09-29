import { AuthField } from "./AuthField";
import { GoogleAuthOption, Signup } from "./Signup";
import { ForgotPassword } from "./ForgotPassword";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isTenantRole, resendSignupVerification } from "@/services/authService";
import { AlertCircle, CheckCircle2, Eye, EyeOff, House, } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./signin.css";

/**
 * Floating sign-in form. Always rendered inside AuthDialog — "Create account"
 * and "Forgot password?" switch views in the same dialog, and the optional
 * redirectTo sends the user back to the page they came from after sign-in.
 */
export function Login({ initialMessage = null, redirectTo: redirectToProp = null, onSwitchToSignup, onSwitchToForgot, showBackToHome = false, }) {
    const navigate = useNavigate();
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
    const [verificationHelpOpen, setVerificationHelpOpen] = useState(false);
    const [helpEmail, setHelpEmail] = useState("");
    const requestedRedirect = redirectToProp;
    const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : "/dashboard";
    useEffect(() => {
        if (!initialMessage?.message)
            return;
        setSuccessMessage(initialMessage.message);
        if (typeof initialMessage.verificationEmail === "string") {
            setVerificationEmail(initialMessage.verificationEmail);
            setHelpEmail(initialMessage.verificationEmail);
        }
        // Signup opens this panel when it could not confirm that Supabase
        // actually sent the confirmation email.
        if (initialMessage.verificationHelp === true)
            setVerificationHelpOpen(true);
    }, [initialMessage]);
    useEffect(() => {
        if (resendCooldown <= 0)
            return;
        const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [resendCooldown]);
    const requestVerificationEmail = async (targetEmail) => {
        const email = (targetEmail ?? "").trim();
        if (!email || resending || resendCooldown > 0)
            return;
        setResending(true);
        setError("");
        try {
            await resendSignupVerification(email);
            setVerificationEmail(email);
            setHelpEmail(email);
            setVerificationHelpOpen(false);
            setSuccessMessage(`Verification email requested for ${email}. Check your inbox and spam folder.`);
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
    const resendVerification = () => requestVerificationEmail(verificationEmail);
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
                // Unverified accounts are stuck until the confirmation email
                // arrives, so surface the resend form immediately.
                if (/verify your account/i.test(message))
                    setVerificationHelpOpen(true);
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
      <div className="login-content">
        <div className="login-form-container">
          <div className="auth-form-shell login-form-shell">

            <div className="login-form-heading">
              <h1 className="login-title">Sign in</h1>
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

            {/* Verification recovery is shown only when the account is
                actually stuck: an unverified sign-in, or a signup that
                could not confirm delivery. The old always-visible toggle
                was noise on an otherwise clean login page. */}
            {verificationHelpOpen && (<div className="login-verification-panel">
                  <p className="login-verification-text">
                    Enter the email address you registered with and we will ask
                    Supabase to send a fresh confirmation link. Confirmation mail
                    is delivered by Supabase, so also check your spam folder.
                  </p>
                  <div className="login-verification-row">
                    <input id="verification-email" type="email" autoComplete="email" placeholder="you@example.com" aria-label="Verification email address" value={helpEmail} onChange={(event) => setHelpEmail(event.target.value)} className="login-verification-input"/>
                    <button type="button" className="login-verification-send" disabled={resending || resendCooldown > 0} onClick={() => void requestVerificationEmail(helpEmail || verificationEmail)}>
                      {resending ? "Sending..." : resendCooldown > 0 ? `Wait ${resendCooldown}s` : "Send link"}
                    </button>
                  </div>
                  <button type="button" className="login-verification-dismiss" onClick={() => setVerificationHelpOpen(false)}>
                    Dismiss
                  </button>
                </div>)}

            <form onSubmit={handleSubmit} className="login-form">

              <div>
                <div className="login-form-fields">
                  <AuthField id="username" label="Username" value={username} onChange={setUsername} required autoFocus/>

                  <div className="login-password-field">
                    <AuthField id="password" label="Password" type={showPass ? "text" : "password"} value={password} onChange={setPassword} required suffix={<button type="button" onClick={() => setShowPass(!showPass)} className="auth-password-toggle login-password-toggle" aria-label={showPass ? "Hide password" : "Show password"}>
                          {showPass ? <EyeOff className="login-icon-small"/> : <Eye className="login-icon-small"/>}
                        </button>}/>
                    <div className="login-recovery-link-row">
                      <button type="button" onClick={onSwitchToForgot} className="login-recovery-link auth-dialog-link">
                        Forgot password?
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="login-submit-button">
                {loading ? (<>
                    <div className="login-spinner"/>
                    Signing in...
                  </>) : (<>
                    Sign in
                  </>)}
              </Button>

              <GoogleAuthOption intent="signin" redirectTo={requestedRedirect} onError={setError} disabled={loading} dividerLabel="or"/>

              <p className="login-signup-prompt">Already have an account? <button type="button" onClick={onSwitchToSignup} className="login-create-link auth-dialog-link">Create Account</button></p>

              {showBackToHome && (<Link to="/" className="login-home-link">
                  <House className="login-home-icon" aria-hidden="true"/>
                  Back to Home
                </Link>)}
            </form>
          </div>
        </div>
      </div>
    </div>);
}

/* ═══ Floating auth panel: sign-in / sign-up / forgot-password switch views
   inside one dialog (merged from AuthDialog.jsx) ═══ */
const VIEW_META = {
  login: {
    title: "Sign in to AptFindr",
    description: "Sign in to browse apartments or manage your property listings.",
  },
  signup: {
    title: "Create your AptFindr account",
    description: "Choose Tenant or Landlord to see the matching registration form.",
  },
  forgot: {
    title: "Reset your AptFindr password",
    description: "Enter your account email to request password reset instructions.",
  },
};

/**
 * The one and only auth UI: a floating panel where sign-in, sign-up and
 * forgot-password switch views in the same dialog. Used by the landing page
 * and by the /login, /signup and /forgot-password routes.
 */
export function AuthDialog({
  trigger,
  defaultView = "login",
  open: controlledOpen,
  onOpenChange,
  initialLoginMessage = null,
  redirectTo = null,
  showBackToHome = false,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [view, setView] = useState(defaultView);
  // Message shown by the sign-in view (protected-page notice or the result
  // handed over by the signup view).
  const [loginMessage, setLoginMessage] = useState(initialLoginMessage);

  const handleOpenChange = (next) => {
    if (next) {
      setView(defaultView);
      setLoginMessage(initialLoginMessage);
    }
    setOpen(next);
  };

  const switchToLogin = (state) => {
    setLoginMessage(state ?? null);
    setView("login");
  };

  const meta = VIEW_META[view] ?? VIEW_META.login;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={`auth-dialog-content auth-dialog-content--${view}`}>
        <DialogTitle className="auth-dialog-accessible-title">{meta.title}</DialogTitle>
        <DialogDescription className="auth-dialog-accessible-description">{meta.description}</DialogDescription>
        {view === "login" && (
          <Login
            initialMessage={loginMessage}
            redirectTo={redirectTo}
            onSwitchToSignup={() => setView("signup")}
            onSwitchToForgot={() => setView("forgot")}
          />
        )}
        {view === "signup" && (
          <Signup
            redirectTo={redirectTo}
            onSwitchToLogin={switchToLogin}
            onSwitchToForgot={() => setView("forgot")}
          />
        )}
        {view === "forgot" && (
          <ForgotPassword onSwitchToLogin={() => switchToLogin()} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══ Standalone /login, /signup and /forgot-password route page
   (merged from AuthPage.jsx) ═══ */
/**
 * The /login, /signup and /forgot-password routes render the same floating
 * auth panel (used for direct links, bookmarks and protected-page redirects).
 * Closing the panel returns to the landing page.
 */
export function AuthPage({ view = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get("redirect");
  const state = location.state;
  const initialLoginMessage = state?.message
    ? {
        message: state.message,
        verificationEmail:
          typeof state.verificationEmail === "string" ? state.verificationEmail : undefined,
        verificationHelp: state.verificationHelp === true,
      }
    : null;

  return (
    <div className="auth-page-backdrop">
      <AuthDialog
        defaultView={view}
        open
        showBackToHome
        onOpenChange={(next) => {
          if (!next) navigate("/", { replace: true });
        }}
        initialLoginMessage={initialLoginMessage}
        redirectTo={redirect}
      />
    </div>
  );
}

/* ═══ Thin default-view wrappers around AuthDialog
   (merged from LoginDialog.jsx, SignupDialog.jsx and ForgotPasswordDialog.jsx) ═══ */
/**
 * Floating sign-in panel used by the public landing page.
 * "Create account" and "Forgot password?" switch views inside this same
 * floating dialog instead of navigating to the old full-page routes.
 */
export function LoginDialog(props) {
  return <AuthDialog defaultView="login" {...props} />;
}

/**
 * Floating registration panel; the signup screen reveals the selected
 * role's form. "Sign in here" switches back to the floating sign-in view.
 */
export function SignupDialog(props) {
  return <AuthDialog defaultView="signup" {...props} />;
}

/** Floating password-recovery panel; "Back to Sign In" returns to the sign-in view. */
export function ForgotPasswordDialog(props) {
  return <AuthDialog defaultView="forgot" {...props} />;
}
