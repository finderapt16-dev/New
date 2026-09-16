import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppRuntime } from "./components/AppRuntime";
import { PageLoader } from "./components/PageLoader";
import ProtectedRoute from "./auth/ProtectedRoute";
import { ApartmentsProvider } from "./contexts/ApartmentsContext";
import { Root } from "./components/Root";
// Public
const Landing = lazy(() => import("./landing/Landing").then((module) => ({ default: module.Landing })));
const NotFound = lazy(() => import("./landing/NotFound").then((module) => ({ default: module.NotFound })));
// Authentication and shared account pages
const Login = lazy(() => import("./auth/Signin").then((module) => ({ default: module.Login })));
const Signup = lazy(() => import("./auth/Signup").then((module) => ({ default: module.Signup })));
const ForgotPassword = lazy(() => import("./auth/ForgotPassword").then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import("./auth/ResetPassword").then((module) => ({ default: module.ResetPassword })));
const AuthCallback = lazy(() => import("./auth/AuthCallback").then((module) => ({ default: module.AuthCallback })));
const Dashboard = lazy(() => import("./auth/Dashboard").then((module) => ({ default: module.Dashboard })));
const Settings = lazy(() => import("./components/Settings").then((module) => ({ default: module.Settings })));
// Tenant
const TenantDashboard = lazy(() => import("@/tenant/Dashboard").then((module) => ({ default: module.Dashboard })));
const Apartments = lazy(() => import("./tenant/Apartments").then((module) => ({ default: module.Apartments })));
const ApartmentDetail = lazy(() => import("./tenant/ApartmentDetails").then((module) => ({ default: module.ApartmentDetails })));
const Favorites = lazy(() => import("./tenant/Favorites").then((module) => ({ default: module.Favorites })));
// Landlord
const LandlordDashboard = lazy(() => import("@/landlord/LandlordDashboard").then((module) => ({ default: module.LandlordDashboard })));
const AddApartment = lazy(() => import("./landlord/AddApartment").then((module) => ({ default: module.AddApartment })));
const ManageRooms = lazy(() => import("./landlord/ManageRooms").then((module) => ({ default: module.ManageRooms })));
// Admin
const AdminDashboard = lazy(() => import("@/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const AdminApartmentDetail = lazy(() => import("./admin/AdminApartmentDetail").then((module) => ({ default: module.AdminApartmentDetail })));
const roleDashboard = <Dashboard tenant={<TenantDashboard />} landlord={<LandlordDashboard />} admin={<AdminDashboard />}/>;
const APARTMENT_LOGIN_MESSAGE = "Please sign in or create an account to view apartment details.";
function PublicLandingRoute() {
    return (<ApartmentsProvider>
      <PageLoader><Landing /></PageLoader>
    </ApartmentsProvider>);
}
export const router = createBrowserRouter([
    // Public landing and standalone authentication pages
    { path: "/", element: <PublicLandingRoute /> },
    { path: "/auth/callback", element: <PageLoader><AuthCallback /></PageLoader> },
    { path: "/reset-password", element: <PageLoader><ResetPassword /></PageLoader> },
    // Main app wrapped in Root layout
    {
        path: "/",
        element: <Root />,
        children: [
            // Tenant browsing (including the existing landlord access).
            { path: "browse", element: <ProtectedRoute allowedRoles={["tenant", "landlord"]} preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><PageLoader><Apartments /></PageLoader></ProtectedRoute> },
            { path: "apartment/:id", element: <ProtectedRoute preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><PageLoader><ApartmentDetail /></PageLoader></ProtectedRoute> },
            // Landlord market details.
            { path: "landlord/market/:id", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><ApartmentDetail /></PageLoader></ProtectedRoute> },
            // Admin apartment review.
            { path: "admin/apartment/:id", element: <ProtectedRoute allowedRoles={["admin"]}><PageLoader><AdminApartmentDetail /></PageLoader></ProtectedRoute> },
            // Landlord property management.
            { path: "add-apartment", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><AddApartment /></PageLoader></ProtectedRoute> },
            { path: "landlord/properties/:id/rooms", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><ManageRooms /></PageLoader></ProtectedRoute> },
            // Tenant favorites and shared account settings.
            { path: "favorites", element: <ProtectedRoute allowedRoles={["tenant"]}><PageLoader><Favorites /></PageLoader></ProtectedRoute> },
            { path: "settings", element: <ProtectedRoute><PageLoader><Settings /></PageLoader></ProtectedRoute> },
            // Role dashboards: sections remain query parameters, not new URLs.
            // Tenant: overview, suggested, popular, favorites, notifications, report, help, settings.
            // Landlord: overview, properties, activity, notifications, settings, help.
            // Admin: overview, notifications, landlords, apartments, reports, appeals, admininfo.
            { path: "dashboard", element: <ProtectedRoute><PageLoader>{roleDashboard}</PageLoader></ProtectedRoute> },
            { path: "admin", element: <ProtectedRoute allowedRoles={["admin"]}><PageLoader>{roleDashboard}</PageLoader></ProtectedRoute> },
            // Authentication.
            { path: "login", element: <PageLoader><Login /></PageLoader> },
            { path: "signup", element: <PageLoader><Signup /></PageLoader> },
            { path: "forgot-password", element: <PageLoader><ForgotPassword /></PageLoader> },
            { path: "*", element: <PageLoader><NotFound /></PageLoader> },
        ],
    },
]);
export default function App() {
    return <AppRuntime><RouterProvider router={router}/></AppRuntime>;
}
