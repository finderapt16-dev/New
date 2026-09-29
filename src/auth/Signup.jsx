import { AuthField } from "./AuthField";
import "./signup.css";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithGoogle } from "@/services/authService";
import { AlertCircle, Building2, Check, ChevronLeft, ChevronRight, Eye, EyeOff, FileBadge, House, MapPin, Pencil, Phone, User, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ═══ Continue with Google (merged from GoogleAuthButton.jsx) ═══ */


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
export function GoogleAuthButton({ intent = "signin", role = null, redirectTo = null, onError, disabled = false, label = "Continue with Google" }) {
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
      <span>{loading ? "Connecting to Google…" : label}</span>
    </button>);
}

/** An "or" divider and Google button shown below the primary form action. */
export function GoogleAuthOption({ dividerLabel, ...buttonProps }) {
    return (<div className="auth-google-option">
      <p className="auth-divider">{dividerLabel}</p>
      <GoogleAuthButton {...buttonProps}/>
    </div>);
}

/* ═══ Terms of Service / Privacy Policy dialog (merged from TermsPrivacyDialog.jsx) ═══ */


const TENANT_TERMS = [
  {
    title: "1. Platform Usage",
    body: "AptFindr is a localized Progressive Web Application designed to help users search for apartments and boarding houses in La Paz, Iloilo City.",
  },
  {
    title: "2. User Accounts",
    body: "Users must provide accurate, complete, and up-to-date information when creating and maintaining their accounts. You are responsible for keeping your account credentials secure.",
  },
  {
    title: "3. Listing Information",
    body: "AptFindr provides apartment information submitted by landlords and reviewed through the platform's verification process. Users should review listing details carefully before making rental decisions.",
  },
  {
    title: "4. Acceptable Conduct",
    body: "You agree to use AptFindr responsibly, treat other users with respect, and communicate professionally with landlords.",
  },
  {
    title: "5. Prohibited Conduct",
    body: "You must not create fake accounts, provide false information, harass other users, engage in fraudulent activities, or misuse the platform. Violations may result in account suspension.",
  },
];

const TENANT_PRIVACY = [
  {
    title: "1. Information We Collect",
    body: "AptFindr may collect personal information such as your name, mobile number, email address, username, and other profile information for account registration and platform use.",
  },
  {
    title: "2. How We Use Information",
    body: "Your information is used to operate AptFindr, manage accounts, provide apartment search and communication features, ensure platform security, and improve our services.",
  },
  {
    title: "3. Information Visibility",
    body: "Certain information, such as your display name and profile, may be visible to landlords when you inquire about a property, in order to facilitate safe and legitimate communication.",
  },
  {
    title: "4. Data Storage and Security",
    body: "AptFindr uses secure database and authentication technologies, such as Supabase, to protect your personal information against unauthorized access, alteration, or loss.",
  },
  {
    title: "5. Data Sharing",
    body: "AptFindr does not sell your personal information. Your information may be processed by authorized service providers (e.g., Supabase) to operate the platform or as required by applicable law.",
  },
];

const LANDLORD_TERMS = [
  {
    title: "1. Platform Usage",
    body: "AptFindr is a localized web app for tenants to search for and list apartments or boarding houses in La Paz, Iloilo City.",
  },
  {
    title: "2. Account Information",
    body: "Users must provide accurate, complete, and up-to-date information when creating and maintaining their accounts. Landlords are responsible for ensuring that property and business information submitted for verification is accurate.",
  },
  {
    title: "3. Property Listings",
    body: "Landlords must provide accurate information regarding property location, rental prices, room availability, amenities, utilities, house rules, and other listing details.",
  },
  {
    title: "4. Verification",
    body: "Landlord accounts and property listings may be subject to administrative verification before being published on AptFindr. Providing false or misleading information may result in account suspension or removal of listings.",
  },
  {
    title: "5. Responsibilities",
    body: "Landlords are responsible for maintaining accurate listing information, responding to tenant inquiries professionally, and complying with applicable rental laws and regulations.",
  },
];

const LANDLORD_PRIVACY = [
  {
    title: "1. Information We Collect",
    body: "AptFindr may collect personal information such as your name, mobile number, username, recovery email, business name, property information, and verification documents when necessary for account registration, verification, and listing management.",
  },
  {
    title: "2. How Information Is Used",
    body: "Your information is used exclusively to operate AptFindr, manage accounts and property listings, perform verification, facilitate safe communication between users, process reports and appeals, and maintain platform security.",
  },
  {
    title: "3. Data Security",
    body: "We use secure database systems, such as Supabase, to protect your personal information against unauthorized access, alteration, or loss.",
  },
  {
    title: "4. Data Sharing",
    body: "AptFindr does not sell your personal information. We may share information only when necessary to operate the platform, comply with applicable legal requirements, protect users, or provide services through authorized third-party service providers (e.g., Supabase).",
  },
];

