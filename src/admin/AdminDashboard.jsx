import "./AdminDashboard.css";
import "./AdminLandlordVerification.css";
import { getAdminListingState, getLowestRoomRent } from "@/admin/adminListingState";
import { clearAdminNavigationMemory, getAdminModuleLocation, getAdminModulePath, rememberAdminModuleLocation } from "@/admin/adminNavigationMemory";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { updateApartmentPublication } from "@/services/apartmentsService";
import { archiveAppeal, archiveReport, createAuditLog, createViolation, deleteNotification, deleteViolation as deleteViolationRecord, fetchAdminActivityLogs, fetchAdminReports, fetchApartments, fetchArchivedAppeals, fetchArchivedReports, fetchLandlordWithDetails, fetchNotifications, fetchPendingAppeals, fetchReportWithDetails, fetchSupportTicketById, fetchUserById, fetchUsers, fetchViolations, markAllNotificationsRead, markNotificationRead, markNotificationUnread, notifyReportDismissed, notifyReportResolved, permanentlyDeleteAppeal, permanentlyDeleteNotification, permanentlyDeleteReport, restoreAppeal, restoreReport, unarchiveNotification, updateReportStatus, updateUserProfile } from "@/services/dashboardSupabaseService";
import { getReportEvidence } from "@/services/reportEvidenceService";
import { supabase } from "@/services/supabaseClient";
import { formatAuditLogForDisplay, formatNotificationType, safeNotificationText } from "@/utils/auditLogDisplay";
import { Activity, AlertOctagon, AlertTriangle, Archive, Bell, BellRing, Building2, Calendar, CheckCheck, CheckCircle2, ChevronRight, ClipboardList, Clock, Edit2, Eye, FileText, Flag, History, Lock, Mail, MailOpen, Menu, Phone, RefreshCw, RotateCcw, Save, Search, Settings, Shield, ShieldAlert, ShieldCheck, Smartphone, Trash2, User as UserIcon, Users, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AdminApartments } from './AdminApartments';
import { AdminAppeals } from './AdminAppeals';
import { AdminLandlordVerification } from './AdminLandlordVerification';
import { ArchiveEmpty, canPublishForLandlord, formatOptionalDate, getLandlordVerificationStatus, isAdminModule, NOTICE_TYPES, NotificationEmpty, SettingsField, SettingsSectionTitle, text, toAdminProfileState, toEvidenceItem, VIOLATION_TYPES } from './adminDashboardHelpers';
import { AdminReports } from './AdminReports';
import { AdminSidebar } from './AdminSidebar';
export function AdminDashboard() {
    const { user, verifyLandlord, updateUser, refreshUsers, logout } = useAuth();
    const navigate = useNavigate();
    const portalBasePath = "/dashboard";
    const apartmentDetailBasePath = "/admin/apartment";
    const [searchParams] = useSearchParams();
    const requestedSection = searchParams.get("section") ?? "overview";
    const isAvailableSection = (value) => isAdminModule(value);
    const [activeSection, setActiveSection] = useState(() => isAvailableSection(requestedSection) ? requestedSection : "overview");
    useEffect(() => {
        if (isAvailableSection(requestedSection))
            setActiveSection(requestedSection);
    }, [requestedSection]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [navigationDataReady, setNavigationDataReady] = useState(false);
    // landlords
    const [landlords, setLandlords] = useState([]);
    const [verifyAction, setVerifyAction] = useState(null);
    const [landlordSearch, setLandlordSearch] = useState("");
    const [landlordStatusFilter, setLandlordStatusFilter] = useState("all");
    // Loading states for action prevention
    const [deletingNotifId, setDeletingNotifId] = useState(null);
    const [isMarkingAllNotifs, setIsMarkingAllNotifs] = useState(false);
    const [isResolvingReportId, setIsResolvingReportId] = useState(null);
    const [isDismissingReportId, setIsDismissingReportId] = useState(null);
    const [caseAction, setCaseAction] = useState(null);
    const [processingCaseAction, setProcessingCaseAction] = useState(false);
    // reports
    const [reports, setReports] = useState([]);
    const [archivedReports, setArchivedReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedReportDetails, setSelectedReportDetails] = useState(null);
    const [selectedReportEvidence, setSelectedReportEvidence] = useState([]);
    const [dismissReportModal, setDismissReportModal] = useState(null);
    const [viewingUserProfile, setViewingUserProfile] = useState(null);
    const [reportSearch, setReportSearch] = useState("");
    const [reportStatusFilter, setReportStatusFilter] = useState("all");
    const [reportTypeFilter, setReportTypeFilter] = useState("all");
    const [reportSort, setReportSort] = useState("newest");
    const [reportArchiveView, setReportArchiveView] = useState(false);
    // violations / notices  { landlordId, type, category, message, issuedAt, apartmentTitle }
    const [violations, setViolations] = useState([]);
    // appeals
    const [appeals, setAppeals] = useState([]);
    const [archivedAppeals, setArchivedAppeals] = useState([]);
    const [selectedAppeal, setSelectedAppeal] = useState(null);
    const [appealResponse, setAppealResponse] = useState("");
    const [appealStatus, setAppealStatus] = useState("under_review");
    const [appealSearch, setAppealSearch] = useState("");
    const [appealTypeFilter, setAppealTypeFilter] = useState("all");
    const [appealSort, setAppealSort] = useState("newest");
    const [appealArchiveView, setAppealArchiveView] = useState(false);
    useEffect(() => {
        if (!selectedAppeal)
            return;
        const status = selectedAppeal.status;
        if (status === "under_review" || status === "needs_information" || status === "approved" || status === "rejected" || status === "dismissed") {
            setAppealStatus(status);
        }
        else {
            setAppealStatus("under_review");
        }
        setAppealResponse(selectedAppeal.admin_response ?? "");
    }, [selectedAppeal?.id]);
    // violation modal
    const [violationModal, setViolationModal] = useState(null);
    const [vType, setVType] = useState(VIOLATION_TYPES[0]);
    const [vMessage, setVMessage] = useState("");
    const [nType, setNType] = useState(NOTICE_TYPES[0]);
    const [nMessage, setNMessage] = useState("");
    const [vExpirationDays, setVExpirationDays] = useState(90);
    const [isIssuingViolation, setIsIssuingViolation] = useState(false);
    // violation edit modal
    const [editViolationModal, setEditViolationModal] = useState(null);
    const [editVMessage, setEditVMessage] = useState("");
    const [editVExpirationDays, setEditVExpirationDays] = useState(90);
    // password change modal
    const [passwordModal, setPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [activityLogOpen, setActivityLogOpen] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [isLoadingActivity, setIsLoadingActivity] = useState(false);
    // admin notifications (new property submissions)
    const [adminNotifs, setAdminNotifs] = useState([]);
    const [notifSearch, setNotifSearch] = useState("");
    const [notifFilter, setNotifFilter] = useState("all");
    const [notifTypeFilter, setNotifTypeFilter] = useState("all");
    const [notifActivityFilter, setNotifActivityFilter] = useState("all");
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const [notifPage, setNotifPage] = useState(1);
    const [notificationToDelete, setNotificationToDelete] = useState(null);
    const [selectedSupportRequest, setSelectedSupportRequest] = useState(null);
    const [loadingSupportRequestId, setLoadingSupportRequestId] = useState(null);
    const isNotificationRead = (notification) => (notification.read ?? notification.is_read) === true;
    const getNotificationCategory = (notification) => {
        const payload = notification.payload ?? {};
        const type = String(notification.type ?? "").toLowerCase();
        const title = String(notification.title ?? "").toLowerCase();
        const message = String(notification.message ?? "").toLowerCase();
        const action = String(payload.action ?? "").toLowerCase();
        const value = `${type} ${title} ${message} ${action}`;
        if (type === "support_request" || payload.ticket_id || payload.support_ticket_id)
            return "reports";
        if (type === "landlord_activity" || payload.category === "landlord_activity" || payload.activity_type)
            return "activities";
        if (value.includes("report") || value.includes("violation"))
            return "reports";
        if (value.includes("appeal"))
            return "appeals";
        if (value.includes("landlord") ||
            value.includes("property") ||
            value.includes("submission") ||
            value.includes("verification") ||
            payload.landlord_id ||
            payload.landlordId)
            return "landlord";
        return "system";
    };
    const loadAdminNotifications = useCallback(async () => {
        if (!user?.id) {
            setAdminNotifs([]);
            return [];
        }
        const notifications = await fetchNotifications(user.id, true);
        setAdminNotifs(notifications);
        return notifications;
    }, [user?.id]);
    const markNotifsRead = async () => {
        if (!user?.id || isMarkingAllNotifs)
            return;
        const unreadCount = adminNotifs.filter((notification) => !notification.is_deleted && !isNotificationRead(notification)).length;
        if (unreadCount === 0)
            return;
        setIsMarkingAllNotifs(true);
        setAdminNotifs((previous) => previous.map((notification) => notification.is_deleted ? notification : ({
            ...notification, read: true, is_read: true, read_at: new Date().toISOString(),
        })));
        const updatedCount = await markAllNotificationsRead(user.id);
        await loadAdminNotifications();
        setIsMarkingAllNotifs(false);
        if (updatedCount === 0) {
            toast.error("Could not mark notifications as read. Please try again.");
        }
    };
    const deleteNotif = async (notificationId) => {
        if (deletingNotifId === notificationId) {
            toast.error("Deletion in progress...");
            return;
        }
        if (!user?.id || !notificationId)
            return;
        const notification = adminNotifs.find((item) => item.id === notificationId);
        if (notification?.is_deleted !== true)
            return;
        setDeletingNotifId(notificationId);
        setAdminNotifs((prev) => prev.filter((n) => n.id !== notificationId));
        const deleted = await permanentlyDeleteNotification(notificationId, user.id);
        await loadAdminNotifications();
        setDeletingNotifId(null);
        setNotificationToDelete(null);
        if (!deleted)
            toast.error("Could not permanently delete the archived notification. Please try again.");
    };
    const archiveNotif = async (notificationId) => {
        if (!user?.id || !notificationId || deletingNotifId === notificationId)
            return;
        setDeletingNotifId(notificationId);
        setAdminNotifs((previous) => previous.map((notification) => notification.id === notificationId
            ? { ...notification, is_deleted: true, deleted_at: new Date().toISOString() }
            : notification));
        const archived = await deleteNotification(notificationId, user.id);
        await loadAdminNotifications();
        setDeletingNotifId(null);
        if (!archived)
            toast.error("Could not archive the notification. Please try again.");
    };
    const unarchiveNotif = async (notificationId) => {
        if (!user?.id || !notificationId || deletingNotifId === notificationId)
            return;
        setDeletingNotifId(notificationId);
        setAdminNotifs((previous) => previous.map((notification) => notification.id === notificationId
            ? { ...notification, is_deleted: false, deleted_at: null }
            : notification));
        const restored = await unarchiveNotification(notificationId, user.id);
        await loadAdminNotifications();
        setDeletingNotifId(null);
        if (!restored)
            toast.error("Could not restore the notification. Please try again.");
    };
    const openSupportRequest = async (notification) => {
        const ticketId = String(notification.payload?.ticket_id ?? notification.payload?.support_ticket_id ?? notification.action_target_id ?? "");
        if (!ticketId || loadingSupportRequestId) {
            if (!ticketId)
                toast.error("This support request is missing its ticket reference.");
            return;
        }
        setLoadingSupportRequestId(notification.id ?? ticketId);
        try {
            const ticket = await fetchSupportTicketById(ticketId);
            if (!ticket) {
                toast.error("The support request could not be loaded.");
                return;
            }
            const submitter = ticket.user_id ? await fetchUserById(ticket.user_id) : null;
            setSelectedSupportRequest({ ticket, submitter });
            if (notification.id && !notification.is_deleted && !isNotificationRead(notification)) {
                await markNotificationRead(notification.id, user?.id);
                await loadAdminNotifications();
            }
        }
        catch (error) {
            console.error("Unable to open support request:", error);
            toast.error("The support request could not be loaded.");
        }
        finally {
            setLoadingSupportRequestId(null);
        }
    };
    const openAppealNotification = async (notification) => {
        const appealId = String(notification.payload?.appeal_id ?? "");
        if (!appealId)
            return void toast.error("This notification is missing its appeal reference.");
        let appeal = appeals.find((item) => item.id === appealId);
        if (!appeal) {
            const latestAppeals = await fetchPendingAppeals();
            setAppeals(latestAppeals);
            appeal = latestAppeals.find((item) => item.id === appealId);
        }
        if (!appeal)
            return void toast.error("The linked appeal could not be found.");
        if (user?.id)
            rememberAdminModuleLocation(user.id, "appeals", { view: "appeal-review", appealId });
        setSelectedAppeal(appeal);
        setActiveSection("appeals");
        navigate(`${portalBasePath}?section=appeals`);
    };
    const refreshAdminNotifications = async () => {
        if (isRefreshingNotifs)
            return;
        setIsRefreshingNotifs(true);
        await loadAdminNotifications();
        setIsRefreshingNotifs(false);
    };
    const toggleNotifReadStatus = async (notificationId, isCurrentlyRead) => {
        if (!user?.id || !notificationId)
            return;
        setAdminNotifs((previous) => previous.map((notification) => notification.id === notificationId
            ? { ...notification, read: !isCurrentlyRead, is_read: !isCurrentlyRead }
            : notification));
        const updated = isCurrentlyRead
            ? await markNotificationUnread(notificationId, user.id)
            : await markNotificationRead(notificationId, user.id);
        if (!updated) {
            toast.error("Could not update the notification status. Please try again.");
        }
        await loadAdminNotifications();
    };
    const filteredNotifs = useMemo(() => {
        return adminNotifs.filter((n) => {
            const category = getNotificationCategory(n);
            if (category === "reports" || category === "appeals")
                return false;
            const matchesSearch = !notifSearch ||
                n.title?.toLowerCase().includes(notifSearch.toLowerCase()) ||
                n.message?.toLowerCase().includes(notifSearch.toLowerCase()) ||
                n.type?.toLowerCase().includes(notifSearch.toLowerCase());
            const isRead = isNotificationRead(n);
            const isArchived = n.is_deleted === true;
            const matchesStatus = notifFilter === "archived"
                ? isArchived
                : !isArchived && (notifFilter === "all" || !isRead);
            const matchesType = notifTypeFilter === "all" || category === notifTypeFilter;
            const matchesActivity = notifActivityFilter === "all" || String(n.payload?.activity_type ?? n.type ?? "") === notifActivityFilter;
            const payloadText = `${n.payload?.landlord_name ?? ""} ${n.payload?.property_name ?? ""} ${n.payload?.room_name ?? ""} ${n.payload?.topic ?? ""}`.toLowerCase();
            const matchesExpandedSearch = matchesSearch || Boolean(notifSearch && payloadText.includes(notifSearch.toLowerCase()));
            return matchesExpandedSearch && matchesStatus && matchesType && matchesActivity;
        });
    }, [adminNotifs, notifSearch, notifFilter, notifTypeFilter, notifActivityFilter]);
    useEffect(() => {
        setNotifPage(1);
    }, [notifSearch, notifFilter, notifTypeFilter, notifActivityFilter]);
    // apartments
    const [aptSearch, setAptSearch] = useState("");
    const [selectedApt, setSelectedApt] = useState(null);
    const [aptFilter, setAptFilter] = useState("all");
    const [aptStatusFilter, setAptStatusFilter] = useState("all");
    const [aptPropertyTypeFilter, setAptPropertyTypeFilter] = useState("all");
    const [aptSort, setAptSort] = useState("newest");
    const [publishingApartmentId, setPublishingApartmentId] = useState(null);
    // landlord details modal
    const [selectedLandlord, setSelectedLandlord] = useState(null);
    const [selectedLandlordDetails, setSelectedLandlordDetails] = useState(null);
    const [isLoadingLandlordDetails, setIsLoadingLandlordDetails] = useState(false);
    const [allApartments, setAllApartments] = useState([]);
    const [adminProfile, setAdminProfile] = useState(() => toAdminProfileState(user));
    const [savedAdminProfile, setSavedAdminProfile] = useState(() => toAdminProfileState(user));
    const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false);
    const [isSavingAdminProfile, setIsSavingAdminProfile] = useState(false);
    const [isLoadingAdminProfile, setIsLoadingAdminProfile] = useState(Boolean(user?.id));
    const updateAdminProfile = (updater) => {
        setAdminProfile(updater);
    };
    const handleUpdateAdminProfile = async () => {
        if (!user) {
            return;
        }
        if (!adminProfile.firstName.trim() || !adminProfile.lastName.trim()) {
            toast.error("Please enter your first and last name.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminProfile.email)) {
            toast.error("Please enter a valid email address.");
            return;
        }
        setIsSavingAdminProfile(true);
        const updatedUser = {
            id: user.id,
            role: user.role,
            email: adminProfile.email.trim(),
            name: `${adminProfile.firstName.trim()} ${adminProfile.lastName.trim()}`,
            mobile: adminProfile.mobile.trim(),
            avatar_url: adminProfile.avatar || null,
            bio: adminProfile.bio.trim(),
            department: adminProfile.department.trim(),
            admin_level: adminProfile.adminLevel,
            is_verified: user.isVerified ?? false,
            permit_number: user.permitNumber ?? null,
        };
        try {
            const result = await updateUserProfile(updatedUser);
            if (result) {
                const savedProfile = toAdminProfileState(result);
                setAdminProfile(savedProfile);
                setSavedAdminProfile(savedProfile);
                setIsEditingAdminProfile(false);
                await refreshUsers();
                await createAuditLog({
                    admin_id: user.id,
                    action: "admin_profile_updated",
                    target_type: "user",
                    target_id: user.id,
                    details: { fields: ["name", "email", "mobile", "bio", "department", "admin_level"] },
                });
                toast.success("Profile updated successfully!");
            }
            else {
                toast.error("Failed to update profile");
            }
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update profile");
        }
        finally {
            setIsSavingAdminProfile(false);
        }
    };
    const handleResetAdminProfile = () => {
        setAdminProfile(savedAdminProfile);
        setIsEditingAdminProfile(false);
    };
    const openActivityLog = async () => {
        if (!user?.id)
            return;
        setActivityLogOpen(true);
        setIsLoadingActivity(true);
        try {
            const adminLogs = await fetchAdminActivityLogs(user.id);
            setActivityLogs(adminLogs);
        }
        finally {
            setIsLoadingActivity(false);
        }
    };
    const getApartmentReportCount = (apartmentId) => {
        if (!apartmentId)
            return 0;
        return reports.filter((r) => r.apartmentId === apartmentId && r.status === "pending").length;
    };
    const handleApproveAndPublishApartment = async (apartment) => {
        if (!apartment.id || !user?.id || publishingApartmentId)
            return;
        const landlord = getLandlordForApt(apartment);
        if (!canPublishForLandlord(landlord)) {
            toast.error("This apartment cannot be published because the landlord has not been verified.");
            return;
        }
        setPublishingApartmentId(apartment.id);
        try {
            await updateApartmentPublication(apartment.id, true, user.id);
            const updatedApartment = {
                ...apartment,
                isPublished: true,
                is_published: true,
                approvalStatus: "approved",
                approval_status: "approved",
                isArchived: false,
                is_archived: false,
                deletedAt: undefined,
                deleted_at: null,
            };
            setAllApartments((current) => current.map((item) => item.id === apartment.id ? { ...item, ...updatedApartment } : item));
            setSelectedApt((current) => current?.id === apartment.id ? { ...current, ...updatedApartment } : current);
            toast.success("Property approved and published");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to approve and publish this apartment.");
        }
        finally {
            setPublishingApartmentId(null);
        }
    };
    const filteredApts = useMemo(() => {
        const query = aptSearch.trim().toLowerCase();
        let filtered = allApartments.filter((apartment) => {
            const landlordName = landlords.find((landlord) => landlord.id === apartment.landlordId)?.name ?? "";
            const matchesSearch = !query || [apartment.title, apartment.location, apartment.address, landlordName]
                .some((value) => String(value ?? "").toLowerCase().includes(query));
            const status = getAdminListingState(apartment);
            const matchesStatus = aptStatusFilter === "all" || status === aptStatusFilter;
            const matchesType = aptPropertyTypeFilter === "all" || apartment.propertyType === aptPropertyTypeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
        if (aptFilter === "reported") {
            filtered = filtered.filter((apartment) => getApartmentReportCount(apartment.id) > 0);
        }
        return filtered.sort((left, right) => {
            if (aptSort === "name")
                return left.title.localeCompare(right.title);
            if (aptSort === "price-low" || aptSort === "price-high") {
                const leftRent = getLowestRoomRent(left) ?? Number.POSITIVE_INFINITY;
                const rightRent = getLowestRoomRent(right) ?? Number.POSITIVE_INFINITY;
                return aptSort === "price-low" ? leftRent - rightRent : rightRent - leftRent;
            }
            const leftTime = new Date(left.createdAt ?? 0).getTime();
            const rightTime = new Date(right.createdAt ?? 0).getTime();
            return aptSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
        });
    }, [allApartments, aptSearch, aptFilter, aptStatusFilter, aptPropertyTypeFilter, aptSort, reports, landlords]);
    useEffect(() => {
        let active = true;
        if (!user?.id) {
            const emptyProfile = toAdminProfileState(null);
            setAdminProfile(emptyProfile);
            setSavedAdminProfile(emptyProfile);
            setIsLoadingAdminProfile(false);
            return () => {
                active = false;
            };
        }
        setIsLoadingAdminProfile(true);
        void fetchUserById(user.id)
            .then((profile) => {
            if (!active)
                return;
            const loadedProfile = toAdminProfileState(profile ?? user);
            setAdminProfile(loadedProfile);
            setSavedAdminProfile(loadedProfile);
        })
            .finally(() => {
            if (active)
                setIsLoadingAdminProfile(false);
        });
        return () => {
            active = false;
        };
    }, [user?.id]);
    useEffect(() => {
        const loadData = async () => {
            const [loadedReports, loadedViolations, loadedNotifications, loadedApartments, loadedAppeals, loadedArchivedReports, loadedArchivedAppeals, loadedUsers] = await Promise.all([
                fetchAdminReports(),
                fetchViolations(),
                user?.id ? fetchNotifications(user.id, true) : Promise.resolve([]),
                fetchApartments(),
                fetchPendingAppeals(),
                fetchArchivedReports(),
                fetchArchivedAppeals(),
                fetchUsers(),
            ]);
            setReports(loadedReports);
            setViolations(loadedViolations);
            setAdminNotifs(loadedNotifications);
            setAllApartments(loadedApartments);
            setAppeals(loadedAppeals);
            setArchivedReports(loadedArchivedReports);
            setArchivedAppeals(loadedArchivedAppeals);
            setLandlords(loadedUsers.filter((account) => account.role === "landlord"));
            setNavigationDataReady(true);
        };
        void loadData();
    }, [user?.id]);
    useEffect(() => {
        if (activeSection === "notifications") {
            void loadAdminNotifications();
        }
        if (activeSection === "reports") {
            void fetchAdminReports().then(setReports);
            void fetchArchivedReports().then(setArchivedReports);
        }
        if (activeSection === "apartments") {
            void fetchApartments().then((items) => setAllApartments(items));
        }
        if (activeSection === "appeals") {
            void fetchPendingAppeals().then(setAppeals);
            void fetchArchivedAppeals().then(setArchivedAppeals);
        }
    }, [activeSection, loadAdminNotifications]);
    useEffect(() => {
        if (user?.role !== "admin")
            return;
        const refreshApartmentData = () => {
            void fetchApartments().then((items) => setAllApartments(items));
        };
        const refreshUserData = () => {
            void fetchUsers().then((users) => {

                setLandlords(users.filter((account) => account.role === "landlord"));
            });
        };
        const refreshVisibleData = () => {
            refreshApartmentData();
            refreshUserData();
            void fetchAdminReports().then(setReports);
            void fetchViolations().then(setViolations);
            void fetchPendingAppeals().then(setAppeals);
        };
        const channel = supabase
            .channel(`admin-dashboard-${user.id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
            void fetchAdminReports().then(setReports);
            void fetchArchivedReports().then(setArchivedReports);
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "violations" }, () => { void fetchViolations().then(setViolations); })
            .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => { void loadAdminNotifications(); })
            .on("postgres_changes", { event: "*", schema: "public", table: "appeals" }, () => {
            void fetchPendingAppeals().then(setAppeals);
            void fetchArchivedAppeals().then(setArchivedAppeals);
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "apartments" }, refreshApartmentData)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms" }, refreshApartmentData)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_images" }, refreshApartmentData)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_verification_documents" }, refreshApartmentData)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_users" }, refreshUserData)
            .on("postgres_changes", { event: "*", schema: "public", table: "landlord_profiles" }, refreshUserData)
            .subscribe();
        const refreshOnFocus = () => refreshVisibleData();
        const refreshOnVisibility = () => {
            if (document.visibilityState === "visible")
                refreshVisibleData();
        };
        window.addEventListener("focus", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshOnVisibility);
        return () => {
            window.removeEventListener("focus", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshOnVisibility);
            void supabase.removeChannel(channel);
        };
    }, [loadAdminNotifications, user?.id, user?.role]);
    // Fetch full report details when a report is selected
    useEffect(() => {
        let active = true;
        if (selectedReport?.id) {
            void Promise.all([
                fetchReportWithDetails(selectedReport.id),
                getReportEvidence(selectedReport.id),
            ]).then(([details, evidenceRows]) => {
                if (!active)
                    return;
                setSelectedReportDetails(details);
                setSelectedReportEvidence(evidenceRows
                    .map(toEvidenceItem)
                    .filter((item) => Boolean(item)));
            });
        }
        else {
            setSelectedReportDetails(null);
            setSelectedReportEvidence([]);
        }
        return () => {
            active = false;
        };
    }, [selectedReport?.id]);
    // Fetch full landlord details when a landlord is selected
    useEffect(() => {
        if (!selectedLandlord?.id) {
            setSelectedLandlordDetails(null);
            setIsLoadingLandlordDetails(false);
            return;
        }
        let active = true;
        const permitNumber = selectedLandlord.permit_number ?? selectedLandlord.permitNumber ?? null;
        setSelectedLandlordDetails({
            user: selectedLandlord,
            profile: {
                user_id: selectedLandlord.id,
                permit_number: permitNumber,
                business_permit_number: permitNumber,
                is_verified: selectedLandlord.is_verified ?? selectedLandlord.isVerified ?? false,
            },
            properties: [],
            violations: [],
            reports: [],
            propertyStats: {
                totalProperties: 0,
                publishedProperties: 0,
                totalViews: 0,
                totalFavorites: 0,
                averagePrice: 0,
            },
        });
        setIsLoadingLandlordDetails(true);
        void fetchLandlordWithDetails(selectedLandlord.id)
            .then((details) => {
            if (active && details)
                setSelectedLandlordDetails(details);
        })
            .finally(() => {
            if (active)
                setIsLoadingLandlordDetails(false);
        });
        return () => {
            active = false;
        };
    }, [selectedLandlord]);
    const loadLandlords = async () => {
        const users = await fetchUsers();
        setLandlords(users.filter((x) => x.role === "landlord"));
    };
    const requestVerification = async (landlord, verify) => {
        if (!verify) {
            setVerifyAction({ landlordId: text(landlord.id), verify: false });
            return;
        }
        try {
            const details = await fetchLandlordWithDetails(text(landlord.id));
            const profile = details?.profile;
            const hasPermitNumber = Boolean(text(profile?.business_permit_number || profile?.permit_number || landlord.permit_number || landlord.permitNumber).trim());
            const hasPermitDocument = Boolean(text(profile?.verification_document_url).trim());
            const hasIdDocument = Boolean(text(profile?.id_document_url).trim());
            setVerifyAction({ landlordId: text(landlord.id), verify: true, credentialsIncomplete: !hasPermitNumber || !hasPermitDocument || !hasIdDocument });
        }
        catch (error) {
            console.error("Unable to check submitted landlord credentials:", error);
            setVerifyAction({ landlordId: text(landlord.id), verify: true, credentialsIncomplete: true });
        }
    };
    const confirmVerification = () => {
        if (!verifyAction)
            return;
        const pendingAction = verifyAction;
        const previousLandlords = landlords;
        setVerifyAction(null);
        setLandlords((current) => current.map((landlord) => landlord.id === pendingAction.landlordId
            ? {
                ...landlord,
                is_verified: pendingAction.verify,
                isVerified: pendingAction.verify,
                status: pendingAction.verify ? "verified" : "pending",
            }
            : landlord));
        const toastId = toast.loading(pendingAction.verify ? "Verifying landlord…" : "Revoking verification…");
        const action = verifyLandlord(pendingAction.landlordId, pendingAction.verify);
        void action.then(() => {
            toast.success(pendingAction.verify ? "Landlord verified" : "Verification revoked", { id: toastId });
            void loadLandlords();
        }).catch((error) => {
            setLandlords(previousLandlords);
            console.error("Unable to update landlord verification:", error);
            toast.error(error instanceof Error ? error.message : "Unable to update landlord verification.", { id: toastId });
        });
    };
    const resolveReport = (id) => {
        if (isResolvingReportId === id) {
            toast.error("Operation in progress...");
            return;
        }
        setIsResolvingReportId(id);
        void updateReportStatus(id, "resolved").then(async (updated) => {
            if (updated) {
                setReports((p) => p.map((r) => (r.id === id ? updated : r)));
                // Share the report only after admin verification.
                if (selectedReportDetails?.report?.id && selectedReportDetails?.landlord?.id && selectedReportDetails.report.reporter_id) {
                    await notifyReportResolved(selectedReportDetails.report.id, selectedReportDetails.landlord.id, selectedReportDetails.report.reporter_id, selectedReportDetails.report.apartment_title || selectedReportDetails.report.apartment || "Reported Apartment");
                }
                setSelectedReport(null);
                toast.success("Report verified and shared with the landlord");
            }
        }).finally(() => {
            setIsResolvingReportId(null);
        });
    };
    const dismissReport = (id, reason) => {
        if (isDismissingReportId === id) {
            toast.error("Operation in progress...");
            return;
        }
        setIsDismissingReportId(id);
        void updateReportStatus(id, "dismissed").then(async (updated) => {
            if (updated) {
                setReports((p) => p.map((r) => (r.id === id ? updated : r)));
                // Send notification to reporter
                if (selectedReportDetails?.report?.id && selectedReportDetails.report.reporter_id) {
                    await notifyReportDismissed(selectedReportDetails.report.id, selectedReportDetails.report.reporter_id, selectedReportDetails.report.apartment_title || selectedReportDetails.report.apartment || "Reported Apartment", reason);
                }
                setSelectedReport(null);
                setDismissReportModal(null);
                toast.success("Report dismissed and notification sent to reporter");
            }
        }).finally(() => {
            setIsDismissingReportId(null);
        });
    };
    const executeCaseAction = async () => {
        if (!caseAction || !user?.id || processingCaseAction)
            return;
        setProcessingCaseAction(true);
        try {
            if (caseAction.type === "archive-report") {
                const archived = await archiveReport(caseAction.id, user.id);
                setReports((current) => current.filter((report) => report.id !== caseAction.id));
                setArchivedReports((current) => [archived, ...current.filter((report) => report.id !== caseAction.id)]);
                setSelectedReport(null);
                toast.success("Report archived.");
            }
            else if (caseAction.type === "archive-appeal") {
                const archived = await archiveAppeal(caseAction.id, user.id);
                setAppeals((current) => current.filter((appeal) => appeal.id !== caseAction.id));
                setArchivedAppeals((current) => [archived, ...current.filter((appeal) => appeal.id !== caseAction.id)]);
                setSelectedAppeal(null);
                toast.success("Appeal archived.");
            }
            else if (caseAction.type === "restore-report") {
                const restored = await restoreReport(caseAction.id, user.id);
                setArchivedReports((current) => current.filter((report) => report.id !== caseAction.id));
                setReports((current) => [restored, ...current.filter((report) => report.id !== caseAction.id)]);
                toast.success("Report restored to the active list.");
            }
            else if (caseAction.type === "restore-appeal") {
                const restored = await restoreAppeal(caseAction.id, user.id);
                setArchivedAppeals((current) => current.filter((appeal) => appeal.id !== caseAction.id));
                setAppeals((current) => [restored, ...current.filter((appeal) => appeal.id !== caseAction.id)]);
                toast.success("Appeal restored to the active list.");
            }
            else if (caseAction.type === "delete-report") {
                await permanentlyDeleteReport(caseAction.id, user.id);
                setArchivedReports((current) => current.filter((report) => report.id !== caseAction.id));
                toast.success("Archived report permanently deleted.");
            }
            else if (caseAction.type === "delete-appeal") {
                await permanentlyDeleteAppeal(caseAction.id, user.id);
                setArchivedAppeals((current) => current.filter((appeal) => appeal.id !== caseAction.id));
                toast.success("Archived appeal permanently deleted.");
            }
            setCaseAction(null);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to complete this action.");
        }
        finally {
            setProcessingCaseAction(false);
        }
    };
    const issueViolation = async () => {
        if (!violationModal || !user || isIssuingViolation)
            return;
        const type = (violationModal.mode === "violation" ? vType : nType).trim();
        const message = (violationModal.mode === "violation" ? vMessage : nMessage).trim();
        const expirationDays = Number(vExpirationDays);
        if (!violationModal.landlordId) {
            toast.error("The selected landlord could not be identified");
            return;
        }
        if (!type) {
            toast.error(`Please select a ${violationModal.mode} type`);
            return;
        }
        if (violationModal.mode === "violation" && (!Number.isInteger(expirationDays) || expirationDays < 1 || expirationDays > 365)) {
            toast.error("Expiration must be between 1 and 365 days");
            return;
        }
        setIsIssuingViolation(true);
        try {
            const created = await createViolation({
                landlord_id: violationModal.landlordId,
                admin_id: user.id,
                mode: violationModal.mode,
                type,
                message: message || null,
                issued_at: new Date().toISOString(),
                expires_at: violationModal.mode === "violation"
                    ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
                    : null,
                related_report_id: violationModal.reportId ?? null,
                apartment_id: violationModal.apartmentId ?? null,
                active: true,
            });
            if (!created)
                throw new Error("The violation record could not be saved");
            setViolations(await fetchViolations());
            if (violationModal.reportId) {
                const updatedReport = await updateReportStatus(violationModal.reportId, "resolved");
                if (updatedReport) {
                    setReports((previous) => previous.map((report) => report.id === violationModal.reportId ? updatedReport : report));
                    setSelectedReport(null);
                }
            }
            setViolationModal(null);
            setVMessage("");
            setNMessage("");
            setVExpirationDays(90);
            toast.success(violationModal.mode === "violation" ? "Violation issued and landlord notified" : "Notice sent to landlord");
        }
        catch (error) {
            console.error("Error issuing violation or notice:", error);
            toast.error(error instanceof Error ? error.message : `Unable to issue ${violationModal.mode}`);
        }
        finally {
            setIsIssuingViolation(false);
        }
    };
    // ── Password Change ───────────────────────────────────────────────────────
    const handleChangePassword = async () => {
        if (!user) {
            toast.error("User not found");
            return;
        }
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            toast.error("All password fields are required");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        try {
            await updateUser(user.id, { password: newPassword });
            toast.success("Password changed successfully!");
            setPasswordModal(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to change password.";
            toast.error(message);
        }
    };
    const saveViolationEdit = () => {
        if (!editViolationModal?.id)
            return;
        if (!editVMessage.trim()) {
            toast.error("Violation message cannot be empty");
            return;
        }
        void createViolation({
            landlord_id: editViolationModal.landlord_id ?? editViolationModal.landlordId ?? null,
            admin_id: editViolationModal.admin_id ?? null,
            mode: editViolationModal.mode ?? "violation",
            type: editViolationModal.type ?? null,
            message: editVMessage,
            issued_at: editViolationModal.issued_at ?? editViolationModal.issuedAt ?? new Date().toISOString(),
            expires_at: new Date(Date.now() + editVExpirationDays * 24 * 60 * 60 * 1000).toISOString(),
            related_report_id: editViolationModal.related_report_id ?? editViolationModal.reportId ?? null,
            active: editViolationModal.active ?? true,
        }).then((created) => {
            if (created) {
                void deleteViolationRecord(editViolationModal.id ?? "");
                void fetchViolations().then(setViolations);
                toast.success("Violation updated successfully");
                setEditViolationModal(null);
                setEditVMessage("");
                setEditVExpirationDays(90);
            }
        });
    };
    const openViolationModal = (mode, landlordId, landlordName, apartmentTitle, reportId, apartmentId, sourceModule = isAdminModule(activeSection) ? activeSection : "overview") => {
        setVType(VIOLATION_TYPES[0]);
        setNType(NOTICE_TYPES[0]);
        setVMessage("");
        setNMessage("");
        setVExpirationDays(90);
        setViolationModal({ open: true, mode, landlordId, landlordName, apartmentTitle, reportId, apartmentId, sourceModule });
    };
    const getLandlordForApt = (apt) => landlords.find((l) => l.id === apt.landlordId) ?? null;
    const violationsForLandlord = (lid) => violations.filter((v) => {
        const violationLandlordId = text(v.landlordId ?? v.landlord_id);
        return violationLandlordId === lid && v.active !== false;
    });
    const verifiedCount = landlords.filter((l) => l.isVerified ?? l.is_verified).length;
    const pendingReports = reports.filter((r) => r.status === "pending").length;
    const activeAppealsCount = appeals.filter((appeal) => appeal.status === "pending" || appeal.status === "under_review" || appeal.status === "needs_information").length;
    const unreadNotifsCount = adminNotifs.filter((n) => {
        const category = getNotificationCategory(n);
        return category !== "reports" && category !== "appeals" && !n.is_deleted && !isNotificationRead(n);
    }).length;
    const restoreAdminModule = (section) => {
        if (!user?.id)
            return;
        const remembered = getAdminModuleLocation(user.id, section);
        if (section === "overview") {
            const landlordId = remembered?.view === "landlord-details" || remembered?.view === "landlord-action" ? remembered.landlordId : "";
            const landlord = landlordId ? landlords.find((item) => text(item.id) === landlordId) ?? null : null;
            setSelectedLandlord(landlord);
            if (remembered?.view === "landlord-action" && landlord) {
                openViolationModal(remembered.mode, landlordId, text(landlord.name, "Landlord"), "General", undefined, undefined, "overview");
            }
            else if (violationModal?.sourceModule === "overview") {
                setViolationModal(null);
            }
            if (remembered && remembered.view !== "overview" && !landlord) {
                rememberAdminModuleLocation(user.id, "overview", { view: "overview" });
            }
        }
        if (section === "reports") {
            const reportId = remembered?.view === "report-review" ? remembered.reportId : "";
            const report = reportId ? [...reports, ...archivedReports].find((item) => text(item.id) === reportId) ?? null : null;
            setSelectedReport(report);
            if (remembered?.view === "report-review" && !report) {
                rememberAdminModuleLocation(user.id, "reports", { view: "overview" });
            }
        }
        if (section === "appeals") {
            const appealId = remembered?.view === "appeal-review" ? remembered.appealId : "";
            const appeal = appealId ? [...appeals, ...archivedAppeals].find((item) => text(item.id) === appealId) ?? null : null;
            setSelectedAppeal(appeal);
            if (remembered?.view === "appeal-review" && !appeal) {
                rememberAdminModuleLocation(user.id, "appeals", { view: "overview" });
            }
        }
    };
    const navigateToAdminModule = (section) => {
        setSidebarOpen(false);
        if (!isAdminModule(section)) return;
        if (!user?.id) {
            setActiveSection(section);
            navigate(`${portalBasePath}?section=${section}`);
            return;
        }
        const rememberedPath = getAdminModulePath(user.id, section);
        const path = rememberedPath;
        if (path.startsWith("/admin/apartment/")) {
            navigate(path, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } });
            return;
        }

        restoreAdminModule(section);
        setActiveSection(section);
        navigate(path);
    };
    useEffect(() => {
        if (!navigationDataReady || !user?.id || !isAdminModule(requestedSection))
            return;
        restoreAdminModule(requestedSection);
    }, [navigationDataReady, requestedSection, user?.id]);
    useEffect(() => {
        if (!navigationDataReady || !user?.id)
            return;
        if (activeSection === "overview") {
            if (violationModal?.open && violationModal.sourceModule === "overview") {
                rememberAdminModuleLocation(user.id, "overview", { view: "landlord-action", landlordId: violationModal.landlordId, mode: violationModal.mode });
            }
            else if (selectedLandlord?.id) {
                rememberAdminModuleLocation(user.id, "overview", { view: "landlord-details", landlordId: text(selectedLandlord.id) });
            }
            else {
                rememberAdminModuleLocation(user.id, "overview", { view: "overview" });
            }
        }
        else if (activeSection === "reports") {
            rememberAdminModuleLocation(user.id, "reports", selectedReport?.id ? { view: "report-review", reportId: text(selectedReport.id) } : { view: "overview" });
        }
        else if (activeSection === "appeals") {
            rememberAdminModuleLocation(user.id, "appeals", selectedAppeal?.id ? { view: "appeal-review", appealId: text(selectedAppeal.id) } : { view: "overview" });
        }
        else if (isAdminModule(activeSection)) {
            rememberAdminModuleLocation(user.id, activeSection, { view: "overview" });
        }
    }, [activeSection, navigationDataReady, selectedAppeal?.id, selectedLandlord?.id, selectedReport?.id, user?.id, violationModal]);
    const handleLogout = () => { if (user?.id)
        clearAdminNavigationMemory(user.id); logout?.(); navigate("/"); };
    // ── Sidebar ───────────────────────────────────────────────────────────────
    const PortalSidebarContent = () => (<AdminSidebar activeSection={activeSection} pendingReports={pendingReports} activeAppealsCount={activeAppealsCount} unreadNotifsCount={unreadNotifsCount} navigateToAdminModule={navigateToAdminModule} handleLogout={handleLogout}/>);
    // ── Section: Notifications ────────────────────────────────────────────────
    const renderNotifications = () => {
        const notificationCenterItems = adminNotifs.filter((notification) => {
            const category = getNotificationCategory(notification);
            return category !== "reports" && category !== "appeals";
        });
        const activeNotifications = notificationCenterItems.filter((notification) => !notification.is_deleted);
        const unreadCount = activeNotifications.filter((notification) => !isNotificationRead(notification)).length;
        const selectNotificationView = (status, type = "all") => {
            setNotifFilter(status);
            setNotifTypeFilter(type);
            setNotifActivityFilter("all");
        };
        const isViewActive = (status, type = "all") => notifFilter === status && notifTypeFilter === type;
        const notificationTone = (notification) => {
            const category = getNotificationCategory(notification);
            if (category === "activities")
                return { icon: Activity, bg: "admin-dashboard-span-10", text: "admin-dashboard-span-13" };
            if (category === "landlord")
                return { icon: Users, bg: "admin-dashboard-span-11", text: "admin-dashboard-span-14" };
            return { icon: Bell, bg: "admin-dashboard-span-12", text: "admin-dashboard-span-15" };
        };
        const activityTypes = Array.from(new Set(notificationCenterItems
            .filter((notification) => getNotificationCategory(notification) === "activities")
            .map((notification) => String(notification.payload?.activity_type ?? notification.type ?? ""))
            .filter(Boolean))).sort();
        const pageSize = 8;
        const pageCount = Math.max(1, Math.ceil(filteredNotifs.length / pageSize));
        const currentPage = Math.min(notifPage, pageCount);
        const visibleNotifs = filteredNotifs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        return (<div className="admin-dashboard-container-3">
        <header>
          <h1 className="admin-dashboard-notifications">Notifications</h1>
          <p className="admin-dashboard-text-6">Review system updates and items relevant to administration.</p>
        </header>
        <div className="admin-dashboard-row-17">
          <label className="admin-dashboard-label">
            <Search className="admin-dashboard-search-icon"/>
            <input value={notifSearch} onChange={(event) => setNotifSearch(event.target.value)} placeholder="Search notifications..." className="admin-dashboard-input"/>
          </label>
          <button onClick={() => void refreshAdminNotifications()} disabled={isRefreshingNotifs} title="Refresh" aria-label="Refresh notifications" className="admin-dashboard-refresh-notifications"><RefreshCw className={`admin-dashboard-refresh-cw-icon ${isRefreshingNotifs ? "admin-dashboard-refresh-cw-icon-2" : ""}`}/></button>
        </div>

        <div className="admin-dashboard-content">
          <p className="admin-dashboard-text-7">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}</p>
          <Button variant="outline" onClick={() => void markNotifsRead()} disabled={isMarkingAllNotifs || unreadCount === 0} className="admin-dashboard-button-6"><CheckCheck className="admin-dashboard-check-check-icon"/>{isMarkingAllNotifs ? "Marking..." : "Mark all as read"}</Button>
        </div>

        <section className="admin-dashboard-section-5">
          <div className="admin-dashboard-card-2">
              {[
                { label: "All", status: "all", type: "all", icon: Bell },
                { label: "Unread", status: "unread", type: "all", icon: Mail },
                { label: "System", status: "all", type: "system", icon: ShieldAlert },
                { label: "Landlord", status: "all", type: "landlord", icon: Users },
                { label: "Activity", status: "all", type: "activities", icon: Activity },
                { label: "Archived", status: "archived", type: "all", icon: Archive },
            ].map(({ label, status, type, icon: Icon }) => {
                const selected = isViewActive(status, type);
                return <button key={label} onClick={() => selectNotificationView(status, type)} className={`admin-dashboard-button-7 ${selected ? "admin-dashboard-button-8" : "admin-dashboard-button-9"}`}><Icon className="admin-dashboard-icon-icon-3"/>{label}</button>;
            })}
          </div>
          {notifTypeFilter === "activities" && <select value={notifActivityFilter} onChange={(event) => setNotifActivityFilter(event.target.value)} className="admin-dashboard-select"><option value="all">All activity types</option>{activityTypes.map((type) => <option key={type} value={type}>{formatNotificationType(type)}</option>)}</select>}

          {notificationCenterItems.length === 0 ? (<NotificationEmpty title="No notifications found." message="New administrative notifications will appear here."/>) : filteredNotifs.length === 0 ? (notifFilter === "unread" && !notifSearch && notifTypeFilter === "all"
                ? <NotificationEmpty title="You're all caught up." message="You have no unread notifications."/>
                : notifFilter === "archived" ? <ArchiveEmpty kind="notifications" icon={Bell}/> : <NotificationEmpty title="No notifications found." message="Try adjusting your search or filter."/>) : (<div className="admin-dashboard-card-3">
              {visibleNotifs.map((notification) => {
                    const tone = notificationTone(notification);
                    const Icon = tone.icon;
                    const archived = notification.is_deleted === true;
                    const read = isNotificationRead(notification);
                    const apartmentId = String(notification.payload?.apartment_id ?? notification.apartmentId ?? notification.action_target_id ?? "");
                    const apartment = apartmentId ? allApartments.find((item) => item.id === apartmentId) : undefined;
                    const rawActionUrl = String(notification.action_url ?? notification.payload?.action_url ?? "");
                    const actionUrl = rawActionUrl.startsWith("/")
                        ? rawActionUrl
                        : apartment ? `${apartmentDetailBasePath}/${apartmentId}` : "";
                    const supportTicketId = String(notification.payload?.ticket_id ?? notification.payload?.support_ticket_id ?? notification.action_target_id ?? "");
                    const isSupportRequest = String(notification.type ?? "").toLowerCase() === "support_request"
                        || Boolean(notification.payload?.ticket_id ?? notification.payload?.support_ticket_id);
                    const isAppealNotification = ["appeal_submitted", "appeal_information_submitted"].includes(String(notification.type ?? "").toLowerCase());
                    const supportRequestLoading = loadingSupportRequestId === (notification.id ?? supportTicketId);
                    return (<article key={notification.id} className={`admin-dashboard-article-2 ${!read && !archived ? "admin-dashboard-article-3" : "admin-dashboard-article-4"}`}>
                    <span className={`admin-dashboard-row-18 ${tone.bg} ${tone.text}`}><Icon className="admin-dashboard-icon-icon"/></span>
                    <div className="admin-dashboard-panel-7">
                      <div className="admin-dashboard-row-19">
                        {!read && !archived && <span className="admin-dashboard-unread" aria-label="Unread"/>}
                        <h3 className={`admin-dashboard-heading ${read || archived ? "admin-dashboard-heading-2" : "admin-dashboard-heading-3"}`}>{safeNotificationText(notification.title, "Notification")}</h3>
                      </div>
                      <p className="admin-dashboard-text-8">{safeNotificationText(notification.message, "No additional details provided.")}</p>
                      <p className="admin-dashboard-text-9">{formatOptionalDate(notification.createdAt ?? notification.created_at, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="admin-dashboard-row-20">
                      {!archived && isSupportRequest && <Button size="sm" variant="outline" disabled={supportRequestLoading} onClick={() => void openSupportRequest(notification)} className="admin-dashboard-button-10"><Eye className="admin-dashboard-eye-icon"/>{supportRequestLoading ? "Loading..." : "View Details"}</Button>}
                      {!archived && isAppealNotification && <Button size="sm" variant="outline" onClick={() => void openAppealNotification(notification)} className="admin-dashboard-view-details"><Eye className="admin-dashboard-eye-icon"/>View Details</Button>}
                      {actionUrl && !archived && !isSupportRequest && !isAppealNotification && <Button size="sm" variant="outline" onClick={() => { if (!read && notification.id)
                        void markNotificationRead(notification.id, user?.id); navigate(actionUrl, { state: { returnTo: `${portalBasePath}?section=notifications`, backLabel: "Back to Notifications" } }); }} className="admin-dashboard-view-details"><Eye className="admin-dashboard-eye-icon"/>View Details</Button>}
                      {!archived && <button onClick={() => void toggleNotifReadStatus(notification.id || "", read)} title={read ? "Mark as unread" : "Mark as read"} aria-label={read ? "Mark as unread" : "Mark as read"} className="admin-dashboard-button-11">{read ? <Mail className="admin-dashboard-mail-icon"/> : <MailOpen className="admin-dashboard-mail-open-icon"/>}</button>}
                      {!archived && <button onClick={() => void archiveNotif(notification.id || "")} title="Archive" aria-label="Archive notification" className="admin-dashboard-archive-notification"><Archive className="admin-dashboard-archive-icon"/></button>}
                      {archived && <Button size="sm" variant="outline" disabled={deletingNotifId === notification.id} onClick={() => void unarchiveNotif(notification.id || "")} className="admin-dashboard-restore"><RotateCcw className="admin-dashboard-rotate-ccw-icon"/>Restore</Button>}
                      {archived && <Button size="sm" variant="outline" disabled={deletingNotifId === notification.id} onClick={() => setNotificationToDelete(notification)} className="admin-dashboard-delete-permanently"><Trash2 className="admin-dashboard-trash2-icon"/>Delete Permanently</Button>}
                    </div>
                  </article>);
                })}
            </div>)}
          {filteredNotifs.length > pageSize && <nav className="admin-dashboard-notification-pages" aria-label="Notification pages">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setNotifPage((page) => Math.max(1, page - 1))} className="admin-dashboard-previous">Previous</Button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <button key={page} onClick={() => setNotifPage(page)} className={`admin-dashboard-button-12 ${page === currentPage ? "admin-dashboard-button-8" : "admin-dashboard-button-13"}`}>{page}</button>)}
            <Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setNotifPage((page) => Math.min(pageCount, page + 1))} className="admin-dashboard-next">Next</Button>
          </nav>}
        </section>
      </div>);
    };
    // ── Section: Apartments ───────────────────────────────────────────────────
    const renderOverview = () => (<AdminLandlordVerification landlords={landlords} apartments={allApartments} search={landlordSearch} setSearch={setLandlordSearch} statusFilter={landlordStatusFilter} setStatusFilter={setLandlordStatusFilter} onSelect={setSelectedLandlord}/>);
    const renderApartments = () => (<AdminApartments allApartments={allApartments} aptSearch={aptSearch} setAptSearch={setAptSearch} aptStatusFilter={aptStatusFilter} setAptStatusFilter={setAptStatusFilter} aptSort={aptSort} setAptSort={setAptSort} filteredApts={filteredApts} getLandlordForApt={getLandlordForApt} navigate={navigate} apartmentDetailBasePath={apartmentDetailBasePath} portalBasePath={portalBasePath}/>);
    // ── Section: Reports ──────────────────────────────────────────────────────
    const renderReports = () => (<AdminReports reports={reports} reportArchiveView={reportArchiveView} archivedReports={archivedReports} reportSearch={reportSearch} allApartments={allApartments} reportStatusFilter={reportStatusFilter} reportTypeFilter={reportTypeFilter} reportSort={reportSort} selectedReport={selectedReport} selectedReportDetails={selectedReportDetails} setSelectedReport={setSelectedReport} setActiveSection={setActiveSection} unreadNotifsCount={unreadNotifsCount} setViewingUserProfile={setViewingUserProfile} navigate={navigate} apartmentDetailBasePath={apartmentDetailBasePath} portalBasePath={portalBasePath} selectedReportEvidence={selectedReportEvidence} resolveReport={resolveReport} setDismissReportModal={setDismissReportModal} setCaseAction={setCaseAction} setReportSearch={setReportSearch} setReportStatusFilter={setReportStatusFilter} setReportTypeFilter={setReportTypeFilter} setReportSort={setReportSort} setReportArchiveView={setReportArchiveView} dismissReportModal={dismissReportModal} dismissReport={dismissReport} viewingUserProfile={viewingUserProfile}/>);
    // ── Section: Appeals Management ─────────────────────────────────────────
    const renderAppeals = () => (<AdminAppeals landlords={landlords} reports={reports} archivedReports={archivedReports} violations={violations} allApartments={allApartments} appealSearch={appealSearch} appealArchiveView={appealArchiveView} archivedAppeals={archivedAppeals} appeals={appeals} appealTypeFilter={appealTypeFilter} appealSort={appealSort} selectedAppeal={selectedAppeal} user={user} appealStatus={appealStatus} appealResponse={appealResponse} setAppeals={setAppeals} setSelectedAppeal={setSelectedAppeal} setAppealResponse={setAppealResponse} setAppealStatus={setAppealStatus} setActiveSection={setActiveSection} unreadNotifsCount={unreadNotifsCount} setSelectedReport={setSelectedReport} navigate={navigate} apartmentDetailBasePath={apartmentDetailBasePath} portalBasePath={portalBasePath} setCaseAction={setCaseAction} setAppealSearch={setAppealSearch} setAppealTypeFilter={setAppealTypeFilter} setAppealSort={setAppealSort} setAppealArchiveView={setAppealArchiveView}/>);
    const renderAdminInfo = () => {
        const inputClass = "admin-dashboard-input-3";
        const adminName = `${adminProfile.firstName} ${adminProfile.lastName}`.trim();
        const accountStatus = user?.status || "Unavailable";
        const ViewField = ({ label, value, wide = false }) => <div className={wide ? "admin-dashboard-panel-9" : ""}><p className="admin-dashboard-text-14">{label}</p><p className="admin-dashboard-text-15">{value?.trim() || (label === "Bio" ? "No bio provided" : "Not provided")}</p></div>;
        return (<div className="admin-dashboard-container-5">
        <header className="admin-dashboard-header-4">
          <div className="admin-dashboard-row-21">
            <span className="admin-dashboard-card-7"><Settings className="admin-dashboard-settings-icon"/></span>
            <div>
              <h2 className="admin-dashboard-admin-settings">Admin Settings</h2>
              <p className="admin-dashboard-text-16">Manage your admin profile, account information, and security.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void openActivityLog()} className="admin-dashboard-view-activity-log"><History className="admin-dashboard-history-icon"/>View Activity Log</Button>
        </header>

        <Card className="admin-dashboard-card-6">
          <CardContent className="admin-dashboard-content-3">
            <div className="admin-dashboard-row-28">
              {adminProfile.avatar ? <img src={adminProfile.avatar} alt={adminName || "Admin profile"} className="admin-dashboard-image-3"/> : (adminProfile.firstName[0]?.toUpperCase() || <UserIcon className="admin-dashboard-user-icon-icon-2"/>)}
            </div>
            <div className="admin-dashboard-panel-7">
              <h3 className="admin-dashboard-heading-5">{isLoadingAdminProfile ? "Loading profile..." : (adminName || "Profile name unavailable")}</h3>
              <p className="admin-dashboard-text-17">{adminProfile.email || "Email unavailable"}</p>
              <p className="admin-dashboard-text-18">{adminProfile.adminLevel || "Administrator"} <span className="admin-dashboard-span-19">·</span> <span className="admin-dashboard-span-20">{accountStatus}</span></p>
            </div>
            <Button onClick={() => setIsEditingAdminProfile(true)} disabled={isEditingAdminProfile || isLoadingAdminProfile} className="admin-dashboard-edit-profile"><Edit2 className="admin-dashboard-edit2-icon"/>Edit Profile</Button>
          </CardContent>
        </Card>

        <Card className="admin-dashboard-card-6"><CardContent className="admin-dashboard-card-content">
          <SettingsSectionTitle icon={UserIcon} tone="admin-tone-brand-icon" title="Personal Information" description="Your saved account and contact details."/>
          {isEditingAdminProfile ? <fieldset disabled={isSavingAdminProfile} className="admin-dashboard-grid-9">
                  <SettingsField label="First Name"><input value={adminProfile.firstName} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, firstName: event.target.value }))} className={inputClass}/></SettingsField>
                  <SettingsField label="Last Name"><input value={adminProfile.lastName} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, lastName: event.target.value }))} className={inputClass}/></SettingsField>
                  <SettingsField label="Email Address" wide><input type="email" value={adminProfile.email} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, email: event.target.value }))} className={inputClass}/></SettingsField>
                  <SettingsField label="Mobile Number" wide><div className="admin-dashboard-panel-10"><Smartphone className="admin-dashboard-smartphone-icon"/><input type="tel" value={adminProfile.mobile} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, mobile: event.target.value }))} placeholder="Not provided" className={`${inputClass} admin-dashboard-input-4`}/></div></SettingsField>
                  <SettingsField label="Bio" wide><textarea rows={4} value={adminProfile.bio} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, bio: event.target.value.slice(0, 200) }))} placeholder="No bio provided" className={`${inputClass} admin-dashboard-textarea`}/><span className="admin-dashboard-200">{adminProfile.bio.length}/200</span></SettingsField>
                </fieldset> : <div className="admin-dashboard-grid-10"><ViewField label="First Name" value={adminProfile.firstName}/><ViewField label="Last Name" value={adminProfile.lastName}/><ViewField label="Email Address" value={adminProfile.email}/><ViewField label="Mobile Number" value={adminProfile.mobile}/><ViewField label="Bio" value={adminProfile.bio} wide/></div>}
        </CardContent></Card>

        <Card className="admin-dashboard-card-6"><CardContent className="admin-dashboard-card-content">
          <SettingsSectionTitle icon={Shield} tone="admin-tone-brand-icon" title="Administrative Information" description="Your administrative role and access information."/>
          {isEditingAdminProfile ? <fieldset disabled={isSavingAdminProfile} className="admin-dashboard-grid-9">
                  <SettingsField label="Department"><input value={adminProfile.department} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, department: event.target.value }))} placeholder="Not provided" className={inputClass}/></SettingsField>
                  <SettingsField label="Admin Level"><select value={adminProfile.adminLevel} onChange={(event) => updateAdminProfile((profile) => ({ ...profile, adminLevel: event.target.value }))} className={inputClass}><option value="">Not provided</option>{adminProfile.adminLevel && !["Full Administrator", "Senior Moderator", "Moderator"].includes(adminProfile.adminLevel) && <option value={adminProfile.adminLevel}>{adminProfile.adminLevel}</option>}<option value="Full Administrator">Full Administrator</option><option value="Senior Moderator">Senior Moderator</option><option value="Moderator">Moderator</option></select></SettingsField>
                </fieldset> : <div className="admin-dashboard-grid-10"><ViewField label="Department" value={adminProfile.department}/><ViewField label="Admin Level" value={adminProfile.adminLevel}/></div>}
        </CardContent></Card>

        {isEditingAdminProfile && <div className="admin-dashboard-content-4"><Button variant="outline" onClick={handleResetAdminProfile} disabled={isSavingAdminProfile} className="admin-dashboard-reset-changes"><RotateCcw className="admin-dashboard-rotate-ccw-icon-2"/>Reset Changes</Button><Button onClick={() => void handleUpdateAdminProfile()} disabled={isSavingAdminProfile} className="admin-dashboard-button-19"><Save className="admin-dashboard-save-icon"/>{isSavingAdminProfile ? "Saving..." : "Save Changes"}</Button></div>}

        <Card className="admin-dashboard-card-6"><CardContent className="admin-dashboard-content-5"><SettingsSectionTitle icon={Lock} tone="admin-tone-brand-icon" title="Security" description="Manage the security of your administrator account."/><div className="admin-dashboard-panel-11"><p className="admin-dashboard-text-19">Protect your administrator account with an updated password.</p><Button onClick={() => setPasswordModal(true)} variant="outline" className="admin-dashboard-change-password"><Lock className="admin-dashboard-lock-icon"/>Change Password</Button></div></CardContent></Card>
      </div>);
    };
    /* Retired History screen: no admin route or sidebar entry can render this block. */
    /* const renderHistory = () => {
        const landlordMap = new Map(landlords.filter((landlord) => landlord.id).map((landlord) => [landlord.id, landlord]));
        const apartmentMap = new Map(allApartments.filter((apartment) => apartment.id).map((apartment) => [apartment.id, apartment]));
        const historyItems = [
            ...archivedReports.map((report) => {
                const apartmentId = text(report.apartment_id ?? report.apartmentId);
                const landlordId = text(report.landlord_id);
                return {
                    kind: "report",
                    id: text(report.id),
                    label: report.issueType ?? report.issue_type ?? report.category ?? "Report",
                    apartment: report.apartment_title ?? report.apartment ?? apartmentMap.get(apartmentId)?.title ?? "Apartment unavailable",
                    landlord: landlordMap.get(landlordId)?.name ?? landlordId,
                    tenant: "Anonymous Tenant",
                    status: report.status ?? "resolved",
                    decision: report.status ?? "Processed",
                    notes: report.details ?? "No resolution notes recorded.",
                    createdAt: report.submitted_at ?? report.submittedAt ?? report.created_at,
                    resolvedAt: report.resolved_at ?? report.reviewed_at,
                    archivedAt: report.archived_at,
                    archivedBy: report.archived_by === user?.id ? user?.name ?? "Admin" : "Admin",
                };
            }),
            ...archivedAppeals.map((appeal) => {
                const report = reports.find((item) => item.id === appeal.report_id) ?? archivedReports.find((item) => item.id === appeal.report_id);
                const apartmentId = text(report?.apartment_id ?? report?.apartmentId);
                const landlordId = text(appeal.landlord_id);
                return {
                    kind: "appeal",
                    id: text(appeal.id),
                    label: appeal.report_id ? "Report Appeal" : appeal.violation_id ? "Violation Appeal" : "General Appeal",
                    apartment: report?.apartment_title ?? report?.apartment ?? apartmentMap.get(apartmentId)?.title ?? "Apartment unavailable",
                    landlord: landlordMap.get(landlordId)?.name ?? landlordId,
                    tenant: report ? "Anonymous Tenant" : "—",
                    status: appeal.status ?? "reviewed",
                    decision: appeal.admin_response ?? appeal.status ?? "Reviewed",
                    notes: appeal.description ?? appeal.reason ?? "No appeal notes recorded.",
                    createdAt: appeal.submitted_at ?? appeal.created_at,
                    resolvedAt: appeal.reviewed_at,
                    archivedAt: appeal.archived_at,
                    archivedBy: appeal.archived_by === user?.id ? user?.name ?? "Admin" : "Admin",
                };
            }),
            ...adminNotifs.filter((notification) => notification.is_deleted === true).map((notification) => {
                const payload = notification.payload ?? {};
                return {
                    kind: "notification",
                    id: text(notification.id),
                    label: safeNotificationText(notification.title, "Notification"),
                    apartment: text(String(payload.property_name ?? payload.apartment_title ?? payload.topic ?? notification.action_target_type ?? "Notification")),
                    landlord: text(String(payload.landlord_name ?? "—")),
                    tenant: getNotificationCategory(notification) === "reports" ? "Anonymous Tenant" : text(String(payload.tenant_name ?? "—")),
                    status: isNotificationRead(notification) ? "read" : "unread",
                    decision: formatNotificationType(notification.type),
                    notes: safeNotificationText(notification.message, "No notification message recorded."),
                    createdAt: notification.createdAt ?? notification.created_at,
                    resolvedAt: notification.read_at,
                    archivedAt: notification.deleted_at,
                    archivedBy: user?.name ?? "Admin",
                };
            }),
        ];
        const statusOptions = Array.from(new Set(historyItems.map((item) => item.status).filter(Boolean))).sort();
        const query = historySearch.trim().toLowerCase();
        const visibleHistory = historyItems
            .filter((item) => historyKindFilter === "all" || (historyKindFilter === "reports" ? item.kind === "report" : historyKindFilter === "appeals" ? item.kind === "appeal" : item.kind === "notification"))
            .filter((item) => historyStatusFilter === "all" || item.status === historyStatusFilter)
            .filter((item) => !query || [item.id, item.label, item.apartment, item.landlord, item.tenant, item.status, item.decision, item.notes].some((value) => String(value ?? "").toLowerCase().includes(query)))
            .sort((left, right) => new Date(right.archivedAt ?? 0).getTime() - new Date(left.archivedAt ?? 0).getTime());
        return (<div className="admin-dashboard-container-3">
        <header className="admin-dashboard-header-5">
          <div className="admin-dashboard-row-21">
            <span className="admin-dashboard-row-29"><History className="admin-dashboard-history-icon-2"/></span>
            <div><h1 className="admin-dashboard-history">History</h1><p className="admin-dashboard-text-20">Archived reports, appeals, and notifications remain available for audit and restoration.</p></div>
          </div>
          <Button variant="outline" onClick={() => { void fetchArchivedReports().then(setArchivedReports); void fetchArchivedAppeals().then(setArchivedAppeals); void loadAdminNotifications(); }} className="admin-dashboard-refresh"><RefreshCw className="admin-dashboard-refresh-cw-icon-3"/>Refresh</Button>
        </header>

        <section className="admin-dashboard-section-10">
          {[{ label: "Archived Reports", value: archivedReports.length, icon: Flag, tone: "admin-tone-info-icon" }, { label: "Archived Appeals", value: archivedAppeals.length, icon: AlertTriangle, tone: "admin-tone-orange-icon" }, { label: "Archived Notifications", value: adminNotifs.filter((notification) => notification.is_deleted === true).length, icon: Bell, tone: "admin-tone-violet-icon" }, { label: "Total History", value: historyItems.length, icon: Archive, tone: "admin-tone-muted-strong" }].map(({ label, value, icon: Icon, tone }) => (<Card key={label} className="admin-dashboard-card-8"><CardContent className="admin-dashboard-row-30"><span className={`admin-dashboard-row-31 ${tone}`}><Icon className="admin-dashboard-icon-icon"/></span><span><strong className="admin-dashboard-strong-8">{value}</strong><span className="admin-dashboard-span-21">{label}</span></span></CardContent></Card>))}
        </section>

        <section className="admin-dashboard-section-11">
          <label className="admin-dashboard-label-2"><Search className="admin-dashboard-search-icon-2"/><input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Search history by apartment, landlord, tenant, status, or ID" className="admin-dashboard-input-5"/></label>
          <select value={historyKindFilter} onChange={(event) => setHistoryKindFilter(event.target.value)} className="admin-dashboard-select-3"><option value="all">Type: All</option><option value="reports">Reports</option><option value="appeals">Appeals</option><option value="notifications">Notifications</option></select>
          <select value={historyStatusFilter} onChange={(event) => setHistoryStatusFilter(event.target.value)} className="admin-dashboard-select-3"><option value="all">Status: All</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        </section>

        <section className="admin-dashboard-section-12">
          {visibleHistory.length === 0 ? (<div className="admin-dashboard-content-6"><Archive className="admin-dashboard-archive-icon-2"/><h3 className="admin-dashboard-no-archived-items-found">No archived items found.</h3><p className="admin-dashboard-text-21">Processed reports, appeals, and deleted notifications moved from active queues will appear here.</p></div>) : (<div className="admin-dashboard-panel-6">
              {visibleHistory.map((item) => (<article key={`${item.kind}-${item.id}`} className="admin-dashboard-article-6">
                  <div><Badge className={item.kind === "report" ? "admin-dashboard-badge-3" : item.kind === "appeal" ? "admin-dashboard-badge-4" : "admin-dashboard-badge-5"}>{item.kind === "report" ? "Report" : item.kind === "appeal" ? "Appeal" : "Notification"}</Badge><p className="admin-dashboard-text-22">{item.id}</p></div>
                  <div className="admin-dashboard-panel-4"><h3 className="admin-dashboard-heading-6">{String(item.apartment ?? "Apartment unavailable")}</h3><p className="admin-dashboard-text-23">{String(item.label ?? "Archived item")}</p><p className="admin-dashboard-text-24">{String(item.notes ?? "No notes recorded.")}</p></div>
                  <div className="admin-dashboard-grid-11"><span><strong>Landlord:</strong> {String(item.landlord || "—")}</span><span><strong>Tenant:</strong> {String(item.tenant || "—")}</span><span><strong>Status:</strong> <span className="admin-dashboard-span-20">{String(item.status ?? "")}</span></span><span><strong>Archived:</strong> {formatOptionalDate(item.archivedAt, { month: "short", day: "numeric", year: "numeric" })}</span></div>
                  <div className="admin-dashboard-grid-12">
                    {item.kind === "notification" ? (<>
                        <Button size="sm" variant="outline" disabled={deletingNotifId === item.id} onClick={() => void unarchiveNotif(item.id)} className="admin-dashboard-restore-2"><RotateCcw className="admin-dashboard-rotate-ccw-icon-3"/>Restore</Button>
                        <Button size="sm" variant="outline" disabled={deletingNotifId === item.id} onClick={() => void deleteNotif(item.id)} className="admin-dashboard-permanent-delete"><Trash2 className="admin-dashboard-trash2-icon-2"/>Permanent Delete</Button>
                      </>) : (<>
                        <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: item.kind === "report" ? "restore-report" : "restore-appeal", id: item.id, label: item.apartment })} className="admin-dashboard-restore-2"><RotateCcw className="admin-dashboard-rotate-ccw-icon-3"/>Restore</Button>
                        <Button size="sm" variant="outline" onClick={() => setCaseAction({ type: item.kind === "report" ? "delete-report" : "delete-appeal", id: item.id, label: item.apartment })} className="admin-dashboard-permanent-delete"><Trash2 className="admin-dashboard-trash2-icon-2"/>Permanent Delete</Button>
                      </>)}
                  </div>
                </article>))}
            </div>)}
        </section>
      </div>);
    }; */
    const renderLandlordDetails = () => {
        if (!selectedLandlord || !selectedLandlordDetails)
            return renderOverview();
        const verified = selectedLandlord.isVerified || selectedLandlord.is_verified;
        const latestProperty = [...(selectedLandlordDetails.properties ?? [])]
            .sort((left, right) => new Date(right.createdAt ?? right.created_at ?? 0).getTime() - new Date(left.createdAt ?? left.created_at ?? 0).getTime())[0] ?? null;
        const propertyReviewStatus = latestProperty?.isPublished ?? latestProperty?.is_published
            ? "Published"
            : String(latestProperty?.approvalStatus ?? latestProperty?.approval_status ?? "").toLowerCase() === "rejected"
                ? "Needs Changes"
                : "Pending Approval";
        const landlordAddress = selectedLandlordDetails.profile?.address || (latestProperty ? `${latestProperty.address || ""}, ${latestProperty.city || ""}`.replace(/^, |, $/g, "") : "Not provided");
        const permitNumber = selectedLandlordDetails.profile?.business_permit_number || selectedLandlordDetails.profile?.permit_number || selectedLandlord.permit_number || selectedLandlord.permitNumber || "Not provided";
        const permitUrl = selectedLandlordDetails.profile?.verification_document_url;
        const closeDetails = () => setSelectedLandlord(null);
        return (<div className="admin-dashboard-container-3">
        <header className="landlord-property-review-header">
          <div><button type="button" onClick={closeDetails}>Back to Dashboard</button><h1>Landlord &amp; Property Review</h1><p>Review landlord details, permit documents, and submitted property information.</p></div>
          <span className={`landlord-property-review-status is-${propertyReviewStatus === "Published" ? "published" : propertyReviewStatus === "Needs Changes" ? "changes" : "pending"}`}>{propertyReviewStatus}</span>
        </header>

        {isLoadingLandlordDetails && <div className="admin-dashboard-loading-landlord-details"><RefreshCw className="admin-dashboard-refresh-cw-icon-4"/>Loading landlord details…</div>}

        <section className="landlord-property-review-summary">
          <article>
            <h2><UserIcon />Account Information</h2>
            <dl><div><dt>Full Name</dt><dd>{selectedLandlord.name || "Not provided"}</dd></div><div><dt>Email</dt><dd>{selectedLandlord.email || "Not provided"}</dd></div><div><dt>Contact Number</dt><dd>{selectedLandlord.mobile || selectedLandlord.mobileNumber || "Not provided"}</dd></div><div><dt>Address</dt><dd>{landlordAddress || "Not provided"}</dd></div><div><dt>Date Registered</dt><dd>{formatOptionalDate(selectedLandlord.created_at, { month: "short", day: "numeric", year: "numeric" })}</dd></div></dl>
          </article>
          <article>
            <h2><FileText />Permit Document Review</h2>
            <div className="landlord-property-review-permit">
              <div className="landlord-property-review-document-preview"><FileText /><small>BUSINESS PERMIT</small></div>
              <dl><div><dt>Document Type</dt><dd>Business Permit</dd></div><div><dt>Business Permit</dt><dd>{permitNumber}</dd></div><div><dt>Date Submitted</dt><dd>{formatOptionalDate(selectedLandlordDetails.profile?.created_at || selectedLandlord.created_at, { month: "short", day: "numeric", year: "numeric" })}</dd></div></dl>
            </div>
            {permitUrl ? <a href={permitUrl} target="_blank" rel="noreferrer" className="landlord-property-review-document-link">View Full Document</a> : <p className="landlord-property-review-no-document">No permit file was uploaded.</p>}
          </article>
        </section>

        <section>
          <h2 className="admin-dashboard-administrative-record"><ClipboardList className="admin-dashboard-clipboard-list-icon"/>Administrative Record</h2>
          <div className="admin-dashboard-grid-3">
            <div className="admin-dashboard-card-9"><p className="admin-dashboard-violations">Violations</p><p className="admin-dashboard-text-27">{selectedLandlordDetails.violations.filter((item) => item.mode === "violation").length}</p></div>
            <div className="admin-dashboard-card-9"><p className="admin-dashboard-notices">Notices</p><p className="admin-dashboard-text-27">{selectedLandlordDetails.violations.filter((item) => item.mode === "notice").length}</p></div>
          </div>
        </section>

        <section className="admin-dashboard-section-14">
          {verified ? <Button variant="outline" onClick={(e) => { e.stopPropagation(); void requestVerification(selectedLandlord, false); setSelectedLandlord(null); }} className="admin-dashboard-revoke-verification"><XCircle className="admin-dashboard-xcircle-icon-2"/>Revoke Verification</Button> : <Button onClick={(e) => { e.stopPropagation(); void requestVerification(selectedLandlord, true); setSelectedLandlord(null); }} className="admin-dashboard-verify-landlord"><CheckCircle2 className="admin-dashboard-check-circle2-icon-5"/>Verify Landlord</Button>}
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); openViolationModal("violation", text(selectedLandlord.id), text(selectedLandlord.name, "Landlord"), "General"); }} className="admin-dashboard-issue-violation"><AlertOctagon className="admin-dashboard-alert-octagon-icon-2"/>Issue Violation</Button>
          <Button variant="outline" onClick={(e) => { e.stopPropagation(); openViolationModal("notice", text(selectedLandlord.id), text(selectedLandlord.name, "Landlord"), "General"); }} className="admin-dashboard-send-notice"><BellRing className="admin-dashboard-bell-ring-icon-2"/>Send Notice</Button>
        </section>
      </div>);
    };
    const renderAdministrativeAction = () => {
        if (!violationModal?.open)
            return renderOverview();
        const isViolation = violationModal.mode === "violation";
        const subject = selectedLandlord ?? landlords.find((landlord) => text(landlord.id) === violationModal.landlordId) ?? null;
        const closeAction = () => setViolationModal(null);
        return (<div className="admin-dashboard-container-3">
        <button type="button" onClick={closeAction} disabled={isIssuingViolation} className="admin-dashboard-back-to-landlord-details"><ChevronRight className="admin-dashboard-chevron-right-icon-2"/>Back to Landlord Details</button>

        <header className="admin-dashboard-header-7">
          <div className="admin-dashboard-row-33">{subject?.name?.[0]?.toUpperCase() ?? violationModal.landlordName?.[0]?.toUpperCase() ?? "L"}</div>
          <div className="admin-dashboard-panel-4"><div className="admin-dashboard-row-19"><h1 className="admin-dashboard-title-2">{subject?.name || violationModal.landlordName || "Landlord"}</h1>{subject && <Badge className="admin-dashboard-badge-6">{subject.isVerified || subject.is_verified ? <CheckCircle2 className="admin-dashboard-check-circle2-icon-4"/> : <Clock className="admin-dashboard-clock-icon-2"/>}{getLandlordVerificationStatus(subject)}</Badge>}</div><p className="admin-dashboard-text-25">{subject?.email || "Email unavailable"}</p></div>
        </header>

        <section className="admin-dashboard-section-3">
          <div className="admin-dashboard-row-34"><span className="admin-dashboard-row-35">{isViolation ? <ShieldAlert className="admin-dashboard-shield-alert-icon"/> : <BellRing className="admin-dashboard-bell-ring-icon-3"/>}</span><div><h2 className="admin-dashboard-heading-7">{isViolation ? "Issue Violation" : "Send Notice"}</h2><p className="admin-dashboard-text-28">{isViolation ? "Issue an administrative violation for this landlord." : "Send a formal administrative notice to this landlord."}</p></div></div>

          <div className="admin-dashboard-grid-15">
            <div><p className="admin-dashboard-landlord-2">Landlord</p><p className="admin-dashboard-text-29">{subject?.name || violationModal.landlordName || "Landlord unavailable"}</p><p className="admin-dashboard-text-30">{subject?.email || "Email unavailable"}</p></div>
            <div className="admin-dashboard-panel-12"><p className="admin-dashboard-linked-apartment">Linked Apartment</p><p className="admin-dashboard-text-29">{violationModal.apartmentId ? violationModal.apartmentTitle : "None"}</p>{!violationModal.apartmentId && <p className="admin-dashboard-no-apartment-linked-to-this-record">No apartment linked to this record.</p>}</div>
          </div>

          <div className="admin-dashboard-panel-13">
            <div className="admin-dashboard-panel-8"><label htmlFor="violation-type" className="admin-dashboard-violation-type">{isViolation ? "Violation Type" : "Notice Type"}</label><div className="admin-dashboard-panel-10"><select id="violation-type" value={isViolation ? vType : nType} onChange={(e) => isViolation ? setVType(e.target.value) : setNType(e.target.value)} disabled={isIssuingViolation} className="admin-dashboard-violation-type-2">{(isViolation ? VIOLATION_TYPES : NOTICE_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}</select><ChevronRight className="admin-dashboard-chevron-right-icon-3"/></div><p className="admin-dashboard-select-the-type-of">Select the type of {isViolation ? "violation you are issuing" : "notice you are sending"} to this landlord.</p></div>

            <div className="admin-dashboard-panel-8"><div className="admin-dashboard-row-7"><label htmlFor="violation-description" className="admin-dashboard-violation-description">{isViolation ? "Violation Details" : "Notice Details"} <span className="admin-dashboard-optional">(optional)</span></label><span className="admin-dashboard-500">{(isViolation ? vMessage : nMessage).length}/500</span></div><textarea id="violation-description" rows={5} maxLength={500} value={isViolation ? vMessage : nMessage} onChange={(e) => isViolation ? setVMessage(e.target.value) : setNMessage(e.target.value)} disabled={isIssuingViolation} placeholder={isViolation ? "Provide additional details about this violation..." : "Provide additional context or instructions for the landlord..."} className="admin-dashboard-violation-description-2"/><p className="admin-dashboard-text-31">Additional context helps ensure accurate review and follow-up.</p></div>

            {isViolation && <div className="admin-dashboard-panel-8"><label htmlFor="violation-expiration" className="admin-dashboard-violation-expiration">Days Until Expiration</label><input id="violation-expiration" type="number" min="1" max="365" value={vExpirationDays} step="1" onChange={(e) => setVExpirationDays(Number(e.target.value))} disabled={isIssuingViolation} placeholder="Days" className="admin-dashboard-violation-expiration-2"/><p className="admin-dashboard-enter-a-whole-number-from-1-to-365">Number of days before this violation expires.<br />Enter a whole number from 1 to 365.</p></div>}

            <div className="admin-dashboard-card-11"><AlertTriangle className="admin-dashboard-alert-triangle-icon-2"/><p className="admin-dashboard-text-32">{violationModal.reportId ? `This ${isViolation ? "violation" : "notice"} will be recorded and will mark the linked report as resolved.` : isViolation ? "This action will be recorded in the landlord's administrative record." : "This notice will be sent to the landlord as a formal warning on record."}</p></div>
          </div>

          <div className="admin-dashboard-grid-16"><Button onClick={() => void issueViolation()} disabled={isIssuingViolation} className="admin-dashboard-button-20">{isIssuingViolation ? <><RefreshCw className="admin-dashboard-refresh-cw-icon-5"/>Saving...</> : isViolation ? <><ShieldAlert className="admin-dashboard-shield-alert-icon-2"/>Issue Violation</> : <><BellRing className="admin-dashboard-bell-ring-icon-2"/>Send Notice</>}</Button><Button type="button" variant="outline" onClick={closeAction} disabled={isIssuingViolation} className="admin-dashboard-cancel">Cancel</Button></div>
        </section>
      </div>);
    };
    const sectionMap = {
        overview: renderOverview,
        notifications: renderNotifications,
        apartments: renderApartments,
        reports: renderReports,
        appeals: renderAppeals,
        admininfo: renderAdminInfo,
    };
    // ── Render ────────────────────────────────────────────────────────────────
    return (<div className="admin-portal-shell app-shell">
      <div className="app-shell-frame">
        <aside className="app-shell-sidebar">
          {PortalSidebarContent()}
        </aside>
        {sidebarOpen && <div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}
        <aside className={`app-sidebar-drawer ${sidebarOpen ? "is-open" : ""}`}>
          <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close">
            <X className="admin-dashboard-x-icon"/>
          </button>
          {PortalSidebarContent()}
        </aside>
        <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger">
          <Menu className="admin-dashboard-menu-icon"/>
        </button>
        <div className="app-shell-main">
          <main className="app-shell-content app-shell-content-mobile-nav">
            {violationModal?.open && violationModal.sourceModule === activeSection
            ? renderAdministrativeAction()
            : activeSection === "overview" && selectedLandlord && selectedLandlordDetails
                ? renderLandlordDetails()
                : (sectionMap[activeSection] ?? renderOverview)()}
          </main>
        </div>
      </div>

      <AlertDialog open={!!verifyAction} onOpenChange={() => setVerifyAction(null)}>
        <AlertDialogContent className="admin-dashboard-card-12">
          <AlertDialogHeader>
            <AlertDialogTitle className="admin-dashboard-alert-dialog-title">{verifyAction?.verify ? "Verify Landlord?" : "Revoke Verification?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {verifyAction?.verify
            ? "You are about to verify this landlord. Please confirm that you have reviewed the submitted credentials."
            : "This landlord will no longer be able to add or edit apartments."}
            </AlertDialogDescription>
            {verifyAction?.verify && verifyAction.credentialsIncomplete && <div className="admin-dashboard-card-13"><AlertTriangle className="admin-dashboard-alert-triangle-icon"/><span>Some credentials may be incomplete. You may still continue if the submitted documents have been manually reviewed and considered acceptable.</span></div>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="admin-dashboard-cancel-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVerification} className={`admin-dashboard-alert-dialog-action ${verifyAction?.verify ? "admin-dashboard-alert-dialog-action-2" : "admin-dashboard-alert-dialog-action-3"}`}>
              {verifyAction?.verify ? "Confirm Verification" : "Confirm Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={selectedSupportRequest !== null} onOpenChange={(open) => { if (!open)
        setSelectedSupportRequest(null); }}>
        <AlertDialogContent className="admin-dashboard-card-14">
          <AlertDialogHeader className="admin-dashboard-alert-dialog-header">
            <div className="admin-dashboard-row-10">
              <span className="admin-dashboard-row-36"><Flag className="admin-dashboard-flag-icon"/></span>
              <div className="admin-dashboard-panel-4">
                <AlertDialogTitle className="admin-dashboard-support-request-details">Support Request Details</AlertDialogTitle>
                <AlertDialogDescription className="admin-dashboard-alert-dialog-description">Review the complete request submitted to platform support.</AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          {selectedSupportRequest && (<div className="admin-dashboard-panel-14">
              <div className="admin-dashboard-grid-3">
                <div className="admin-dashboard-panel-15"><p className="admin-dashboard-submitted-by">Submitted by</p><p className="admin-dashboard-text-33">{selectedSupportRequest.submitter?.name || "User unavailable"}</p></div>
                <div className="admin-dashboard-panel-15"><p className="admin-dashboard-user-role">User role</p><p className="admin-dashboard-text-34">{selectedSupportRequest.submitter?.role || "Unavailable"}</p></div>
                <div className="admin-dashboard-panel-15"><p className="admin-dashboard-contact-email">Contact email</p><p className="admin-dashboard-text-35">{selectedSupportRequest.ticket.contact || selectedSupportRequest.submitter?.email || "Not provided"}</p></div>
                <div className="admin-dashboard-panel-15"><p className="admin-dashboard-date-submitted">Date submitted</p><p className="admin-dashboard-text-33">{formatOptionalDate(selectedSupportRequest.ticket.created_at, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                <div className="admin-dashboard-panel-15"><p className="admin-dashboard-topic">Topic</p><p className="admin-dashboard-text-33">{selectedSupportRequest.ticket.topic || "Not provided"}</p></div>
                <div className="admin-dashboard-panel-15"><p className="admin-dashboard-status">Status</p><p className="admin-dashboard-text-34">{(selectedSupportRequest.ticket.status || "Unavailable").replace(/_/g, " ")}</p></div>
              </div>
              <div>
                <p className="admin-dashboard-full-message">Full message</p>
                <p className="admin-dashboard-text-36">{selectedSupportRequest.ticket.message || "No message provided."}</p>
              </div>
            </div>)}
          <AlertDialogFooter className="admin-dashboard-alert-dialog-footer">
            <AlertDialogCancel className="admin-dashboard-close">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {activityLogOpen && (<div className="admin-dashboard-overlay" onClick={() => setActivityLogOpen(false)}>
          <div className="admin-dashboard-overlay-2"/>
          <div className="admin-dashboard-card-15" onClick={(event) => event.stopPropagation()}>
            <div className="admin-dashboard-row-37">
              <div className="admin-dashboard-row-21"><span className="admin-dashboard-row-38"><History className="admin-dashboard-history-icon-2"/></span><div><h3 className="admin-dashboard-admin-activity-log">Admin Activity Log</h3><p className="admin-dashboard-text-31">Recorded actions for this administrator.</p></div></div>
              <button type="button" title="Close activity log" onClick={() => setActivityLogOpen(false)} className="admin-dashboard-button-21"><X className="admin-dashboard-x-icon"/></button>
            </div>
            <div className="admin-dashboard-panel-16">
              {isLoadingActivity ? (<div className="admin-dashboard-row-39"><RefreshCw className="admin-dashboard-refresh-cw-icon-6"/></div>) : activityLogs.length === 0 ? (<div className="admin-dashboard-card-16"><History className="admin-dashboard-history-icon-3"/><h4 className="admin-dashboard-no-activity-recorded-yet">No activity recorded yet.</h4><p className="admin-dashboard-text-10">Administrative actions will appear here after they are saved.</p></div>) : (<div className="admin-dashboard-panel-6">
                  {activityLogs.map((log) => {
                    const displayLog = formatAuditLogForDisplay(log);
                    return <div key={log.id} className="admin-dashboard-row-40">
                      <span className="admin-dashboard-row-41"><CheckCircle2 className="admin-dashboard-check-circle2-icon-6"/></span>
                      <div className="admin-dashboard-panel-7">
                        <p className="admin-dashboard-text-37">{displayLog.title}</p>
                        <p className="admin-dashboard-text-38">{displayLog.detail}</p>
                        {displayLog.changes.length > 1 && <div className="admin-dashboard-panel-17">{displayLog.changes.slice(1).map((change) => <p key={change.key}>{change.summary}</p>)}</div>}
                      </div>
                      <time className="admin-dashboard-time-2">{log.created_at ? new Date(log.created_at).toLocaleString("en-PH") : "Time unavailable"}</time>
                    </div>;
                })}
                </div>)}
            </div>
            <div className="admin-dashboard-row-42"><Button variant="outline" onClick={() => void openActivityLog()} disabled={isLoadingActivity} className="admin-dashboard-refresh-2"><RefreshCw className={`admin-dashboard-refresh-cw-icon-3 ${isLoadingActivity ? "admin-dashboard-refresh-cw-icon-2" : ""}`}/>Refresh</Button></div>
          </div>
        </div>)}

      {passwordModal && (<div className="admin-dashboard-overlay" onClick={() => setPasswordModal(false)}>
          <div className="admin-dashboard-overlay-3"/>
          <div className="admin-dashboard-card-17" onClick={(e) => e.stopPropagation()}>
            <div className="admin-dashboard-row-43">
              <div className="admin-dashboard-row-21">
                <div className="admin-dashboard-row-44">
                  <Lock className="admin-dashboard-lock-icon-2"/>
                </div>
                <div>
                  <p className="admin-dashboard-change-password-2">Change Password</p>
                  <p className="admin-dashboard-update-your-admin-account-password">Update your admin account password</p>
                </div>
              </div>
              <button onClick={() => setPasswordModal(false)} className="admin-dashboard-button-22">
                <X className="admin-dashboard-x-icon-2"/>
              </button>
            </div>
            <div className="admin-dashboard-panel-18">
              <div className="admin-dashboard-panel-19">
                <label className="admin-dashboard-current-password">Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="admin-dashboard-input-6"/>
              </div>
              <div className="admin-dashboard-panel-19">
                <label className="admin-dashboard-new-password">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password (minimum 6 characters)" className="admin-dashboard-input-6"/>
              </div>
              <div className="admin-dashboard-panel-19">
                <label className="admin-dashboard-confirm-password">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="admin-dashboard-input-6"/>
              </div>
              <div className="admin-dashboard-card-18">
                <AlertTriangle className="admin-dashboard-alert-triangle-icon-3"/>
                <p className="admin-dashboard-text-39">
                  Use a strong password with a mix of letters, numbers, and special characters for better security.
                </p>
              </div>
            </div>
            <div className="admin-dashboard-row-45">
              <Button onClick={handleChangePassword} className="admin-dashboard-change-password-3">
                <Lock className="admin-dashboard-lock-icon-3"/>Change Password
              </Button>
              <Button variant="outline" onClick={() => setPasswordModal(false)} className="admin-dashboard-cancel-3">
                Cancel
              </Button>
            </div>
          </div>
        </div>)}

      {editViolationModal && (<div className="admin-dashboard-overlay" onClick={() => setEditViolationModal(null)}>
          <div className="admin-dashboard-overlay-3"/>
          <div className="admin-dashboard-card-19" onClick={(e) => e.stopPropagation()}>
            <div className="admin-dashboard-row-46">
              <div className="admin-dashboard-row-21">
                <div className="admin-dashboard-row-47">
                  <Edit2 className="admin-dashboard-edit2-icon-2"/>
                </div>
                <div>
                  <p className="admin-dashboard-edit">Edit {editViolationModal.mode === "violation" ? "Violation" : "Notice"}</p>
                  <p className="admin-dashboard-text-40">{editViolationModal.landlordName}</p>
                </div>
              </div>
              <button onClick={() => setEditViolationModal(null)} className="admin-dashboard-button-22">
                <X className="admin-dashboard-x-icon-2"/>
              </button>
            </div>
            <div className="admin-dashboard-panel-18">
              <div className="admin-dashboard-panel-19">
                <div className="admin-dashboard-row-7">
                  <label className="admin-dashboard-message">Message</label>
                  <span className="admin-dashboard-300">
                    {editVMessage.length}/300
                  </span>
                </div>
                <textarea rows={4} maxLength={300} value={editVMessage} onChange={(e) => setEditVMessage(e.target.value)} placeholder="Edit the violation message…" className="admin-dashboard-textarea-2"/>
              </div>
              <div className="admin-dashboard-panel-19">
                <label className="admin-dashboard-label-3">
                  <Calendar className="admin-dashboard-calendar-icon-3"/>
                  Expiration Days (for violations only)
                </label>
                <input type="number" min="1" max="365" value={editVExpirationDays} onChange={(e) => setEditVExpirationDays(Math.max(1, parseInt(e.target.value) || 1))} placeholder="Days" className="admin-dashboard-input-7"/>
                <p className="admin-dashboard-this-violation-will-expire-in">
                  This violation will expire in {editVExpirationDays} days ({new Date(Date.now() + editVExpirationDays * 24 * 60 * 60 * 1000).toLocaleDateString()})
                </p>
              </div>
            </div>
            <div className="admin-dashboard-row-48">
              <Button onClick={saveViolationEdit} className="admin-dashboard-save-changes">
                <CheckCheck className="admin-dashboard-check-check-icon-2"/>Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditViolationModal(null)} className="admin-dashboard-cancel-3">
                Cancel
              </Button>
            </div>
          </div>
        </div>)}

      <AlertDialog open={Boolean(notificationToDelete)} onOpenChange={(open) => !open && !deletingNotifId && setNotificationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this notification permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
              {notificationToDelete?.title ? <span className="admin-dashboard-span-22">{safeNotificationText(notificationToDelete.title, "Notification")}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingNotifId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={Boolean(deletingNotifId)} onClick={(event) => {
            event.preventDefault();
            if (notificationToDelete?.id)
                void deleteNotif(notificationToDelete.id);
        }} className="admin-dashboard-alert-dialog-action-4">
              {deletingNotifId ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(caseAction)} onOpenChange={(open) => !open && !processingCaseAction && setCaseAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {caseAction?.type.startsWith("archive") ? "Remove from active list?" : caseAction?.type.startsWith("restore") ? "Restore this item?" : "Permanently delete this item?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {caseAction?.type.startsWith("archive")
            ? "This item will move to the Archived view in its current module and can be restored later."
            : caseAction?.type.startsWith("restore")
                ? "This item will return to the active admin list with its existing resolution status preserved."
                : "This permanently removes the archived database record after confirmation. Related notifications, notices, and violations are not removed by this action."}
              {caseAction?.label ? <span className="admin-dashboard-span-23">{caseAction.label}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingCaseAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={processingCaseAction} onClick={(event) => {
            event.preventDefault();
            void executeCaseAction();
        }} className={caseAction?.type.startsWith("delete") ? "admin-dashboard-alert-dialog-action-4" : "admin-dashboard-alert-dialog-action-5"}>
              {processingCaseAction ? "Working..." : caseAction?.type.startsWith("archive") ? "Archive" : caseAction?.type.startsWith("restore") ? "Restore" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);
}
