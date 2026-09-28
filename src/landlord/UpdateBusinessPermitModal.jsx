import "./UpdateBusinessPermitModal.css";
import { Button } from "@/components/ui/button";
import { updateApartment } from "@/data/apartments";
import { updateLandlordPermitProfile } from "@/services/dashboardSupabaseService";
import { uploadVerificationDocuments, VERIFICATION_DOCUMENT_TYPES } from "@/services/verificationDocumentsService";
import { apartmentToFormValues } from "@/utils/apartmentMappers";
import { Check, FileText, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_PERMIT_FILES = 5;
const MAX_PERMIT_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
// Mirrors the Add Property wizard: one file per verification slot, up to 5 slots.
const PERMIT_UPLOAD_TYPES = [
    "mayors_business_permit",
    "proof_of_ownership",
    "business_registration",
    "barangay_clearance",
    "additional_supporting_documents",
];

const documentLabel = (type) => VERIFICATION_DOCUMENT_TYPES.find((documentType) => documentType.key === type)?.label ?? "Supporting document";

const validatePermitFile = (file) => {
    if (!ACCEPTED_TYPES.has(file.type))
        return "Use a JPG, JPEG, PNG, or PDF file.";
    if (file.size > MAX_PERMIT_FILE_SIZE_MB * 1024 * 1024)
        return `Each file must be ${MAX_PERMIT_FILE_SIZE_MB} MB or smaller.`;
    return null;
};

const toDateInputValue = (value) => {
    const text = String(value ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text))
        return text.slice(0, 10);
    if (!text)
        return "";
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const verificationFromApartment = (apartment) => {
    const features = apartment?.features && !Array.isArray(apartment.features) ? apartment.features : {};
    return features.verification && typeof features.verification === "object" && !Array.isArray(features.verification) ? features.verification : {};
};

export function UpdateBusinessPermitModal({ apartments = [], initialPermitNumber = "", initialExpiryDate = "", actorUserId, onSaved, onClose }) {
    const [permitNumber, setPermitNumber] = useState(initialPermitNumber);
    const [expiryDate, setExpiryDate] = useState(toDateInputValue(initialExpiryDate));
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        return () => {
            files.forEach((entry) => {
                if (entry.previewUrl)
                    URL.revokeObjectURL(entry.previewUrl);
            });
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape")
                onClose?.();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const addFiles = (fileList) => {
        const incoming = Array.from(fileList ?? []);
        if (incoming.length === 0)
            return;
        setFiles((current) => {
            const next = [...current];
            for (const file of incoming) {
                if (next.length >= MAX_PERMIT_FILES) {
                    toast.error(`You can upload up to ${MAX_PERMIT_FILES} files.`);
                    break;
                }
                const validationError = validatePermitFile(file);
                if (validationError) {
                    toast.error(`${file.name}: ${validationError}`);
                    continue;
                }
                const duplicate = next.some((entry) => entry.file.name === file.name && entry.file.size === file.size);
                if (duplicate) {
                    toast.error(`${file.name} is already selected.`);
                    continue;
                }
                const usedTypes = new Set(next.map((entry) => entry.type));
                const type = PERMIT_UPLOAD_TYPES.find((candidate) => !usedTypes.has(candidate)) ?? PERMIT_UPLOAD_TYPES[0];
                next.push({
                    key: `${file.name}-${file.size}-${next.length}-${Date.now()}`,
                    file,
                    type,
                    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
                });
            }
            return next;
        });
    };

    const updateFileType = (key, nextType) => {
        if (!PERMIT_UPLOAD_TYPES.includes(nextType))
            return;
        setFiles((current) => {
            if (current.some((entry) => entry.type === nextType && entry.key !== key))
                return current;
            return current.map((entry) => (entry.key === key ? { ...entry, type: nextType } : entry));
        });
    };

    const removeFile = (key) => {
        setFiles((current) => {
            const removed = current.find((entry) => entry.key === key);
            if (removed?.previewUrl)
                URL.revokeObjectURL(removed.previewUrl);
            return current.filter((entry) => entry.key !== key);
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting)
            return;
        const permit = permitNumber.trim();
        if (!permit) {
            toast.error("Business permit number is required.");
            return;
        }
        if (!expiryDate) {
            toast.error("Permit expiry date is required.");
            return;
        }
        const targets = apartments.filter((apartment) => apartment?.id);
        if (targets.length === 0) {
            toast.error("Add a property first to manage its permit details.");
            return;
        }
        setIsSubmitting(true);
        try {
            const documents = files.map((entry) => ({ type: entry.type, file: entry.file }));
            for (const apartment of targets) {
                if (documents.length > 0) {
                    await uploadVerificationDocuments(apartment.id, apartment.landlordId ?? actorUserId, documents);
                }
                const features = apartment.features && !Array.isArray(apartment.features) ? apartment.features : {};
                const verification = {
                    ...verificationFromApartment(apartment),
                    businessPermit: permit,
                    permitExpiry: expiryDate,
                };
                await updateApartment(apartment.id, apartmentToFormValues({
                    ...apartment,
                    images: apartment.images ?? [],
                    features: { ...features, verification },
                }), actorUserId);
            }
            await updateLandlordPermitProfile(targets[0].landlordId ?? actorUserId, { permitNumber: permit, permitExpiry: expiryDate });
            onSaved?.();
            setSubmitted(true);
        }
        catch (error) {
            console.error("Failed to update business permit:", error);
            toast.error(error instanceof Error ? error.message : "Unable to save business permit details.");
        }
        finally {
            setIsSubmitting(false);
        }
    };

    return (<div className="ubp-overlay" role="presentation">
        <div className="ubp-overlay-backdrop" onClick={onClose} />
        {submitted ? (<div className="ubp-card ubp-card-success" role="dialog" aria-modal="true" aria-label="Permit details submitted">
            <button type="button" className="ubp-close-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
            <div className="ubp-success-icon"><Check size={38} strokeWidth={3} /></div>
            <h2 className="ubp-success-title">Permit Details Submitted</h2>
            <p className="ubp-success-text">Your updated business permit verification records have been successfully uploaded and are currently under review by our administration team. This process typically takes 1 to 2 business days.</p>
            <Button type="button" onClick={onClose} className="ubp-submit">Close</Button>
        </div>) : (<form className="ubp-card" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Update business permit">
            <h2 className="ubp-title">Update Business Permit</h2>
            <div className="ubp-field">
                <span className="ubp-label"><strong>Upload Permit</strong> (PDF or Image)</span>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="ubp-file-input"
                    onChange={(event) => {
                        addFiles(event.target.files);
                        event.currentTarget.value = "";
                    }}
                    aria-label="Upload business permit files"
                />
                {files.length < MAX_PERMIT_FILES && (
                    <div
                        className="ubp-dropzone"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            addFiles(event.dataTransfer.files);
                        }}
                    >
                        <button type="button" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={26} strokeWidth={1.5} />
                            <strong>Drag and drop files here or click to browse</strong>
                            <span>JPG, JPEG, or PNG • Max 5MB • Up to 5 files</span>
                        </button>
                    </div>
                )}
                {files.length > 0 && (
                    <div className="ubp-file-list">
                        {files.map((entry) => (
                            <div className="ubp-file-row" key={entry.key}>
                                {entry.previewUrl ? (
                                    <img src={entry.previewUrl} alt="" className="ubp-file-thumb" />
                                ) : (
                                    <span className="ubp-file-icon"><FileText size={16} /></span>
                                )}
                                <div className="ubp-file-info">
                                    <strong>{entry.file.name}</strong>
                                    <select
                                        aria-label={`Document category for ${entry.file.name}`}
                                        value={entry.type}
                                        onChange={(event) => updateFileType(entry.key, event.target.value)}
                                    >
                                        {PERMIT_UPLOAD_TYPES.map((type) => (
                                            <option key={type} value={type} disabled={files.some((other) => other.type === type && other.key !== entry.key)}>
                                                {documentLabel(type)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button type="button" className="ubp-file-remove" onClick={() => removeFile(entry.key)} aria-label={`Remove ${entry.file.name}`}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="ubp-field">
                <label className="ubp-label" htmlFor="ubp-permit-number">Permit Number</label>
                <input
                    id="ubp-permit-number"
                    className="ubp-input"
                    value={permitNumber}
                    onChange={(event) => setPermitNumber(event.target.value)}
                    placeholder="BP 2026-1231"
                />
            </div>
            <div className="ubp-field">
                <label className="ubp-label" htmlFor="ubp-expiry-date">Expiry Date</label>
                <input
                    id="ubp-expiry-date"
                    className="ubp-input"
                    type="date"
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                />
            </div>
            <div className="ubp-actions">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="ubp-close">Close</Button>
                <Button type="submit" disabled={isSubmitting} className="ubp-submit">{isSubmitting ? "Submitting..." : "Submit"}</Button>
            </div>
        </form>)}
    </div>);
}