function getContent(role, type) {
  const isLandlord = role === "landlord";
  if (type === "terms") return isLandlord ? LANDLORD_TERMS : TENANT_TERMS;
  return isLandlord ? LANDLORD_PRIVACY : TENANT_PRIVACY;
}

export function TermsPrivacyDialog({ open, onOpenChange, role = "tenant", type = "terms" }) {
  const content = getContent(role, type);
  const title = type === "terms" ? "Terms of Service" : "Privacy Policy";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="terms-privacy-dialog-content">
        <DialogTitle className="terms-privacy-dialog-title">{title}</DialogTitle>
        <DialogDescription className="terms-privacy-dialog-desc">
          {role === "landlord" ? `Landlord ${title}` : `Tenant ${title}`} for AptFindr account registration.
        </DialogDescription>

        <div className="terms-privacy-dialog-body">
          <div className="terms-privacy-dialog-card">
            {content.map((section) => (
              <div key={section.title} className="terms-privacy-section">
                <h4 className="terms-privacy-section-title">{section.title}</h4>
                <p className="terms-privacy-section-body">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ Landlord review edit dialog (merged from SignupEditDetailsDialog.jsx) ═══ */


/* ─── Shared validation rules (kept in sync with the wizard) ─── */
const USERNAME_RULE = /^[A-Za-z0-9_]{4,30}$/;
const EMAIL_RULE = /^\S+@\S+\.\S+$/;

const COPY = {
    account: {
        title: "Create Your Account",
        description: "Update your account details below.",
        successTitle: "Account Details Updated",
        successText: "Your account details have been updated successfully.",
    },
    personal: {
        title: "Personal Information",
        description: "Update your personal information below.",
        successTitle: "Personal Information Updated",
        successText: "Your personal information has been updated successfully.",
    },
};

const AccountEditFields = ({ draft, set, firstFieldRef }) => (<div className="signup-edit-dialog-fields">
    <AuthField
      id="edit-username"
      label="Username"
      value={draft.username}
      onChange={(v) => set("username", v)}
      required
      placeholder="Enter your username"
      autoComplete="username"
      inputRef={firstFieldRef}
    />
    <AuthField
      id="edit-email"
      label="Recovery Email"
      type="email"
      value={draft.email}
      onChange={(v) => set("email", v)}
      required
      placeholder="Enter your recovery email"
      autoComplete="email"
    />
  </div>);

const PersonalEditFields = ({ draft, set, firstFieldRef }) => (<div className="signup-edit-dialog-fields">
    <div className="signup-edit-dialog-row">
      <AuthField
        id="edit-firstName"
        label="First Name"
        value={draft.firstName}
        onChange={(v) => set("firstName", v)}
        required
        placeholder="Enter your first name"
        autoComplete="given-name"
        inputRef={firstFieldRef}
      />
      <AuthField
        id="edit-lastName"
        label="Last Name"
        value={draft.lastName}
        onChange={(v) => set("lastName", v)}
        required
        placeholder="Enter your last name"
        autoComplete="family-name"
      />
    </div>
    <AuthField
      id="edit-middleInitial"
      label="Middle Initial (Optional)"
      value={draft.middleInitial}
      onChange={(v) => set("middleInitial", v)}
      placeholder="e.g. R"
      maxLength={1}
    />
    <AuthField
      id="edit-mobileNumber"
      label="Mobile Number"
      type="tel"
      value={draft.mobileNumber}
      onChange={(v) => set("mobileNumber", v)}
      required
      placeholder="Enter your mobile number"
      inputMode="tel"
    />
    <AuthField
      id="edit-businessName"
      label="Business Name"
      value={draft.businessName}
      onChange={(v) => set("businessName", v)}
      placeholder="e.g. Santos Apartments"
    />
  </div>);

const EditSuccess = ({ copy, onDone }) => (<div className="signup-edit-success">
    <span className="signup-edit-success-icon" aria-hidden="true">
      <Check/>
    </span>
    <h2 className="signup-edit-success-title">{copy.successTitle}</h2>
    <p className="signup-edit-success-text">{copy.successText}</p>
    <Button type="button" className="signup-edit-success-ok" onClick={onDone}>
      OK
    </Button>
  </div>);

/**
 * Edit popover used by the landlord review screen. The Account Details and
 * Personal Information cards both open this dialog so a landlord can correct
 * a field without walking back through the whole wizard.
 */
export function SignupEditDetailsDialog({ open, onOpenChange, variant = "account", formData, onSave }) {
    const [draft, setDraft] = useState(() => ({ ...formData }));
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const firstFieldRef = useRef(null);
    const wasOpenRef = useRef(false);
    const copy = COPY[variant] ?? COPY.account;
    const isPersonal = variant === "personal";

    // Re-seed the draft from live form state only when the dialog opens, so a
    // cancelled edit never leaks into the next attempt and saving does not wipe
    // the success confirmation the moment the wizard state updates.
    useEffect(() => {
        const justOpened = open && !wasOpenRef.current;
        wasOpenRef.current = open;
        if (!justOpened)
            return;
        setDraft({ ...formData });
        setError("");
        setSaved(false);
    }, [open, formData, variant]);

    // Move focus into the dialog so keyboard users land on the first field.
    useEffect(() => {
        if (!open)
            return;
        const frame = requestAnimationFrame(() => firstFieldRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open, variant]);

    const set = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));

    const handleOpenChange = (next) => {
        if (!next) {
            setError("");
            setSaved(false);
        }
        onOpenChange?.(next);
    };

    const handleSave = (event) => {
        event.preventDefault();
        if (isPersonal) {
            if (!draft.firstName.trim() || !draft.lastName.trim()) {
                setError("Full name is required.");
                firstFieldRef.current?.focus();
                return;
            }
            if (!draft.mobileNumber.trim()) {
                setError("Mobile number is required.");
                return;
            }
        }
        if (!USERNAME_RULE.test(draft.username.trim()) || draft.username.includes("@")) {
            setError("Username must be 4–30 characters using only letters, numbers, or underscores.");
            firstFieldRef.current?.focus();
            return;
        }
        if (!draft.email.trim() || !EMAIL_RULE.test(draft.email.trim())) {
            setError("Enter a valid recovery email address.");
            return;
        }
        setError("");
        onSave?.(draft);
        setSaved(true);
    };

    const fieldsProps = { draft, set, firstFieldRef };

    return (<Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="signup-edit-dialog" data-testid="signup-edit-dialog">
        {saved ? (<EditSuccess copy={copy} onDone={() => handleOpenChange(false)}/>) : (<form onSubmit={handleSave} noValidate>
            <DialogHeader>
              <DialogTitle className="signup-edit-dialog-title">{copy.title}</DialogTitle>
              <DialogDescription className="signup-edit-dialog-description">{copy.description}</DialogDescription>
            </DialogHeader>

            {error && (<p className="signup-edit-dialog-error" role="alert">
                <AlertCircle className="signup-edit-dialog-error-icon" aria-hidden="true"/>
                {error}
              </p>)}

            {isPersonal ? <PersonalEditFields {...fieldsProps}/> : <AccountEditFields {...fieldsProps}/>}

            <div className="signup-edit-dialog-actions">
              <Button type="button" variant="outline" className="signup-edit-dialog-cancel" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="signup-edit-dialog-save">
                Save Changes
              </Button>
            </div>
          </form>)}
      </DialogContent>
    </Dialog>);
}


/* ═══ First-time Google signup profile setup (merged from CompleteGoogleSignup.jsx) ═══ */


const ROLE_OPTIONS = [
  { id: "tenant", label: "Tenant", description: "Browse apartments", icon: Users },
  { id: "landlord", label: "Landlord", description: "Manage listings", icon: Building2 },
];

/**
 * Shown on /auth/callback the first time someone continues with Google: they
 * choose Tenant or Landlord and accept the same terms as the email sign-up
 * before their AptFindr profile is created.
 */
export function CompleteGoogleSignup({ account, initialRole = null, onSubmit, onCancel }) {
  const [role, setRole] = useState(initialRole === "tenant" || initialRole === "landlord" ? initialRole : "");
  const [name, setName] = useState(account?.name ?? "");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const isLandlord = role === "landlord";
  const chooseRole = (nextRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setTermsAccepted(false);
    setError("");
  };
  const validate = () => {
    if (!role) return "Choose Tenant or Landlord to finish creating your account.";
    if (isLandlord) {
      if (!name.trim()) return "Full name is required.";
      if (!mobile.trim()) return "Mobile number is required.";
      if (!address.trim()) return "Home address is required.";
      if (!permitNumber.trim()) return "Business permit number is required.";
    }
    if (!termsAccepted) {
      return isLandlord
        ? "You must agree to the Terms of Use and Landlord Verification Policy to continue."
        : "You must agree to the Terms of Use and Privacy Policy to continue.";
    }
    return "";
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        role,
        name: isLandlord ? name.trim() : null,
        mobile: isLandlord ? mobile.trim() : null,
        address: isLandlord ? address.trim() : null,
        permitNumber: isLandlord ? permitNumber.trim() : null,
        termsAccepted: true,
        landlordVerificationAccepted: isLandlord,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.message
          ? submitError.message
          : "We could not finish creating your account. Please try again."
      );
      setSubmitting(false);
    }
  };
  return (
    <section className="auth-palette auth-callback-card" aria-labelledby="complete-google-signup-title">
      <div className="auth-callback-account">
        <GoogleLogo className="auth-callback-account-logo" />
        <p className="auth-callback-account-text">
          Signed in with Google as <strong>{account?.email || "your Google account"}</strong>
        </p>
      </div>

      <h1 id="complete-google-signup-title" className="auth-callback-title">
        Finish setting up your account
      </h1>
      <p className="auth-callback-description">Choose how you&apos;ll use AptFindr. The account type can&apos;t be changed later.</p>

      {error && (
        <Alert variant="destructive" className="auth-callback-alert">
          <AlertCircle className="auth-callback-alert-icon" />
          <AlertDescription className="auth-callback-alert-text">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="auth-callback-form" noValidate>
        <fieldset className="auth-callback-roles">
          <legend className="auth-callback-label">Choose your account type</legend>
          <div className="auth-callback-role-options">
            {ROLE_OPTIONS.map((option) => {
              const selected = role === option.id;
              const Icon = option.icon;
              return (
                <label
                  key={option.id}
                  className={`auth-callback-role${selected ? " auth-callback-role-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="google-account-type"
                    value={option.id}
                    checked={selected}
                    onChange={() => chooseRole(option.id)}
                    className="auth-callback-role-input"
                  />
                  <span className="auth-callback-role-symbol" aria-hidden="true">
                    <Icon className="auth-callback-role-icon" />
                  </span>
                  <span className="auth-callback-role-title">{option.label}</span>
                  <span className="auth-callback-role-description">{option.description}</span>
                  {selected && <Check className="auth-callback-role-check" aria-hidden="true" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        {isLandlord && (
          <div className="auth-callback-landlord">
            <AuthField
              id="google-signup-name"
              label="Full Name"
              value={name}
              onChange={setName}
              required
              autoComplete="name"
              maxLength={120}
              icon={<User className="auth-callback-field-icon" />}
            />
            <AuthField
              id="google-signup-mobile"
              label="Mobile Number"
              type="tel"
              value={mobile}
              onChange={setMobile}
              required
              autoComplete="tel"
              inputMode="tel"
              maxLength={32}
              icon={<Phone className="auth-callback-field-icon" />}
            />
            <AuthField
              id="google-signup-address"
              label="Home Address"
              value={address}
              onChange={setAddress}
              required
              autoComplete="street-address"
              maxLength={300}
              icon={<MapPin className="auth-callback-field-icon" />}
            />
            <AuthField
              id="google-signup-permit"
              label="Business Permit Number"
              value={permitNumber}
              onChange={setPermitNumber}
              required
              maxLength={80}
              icon={<FileBadge className="auth-callback-field-icon" />}
            />
            <p className="auth-callback-note">
              Your landlord account starts as pending. Your listings can&apos;t be published until an administrator verifies your
              business permit.
            </p>
          </div>
        )}

        {role && (
          <label className="auth-callback-agreement">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              className="auth-callback-checkbox"
            />
            {isLandlord ? (
              <span>
                <strong>
                  I agree to AptFindr&apos;s{" "}
                  <button type="button" onClick={() => setShowTermsDialog(true)} className="auth-callback-link">
                    Terms of Use
                  </button>
                  ,{" "}
                  <button type="button" onClick={() => setShowPrivacyDialog(true)} className="auth-callback-link">
                    Privacy Policy
                  </button>
                  , and Landlord Verification Policy.
                </strong>{" "}
                I understand that my Business Permit Number and submitted verification information may be reviewed by the
                administrator, and that my apartment listings cannot be published until my landlord account is verified.
              </span>
            ) : (
              <span>
                <strong>
                  I agree to AptFindr&apos;s{" "}
                  <button type="button" onClick={() => setShowTermsDialog(true)} className="auth-callback-link">
                    Terms of Use
                  </button>{" "}
                  and{" "}
                  <button type="button" onClick={() => setShowPrivacyDialog(true)} className="auth-callback-link">
                    Privacy Policy
                  </button>
                  .
                </strong>{" "}
                I understand that the information I provide will be used to manage my AptFindr account and that I am responsible
                for using the platform appropriately.
              </span>
            )}
          </label>
        )}

        <button type="submit" className="auth-callback-submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="auth-callback-spinner" aria-hidden="true" />
              Creating your account…
            </>
          ) : (
            "Create account"
          )}
        </button>
        <button type="button" className="auth-callback-cancel" onClick={onCancel} disabled={submitting}>
          Cancel and sign out
        </button>
      </form>

      <TermsPrivacyDialog open={showTermsDialog} onOpenChange={setShowTermsDialog} role={role || "tenant"} type="terms" />
      <TermsPrivacyDialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog} role={role || "tenant"} type="privacy" />
    </section>
  );
}

/* ═══ Email sign-up wizard ═══ */


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
