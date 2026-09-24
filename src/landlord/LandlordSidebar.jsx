import "./LandlordSidebar.css";
import { Bell, HelpCircle, LayoutGrid, ListPlus, LogOut, Settings, ShieldCheck, TrendingUp, User } from "lucide-react";
import { Link } from "react-router-dom";
import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { AppLogo } from "@/components/AppLogo";
const mainItems = [
    { label: "My Properties", section: "overview", icon: LayoutGrid },
    { label: "Market Trends", section: "market", icon: TrendingUp, to: "/browse" },
    { label: "Notifications", section: "notifications", icon: Bell },
];
const accountItems = [
    { label: "Settings", section: "settings", icon: Settings },
    { label: "Help & Support", section: "help", icon: HelpCircle },
];
export function LandlordSidebar({ user, verified = false, activeSection, unreadNotifications = 0, onSectionChange, onClose, onLogout }) {
    const selectSection = (section) => {
        onSectionChange(section);
        onClose?.();
    };
    const navClass = (active) => `app-sidebar-nav-item ${active ? "landlord-sidebar-nav-active" : "landlord-sidebar-nav-idle"}`;
    return (<div className="app-sidebar">
      <button type="button" onClick={() => selectSection("overview")} className="app-sidebar-brand">
        <span className="landlord-sidebar-row"><span className="landlord-sidebar-card"><AppLogo className="landlord-sidebar-app-logo"/></span><span><strong className="landlord-sidebar-apt-findr">AptFindr</strong><small className="landlord-sidebar-landlord-portal">La Paz, Iloilo City</small></span></span>
      </button>

      <div className="landlord-sidebar-panel">
        <div className="app-sidebar-profile">
          <span className="landlord-sidebar-row-2">{user?.avatar ? <img src={user.avatar} alt="Profile" className="landlord-sidebar-image"/> : user?.name?.[0]?.toUpperCase() ?? <User className="landlord-sidebar-user-icon"/>}</span>
          <span className="landlord-sidebar-span"><strong className="landlord-sidebar-strong">{user?.name || "Name unavailable"}</strong><small className="landlord-sidebar-small">{user?.email ?? ""}</small></span>
          {verified && <ShieldCheck className="landlord-sidebar-shield-check-icon"/>}
        </div>
      </div>

      <nav className="landlord-sidebar-nav"><p className="landlord-sidebar-main">Main<span className="landlord-sidebar-main-2"/></p><div className="landlord-sidebar-panel-2">{mainItems.map(({ label, section, icon: Icon, to }) => to ? <Link key={section} to={to} onClick={onClose} aria-current={activeSection === section ? "page" : undefined} className={navClass(activeSection === section)}><Icon className="landlord-sidebar-icon-icon"/>{label}</Link> : <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => selectSection(section)} className={navClass(activeSection === section)}><Icon className="landlord-sidebar-icon-icon"/>{label}{section === "notifications" && unreadNotifications > 0 && <span className="app-sidebar-badge">{unreadNotifications}</span>}</button>)}</div></nav>
      <nav className="landlord-sidebar-nav-2"><p className="landlord-sidebar-manage">Manage<span className="landlord-sidebar-manage-2"/></p><Link to="/add-apartment" onClick={onClose} className="landlord-sidebar-add-property"><ListPlus className="landlord-sidebar-list-plus-icon"/>Add Property</Link></nav>
      <nav className="landlord-sidebar-nav-2"><p className="landlord-sidebar-account">Account<span className="landlord-sidebar-account-2"/></p><div className="landlord-sidebar-panel-2">{accountItems.map(({ label, section, icon: Icon }) => <button key={section} aria-current={activeSection === section ? "page" : undefined} onClick={() => selectSection(section)} className={navClass(activeSection === section)}><Icon className="landlord-sidebar-icon-icon"/>{label}</button>)}</div></nav>
      <div className="landlord-sidebar-panel-3"/>
      <div className="landlord-sidebar-panel-4"><LogoutConfirmation onConfirm={onLogout}><button className="app-sidebar-logout"><LogOut className="landlord-sidebar-log-out-icon"/>Log Out</button></LogoutConfirmation></div>
    </div>);
}
