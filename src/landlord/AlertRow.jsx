import "./AlertRow.css";
import { SettingsToggle as Toggle } from "@/landlord/SettingsFormFields";
export const AlertRow = ({ label, hint, pushVal, onPush }) => (<div className="alert-row-row">
    <div className="alert-row-panel">
      <p className="alert-row-text">{label}</p>
      {hint && <p className="alert-row-text-2">{hint}</p>}
    </div>
    <Toggle checked={pushVal} onChange={onPush}/>
  </div>);
