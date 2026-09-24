import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const fields = [
    {
        key: "firstName",
        label: "First Name",
        required: true,
        autoComplete: "given-name",
    },
    {
        key: "lastName",
        label: "Last Name",
        required: true,
        autoComplete: "family-name",
    },
    {
        key: "middleInitial",
        label: "Middle Initial (Optional)",
        autoComplete: "additional-name",
    },
    {
        key: "mobile",
        label: "Mobile Number (Optional)",
        type: "tel",
        autoComplete: "tel",
    },
    {
        key: "email",
        label: "Email Address",
        required: true,
        type: "email",
        autoComplete: "email",
    },
];

export function Settings({
    profile,
    setProfile,
    user,
    onUpload,
    onRemove,
    onSave,
    loading,
    onDeleteAccount,
}) {
    const [busy, setBusy] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    const runAction = async (action) => {
        setBusy(true);

        try {
            await action();
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!onDeleteAccount || deletingAccount) return;

        setDeletingAccount(true);

        try {
            await onDeleteAccount();

            /*
             * Do not close the dialog before the deletion request succeeds.
             * The parent should handle logout/navigation after successful
             * account deletion.
             */
            setDeleteModalOpen(false);
        } catch (error) {
            console.error("Failed to delete account:", error);
        } finally {
            setDeletingAccount(false);
        }
    };

    const disabled = loading || busy;

    return (
        <div className="tenant-profile-settings">
            <header className="tenant-profile-heading">
                <h1>Settings</h1>

                <p>
                    Manage your profile, notification preferences,
                    and account security.
                </p>
            </header>

            <div className="tenant-profile-summary">
                <div className="tenant-profile-identity">
                    <div className="tenant-profile-avatar">
                        {profile.avatar ? (
                            <img
                                src={profile.avatar}
                                alt="Profile"
                            />
                        ) : (
                            (
                                profile.firstName?.[0] ||
                                user?.name?.[0] ||
                                "U"
                            ).toUpperCase()
                        )}
                    </div>

                    <div className="tenant-profile-name">
                        <h2>
                            {[
                                profile.firstName,
                                profile.lastName,
                            ]
                                .filter(Boolean)
                                .join(" ") || "Your profile"}
                        </h2>

                        <p>{profile.email}</p>
                    </div>
                </div>

                <div className="tenant-profile-photo-actions">
                    <label
                        className={`tenant-profile-upload${
                            disabled ? " is-disabled" : ""
                        }`}
                    >
                        Upload Photo

                        <input
                            aria-label="Upload profile photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={disabled}
                            onChange={(event) =>
                                void runAction(() =>
                                    onUpload(event)
                                )
                            }
                        />
                    </label>

                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            void runAction(onRemove)
                        }
                    >
                        Remove Photo
                    </button>

                    <p>JPG, PNG, or WebP up to 2MB</p>
                </div>
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void runAction(onSave);
                }}
            >
                <div className="tenant-profile-information">
                    <h2>Personal Information</h2>

                    <p>Update your personal details.</p>

                    <div className="tenant-profile-fields">
                        {fields.map(
                            ({
                                key,
                                label,
                                required,
                                type = "text",
                                autoComplete,
                            }) => (
                                <div
                                    className="tenant-profile-field"
                                    key={key}
                                >
                                    <label
                                        htmlFor={`tenant-profile-${key}`}
                                    >
                                        {label}

                                        {required && (
                                            <span> *</span>
                                        )}
                                    </label>

                                    <div className="tenant-profile-input-wrap">
                                        <input
                                            id={`tenant-profile-${key}`}
                                            type={type}
                                            autoComplete={
                                                autoComplete
                                            }
                                            required={required}
                                            disabled={disabled}
                                            value={
                                                profile[key] ?? ""
                                            }
                                            onChange={(event) =>
                                                setProfile(
                                                    (current) => ({
                                                        ...current,
                                                        [key]:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }
                                        />

                                        <Pencil
                                            aria-hidden="true"
                                            size={16}
                                        />
                                    </div>

                                    {key === "email" && (
                                        <p>
                                            Managed securely
                                            through your
                                            authenticated account.
                                        </p>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>

                <div className="tenant-profile-save-actions">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            setProfile((current) => ({
                                ...current,
                                firstName: "",
                                lastName: "",
                                middleInitial: "",
                                mobile: "",
                                email: "",
                            }))
                        }
                    >
                        Clear
                    </button>

                    <button
                        className="tenant-profile-save"
                        type="submit"
                        disabled={disabled}
                    >
                        {busy
                            ? "Saving..."
                            : "Save Changes"}
                    </button>
                </div>
            </form>

            {/* Danger Zone */}
            <section className="tenant-profile-danger-zone">
                <div className="tenant-profile-danger-content">
                    <div className="tenant-profile-danger-info">
                        <h2>Danger Zone</h2>

                        <h3>Delete Account</h3>

                        <p>
                            Permanently delete your account and
                            associated data. This action cannot be
                            undone.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="tenant-profile-delete-button"
                        disabled={loading || deletingAccount}
                        onClick={() =>
                            setDeleteModalOpen(true)
                        }
                    >
                        Delete Account
                    </button>
                </div>
            </section>

            {/* Delete Account Confirmation */}
            {deleteModalOpen && (
                <div
                    className="tenant-profile-delete-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !deletingAccount
                        ) {
                            setDeleteModalOpen(false);
                        }
                    }}
                >
                    <div
                        className="tenant-profile-delete-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tenant-delete-title"
                    >
                        <div className="tenant-profile-delete-warning">
                            <AlertTriangle
                                aria-hidden="true"
                                size={22}
                            />
                        </div>

                        <h2 id="tenant-delete-title">
                            Delete Account?
                        </h2>

                        <p>
                            This will permanently delete your
                            AptFindr account and associated account
                            data. This action cannot be undone.
                        </p>

                        {!onDeleteAccount && (
                            <div className="tenant-profile-delete-unavailable">
                                Account deletion is not connected
                                yet. A secure deletion service must
                                be configured before this action can
                                be completed.
                            </div>
                        )}

                        <div className="tenant-profile-delete-actions">
                            <button
                                type="button"
                                className="tenant-profile-delete-cancel"
                                disabled={deletingAccount}
                                onClick={() =>
                                    setDeleteModalOpen(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="tenant-profile-delete-confirm"
                                disabled={
                                    deletingAccount ||
                                    !onDeleteAccount
                                }
                                onClick={() =>
                                    void handleDeleteAccount()
                                }
                            >
                                <Trash2
                                    aria-hidden="true"
                                    size={16}
                                />

                                {deletingAccount
                                    ? "Deleting..."
                                    : "Delete Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}