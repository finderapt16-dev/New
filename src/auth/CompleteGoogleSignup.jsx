import { AlertCircle, Building2, Check, FileBadge, MapPin, Phone, User, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthField } from "./AuthField";
import { GoogleLogo } from "./GoogleAuthButton";

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
    const isLandlord = role === "landlord";
    const chooseRole = (nextRole) => {
        if (nextRole === role)
            return;
        setRole(nextRole);
        // Tenants and landlords accept different agreements.
        setTermsAccepted(false);
        setError("");
    };
    const validate = () => {
        if (!role)
            return "Choose Tenant or Landlord to finish creating your account.";
        if (isLandlord) {
            if (!name.trim())
                return "Full name is required.";
            if (!mobile.trim())
                return "Mobile number is required.";
            if (!address.trim())
                return "Home address is required.";
            if (!permitNumber.trim())
                return "Business permit number is required.";
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
        if (submitting)
            return;
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
            // On success the callback page navigates away.
        }
        catch (submitError) {
            setError(submitError instanceof Error && submitError.message ? submitError.message : "We could not finish creating your account. Please try again.");
            setSubmitting(false);
        }
    };
    return (<section className="auth-palette auth-callback-card" aria-labelledby="complete-google-signup-title">
      <div className="auth-callback-account">
        <GoogleLogo className="auth-callback-account-logo"/>
        <p className="auth-callback-account-text">
          Signed in with Google as <strong>{account?.email || "your Google account"}</strong>
        </p>
      </div>

      <h1 id="complete-google-signup-title" className="auth-callback-title">Finish setting up your account</h1>
      <p className="auth-callback-description">
        Choose how you&apos;ll use AptFindr. The account type can&apos;t be changed later.
      </p>

      {error && (<Alert variant="destructive" className="auth-callback-alert">
          <AlertCircle className="auth-callback-alert-icon"/>
          <AlertDescription className="auth-callback-alert-text">{error}</AlertDescription>
        </Alert>)}

      <form onSubmit={handleSubmit} className="auth-callback-form" noValidate>
        <fieldset className="auth-callback-roles">
          <legend className="auth-callback-label">Choose your account type</legend>
          <div className="auth-callback-role-options">
            {ROLE_OPTIONS.map((option) => {
            const selected = role === option.id;
            const Icon = option.icon;
            return (<label key={option.id} className={`auth-callback-role${selected ? " auth-callback-role-selected" : ""}`}>
                  <input type="radio" name="google-account-type" value={option.id} checked={selected} onChange={() => chooseRole(option.id)} className="auth-callback-role-input"/>
                  <span className="auth-callback-role-symbol" aria-hidden="true"><Icon className="auth-callback-role-icon"/></span>
                  <span className="auth-callback-role-title">{option.label}</span>
                  <span className="auth-callback-role-description">{option.description}</span>
                  {selected && <Check className="auth-callback-role-check" aria-hidden="true"/>}
                </label>);
        })}
          </div>
        </fieldset>

        {isLandlord && (<div className="auth-callback-landlord">
            <AuthField id="google-signup-name" label="Full Name" value={name} onChange={setName} required autoComplete="name" maxLength={120} icon={<User className="auth-callback-field-icon"/>}/>
            <AuthField id="google-signup-mobile" label="Mobile Number" type="tel" value={mobile} onChange={setMobile} required autoComplete="tel" inputMode="tel" maxLength={32} icon={<Phone className="auth-callback-field-icon"/>}/>
            <AuthField id="google-signup-address" label="Home Address" value={address} onChange={setAddress} required autoComplete="street-address" maxLength={300} icon={<MapPin className="auth-callback-field-icon"/>}/>
            <AuthField id="google-signup-permit" label="Business Permit Number" value={permitNumber} onChange={setPermitNumber} required maxLength={80} icon={<FileBadge className="auth-callback-field-icon"/>}/>
            <p className="auth-callback-note">
              Your landlord account starts as pending. Your listings can&apos;t be published until an administrator verifies your business permit.
            </p>
          </div>)}

        {role && (<label className="auth-callback-agreement">
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="auth-callback-checkbox"/>
            {isLandlord ? (<span>
                <strong>
                  I agree to AptFindr&apos;s <Link to="/terms-of-service" target="_blank" rel="noreferrer" className="auth-callback-link">Terms of Use</Link>,{" "}
                  <Link to="/privacy-policy" target="_blank" rel="noreferrer" className="auth-callback-link">Privacy Policy</Link>, and Landlord Verification Policy.
                </strong>{" "}
                I understand that my Business Permit Number and submitted verification information may be reviewed by the administrator, and that my apartment listings cannot be published until my landlord account is verified.
              </span>) : (<span>
                <strong>
                  I agree to AptFindr&apos;s <Link to="/terms-of-service" target="_blank" rel="noreferrer" className="auth-callback-link">Terms of Use</Link> and{" "}
                  <Link to="/privacy-policy" target="_blank" rel="noreferrer" className="auth-callback-link">Privacy Policy</Link>.
                </strong>{" "}
                I understand that the information I provide will be used to manage my AptFindr account and that I am responsible for using the platform appropriately.
              </span>)}
          </label>)}

        <button type="submit" className="auth-callback-submit" disabled={submitting}>
          {submitting ? (<>
              <span className="auth-callback-spinner" aria-hidden="true"/>
              Creating your account…
            </>) : "Create account"}
        </button>
        <button type="button" className="auth-callback-cancel" onClick={onCancel} disabled={submitting}>
          Cancel and sign out
        </button>
      </form>
    </section>);
}
