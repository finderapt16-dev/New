import { AuthField } from "./AuthField";
import "./signup.css";
import { AppLogo } from "@/components/AppLogo";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, BadgeCheck, Building2, Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Eye, EyeOff, Home, Key, Lock, Mail, MapPin, Phone, ShieldCheck, Upload, User, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
/* ─── Password strength ────────────────────────────────────── */
function getStrength(p) {
    let s = 0;
    if (p.length >= 6)
        s++;
    if (p.length >= 10)
        s++;
    if (/[A-Z]/.test(p))
        s++;
    if (/[0-9]/.test(p))
        s++;
    if (/[^A-Za-z0-9]/.test(p))
        s++;
    return s;
}
const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
const strengthColor = ["", "signup-strength-fill-weak", "signup-strength-fill-fair", "signup-strength-fill-good", "signup-strength-fill-strong", "signup-strength-fill-very-strong"];
const strengthText = ["", "signup-strength-text-weak", "signup-strength-text-fair", "signup-strength-text-good", "signup-strength-text-strong", "signup-strength-text-very-strong"];
/* ─── Accordion section ────────────────────────────────────── */
function AccordionSection({ title, icon, open, onToggle, done, children, }) {
    return (<div className={`signup-section ${open ? "signup-section-active" : done ? "signup-section-idle-complete" : "signup-section-idle-pending"}`}>
      <button type="button" onClick={onToggle} className={`signup-section-button ${open ? "signup-section-button-active" : "signup-section-button-idle"}`}>
        <div className={`signup-section-symbol ${open ? "signup-section-symbol-active" : done ? "signup-section-symbol-idle-complete" : "signup-section-symbol-idle-pending"}`}>
          {done && !open ? <Check className="signup-icon-small"/> : icon}
        </div>
        <div className="signup-section-heading">
          <p className={`signup-section-title ${open ? "signup-section-title-active" : done ? "signup-section-title-idle-complete" : "signup-section-title-idle-pending"}`}>{title}</p>
          {done && !open && <p className="signup-section-completed">Completed</p>}
        </div>
        <div>
          <ChevronDown className={`signup-section-chevron ${open ? "signup-section-chevron-active" : "signup-section-chevron-idle"}`}/>
        </div>
      </button>
      <>
        {open && (<div>
            <div className="signup-section-content">{children}</div>
          </div>)}
      </>
    </div>);
}
export function Signup() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signup } = useAuth();
    const requestedRedirect = new URLSearchParams(location.search).get("redirect");
    const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : null;
    const loginPath = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const submissionInFlightRef = useRef(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [landlordStep, setLandlordStep] = useState(1);
    const [openSection, setOpenSection] = useState("personal");
    const permitRef = useRef(null);
    const idRef = useRef(null);
    const [permitFile, setPermitFile] = useState(null);
    const [idFile, setIdFile] = useState(null);
    const [tenantTermsAccepted, setTenantTermsAccepted] = useState(false);
    const [landlordAgreementAccepted, setLandlordAgreementAccepted] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "", lastName: "", middleInitial: "",
        username: "", email: "", mobileNumber: "", address: "",
        password: "", confirmPassword: "",
        role: "",
        permitNumber: "",
    });
    const set = (key, value) => setFormData((p) => ({ ...p, [key]: value }));
    const strength = getStrength(formData.password);
    /* ── Section completion checks ─────────────────────────── */
    const donePersonal = formData.role === "landlord" &&
        !!formData.firstName &&
        !!formData.lastName &&
        !!formData.address;
    const doneContact = formData.role === "landlord" && !!formData.mobileNumber;
    const doneRole = formData.role === "landlord" && !!formData.permitNumber;
    const doneSecurity = /^[A-Za-z0-9_]{4,30}$/.test(formData.username) &&
        /^\S+@\S+\.\S+$/.test(formData.email.trim()) &&
        !!formData.password &&
        formData.password.length >= 6 &&
        formData.password === formData.confirmPassword;
    /* ── Submit ─────────────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submissionInFlightRef.current)
            return;
        setError("");
        if (!formData.role) {
            setError("Please select a role.");
            return;
        }
        if (formData.role === "landlord" && !formData.permitNumber.trim()) {
            setError("Business permit number is required.");
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
            if (!formData.address) {
                setError("Home address is required.");
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
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        submissionInFlightRef.current = true;
        setLoading(true);
        const fullName = formData.role === "tenant"
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
                address: formData.role === "landlord" ? formData.address : "",
                mobileNumber: formData.role === "landlord" ? formData.mobileNumber : "",
                permitNumber: formData.role === "landlord" ? formData.permitNumber : undefined,
                permitDocument: permitFile ?? undefined,
                idDocument: idFile ?? undefined,
                termsAccepted: formData.role === "tenant" ? tenantTermsAccepted : landlordAgreementAccepted,
                landlordVerificationAccepted: formData.role === "landlord" ? landlordAgreementAccepted : undefined,
            });
            if (result.success && result.signup?.existingAccount) {
                setError("An account may already exist for this email. Sign in, resend verification, or reset your password instead of registering again.");
            }
            else if (result.success && result.signup?.profileSetupError) {
                navigate(loginPath, { state: { message: result.signup.profileSetupError, verificationEmail: formData.email.trim() } });
            }
            else if (result.success && result.signup?.requiresEmailVerification) {
                navigate(loginPath, { state: { message: `Account created. A verification link was requested for ${formData.email.trim()}. Check your inbox and spam folder before signing in.`, verificationEmail: formData.email.trim() } });
            }
            else if (result.success) {
                navigate(loginPath, { state: { message: "Account created successfully. You can now sign in." } });
            }
            else {
                setError(result.error || "Signup failed");
            }
        }
        catch (submitError) {
            console.error("[AUTH] Unexpected signup UI failure", submitError);
            setError("We could not confirm that registration completed. Try signing in, resending verification, or resetting your password before registering again.");
        }
        finally {
            submissionInFlightRef.current = false;
            setLoading(false);
        }
    };
    const nextLandlordStep = () => {
        setError("");
        if (landlordStep === 1) {
            if (!formData.firstName.trim() || !formData.lastName.trim()) {
                setError("Full name is required.");
                return;
            }
            if (!formData.address.trim()) {
                setError("Home address is required.");
                return;
            }
        }
        if (landlordStep === 2 && !formData.mobileNumber.trim()) {
            setError("Mobile number is required.");
            return;
        }
        if (landlordStep === 3 && !formData.permitNumber.trim()) {
            setError("Business permit number is required.");
            return;
        }
        if (landlordStep === 4) {
            if (!/^[A-Za-z0-9_]{4,30}$/.test(formData.username.trim()) || formData.username.includes("@")) {
                setError("Username must be 4–30 characters using only letters, numbers, or underscores.");
                return;
            }
            if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
                setError("Enter a valid recovery email address.");
                return;
            }
            if (formData.password.length < 6) {
                setError("Password must be at least 6 characters.");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
        }
        setLandlordStep((step) => Math.min(step + 1, 5));
    };
    const previousLandlordStep = () => {
        setError("");
        setLandlordStep((step) => Math.max(step - 1, 1));
    };
    const toggle = (id) => setOpenSection((o) => o === id ? "" : id);
    return (<div className="auth-palette signup-page">

      <div className="auth-visual-panel signup-visual-panel">
        <div className="signup-background">
          <div className="auth-background-overlay signup-background-overlay" />
         </div>
        <div className="signup-visual-content">
          <Link to="/" className="signup-brand">
            <AppLogo className="signup-brand-logo"/>
            <div>
              <span className="signup-brand-name">AptFindr</span>
              <p className="signup-brand-location">La Paz, Iloilo City</p>
            </div>
          </Link>

          <div className="signup-introduction">
            <div>
             
              <h2 className="signup-visual-title">
                Create your<br />
                <span className="signup-visual-accent">
                  AptFindr account
                </span>
              </h2>
              <p className="signup-visual-description">
                Choose an account type and provide the information required for your role.
              </p>
            </div>
          </div>

          <div className="auth-benefits signup-benefits">
            {[
            { icon: BadgeCheck, text: "Review landlord verification status" },
            { icon: ShieldCheck, text: "Submit listing reports for admin review" },
            { icon: MapPin, text: "Compare apartment locations on the map" },
        ].map(({ icon: Icon, text }) => (<div key={text} className="signup-benefit">
                <div className="signup-benefit-symbol">
                  <Icon className="signup-benefit-icon"/>
                </div>
                <span className="signup-benefit-text">{text}</span>
              </div>))}
          </div>

        </div>
      </div>

      <div className="signup-content">

        <div className="signup-mobile-header">
          <Link to="/" className="signup-mobile-brand">
            <AppLogo className="signup-mobile-logo"/>
            <span className="signup-mobile-brand-name">AptFindr</span>
          </Link>
          <Link to={loginPath} className="signup-login-link">
            Sign in
          </Link>
        </div>

        <div className="signup-form-container">
          <div className="signup-form-shell">

            <div className="signup-form-heading">
              <h1 className="signup-title">Create your account</h1>
              <p className="signup-description">
                Already registered?{" "}
                <Link to={loginPath} className="signup-login-prompt-link">Sign in here</Link>
              </p>
            </div>

            <>
              {error && (<div className="signup-message">
                  <Alert variant="destructive" className="signup-error-alert">
                    <AlertCircle className="signup-error-icon"/>
                    <AlertDescription className="signup-error-text">{error}</AlertDescription>
                  </Alert>
                  {(error.includes("may already exist") || error.includes("couldn't send the confirmation email")) && <div className="signup-error-actions"><Link to={loginPath} className="signup-error-link">Sign in</Link><Link to="/forgot-password" className="signup-error-link">Forgot password</Link><Link to={loginPath} state={{ message: "Use Resend Verification Email for this account.", verificationEmail: formData.email.trim() }} className="signup-error-link">Resend verification</Link></div>}
                </div>)}
            </>

            <form onSubmit={handleSubmit} className="signup-form">

              <div className="signup-role-field">
                <p className="signup-role-label">Choose your account type</p>
                <div className="signup-role-options">
                  {[
            { id: "tenant", label: "Tenant", sub: "Browse apartments", icon: Users },
            { id: "landlord", label: "Landlord", sub: "Manage listings", icon: Building2 },
        ].map((item) => {
            const selected = formData.role === item.id;
            return (<button key={item.id} type="button" onClick={() => setFormData((previous) => ({
                    ...previous,
                    role: item.id,
                }))} className={`signup-role-option ${selected ? "signup-role-option-active" : "signup-role-option-idle"}`}>
                        <div className={`signup-role-symbol ${selected ? "signup-role-symbol-active" : "signup-role-symbol-idle"}`}>
                          <item.icon className="signup-icon"/>
                        </div>
                        <span className="signup-role-title">{item.label}</span>
                        <span className="signup-role-description">{item.sub}</span>
                        {selected && (<div className="signup-role-selected">
                            <Check className="signup-role-check"/>
                          </div>)}
                      </button>);
        })}
                </div>
              </div>

              {formData.role === "tenant" && (<div className="signup-tenant-simple-form">
                  <div className="signup-account-field">
                    <AuthField id="username" label="Username" value={formData.username} onChange={(v) => set("username", v)} required placeholder="Enter your username" icon={<User className="signup-icon-small"/>}/>
                  </div>

                  <div className="signup-account-field">
                    <AuthField id="email" label="Email Address" type="email" value={formData.email} onChange={(v) => set("email", v)} required placeholder="Enter your email address" icon={<Mail className="signup-icon-small"/>}/>
                  </div>

                  <div className="signup-account-field">
                    <AuthField id="password" label="Password" type={showPass ? "text" : "password"} value={formData.password} onChange={(v) => set("password", v)} required placeholder="Enter your password" icon={<Key className="signup-icon-small"/>} suffix={<button type="button" onClick={() => setShowPass(!showPass)} className="auth-password-toggle signup-password-toggle" aria-label={showPass ? "Hide password" : "Show password"}>
                          {showPass ? (<EyeOff className="signup-icon-small"/>) : (<Eye className="signup-icon-small"/>)}
                        </button>}/>
                  </div>

                  <div className="signup-account-field">
                    <AuthField id="confirm" label="Confirm Password" type={showConfirm ? "text" : "password"} value={formData.confirmPassword} onChange={(v) => set("confirmPassword", v)} required placeholder="Confirm your password" icon={<Lock className="signup-icon-small"/>} suffix={<button type="button" onClick={() => setShowConfirm(!showConfirm)} className="auth-password-toggle signup-password-toggle" aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>
                          {showConfirm ? (<EyeOff className="signup-icon-small"/>) : (<Eye className="signup-icon-small"/>)}
                        </button>}/>

                    {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (<p className="signup-mismatch-message">
                          <AlertCircle className="signup-validation-icon"/>
                          Passwords do not match
                        </p>)}
                  </div>

                  <div className="signup-tenant-password-help">
                    <strong>Password must contain:</strong>
                    <span>
                      At least 6 characters. An uppercase letter, number, and special
                      character are recommended for a stronger password.
                    </span>
                  </div>
                </div>)}

              {formData.role === "landlord" && (<div className="signup-landlord-wizard">
                  <div className="signup-landlord-stepper">
                    {[
                "Personal Information",
                "Contact Information",
                "Landlord Verification",
                "Account Security",
                "Review",
            ].map((label, index) => {
                const stepNumber = index + 1;
                const active = landlordStep === stepNumber;
                const complete = landlordStep > stepNumber;
                return (<div className="signup-landlord-step-item" key={label}>
                          <div className={`signup-landlord-step-circle ${active
                        ? "signup-landlord-step-circle-active"
                        : complete
                            ? "signup-landlord-step-circle-complete"
                            : ""}`}>
                            {stepNumber}
                          </div>
                          <span className={`signup-landlord-step-text ${active ? "signup-landlord-step-text-active" : ""}`}>
                            {label}
                          </span>
                          {stepNumber < 5 && (<div className={`signup-landlord-step-connector ${complete ? "signup-landlord-step-connector-complete" : ""}`}/>)}
                        </div>);
            })}
                  </div>

                  {landlordStep === 1 && (<div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Personal Information</h2>

                      <div className="signup-name-grid">
                        <AuthField id="firstName" label="First Name" value={formData.firstName} onChange={(v) => set("firstName", v)} required icon={<User className="signup-icon-small"/>}/>
                        <AuthField id="lastName" label="Last Name" value={formData.lastName} onChange={(v) => set("lastName", v)} required/>
                      </div>

                      <AuthField id="middleInitial" label="Middle Initial (optional)" value={formData.middleInitial} onChange={(v) => set("middleInitial", v)}/>

                      <AuthField id="address" label="Home Address" value={formData.address} onChange={(v) => set("address", v)} required icon={<MapPin className="signup-icon-small"/>}/>

                      <div className="signup-landlord-actions signup-landlord-actions-end">
                        <button type="button" onClick={nextLandlordStep} className="signup-landlord-continue">
                          Continue
                          <ChevronRight className="signup-next-icon"/>
                        </button>
                      </div>
                    </div>)}

                  {landlordStep === 2 && (<div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Contact Information</h2>

                      <AuthField id="mobile" label="Mobile Number" type="tel" value={formData.mobileNumber} onChange={(v) => set("mobileNumber", v)} required icon={<Phone className="signup-icon-small"/>}/>

                      <div className="signup-landlord-actions">
                        <button type="button" onClick={previousLandlordStep} className="signup-landlord-back">
                          Back
                        </button>
                        <button type="button" onClick={nextLandlordStep} className="signup-landlord-continue">
                          Continue
                          <ChevronRight className="signup-next-icon"/>
                        </button>
                      </div>
                    </div>)}

                  {landlordStep === 3 && (<div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Landlord Verification</h2>

                      <div className="signup-verification-fields">
                        <AuthField id="permitNumber" label="Business Permit Number" value={formData.permitNumber} onChange={(v) => set("permitNumber", v)} required icon={<ClipboardList className="signup-icon-small"/>}/>

                        <div className="signup-documents-grid">
                          {[
                    { label: "Business Permit", ref: permitRef, file: permitFile, setFile: setPermitFile },
                    { label: "Valid ID", ref: idRef, file: idFile, setFile: setIdFile },
                ].map(({ label, ref, file, setFile }) => (<div key={label}>
                              <p className="signup-document-label">{label}</p>
                              <p className="signup-document-description">
                                Optional during signup — required for verification
                              </p>
                              <button type="button" onClick={() => ref.current?.click()} className={`signup-document-upload ${file
                        ? "signup-document-upload-active"
                        : "signup-document-upload-idle"}`}>
                                {file ? (<>
                                    <CheckCircle2 className="signup-document-icon"/>
                                    <span className="signup-document-name">{file.name}</span>
                                  </>) : (<>
                                    <Upload className="signup-upload-icon"/>
                                    <span className="signup-upload-hint">Upload file</span>
                                  </>)}
                              </button>
                              <input ref={ref} type="file" accept="image/*,.pdf" className="signup-file-input" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                            </div>))}
                        </div>

                        <div className="signup-verification-notice">
                          <ShieldCheck className="signup-notice-icon"/>
                          <p className="signup-notice-text">
                            You may upload your verification documents now or complete them later.
                            Your apartment listings cannot be published until your landlord
                            verification is approved.
                          </p>
                        </div>
                      </div>

                      <div className="signup-landlord-actions">
                        <button type="button" onClick={previousLandlordStep} className="signup-landlord-back">
                          Back
                        </button>
                        <button type="button" onClick={nextLandlordStep} className="signup-landlord-continue">
                          Continue
                          <ChevronRight className="signup-next-icon"/>
                        </button>
                      </div>
                    </div>)}

                  {landlordStep === 4 && (<div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Account Security</h2>

                      <div className="signup-account-field">
                        <AuthField id="username" label="Username" value={formData.username} onChange={(v) => set("username", v)} required placeholder="Choose a unique username" icon={<User className="signup-icon-small"/>}/>
                        <p className="signup-account-hint">
                          You will use this username when signing in. Use 4–30 letters,
                          numbers, or underscores with no spaces.
                        </p>
                      </div>

                      <div className="signup-account-field">
                        <AuthField id="email" label="Recovery Email" type="email" value={formData.email} onChange={(v) => set("email", v)} required placeholder="you@example.com" icon={<Mail className="signup-icon-small"/>}/>
                        <p className="signup-account-hint">
                          Used for account verification, password recovery, and important
                          account notices.
                        </p>
                      </div>

                      <div>
                        <AuthField id="password" label="Password" type={showPass ? "text" : "password"} value={formData.password} onChange={(v) => set("password", v)} required icon={<Key className="signup-icon-small"/>} suffix={<button type="button" onClick={() => setShowPass(!showPass)} className="auth-password-toggle signup-password-toggle" aria-label={showPass ? "Hide password" : "Show password"}>
                              {showPass ? (<EyeOff className="signup-icon-small"/>) : (<Eye className="signup-icon-small"/>)}
                            </button>}/>

                        {formData.password && (<div className="signup-strength">
                            <div className="signup-strength-bars">
                              {[1, 2, 3, 4, 5].map((i) => (<div key={i} className={`signup-strength-segment ${i <= strength
                            ? strengthColor[strength]
                            : "signup-strength-segment-idle"}`}/>))}
                            </div>
                            <p className={`signup-strength-label ${strengthText[strength]}`}>
                              {strengthLabel[strength]}
                            </p>
                          </div>)}
                      </div>

                      <AuthField id="confirm" label="Confirm Password" type={showConfirm ? "text" : "password"} value={formData.confirmPassword} onChange={(v) => set("confirmPassword", v)} required icon={<Lock className="signup-icon-small"/>} suffix={<button type="button" onClick={() => setShowConfirm(!showConfirm)} className="auth-password-toggle signup-password-toggle" aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>
                            {showConfirm ? (<EyeOff className="signup-icon-small"/>) : (<Eye className="signup-icon-small"/>)}
                          </button>}/>

                      {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (<p className="signup-mismatch-message">
                            <AlertCircle className="signup-validation-icon"/>
                            Passwords do not match
                          </p>)}

                      {formData.confirmPassword &&
                    formData.password === formData.confirmPassword &&
                    formData.password.length >= 6 && (<p className="signup-match-message">
                            <CheckCircle2 className="signup-validation-icon"/>
                            Passwords match
                          </p>)}

                      <div className="signup-requirements">
                        {[
                    { label: "At least 6 characters", met: formData.password.length >= 6 },
                    { label: "Uppercase strengthens it", met: /[A-Z]/.test(formData.password) },
                    { label: "Number strengthens it", met: /[0-9]/.test(formData.password) },
                    {
                        label: "Passwords match",
                        met: !!formData.password &&
                            formData.password === formData.confirmPassword,
                    },
                ].map(({ label, met }) => (<div key={label} className={`signup-requirement ${met ? "signup-requirement-active" : "signup-requirement-idle"}`}>
                            <div className={`signup-requirement-marker ${met
                        ? "signup-requirement-marker-active"
                        : "signup-requirement-marker-idle"}`}>
                              {met && <Check className="signup-requirement-check"/>}
                            </div>
                            {label}
                          </div>))}
                      </div>

                      <div className="signup-landlord-actions">
                        <button type="button" onClick={previousLandlordStep} className="signup-landlord-back">
                          Back
                        </button>
                        <button type="button" onClick={nextLandlordStep} className="signup-landlord-continue">
                          Continue
                          <ChevronRight className="signup-next-icon"/>
                        </button>
                      </div>
                    </div>)}

                  {landlordStep === 5 && (<div className="signup-landlord-panel">
                      <h2 className="signup-landlord-panel-title">Review</h2>

                      <div className="signup-landlord-review-card">
                        <div className="signup-landlord-review-heading">
                          <strong>Personal Information</strong>
                          <button type="button" onClick={() => setLandlordStep(1)}>
                            Edit
                          </button>
                        </div>
                        <div className="signup-landlord-review-row">
                          <span>Name</span>
                          <b>
                            {`${formData.firstName} ${formData.middleInitial
                    ? `${formData.middleInitial}. `
                    : ""}${formData.lastName}`.trim()}
                          </b>
                        </div>
                        <div className="signup-landlord-review-row">
                          <span>Home Address</span>
                          <b>{formData.address}</b>
                        </div>
                      </div>

                      <div className="signup-landlord-review-card">
                        <div className="signup-landlord-review-heading">
                          <strong>Contact Information</strong>
                          <button type="button" onClick={() => setLandlordStep(2)}>
                            Edit
                          </button>
                        </div>
                        <div className="signup-landlord-review-row">
                          <span>Mobile Number</span>
                          <b>{formData.mobileNumber}</b>
                        </div>
                      </div>

                      <div className="signup-landlord-review-card">
                        <div className="signup-landlord-review-heading">
                          <strong>Landlord Verification</strong>
                          <button type="button" onClick={() => setLandlordStep(3)}>
                            Edit
                          </button>
                        </div>
                        <div className="signup-landlord-review-row">
                          <span>Business Permit Number</span>
                          <b>{formData.permitNumber}</b>
                        </div>
                        <div className="signup-landlord-review-row">
                          <span>Business Permit</span>
                          <b>{permitFile?.name || "Not uploaded yet"}</b>
                        </div>
                        <div className="signup-landlord-review-row">
                          <span>Valid ID</span>
                          <b>{idFile?.name || "Not uploaded yet"}</b>
                        </div>
                      </div>

                      <div className="signup-landlord-review-card">
                        <div className="signup-landlord-review-heading">
                          <strong>Account Security</strong>
                          <button type="button" onClick={() => setLandlordStep(4)}>
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

                      <label className="signup-agreement">
                        <input type="checkbox" checked={landlordAgreementAccepted} onChange={(event) => setLandlordAgreementAccepted(event.target.checked)} className="signup-checkbox"/>
                        <span>
                          <strong>
                            I agree to AptFindr&apos;s Terms of Use, Privacy Policy,
                            and Landlord Verification Policy.
                          </strong>{" "}
                          I understand that my Business Permit Number and submitted
                          verification information may be reviewed by the administrator,
                          and that my apartment listings cannot be published until my
                          landlord account is verified.
                        </span>
                      </label>

                      <div className="signup-landlord-actions">
                        <button type="button" onClick={previousLandlordStep} className="signup-landlord-back">
                          Back
                        </button>

                        <Button type="submit" disabled={loading} className="signup-submit-button signup-landlord-final-submit">
                          {loading ? (<>
                              <div className="signup-spinner"/>
                              Creating your account...
                            </>) : ("Create Account")}
                        </Button>
                      </div>
                    </div>)}
                </div>)}

              {formData.role === "tenant" && (<label className="signup-agreement">
                  <input type="checkbox" checked={tenantTermsAccepted} onChange={(event) => setTenantTermsAccepted(event.target.checked)} className="signup-checkbox"/>
                  <span><strong>I agree to AptFindr&apos;s Terms of Use and Privacy Policy.</strong> I understand that the information I provide will be used to manage my AptFindr account and that I am responsible for using the platform appropriately.</span>
                </label>)}


              {formData.role === "tenant" && (<Button type="submit" disabled={loading} className="signup-submit-button">
                  {loading ? (<>
                      <div className="signup-spinner"/>
                      Creating your account...
                    </>) : ("Create Account")}
                </Button>)}

              <Link to="/" className="signup-home-link">
                <Home className="signup-icon-small"/>
                Back to Home
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>);
}
