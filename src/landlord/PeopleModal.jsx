import "./PeopleModal.css";
import { X } from "lucide-react";
export function PeopleModal({ open, onClose, title, subtitle, icon: Icon, iconTone, names, }) {
    if (!open)
        return null;
    return (<div className="people-modal-overlay" onClick={onClose}>
      <div className="people-modal-overlay-2"/>
      <div className="people-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="people-modal-row">
          <div className="people-modal-row-2">
            <div className={`people-modal-row-3 ${iconTone === "views" ? "people-modal-icon-views" : "people-modal-icon-favorites"}`}>
              <Icon className="people-modal-icon-icon"/>
            </div>
            <div>
              <p className="people-modal-text">{title}</p>
              <p className="people-modal-text-2">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="people-modal-button">
            <X className="people-modal-x-icon"/>
          </button>
        </div>
        <div className="people-modal-panel">
          {names.length === 0 ? (<div className="people-modal-no-one-yet">No one yet</div>) : (names.map((name, i) => (<div key={i} className="people-modal-row-4">
                <div className="people-modal-row-5">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className="people-modal-span">{name}</span>
              </div>)))}
        </div>
        <div className="people-modal-panel-2">
          <p className="people-modal-total">
            {names.length} {names.length === 1 ? "person" : "people"} total
          </p>
        </div>
      </div>
    </div>);
}
