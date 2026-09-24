import "./SettingsFormFields.css";
export const SettingsField = ({ label, hint, children }) => (<div className="settings-fields-panel">
    <label className="settings-fields-label">{label}</label>
    {children}
    {hint && <p className="settings-fields-text">{hint}</p>}
  </div>);
export const SettingsInput = (props) => (<input {...props} className="settings-fields-input"/>);
export const SettingsSelect = ({ children, ...props }) => (<select {...props} className="settings-fields-select">
    {children}
  </select>);
export const SettingsTextarea = (props) => (<textarea {...props} className="settings-fields-textarea"/>);
export const SettingsToggle = ({ checked, onChange, disabled }) => (<button type="button" onClick={() => !disabled && onChange(!checked)} className={`settings-fields-button ${checked ? "settings-fields-button-2" : "settings-fields-button-3"} ${disabled ? "settings-fields-button-4" : "settings-fields-button-5"}`}>
    <span className={`settings-fields-span ${checked ? "settings-fields-span-2" : "settings-fields-span-3"}`}/>
  </button>);
export const SettingsSectionTitle = ({ icon, title, subtitle }) => (<div className="settings-fields-row">
    {icon && <div className="settings-fields-card">{icon}</div>}
    <div>
      <h3 className="settings-fields-heading">{title}</h3>
      {subtitle && <p className="settings-fields-text-2">{subtitle}</p>}
    </div>
  </div>);
