import { AlertTriangle, Bell, ChevronRight, Heart, HelpCircle, LogOut, Search, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/tenant/useFavorites";

const NAV_MAIN = [
    {
        icon: Search,
        label: "Apartments",
        section: "apartments",
        href: "/browse",
    },
    {
        icon: Heart,
        label: "My Favorites",
        section: "favorites",
        href: "/favorites",
    },
    {
        icon: Bell,
        label: "Notifications",
        section: "notifications",
    },
];
const NAV_ACCOUNT = [
    {
        icon: Settings,
        label: "Settings",
        section: "settings",
    },
    {
        icon: AlertTriangle,
        label: "Report a Problem",
        section: "report",
    },
    {
        icon: HelpCircle,
        label: "Help",
        section: "help",
    },
];
export function Sidebar({ active = "apartments", unreadCount = 0, tenantNotifications, activeSection, setActiveSection, setSidebarOpen, displayName, favoriteIds, handleLogout, mode = "page", }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { favorites } = useFavorites();
    const resolvedDisplayName = displayName?.trim() || user?.name?.trim() || "Welcome";
    const resolvedUnreadCount = tenantNotifications?.unreadCount ?? unreadCount;
    const resolvedFavoriteCount = favoriteIds?.length ?? favorites.length;
    const currentSection = mode === "dashboard"
        ? activeSection
        : active;
    const closeSidebar = () => {
        setSidebarOpen?.(false);
    };
    const logoutUser = () => {
        closeSidebar();
        if (handleLogout) {
            handleLogout();
            return;
        }
        logout?.();
        navigate("/");
    };
    const openSection = (section) => {
        if (mode === "dashboard" && setActiveSection) {
            setActiveSection(section);
            closeSidebar();
            return;
        }
        navigate(`/dashboard?section=${section}`);
        closeSidebar();
    };
    const isActive = (section) => currentSection === section;
    const renderItem = (item) => {
        const Icon = item.icon;
        const badge = item.section === "favorites"
            ? resolvedFavoriteCount
            : item.section === "notifications"
                ? resolvedUnreadCount
                : 0;
        const itemContent = (<>
        <Icon className="tenant-sidebar-icon-icon"/>
        <span className="tenant-sidebar-span">{item.label}</span>

        {badge > 0 && (<span className="app-sidebar-badge">{badge}</span>)}
      </>);
        if (item.href) {
            return (<Link key={item.section} to={item.href} onClick={closeSidebar} aria-current={isActive(item.section) ? "page" : undefined} className={`app-sidebar-nav-item ${isActive(item.section)
                    ? "tenant-sidebar-link"
                    : "tenant-sidebar-link-2"}`}>
          {itemContent}
        </Link>);
        }
        return (<button key={item.section} type="button" aria-current={isActive(item.section) ? "page" : undefined} onClick={() => openSection(item.section)} className={`app-sidebar-nav-item ${isActive(item.section)
                ? "tenant-sidebar-link"
                : "tenant-sidebar-link-2"}`}>
        {itemContent}
      </button>);
    };
    return (<aside className="app-sidebar">
      <div className="app-sidebar-brand">
        <Link to="/browse" onClick={closeSidebar} className="tenant-sidebar-row">
          <div className="tenant-sidebar-card">
            <AppLogo className="tenant-sidebar-app-logo"/>
          </div>

          <div>
            <span className="tenant-sidebar-apt-findr">AptFindr</span>
            <p className="tenant-sidebar-la-paz-iloilo-city">
              La Paz, Iloilo City
            </p>
          </div>
        </Link>
      </div>

      <div className="tenant-sidebar-panel">
        <div className="app-sidebar-profile">
          <div className="tenant-sidebar-row-2">
            {user?.avatar ? (<img src={user.avatar} alt="Profile" className="tenant-sidebar-image"/>) : (user?.name?.[0]?.toUpperCase() ?? "U")}
          </div>

          <div className="tenant-sidebar-panel-2">
            <p className="tenant-sidebar-text">
              {resolvedDisplayName}
            </p>
            <p className="tenant-sidebar-text-2">
              {user?.email ?? "Tenant Portal"}
            </p>
          </div>

          <ChevronRight className="tenant-sidebar-chevron-right-icon"/>
        </div>
      </div>

      <nav className="tenant-sidebar-nav">
        <p className="tenant-sidebar-main">Main</p>
        {NAV_MAIN.map(renderItem)}
      </nav>

      <nav className="tenant-sidebar-nav-2">
        <p className="tenant-sidebar-account">Account</p>
        {NAV_ACCOUNT.map(renderItem)}
      </nav>

      <div className="tenant-sidebar-panel-3">
        <LogoutConfirmation onConfirm={logoutUser}>
          <button type="button" className="app-sidebar-logout">
            <LogOut className="tenant-sidebar-log-out-icon"/>
            Log Out
          </button>
        </LogoutConfirmation>
      </div>
    </aside>);
}
