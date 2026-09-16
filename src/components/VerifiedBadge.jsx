import { Check } from "lucide-react";
export function VerifiedBadge({ label = "Verified", showLabel = true, className = "" }) {
    return (<span className={`verified-badge ${className}`} aria-label={label} title={label}>
      <span className="verified-badge-seal">
        <Check className="verified-badge-check"/>
      </span>
      {showLabel && <span>{label}</span>}
    </span>);
}
