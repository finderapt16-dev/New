import { AuthField } from "./AuthField";
import { GoogleAuthOption } from "./GoogleAuthButton";
import { SignupEditDetailsDialog } from "./SignupEditDetailsDialog";
import { TermsPrivacyDialog } from "./TermsPrivacyDialog";
import "./signup.css";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Building2, ChevronLeft, ChevronRight, Eye, EyeOff, House, Pencil, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_REQUIREMENTS = "At least 8 characters, an uppercase and lowercase letter, a number, and a special character (e.g. !@#$%).";

export function Signup({
  onSwitchToLogin,
  onSwitchToForgot,
  redirectTo = null,
  showBackToHome = false,
}) {
  const { signup } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupStep, setSignupStep] = useState("role");
  const submissionInFlightRef = useRef(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [landlordStep, setLandlordStep] = useState(1);
  const [editPanel, setEditPanel] = useState(null);
  const [tenantTermsAccepted, setTenantTermsAccepted] = useState(false);
  const [landlordAgreementAccepted, setLandlordAgreementAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleInitial: "",
    username: "",
    email: "",
    mobileNumber: "",
    businessName: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const set = (key, value) => setFormData((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionInFlightRef.current) return;
    setError("");
    if (!formData.role) {
      setError("Please select a role.");
      return;
    }
    if (formData.role === "tenant" && !tenantTermsAccepted) {
      setError("You must agree to the Terms of Use and Privacy Policy to continue.");
      return;
    }
    if (formData.role === "landlord" && !landlordAgreementAccepted) {
      setError("You must agree to the Terms of Use and Landlord Verification Policy to continue.");
      return;
    }
    if (formData.role === "landlord") {
      if (!formData.firstName || !formData.lastName) {
        setError("Full name is required.");
        return;
      }
      if (!formData.mobileNumber) {
        setError("Mobile number is required.");
        return;
      }
    }
    if (!/^[A-Za-z0-9_]{4,30}$/.test(formData.username.trim()) || formData.username.includes("@")) {
      setError("Username must be 4–30 characters using only letters, numbers, or underscores.");
      return;
    }
    if (!formData.email) {
      setError("Recovery email is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setError("Enter a valid recovery email address.");
      return;
    }
    const passwordIsValid =
      formData.role === "landlord" ? PASSWORD_RULE.test(formData.password) : formData.password.length >= 6;
    if (!passwordIsValid) {
      setError(
        formData.role === "landlord"
          ? `Password must contain: ${PASSWORD_REQUIREMENTS}`
          : "Password must be at least 6 characters."
      );
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submissionInFlightRef.current = true;
    setLoading(true);
    const fullName =
      formData.role === "tenant"
        ? formData.username.trim()
        : `${formData.firstName} ${formData.middleInitial ? formData.middleInitial + ". " : ""}${formData.lastName}`.trim();

    try {
      const result = await signup({
        name: fullName,
        username: formData.username.trim(),
        email: formData.email,
        password: formData.password,
        role: formData.role,
        middleInitial: formData.role === "landlord" ? formData.middleInitial : "",
        mobileNumber: formData.role === "landlord" ? formData.mobileNumber : "",
        businessName: formData.role === "landlord" ? formData.businessName : undefined,
        termsAccepted: formData.role === "tenant" ? tenantTermsAccepted : landlordAgreementAccepted,
        landlordVerificationAccepted: formData.role === "landlord" ? landlordAgreementAccepted : undefined,
      });
      const confirmationState = result.signup?.emailConfirmation?.state;
      if (result.success && result.signup?.existingAccount) {
        onSwitchToLogin?.({
          message: result.signup.requiresEmailVerification
            ? `An account already exists for ${formData.email.trim()}. If it is still unverified, use "Resend verification email" below.`
            : "An account may already exist for this email. Sign in or reset your password instead of registering again.",
          verificationEmail: formData.email.trim(),
          verificationHelp: true,
        });
      } else if (result.success && result.signup?.profileSetupError) {
        onSwitchToLogin?.({
          message: result.signup.profileSetupError,
          verificationEmail: formData.email.trim(),
          verificationHelp: true,
        });
      } else if (result.success && result.signup?.requiresEmailVerification) {
        const emailSent = confirmationState === "sent";
        onSwitchToLogin?.({
          message: emailSent
            ? `Account created. A verification link was sent to ${formData.email.trim()}. Check your inbox and spam folder before signing in.`
            : `Account created, but we could not confirm that the verification email was sent to ${formData.email.trim()}. Check your inbox and spam folder, and use "Resend verification email" below if nothing arrives within a few minutes.`,
          verificationEmail: formData.email.trim(),
          verificationHelp: !emailSent,
        });
      } else if (result.success) {
        onSwitchToLogin?.({
          message:
            confirmationState === "disabled"
              ? "Account created. Email confirmation is turned off for this project, so no verification email was sent and you can sign in right away."
              : "Account created successfully. You can now sign in.",
        });
      } else {
        setError(result.error || "Signup failed");
      }
    } catch (submitError) {
      console.error("[AUTH] Unexpected signup UI failure", submitError);
      setError(
        "We could not confirm that registration completed. Try signing in, resending verification, or resetting your password before registering again."
      );
    } finally {
      submissionInFlightRef.current = false;
      setLoading(false);
    }
  };

  const nextLandlordStep = () => {
    setError("");
    if (landlordStep === 1) {
      if (!/^[A-Za-z0-9_]{4,30}$/.test(formData.username.trim()) || formData.username.includes("@")) {
        setError("Username must be 4–30 characters using only letters, numbers, or underscores.");
        return;
      }
      if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        setError("Enter a valid recovery email address.");
        return;
      }
      if (!PASSWORD_RULE.test(formData.password)) {
        setError(`Password must contain: ${PASSWORD_REQUIREMENTS}`);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    if (landlordStep === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError("Full name is required.");
        return;
      }
      if (!formData.mobileNumber.trim()) {
        setError("Mobile number is required.");
        return;
      }
    }
    setLandlordStep((step) => Math.min(step + 1, 3));
  };

  const previousLandlordStep = () => {
    setError("");
    setLandlordStep((step) => Math.max(step - 1, 1));
  };

  const applyEdit = (patch) => {
    setFormData((previous) => ({ ...previous, ...patch }));
  };

  const handleLandlordKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || landlordStep > 2) return;
    event.preventDefault();
    nextLandlordStep();
  };

  return (
    <div className="auth-palette signup-page">
      <div className="signup-content">
        <div className="signup-form-container">
          <div className="auth-form-shell signup-form-shell">
            <div className="signup-form-heading">
              {signupStep === "form" && (
                <div className="signup-back-row">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setSignupStep("role");
                      setLandlordStep(1);
                    }}
                    className="signup-back-button"
                    aria-label="Back to role selection"
                  >
                    <ChevronLeft className="signup-back-icon" aria-hidden="true" />
                    Back
                  </button>
                </div>
              )}
              <h1 className="signup-title">
                {signupStep === "role" ? "Create Your Account" : formData.role === "landlord" ? "Create landlord account" : "Create Your Account"}
              </h1>
              {signupStep === "role" && <p className="signup-description">Choose your role to continue.</p>}
            </div>

            {error && (
              <div className="signup-message">
                <Alert variant="destructive" className="signup-error-alert">
                  <AlertCircle className="signup-error-icon" />
                  <AlertDescription className="signup-error-text">{error}</AlertDescription>
                </Alert>
                {(error.includes("may already exist") || error.includes("couldn't send the confirmation email")) && (
                  <div className="signup-error-actions">
                    <button type="button" onClick={() => onSwitchToLogin?.()} className="signup-error-link auth-dialog-link">
                      Sign in
                    </button>
                    <button type="button" onClick={() => onSwitchToForgot?.()} className="signup-error-link auth-dialog-link">
                      Forgot password
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSwitchToLogin?.({
                          message: "Use Resend Verification Email for this account.",
                          verificationEmail: formData.email.trim(),
                          verificationHelp: true,
                        })
                      }
                      className="signup-error-link auth-dialog-link"
                    >
                      Resend verification
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="signup-form">
              {signupStep === "role" && (
                <div className="signup-form-fields">
                  <div className="signup-roles">
                    {[
                      { id: "tenant", label: "Tenant", sub: "Find and explore verified apartments in La Paz.", icon: Users },
                      { id: "landlord", label: "Landlord", sub: "List and manage your apartment properties.", icon: Building2 },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setError("");
                          setFormData((previous) => ({ ...previous, role: item.id }));
                          setSignupStep("form");
                        }}
                        className="signup-role-card"
                      >
                        <span className="signup-role-card-icon">
                          <item.icon className="signup-role-card-glyph" />
                        </span>
                        <span className="signup-role-card-body">
                          <span className="signup-role-card-title">{item.label}</span>
                          <span className="signup-role-card-description">{item.sub}</span>
                        </span>
                        <ChevronRight className="signup-role-card-chevron" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {signupStep === "form" && formData.role === "tenant" && (
                <>
                  <div className="signup-form-fields">
                    <AuthField
                      id="username"
                      label="Username"
                      value={formData.username}
                      onChange={(v) => set("username", v)}
                      required
                      placeholder="Enter your username"
                    />
                    <AuthField
                      id="email"
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(v) => set("email", v)}
                      required
                      placeholder="Enter your email address"
                    />
                    <div className="signup-password-field">
                      <AuthField
                        id="password"
                        label="Password"
                        type={showPass ? "text" : "password"}
                        value={formData.password}
                        onChange={(v) => set("password", v)}
                        required
                        placeholder="Enter your password"
                        suffix={
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="auth-password-toggle signup-password-toggle"
                            aria-label={showPass ? "Hide password" : "Show password"}
                          >
                            {showPass ? <EyeOff className="signup-icon-small" /> : <Eye className="signup-icon-small" />}
                          </button>
                        }
                      />
                    </div>
                    <div className="signup-password-field">
                      <AuthField
                        id="confirm"
                        label="Confirm Password"
                        type={showConfirm ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(v) => set("confirmPassword", v)}
                        required
                        placeholder="Confirm your password"
                        suffix={
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="auth-password-toggle signup-password-toggle"
                            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                          >
                            {showConfirm ? <EyeOff className="signup-icon-small" /> : <Eye className="signup-icon-small" />}
                          </button>
                        }
                      />
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="signup-mismatch-message">
                          <AlertCircle className="signup-validation-icon" />
                          Passwords do not match
                        </p>
                      )}
                    </div>

                    <div className="signup-tenant-password-help">
                      <strong>Password must contain:</strong>
                      <span>At least 6 characters. An uppercase letter, number, and special character are recommended.</span>
                    </div>

                    <label className="signup-agreement">
                      <input
                        type="checkbox"
                        checked={tenantTermsAccepted}
                        onChange={(event) => setTenantTermsAccepted(event.target.checked)}
                        className="signup-checkbox"
                      />
                      <span>
                        <strong>
                          I agree to the{" "}
                          <button type="button" onClick={() => setShowTermsDialog(true)} className="signup-agreement-link">
                            Terms of Service
                          </button>{" "}
                          and{" "}
                          <button type="button" onClick={() => setShowPrivacyDialog(true)} className="signup-agreement-link">
                            Privacy Policy
                          </button>
                          .
                        </strong>
                      </span>
                    </label>
                  </div>

                  <Button type="submit" disabled={loading} className="signup-submit-button">
                    {loading ? (
                      <>
                        <div className="signup-spinner" />
                        Creating your account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <GoogleAuthOption
                    intent="signup"
                    role="tenant"
                    redirectTo={redirectTo}
                    onError={setError}
                    disabled={loading}
                    dividerLabel="or"
                    label="Sign Up with Google"
                  />

                  <p className="signup-login-prompt">
                    Already have an account?{" "}
                    <button type="button" onClick={() => onSwitchToLogin?.()} className="signup-login-prompt-link auth-dialog-link">
                      Sign in
                    </button>
                  </p>

                  {showBackToHome && (
                    <Link to="/" className="signup-home-link">
                      <House className="signup-home-icon" aria-hidden="true" />
                      Back to Home
                    </Link>
                  )}
                </>
              )}

              {signupStep === "form" && formData.role === "landlord" && (
                <div className="signup-landlord-wizard" onKeyDown={handleLandlordKeyDown}>
                  <div className="signup-landlord-stepper">
                    {["Account Details", "Personal Information", "Review"].map((label, index) => {
                      const stepNumber = index + 1;
                      const active = landlordStep === stepNumber;
                      const complete = landlordStep > stepNumber;
                      return (
                        <div className="signup-landlord-step-item" key={label}>
                          <div
                            className={`signup-landlord-step-circle ${
                              active
                                ? "signup-landlord-step-circle-active"
                                : complete
                                ? "signup-landlord-step-circle-complete"
                                : ""
                            }`}
                          >
                            {stepNumber}
                          </div>
                          <span className={`signup-landlord-step-text ${active ? "signup-landlord-step-text-active" : ""}`}>{label}</span>
                          {stepNumber < 3 && (
                            <div className={`signup-landlord-step-connector ${complete ? "signup-landlord-step-connector-complete" : ""}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {landlordStep === 1 && (
                    <div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Account Details</h2>

                      <div className="signup-form-fields">
                        <AuthField
                          id="username"
                          label="Username"
                          value={formData.username}
                          onChange={(v) => set("username", v)}
                          required
                          placeholder="Enter your username"
                          autoComplete="username"
                        />
                        <AuthField
                          id="email"
                          label="Email Address"
                          type="email"
                          value={formData.email}
                          onChange={(v) => set("email", v)}
                          required
                          placeholder="Enter your email address"
                          autoComplete="email"
                        />
                        <div className="signup-password-field">
                          <AuthField
                            id="password"
                            label="Password"
                            type={showPass ? "text" : "password"}
                            value={formData.password}
                            onChange={(v) => set("password", v)}
                            required
                            placeholder="Enter your password"
                            autoComplete="new-password"
                            suffix={
                              <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="auth-password-toggle signup-password-toggle"
                                aria-label={showPass ? "Hide password" : "Show password"}
                              >
                                {showPass ? <EyeOff className="signup-icon-small" /> : <Eye className="signup-icon-small" />}
                              </button>
                            }
                          />
                        </div>
                        <div className="signup-password-field">
                          <AuthField
                            id="confirm"
                            label="Confirm Password"
                            type={showConfirm ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(v) => set("confirmPassword", v)}
                            required
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            suffix={
                              <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="auth-password-toggle signup-password-toggle"
                                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                              >
                                {showConfirm ? <EyeOff className="signup-icon-small" /> : <Eye className="signup-icon-small" />}
                              </button>
                            }
                          />
                          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="signup-mismatch-message">
                              <AlertCircle className="signup-validation-icon" />
                              Passwords do not match
                            </p>
                          )}
                        </div>

                        <p className="signup-account-hint">Username: 4–30 letters, numbers, or underscores with no spaces.</p>

                        <div className="signup-password-help">
                          <strong>Password must contain:</strong>
                          <span>{PASSWORD_REQUIREMENTS}</span>
                        </div>
                      </div>

                      <Button type="button" onClick={nextLandlordStep} className="signup-submit-button">
                        Continue
                        <ChevronRight className="signup-next-icon" />
                      </Button>
                    </div>
                  )}

                  {landlordStep === 2 && (
                    <div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Personal Information</h2>

                      <div className="signup-form-fields">
                        <AuthField
                          id="firstName"
                          label="First Name"
                          value={formData.firstName}
                          onChange={(v) => set("firstName", v)}
                          required
                          placeholder="Enter your first name"
                          autoComplete="given-name"
                        />
                        <AuthField
                          id="lastName"
                          label="Last Name"
                          value={formData.lastName}
                          onChange={(v) => set("lastName", v)}
                          required
                          placeholder="Enter your last name"
                          autoComplete="family-name"
                        />
                        <AuthField
                          id="middleInitial"
                          label="Middle Initial (Optional)"
                          value={formData.middleInitial}
                          onChange={(v) => set("middleInitial", v)}
                          placeholder="e.g. R"
                          maxLength={1}
                        />
                        <AuthField
                          id="mobile"
                          label="Mobile Number"
                          type="tel"
                          value={formData.mobileNumber}
                          onChange={(v) => set("mobileNumber", v)}
                          required
                          placeholder="Enter your mobile number"
                          inputMode="tel"
                        />
                        <AuthField
                          id="businessName"
                          label="Business Name"
                          value={formData.businessName}
                          onChange={(v) => set("businessName", v)}
                          placeholder="e.g. Santos Apartments"
                        />
                        <p className="signup-account-hint">Optional. Shown on your listings; leave blank to use your personal name.</p>
                      </div>

                      <div className="signup-landlord-actions">
                        <button type="button" onClick={previousLandlordStep} className="signup-landlord-back">
                          <ChevronLeft className="signup-next-icon" />
                          Back
                        </button>
                        <button type="button" onClick={nextLandlordStep} className="signup-landlord-continue">
                          Continue
                          <ChevronRight className="signup-next-icon" />
                        </button>
                      </div>
                    </div>
                  )}

                  {landlordStep === 3 && (
                    <div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Review</h2>

                      <div className="signup-form-fields">
                        <div className="signup-landlord-review-card">
                          <div className="signup-landlord-review-heading">
                            <strong>Account Details</strong>
                            <button type="button" onClick={() => setEditPanel("account")}>
                              <Pencil className="signup-review-edit-icon" />
                              Edit
                            </button>
                          </div>
                          <div className="signup-landlord-review-row">
                            <span>Username</span>
                            <b>{formData.username}</b>
                          </div>
                          <div className="signup-landlord-review-row">
                            <span>Recovery Email</span>
                            <b>{formData.email}</b>
                          </div>
                        </div>

                        <div className="signup-landlord-review-card">
                          <div className="signup-landlord-review-heading">
                            <strong>Personal Information</strong>
                            <button type="button" onClick={() => setEditPanel("personal")}>
                              <Pencil className="signup-review-edit-icon" />
                              Edit
                            </button>
                          </div>
                          <div className="signup-landlord-review-row">
                            <span>Name</span>
                            <b>{`${formData.firstName} ${formData.middleInitial ? `${formData.middleInitial}. ` : ""}${formData.lastName}`.trim()}</b>
                          </div>
                          <div className="signup-landlord-review-row">
                            <span>Mobile Number</span>
                            <b>{formData.mobileNumber}</b>
                          </div>
                          <div className="signup-landlord-review-row">
                            <span>Business Name</span>
                            <b>{formData.businessName.trim() || "Not provided"}</b>
                          </div>
                        </div>

                        <label className="signup-agreement">
                          <input
                            type="checkbox"
                            checked={landlordAgreementAccepted}
                            onChange={(event) => setLandlordAgreementAccepted(event.target.checked)}
                            className="signup-checkbox"
                          />
                          <span>
                            <strong>
                              I agree to the{" "}
                              <button type="button" onClick={() => setShowTermsDialog(true)} className="signup-agreement-link">
                                Terms of Service
                              </button>{" "}
                              and{" "}
                              <button type="button" onClick={() => setShowPrivacyDialog(true)} className="signup-agreement-link">
                                Privacy Policy
                              </button>
                              .
                            </strong>
                          </span>
                        </label>
                      </div>

                      <Button type="submit" disabled={loading} className="signup-submit-button">
                        {loading ? (
                          <>
                            <div className="signup-spinner" />
                            Creating your account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>

                      <p className="signup-login-prompt">
                        Already have an account?{" "}
                        <button type="button" onClick={() => onSwitchToLogin?.()} className="signup-login-prompt-link auth-dialog-link">
                          Sign in
                        </button>
                      </p>
                    </div>
                  )}

                  <SignupEditDetailsDialog
                    open={editPanel !== null}
                    variant={editPanel ?? "account"}
                    formData={formData}
                    onSave={applyEdit}
                    onOpenChange={(next) => {
                      if (!next) setEditPanel(null);
                    }}
                  />
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <TermsPrivacyDialog
        open={showTermsDialog}
        onOpenChange={setShowTermsDialog}
        role={formData.role || "tenant"}
        type="terms"
      />
      <TermsPrivacyDialog
        open={showPrivacyDialog}
        onOpenChange={setShowPrivacyDialog}
        role={formData.role || "tenant"}
        type="privacy"
      />
    </div>
  );
}
