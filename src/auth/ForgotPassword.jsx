import { AuthField } from "./AuthField";
import "./forgot_password.css";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requestPasswordResetEmail } from "@/services/authService";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Mail, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
/**
 * Floating password-recovery form. Always rendered inside AuthDialog -
 * "Back to Sign In" switches views in the same dialog.
 */
export function ForgotPassword({ onSwitchToLogin, }) {
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

      <div className="forgot-password-content">

        <div className="forgot-password-form-container">
          <div className="auth-form-shell forgot-password-form-shell">

            <div className="forgot-password-form-heading">
              <h1 className="forgot-password-title">
                {sent ? "Check your email" : "Reset your password"}
              </h1>
              <p className="forgot-password-description">
                Remember your password?{" "}
                <button type="button" onClick={() => onSwitchToLogin?.()} className="forgot-password-login-prompt-link auth-dialog-link">
                    Sign in here
                  </button>
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

                    <button type="button" onClick={() => onSwitchToLogin?.()} className="forgot-password-home-link auth-dialog-link">
                      <ArrowLeft className="forgot-password-icon-small"/>
                      Back to Sign In
                    </button>
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

                  <Button type="button" onClick={() => onSwitchToLogin?.()} className="forgot-password-resend-button">
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
                  </div>
                </div>)}
            </>
          </div>
        </div>
      </div>
    </div>);
}
