import { AuthField } from "./AuthField";
import "./signupEditDetailsDialog.css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

export default SignupEditDetailsDialog;
