import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { LogOut } from "lucide-react";
import "./AdminSidebar.css";
import { NAV_ACCOUNT, NAV_MAIN, NAV_MANAGEMENT } from './adminDashboardHelpers';
export function AdminSidebar({ activeSection, pendingReports, activeAppealsCount, unreadNotifsCount, navigateToAdminModule, handleLogout, }) {
    const navItemClass = (section) => `app-sidebar-nav-item ${activeSection === section
        ? "admin-sidebar-nav-active"
        : "admin-sidebar-nav-idle"}`;
    const countBadge = "app-sidebar-badge";
    return (<div className="app-sidebar">
      <div className="app-sidebar-brand">
        <div className="admin-sidebar-row">
          <span className="admin-sidebar-card">
            <img src="/icon.svg" alt="" className="admin-sidebar-image" aria-hidden="true"/>
          </span>
          <span><strong className="admin-sidebar-apt-findr">AptFindr</strong><small className="admin-sidebar-small">{"Admin Portal"}</small></span>
        </div>
      </div>
      <nav className="admin-sidebar-nav">
        <p className="admin-sidebar-text-3"><span>Main</span><span className="admin-sidebar-span"/></p>
        {(NAV_MAIN).map(({ icon: Icon, label, section }) => {
            const count = label === "Reports" ? pendingReports : label === "Appeals" ? activeAppealsCount : label === "Notifications" ? unreadNotifsCount : 0;
            return (<button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => navigateToAdminModule(section)} className={navItemClass(section)}>
              <Icon className="admin-sidebar-icon-icon"/><span className="admin-sidebar-span-2">{label}</span>
              {count > 0 && <span className={countBadge}>{count}</span>}
            </button>);
        })}
      </nav>
      <nav className="admin-sidebar-nav admin-sidebar-nav-management">
        <p className="admin-sidebar-text-3"><span>Management</span></p>
        {NAV_MANAGEMENT.map(({ icon: Icon, label, section }) => {
            const count = label === "Reports" ? pendingReports : activeAppealsCount;
            return <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => navigateToAdminModule(section)} className={navItemClass(section)}><Icon className="admin-sidebar-icon-icon"/><span className="admin-sidebar-span-2">{label}</span>{count > 0 && <span className={countBadge}>{count}</span>}</button>;
        })}
      </nav>
      <nav className="admin-sidebar-nav-2">
        <p className="admin-sidebar-text-3"><span>Account</span><span className="admin-sidebar-span"/></p>
        {NAV_ACCOUNT.map(({ icon: Icon, label, section }) => (<button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => navigateToAdminModule(section)} className={navItemClass(section)}>
            <Icon className="admin-sidebar-icon-icon"/><span className="admin-sidebar-span-2">{label}</span>
          </button>))}
      </nav>
      <div className="admin-sidebar-panel-3"/>
      <div className="admin-sidebar-panel-4">
        <LogoutConfirmation onConfirm={handleLogout}>
          <button className="app-sidebar-logout">
            <LogOut className="admin-sidebar-log-out-icon"/><span>Log Out</span>
          </button>
        </LogoutConfirmation>
      </div>
    </div>);
}
