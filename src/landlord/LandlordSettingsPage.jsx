import "./LandlordSettingsPage.css";
import { Button } from "@/components/ui/button";
import { UpdateBusinessPermitModal } from "@/landlord/UpdateBusinessPermitModal";
import { fetchApartmentVerificationDocuments } from "@/services/verificationDocumentsService";
import { FileText, Lock, Pencil, ShieldAlert, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const formatDate = (value) => {
    if (!value)
        return "Not provided";
    const date = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
};

const verificationFromApartment = (apartment) => {
    const features = apartment?.features && !Array.isArray(apartment.features) ? apartment.features : {};
    const verification = features.verification && typeof features.verification === "object" && !Array.isArray(features.verification) ? features.verification : {};
    return verification;
};

const hasVerificationData = (apartment) => Object.values(verificationFromApartment(apartment))
    .some((value) => typeof value === "string" && value.trim().length > 0);

// Permit display order: admin-verified properties first, then properties with
// submitted permit details, then the most recently added property.
const permitSourceCandidates = (apartments) => (apartments ?? [])
    .filter((apartment) => apartment?.id)
    .slice()
    .sort((a, b) => {
        const approvedDiff = (a.approvalStatus === "approved" ? 0 : 1) - (b.approvalStatus === "approved" ? 0 : 1);
        if (approvedDiff !== 0)
            return approvedDiff;
        const dataDiff = (hasVerificationData(a) ? 0 : 1) - (hasVerificationData(b) ? 0 : 1);
        if (dataDiff !== 0)
            return dataDiff;
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

const isImageFile = (mimeType, url) => {
    if (typeof mimeType === "string" && mimeType.startsWith("image/"))
        return true;
    if (mimeType)
        return false;
    return /\.(png|jpe?g|webp|gif|bmp)$/i.test(String(url ?? "").split("?")[0] ?? "");
};

function EditableField({ label, required, hint, type = "text", value, onChange, readOnly, placeholder, autoComplete }) {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => {
        if (editing)
            inputRef.current?.focus();
    }, [editing]);
    return (<div className="ls-field">
      <label className="ls-field-label">
        {label}
        {required && <span className="ls-field-required">*</span>}
      </label>
      <div className="ls-field-control">
        <input
          ref={inputRef}
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={readOnly || !editing}
          onChange={onChange}
          className={`ls-field-input${editing ? " is-editing" : ""}`}
        />
        <button
          type="button"
          aria-label={readOnly ? `${label} is managed securely` : `Edit ${label}`}
          title={readOnly ? "Managed securely through your authenticated account" : `Edit ${label}`}
          disabled={readOnly}
          onClick={() => setEditing((current) => !current)}
          className="ls-field-edit"
        >
          <Pencil className="ls-field-edit-icon"/>
        </button>
      </div>
      {hint && <p className="ls-field-hint">{hint}</p>}
    </div>);
}

export function LandlordSettingsPage({
    profile,
    updateProfile,
    savedProfile,
    handleUpdateProfile,
    isUpdatingProfile,
    isUploadingProfilePhoto,
    profilePhotoInputRef,
    handleProfilePhoto,
    handleRemoveProfilePhoto,
    passwordState,
    setPasswordState,
    handlePasswordChange,
    handleDeleteAccount,
    myApartments,
    landlordProfile,
    user,
    onPermitSaved,
}) {
    const [profileDirty, setProfileDirty] = useState(false);
    const [permitDocuments, setPermitDocuments] = useState([]);
    const [permitModalOpen, setPermitModalOpen] = useState(false);
    const [permitReloadKey, setPermitReloadKey] = useState(0);
    const trackChange = (patch) => {
        setProfileDirty(true);
        updateProfile(patch);
    };
    useEffect(() => {
        let active = true;
        const loadPermitDocuments = async () => {
            const candidates = permitSourceCandidates(myApartments);
            if (candidates.length === 0) {
                setPermitDocuments([]);
                return;
            }
            try {
                for (const apartment of candidates) {
                    const documents = await fetchApartmentVerificationDocuments(apartment.id);
                    if (!active)
                        return;
                    if (documents.length > 0) {
                        setPermitDocuments(documents);
                        return;
                    }
                }
                setPermitDocuments([]);
            }
            catch {
                if (active)
                    setPermitDocuments([]);
            }
        };
        void loadPermitDocuments();
        return () => {
            active = false;
        };
    }, [myApartments, permitReloadKey]);
    const cancelProfile = () => {
        updateProfile(() => ({ ...savedProfile }));
        setProfileDirty(false);
    };
    const saveProfile = async () => {
        await handleUpdateProfile();
        setProfileDirty(false);
    };
    const permitCandidates = permitSourceCandidates(myApartments);
    const permitApartment = permitCandidates.find(hasVerificationData) ?? permitCandidates[0] ?? null;
    const propertyVerification = verificationFromApartment(permitApartment);
    const permitDocument = permitDocuments.find((document) => document.documentType === "mayors_business_permit") ?? permitDocuments[0] ?? null;
    const profilePermitUrl = typeof landlordProfile?.verification_document_url === "string" ? landlordProfile.verification_document_url : "";
    const permitFileUrl = permitDocument?.previewUrl || profilePermitUrl;
    const permitFileLabel = permitDocument?.fileName || (profilePermitUrl ? "Business permit document" : "");
    const permitIsImage = isImageFile(permitDocument?.mimeType ?? "", permitFileUrl);
    const permitNumber = String(propertyVerification.businessPermit ?? "").trim() || landlordProfile?.business_permit_number || landlordProfile?.permit_number || "";
    const permitExpiry = propertyVerification.permitExpiry || landlordProfile?.permit_expiry || "";
    const isPermitVerified = permitApartment?.approvalStatus === "approved";
    const cancelPassword = () => setPasswordState((current) => ({ ...current, current: "", new: "", confirm: "" }));
    return (<div className="ls-page">
      <header className="ls-card ls-header">
        <h1>Settings</h1>
        <p>Manage your profile details and account security.</p>
      </header>

      <section className="ls-card ls-identity">
        <div className="ls-identity-left">
          <div className="ls-avatar">
            {profile.avatar ? <img src={profile.avatar} alt={`${profile.firstName || "Landlord"} profile`}/> : (profile.firstName?.[0] || "L").toUpperCase()}
          </div>
          <div>
            <p className="ls-identity-name">{`${profile.firstName} ${profile.lastName}`.trim() || "Not provided"}</p>
            <p className="ls-identity-email">{profile.email || "Email not provided"}</p>
          </div>
        </div>
        <div className="ls-identity-actions">
          <Button type="button" disabled={isUploadingProfilePhoto} onClick={() => profilePhotoInputRef.current?.click()} className="ls-upload">
            <Upload className="ls-upload-icon"/>
            {isUploadingProfilePhoto ? "Uploading..." : "Upload Photo"}
          </Button>
          <Button type="button" variant="outline" disabled={!profile.avatar || isUploadingProfilePhoto} onClick={() => void handleRemoveProfilePhoto()} className="ls-remove">
            Remove Photo
          </Button>
          <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="ls-file-input" onChange={(event) => void handleProfilePhoto(event.target.files?.[0])}/>
          <p className="ls-identity-hint">JPG, PNG, or WebP up to 2MB</p>
        </div>
      </section>

      <section className="ls-card">
        <div className="ls-section-head">
          <h2>Personal Information</h2>
          <p>Update your personal details.</p>
        </div>
        <div className="ls-grid-2">
          <EditableField label="First Name" required autoComplete="given-name" value={profile.firstName} placeholder="First name" onChange={(event) => trackChange((p) => ({ ...p, firstName: event.target.value }))}/>
          <EditableField label="Last Name" required autoComplete="family-name" value={profile.lastName} placeholder="Last name" onChange={(event) => trackChange((p) => ({ ...p, lastName: event.target.value }))}/>
          <EditableField label="Middle Initial (Optional)" autoComplete="additional-name" value={profile.middleInitial} placeholder="Middle initial" onChange={(event) => trackChange((p) => ({ ...p, middleInitial: event.target.value.slice(0, 3) }))}/>
          <EditableField label="Mobile Number" required type="tel" autoComplete="tel" value={profile.mobile} placeholder="09XXXXXXXXX" onChange={(event) => trackChange((p) => ({ ...p, mobile: event.target.value }))}/>
          <EditableField label="Email Address" required type="email" readOnly value={profile.email} hint="Managed securely through your authenticated account."/>
        </div>
        <div className="ls-actions">
          <Button type="button" variant="outline" onClick={cancelProfile} disabled={isUpdatingProfile}>Cancel</Button>
          <Button type="button" onClick={() => void saveProfile()} disabled={isUpdatingProfile || !profileDirty}>
            {isUpdatingProfile ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </section>

      <section className="ls-card">
        <div className="ls-section-head">
          <div>
            <h2>Business Information</h2>
            <p>Manage your business verification and permit details.</p>
          </div>
          <div className="ls-section-head-actions">
            <Button
              type="button"
              variant="outline"
              disabled={!permitApartment}
              title={permitApartment ? "View or update your business permit details" : "Add a property first to manage permit details"}
              onClick={() => setPermitModalOpen(true)}
              className="ls-permit-update"
            >
              View / Update Permit
            </Button>
            <span className="ls-readonly-badge"><Lock className="ls-readonly-icon"/>READ-ONLY</span>
          </div>
        </div>
        {permitFileUrl ? (<div className="ls-permit-file">
            {permitIsImage ? (<a className="ls-permit-thumb" href={permitFileUrl} target="_blank" rel="noopener noreferrer" title="View business permit image">
                <img src={permitFileUrl} alt="Business permit document"/>
              </a>) : (<a className="ls-permit-file-icon" href={permitFileUrl} target="_blank" rel="noopener noreferrer" title="View business permit document"><FileText/></a>)}
            <span>
              <strong className="ls-permit-file-name">{permitFileLabel}</strong>
              <small className="ls-permit-file-meta">{isPermitVerified ? "Verified — approved by admin" : "Submitted for verification"}</small>
            </span>
            <a className="ls-permit-view" href={permitFileUrl} target="_blank" rel="noopener noreferrer">View</a>
          </div>) : (<p className="ls-empty">No business permit document has been submitted yet.</p>)}
        <div className="ls-grid-3">
          <div>
            <p className="ls-meta-label">Permit Number</p>
            <p className="ls-meta-value">{permitNumber || "Not provided"}</p>
          </div>
          <div>
            <p className="ls-meta-label">Issue Date</p>
            <p className="ls-meta-value">{formatDate(landlordProfile?.permit_issue ?? landlordProfile?.permit_issued_at)}</p>
          </div>
          <div>
            <p className="ls-meta-label">Expiry Date</p>
            <p className="ls-meta-value">{formatDate(permitExpiry)}</p>
          </div>
        </div>
      </section>

      <section className="ls-card">
        <div className="ls-section-head">
          <h2>Change Password</h2>
          <p>Update your password to keep your landlord account secure.</p>
        </div>
        <div className="ls-stack">
          <div className="ls-field">
            <label className="ls-field-label">Current Password</label>
            <div className="ls-field-control">
              <input type={passwordState.showCurrent ? "text" : "password"} value={passwordState.current} placeholder="Enter current password" onChange={(event) => setPasswordState((p) => ({ ...p, current: event.target.value }))} className="ls-field-input is-editing"/>
            </div>
          </div>
          <div className="ls-field">
            <label className="ls-field-label">New Password</label>
            <div className="ls-field-control">
              <input type={passwordState.showNew ? "text" : "password"} value={passwordState.new} placeholder="Enter new password" onChange={(event) => setPasswordState((p) => ({ ...p, new: event.target.value }))} className="ls-field-input is-editing"/>
            </div>
            <p className="ls-field-hint">At least 8 characters with letters, numbers, and symbols</p>
          </div>
          <div className="ls-field">
            <label className="ls-field-label">Confirm New Password</label>
            <div className="ls-field-control">
              <input type={passwordState.showConfirm ? "text" : "password"} value={passwordState.confirm} placeholder="Re-enter new password" onChange={(event) => setPasswordState((p) => ({ ...p, confirm: event.target.value }))} className="ls-field-input is-editing"/>
            </div>
          </div>
        </div>
        <div className="ls-actions">
          <Button type="button" variant="outline" onClick={cancelPassword} disabled={passwordState.isChanging}>Cancel</Button>
          <Button type="button" onClick={handlePasswordChange} disabled={passwordState.isChanging}>
            {passwordState.isChanging ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </section>

      <section className="ls-card ls-danger">
        <div className="ls-danger-copy">
          <h2><ShieldAlert className="ls-danger-title-icon"/>Danger Zone</h2>
          <p className="ls-danger-subtitle">Delete Account</p>
          <p>Permanently deletes your account and all associated data, including your profile, properties, and other information. This action cannot be undone.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleDeleteAccount()} className="ls-danger-button">
          <Trash2 className="ls-danger-icon"/>
          Delete Account
        </Button>
      </section>

      {permitModalOpen && (<UpdateBusinessPermitModal
        apartments={myApartments ?? []}
        initialPermitNumber={permitNumber}
        initialExpiryDate={permitExpiry}
        actorUserId={user?.id}
        onSaved={() => {
            setPermitReloadKey((current) => current + 1);
            onPermitSaved?.();
        }}
        onClose={() => setPermitModalOpen(false)}
      />)}
    </div>);
}
