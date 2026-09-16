import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
export default function ProtectedRoute({ children, allowedRoles, preserveReturnDestination = false, loginMessage, }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();
    if (isLoading) {
        return (<div className="auth-status-page auth-session-loading">
        Checking your session...
      </div>);
    }
    if (!isAuthenticated) {
        if (!preserveReturnDestination) {
            return <Navigate to="/login" replace/>;
        }
        const returnDestination = `${location.pathname}${location.search}${location.hash}`;
        const loginPath = `/login?redirect=${encodeURIComponent(returnDestination)}`;
        return <Navigate to={loginPath} replace state={loginMessage ? { message: loginMessage } : undefined}/>;
    }
    if (!user?.role) {
        return (<div className="auth-status-page">
        <div className="auth-status-card auth-role-error">
          <h1 className="auth-status-title">Account role unavailable</h1>
          <p className="auth-status-description auth-role-description">
            Your account role is missing or invalid. Please contact support before continuing.
          </p>
        </div>
      </div>);
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace/>;
    }
    return <>{children}</>;
}
