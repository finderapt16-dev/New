import { useEffect, useRef } from "react";
import { X, FileText, FileCheck2, Bed, Image as ImageIcon, Tag, ShieldCheck } from "lucide-react";
import "./PropertyGuidelines.css";

const GUIDELINES = [
  {
    icon: FileText,
    iconColor: "#0284c7",
    iconBg: "#eff6ff",
    iconBorder: "#dbeafe",
    title: "Accurate Apartment Information",
    description:
      "Apartment name, address, unit configuration, prices, and amenities must be factual and kept up to date.",
  },
  {
    icon: FileCheck2,
    iconColor: "#16a34a",
    iconBg: "#f0fdf4",
    iconBorder: "#dcfce7",
    title: "Valid Permit Information",
    description:
      "Required business permit documents and ownership records must be valid and correspond to the listed apartment.",
  },
  {
    icon: Bed,
    iconColor: "#9333ea",
    iconBg: "#faf5ff",
    iconBorder: "#f3e8ff",
    title: "Accurate Unit Availability",
    description:
      "Units marked as Available, Occupied, or Under Maintenance should reflect their true structural status down the database schema.",
  },
  {
    icon: ImageIcon,
    iconColor: "#ea580c",
    iconBg: "#fff7ed",
    iconBorder: "#ffedd5",
    title: "Apartment Photos",
    description:
      "Uploaded photos should accurately represent the interior unit layouts and exterior building facade (Max 5 photo limit applies).",
  },
  {
    icon: Tag,
    iconColor: "#e11d48",
    iconBg: "#fff1f2",
    iconBorder: "#ffe4e6",
    title: "Pricing Transparency",
    description:
      "Rental prices shown on the active listing should match the actual monthly baseline costs of the available units.",
  },
  {
    icon: ShieldCheck,
    iconColor: "#0d9488",
    iconBg: "#f0fdfa",
    iconBorder: "#ccfbf1",
    title: "Listing Compliance",
    description:
      "Apartment profiles must comply with AptFindr's community rules and pass administrative moderator review before publication.",
  },
];

export function PropertyGuidelines({ open, onClose, onProceed }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ld-guidelines-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guidelines-modal-title"
    >
      <div
        className="ld-guidelines-modal"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        <button
          type="button"
          className="ld-guidelines-close-btn"
          onClick={onClose}
          aria-label="Close guidelines"
        >
          <X size={18} />
        </button>

        <header className="ld-guidelines-header">
          <h2 id="guidelines-modal-title">Apartment Listing Guidelines</h2>
          <p className="ld-guidelines-subtitle">
            Review AptFindr's requirements for maintaining a valid and accurate listing.
          </p>
        </header>

        <p className="ld-guidelines-intro">
          Please follow these guidelines to ensure your apartment listing complies with AptFindr's
          verification requirements.
        </p>

        <div className="ld-guidelines-list">
          {GUIDELINES.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="ld-guideline-item">
                <div
                  className="ld-guideline-icon-wrapper"
                  style={{
                    backgroundColor: item.iconBg,
                    borderColor: item.iconBorder,
                    color: item.iconColor,
                  }}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div className="ld-guideline-text">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ld-guidelines-footer">
          <button
            type="button"
            className="ld-guidelines-accept-btn"
            onClick={onProceed}
          >
            Accept & Proceed to Form
          </button>
        </div>
      </div>
    </div>
  );
}
