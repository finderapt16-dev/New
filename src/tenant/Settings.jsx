import { Pencil } from "lucide-react";
import { useState } from "react";

const fields = [
    { key: "firstName", label: "First Name", required: true, autoComplete: "given-name" },
    { key: "lastName", label: "Last Name", required: true, autoComplete: "family-name" },
    { key: "middleInitial", label: "Middle Initial (Optional)", autoComplete: "additional-name" },
    { key: "mobile", label: "Mobile Number (Optional)", type: "tel", autoComplete: "tel" },
    { key: "email", label: "Email Address", required: true, type: "email", autoComplete: "email" },
];

export function Settings({ profile, setProfile, user, onUpload, onRemove, onSave, loading }) {
    const [busy, setBusy] = useState(false);
    const runAction = async (action) => {
        setBusy(true);
        try { await action(); }
        finally { setBusy(false); }
    };
    const disabled = loading || busy;
    return (
        <div className="tenant-profile-settings">
            <header className="tenant-profile-heading">
                <h1>Settings</h1>
                <p>Manage your profile, notification preferences, and account security.</p>
            </header>

            <div className="tenant-profile-summary">
                <div className="tenant-profile-identity">
                    <div className="tenant-profile-avatar">
                        {profile.avatar ? <img src={profile.avatar} alt="Profile" /> : (profile.firstName[0] || user?.name?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="tenant-profile-name">
                        <h2>{[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Your profile"}</h2>
                        <p>{profile.email}</p>
                    </div>
                </div>
                <div className="tenant-profile-photo-actions">
                    <label className={`tenant-profile-upload${disabled ? " is-disabled" : ""}`}>
                        Upload Photo
                        <input aria-label="Upload profile photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => void runAction(() => onUpload(event))} />
                    </label>
                    <button type="button" disabled={disabled} onClick={() => void runAction(onRemove)}>Remove Photo</button>
                    <p>JPG, PNG, or WebP up to 2MB</p>
                </div>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); void runAction(onSave); }}>
                <div className="tenant-profile-information">
                    <h2>Personal Information</h2>
                    <p>Update your personal details.</p>
                    <div className="tenant-profile-fields">
                        {fields.map(({ key, label, required, type = "text", autoComplete }) => (
                            <div className="tenant-profile-field" key={key}>
                                <label htmlFor={`tenant-profile-${key}`}>{label}{required && <span> *</span>}</label>
                                <div className="tenant-profile-input-wrap">
                                    <input id={`tenant-profile-${key}`} type={type} autoComplete={autoComplete} required={required} disabled={disabled} value={profile[key]} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} />
                                    <Pencil aria-hidden="true" size={16} />
                                </div>
                                {key === "email" && <p>Managed securely through your authenticated account.</p>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="tenant-profile-save-actions">
                    <button type="button" disabled={disabled} onClick={() => setProfile((current) => ({ ...current, firstName: "", lastName: "", middleInitial: "", mobile: "", email: "" }))}>Clear</button>
                    <button className="tenant-profile-save" type="submit" disabled={disabled}>{busy ? "Saving..." : "Save Changes"}</button>
                </div>
            </form>
        </div>
    );
}
