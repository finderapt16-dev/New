import { useAuth } from "@/contexts/AuthContext";
import { Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isTenantRole } from "@/services/authService";
function DashboardLoader() {
    return <div className="auth-status-page auth-dashboard-loading">Loading your dashboard...</div>;
}
// Role selection and redirects are unchanged; App.jsx supplies the lazy pages.
export function Dashboard({ tenant, landlord, admin }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    if (isLoading) {
        return <DashboardLoader />;
    }
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }
    // Show appropriate dashboard based on role
    if (user?.role === "admin") {
        return <Suspense fallback={<DashboardLoader />}>{admin}</Suspense>;
    }
    if (user?.role === "landlord") {
        return <Suspense fallback={<DashboardLoader />}>{landlord}</Suspense>;
    }
    if (isTenantRole(user?.role)) {
        if (!new URLSearchParams(location.search).get("section")) {
            return <Navigate to="/browse" replace/>;
        }
        return <Suspense fallback={<DashboardLoader />}>{tenant}</Suspense>;
    }
    return (<div className="auth-status-page">
      <div className="auth-status-card auth-role-error">
        <h1 className="auth-status-title">Account role unavailable</h1>
        <p className="auth-status-description auth-role-description">
          Your account role is missing or invalid. Please contact support before continuing.
        </p>
      </div>
    </div>);
}
