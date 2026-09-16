export function AuthField({ id, label, type = "text", value, onChange, required, placeholder, icon, suffix, }) {
    return (<div className="auth-field">
      <label htmlFor={id} className="auth-field-label">
        {label}{required && <span className="auth-field-required">*</span>}
      </label>
      <div className="auth-field-control">
        {icon && <span className="auth-field-icon">{icon}</span>}
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder ?? `Enter your ${label.toLowerCase()}`} required={required} className={`auth-field-input ${icon ? "auth-field-with-icon" : ""} ${suffix ? "auth-field-with-suffix" : ""}`}/>
        {suffix && <div className="auth-field-suffix">{suffix}</div>}
      </div>
    </div>);
}
