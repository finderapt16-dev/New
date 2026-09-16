import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { ClipboardList, LifeBuoy, LogOut, Shield, User as UserIcon, Users, Wrench } from "lucide-react";
import { NAV_ACCOUNT, NAV_MAIN } from './adminDashboardHelpers';
export function AdminSidebar({ activeSection, isSuperAdminPortal, user, pendingReports, activeAppealsCount, pendingCount, unreadNotifsCount, navigateToAdminModule, handleLogout, }) {
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
          <span><strong className="admin-sidebar-apt-findr">AptFindr</strong><small className="admin-sidebar-small">{isSuperAdminPortal ? "Super Admin Portal" : "Admin Portal"}</small></span>
        </div>
      </div>
      <div className="admin-sidebar-panel">
        <div className="app-sidebar-profile">
          <div className="admin-sidebar-row-2">{user?.name?.[0]?.toUpperCase() ?? "A"}</div>
          <div className="admin-sidebar-panel-2"><p className="admin-sidebar-text">{user?.name ?? (isSuperAdminPortal ? "Super Administrator" : "Admin")}</p><p className="admin-sidebar-text-2">{user?.email ?? ""}</p>{isSuperAdminPortal && <span className="admin-sidebar-super-admin">SUPER ADMIN</span>}</div>
          <Shield className="admin-sidebar-shield-icon" aria-label={isSuperAdminPortal ? "Super Administrator account" : "Administrator account"}/>
        </div>
      </div>
      <nav className="admin-sidebar-nav">
        <p className="admin-sidebar-text-3"><span>Main</span><span className="admin-sidebar-span"/></p>
        {(isSuperAdminPortal ? NAV_MAIN.filter(({ section }) => section === "overview") : NAV_MAIN).map(({ icon: Icon, label, section }) => {
            const count = label === "Reports" ? pendingReports : label === "Appeals" ? activeAppealsCount : label === "Landlords" ? pendingCount : label === "Notifications" ? unreadNotifsCount : 0;
            return (<button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => navigateToAdminModule(section)} className={navItemClass(section)}>
              <Icon className="admin-sidebar-icon-icon"/><span className="admin-sidebar-span-2">{label}</span>
              {count > 0 && <span className={countBadge}>{count}</span>}
            </button>);
        })}
        {isSuperAdminPortal && <>
          <button aria-current={activeSection === "admin-management" ? "page" : undefined} onClick={() => navigateToAdminModule("admin-management")} className={navItemClass("admin-management")}><Users className="admin-sidebar-users-icon"/><span className="admin-sidebar-admins">Admins</span></button>
          <button aria-current={activeSection === "user-management" ? "page" : undefined} onClick={() => navigateToAdminModule("user-management")} className={navItemClass("user-management")}><UserIcon className="admin-sidebar-user-icon-icon"/><span className="admin-sidebar-users">Users</span></button>
          <button aria-current={activeSection === "help-center" ? "page" : undefined} onClick={() => navigateToAdminModule("help-center")} className={navItemClass("help-center")}><LifeBuoy className="admin-sidebar-life-buoy-icon"/><span className="admin-sidebar-help-center">Help Center</span></button>
          <button aria-current={activeSection === "audit-logs" ? "page" : undefined} onClick={() => navigateToAdminModule("audit-logs")} className={navItemClass("audit-logs")}><ClipboardList className="admin-sidebar-clipboard-list-icon"/><span className="admin-sidebar-audit-logs">Audit Logs</span></button>
          <button aria-current={activeSection === "system-control" ? "page" : undefined} onClick={() => navigateToAdminModule("system-control")} className={navItemClass("system-control")}><Wrench className="admin-sidebar-wrench-icon"/><span className="admin-sidebar-system-control">System Control</span></button>
        </>}
      </nav>
      <nav className="admin-sidebar-nav-2">
        <p className="admin-sidebar-text-3"><span>Account</span><span className="admin-sidebar-span"/></p>
        {isSuperAdminPortal && <button aria-current={activeSection === "profile" ? "page" : undefined} onClick={() => navigateToAdminModule("profile")} className={navItemClass("profile")}><UserIcon className="admin-sidebar-user-icon-icon"/><span className="admin-sidebar-profile">Profile</span></button>}
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
