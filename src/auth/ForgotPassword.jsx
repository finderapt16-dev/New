import { AuthField } from "./AuthField";
import "./forgot_password.css";
import { AppLogo } from "@/components/AppLogo";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requestPasswordResetEmail } from "@/services/authService";
import { AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Home, Lock, Mail, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
export function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const normalizedEmail = email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
            setError("Enter a valid email address.");
            setLoading(false);
            return;
        }
        const { error: resetError } = await requestPasswordResetEmail(normalizedEmail);
        setLoading(false);
        if (resetError) {
            console.error("Password recovery request failed:", resetError);
            if (resetError.status === 429 || /rate|too many|seconds/i.test(resetError.message)) {
                setError("Too many email requests. Please wait before trying again.");
                return;
            }
        }
        setSent(true);
        toast.success("If an account exists for this email, password reset instructions have been sent.");
    };
    return (<div className="auth-palette forgot-password-page">

      <div className="auth-visual-panel forgot-password-visual-panel">
        <div className="forgot-password-background">
          <ImageWithFallback src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=960" alt="Modern apartment in La Paz" className="auth-background-image forgot-password-background-image"/>
          <div className="auth-background-overlay forgot-password-background-overlay"/>
        </div>

        <div className="forgot-password-visual-content">
          <Link to="/" className="forgot-password-brand">
            <AppLogo className="forgot-password-brand-logo"/>
            <div>
              <span className="forgot-password-brand-name">AptFindr</span>
              <p className="forgot-password-brand-location">La Paz, Iloilo City</p>
            </div>
          </Link>

          <div className="forgot-password-introduction">
            <div>
              <h2 className="forgot-password-visual-title">
                Reset your<br />
                <span className="forgot-password-visual-accent">
                  account password
                </span>
              </h2>
              <p className="forgot-password-visual-description">
                Enter your account email to request password reset instructions.
              </p>
            </div>
          </div>

          <div className="auth-benefits forgot-password-benefits">
            {[
            { icon: ShieldCheck, text: "Request instructions using your account email" },
            { icon: Lock, text: "Open the link provided in the email" },
            { icon: BadgeCheck, text: "Choose a new account password" },
        ].map(({ icon: Icon, text }) => (<div key={text} className="forgot-password-benefit">
                <div className="forgot-password-benefit-symbol">
                  <Icon className="forgot-password-benefit-icon"/>
                </div>
                <span className="forgot-password-benefit-text">{text}</span>
              </div>))}
          </div>

        </div>
      </div>

      <div className="forgot-password-content">

        <div className="forgot-password-mobile-header">
          <Link to="/" className="forgot-password-mobile-brand">
            <AppLogo className="forgot-password-mobile-logo"/>
            <span className="forgot-password-mobile-brand-name">AptFindr</span>
          </Link>
          <Link to="/login" className="forgot-password-login-link">
            Sign in
          </Link>
        </div>

        <div className="forgot-password-form-container">
          <div className="auth-form-shell forgot-password-form-shell">

            <div className="forgot-password-form-heading">
              <h1 className="forgot-password-title">
                {sent ? "Check your email" : "Reset your password"}
              </h1>
              <p className="forgot-password-description">
                Remember your password?{" "}
                <Link to="/login" className="forgot-password-login-prompt-link">
                  Sign in here
                </Link>
              </p>
            </div>

            <>
              {error && (<div className="forgot-password-message">
                  <Alert variant="destructive" className="forgot-password-error-alert">
                    <AlertCircle className="forgot-password-error-icon"/>
                    <AlertDescription className="forgot-password-error-text">{error}</AlertDescription>
                  </Alert>
                </div>)}
            </>

            <>

              {!sent && (<div key="form">
                  <form onSubmit={handleEmailSubmit} className="forgot-password-form">

                    <div className="forgot-password-email-card">
                      <div className="forgot-password-email-fields">
                        <AuthField id="email" label="Registered Email Address" type="email" value={email} onChange={setEmail} required icon={<Mail className="forgot-password-icon-small"/>}/>
                        <p className="forgot-password-email-hint">
                          Enter the email address linked to your AptFindr account.
                        </p>
                      </div>

                      <div className="forgot-password-security-note">
                        <ShieldCheck className="forgot-password-security-icon"/>
                        <p className="forgot-password-security-text">
                          For your security, use the most recent recovery email and follow its instructions promptly.
                        </p>
                      </div>
                    </div>

                    <Button type="submit" disabled={loading} className="forgot-password-submit-button">
                      {loading ? (<>
                          <div className="forgot-password-spinner"/>
                          Sending reset link...
                        </>) : (<>
                          Send Reset Link
                        </>)}
                    </Button>

                    <Link to="/login" className="forgot-password-home-link">
                      <ArrowLeft className="forgot-password-icon-small"/>
                      Back to Sign In
                    </Link>
                  </form>
                </div>)}

              {sent && (<div key="success" className="forgot-password-success-panel">
                  <div className="forgot-password-success-card">

                    <div className="forgot-password-success-heading">
                      <div className="forgot-password-success-symbol">
                        <CheckCircle2 className="forgot-password-success-icon"/>
                      </div>
                      <div>
                        <p className="forgot-password-success-title">Check your email</p>
                        <p className="forgot-password-success-description">
                          Password reset instructions were requested for
                        </p>
                        <p className="forgot-password-success-email">If an account exists for this email, password reset instructions have been sent.</p>
                      </div>
                    </div>

                    <div className="forgot-password-instructions">
                      {[
                { step: "1", text: "Open your email inbox" },
                { step: "2", text: "Open the password reset link" },
                { step: "3", text: "Choose a new password" },
            ].map(({ step, text }) => (<div key={step} className="forgot-password-instruction">
                          <div className="forgot-password-step-number">
                            <span className="forgot-password-step-label">{step}</span>
                          </div>
                          <span className="forgot-password-step-text">{text}</span>
                        </div>))}
                    </div>

                    <div className="forgot-password-security-note">
                      <Mail className="forgot-password-security-icon"/>
                      <p className="forgot-password-security-text">
                        Can't find it? Check your spam or junk folder, or request another email.
                      </p>
                    </div>
                  </div>

                  <Button type="button" onClick={() => navigate("/login")} className="forgot-password-resend-button">
                    <Sparkles className="forgot-password-button-icon"/>
                    Back to Sign In
                    <ArrowRight className="forgot-password-icon-small"/>
                  </Button>

                  <div className="forgot-password-delivery-status">
                    {["Account Email", "Reset Link", "New Password"].map((b) => (<div key={b} className="forgot-password-status-label">
                        <div className="forgot-password-status-dot"/>
                        {b}
                      </div>))}
                  </div>

                  <div className="forgot-password-divider">
                    <div className="forgot-password-divider-line"/>
                    <span className="forgot-password-divider-label">or</span>
                    <div className="forgot-password-divider-line"/>
                  </div>

                  <div className="forgot-password-navigation">
                    <button type="button" onClick={() => { setSent(false); setEmail(""); }} className="forgot-password-navigation-link">
                      <RefreshCw className="forgot-password-icon-small"/>
                      Try again
                    </button>
                    <Link to="/" className="forgot-password-navigation-link">
                      <Home className="forgot-password-icon-small"/>
                      Back to Home
                    </Link>
                  </div>
                </div>)}
            </>
          </div>
        </div>
      </div>
    </div>);
}
