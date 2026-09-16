import { Sidebar } from "@/tenant/Sidebar";
import { HelpSupport } from "@/tenant/HelpSupport";
import { ReportProblem } from "@/tenant/ReportProblem";
import { PopularSection, SuggestedSection } from "@/tenant/ApartmentDiscovery";
import { FavoritesOverview } from "@/tenant/Favorites";
import { Button } from "@/components/ui/button";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { isTenantRole } from "@/services/authService";
import { getTimeBasedGreeting } from "@/tenant/tenantGreeting";
import { Notifications } from "@/tenant/Notifications";
import { useTenantNotifications } from "@/tenant/useTenantNotifications";
import { fetchApartmentRatings, subscribeToApartmentRatings, summarizeApartmentRatings } from "@/services/apartmentRatingsService";
import { useFavorites } from "@/tenant/useFavorites";
import { Settings as AccountSettings } from "@/components/Settings";
import { createReport, createSupportTicket, defaultTenantPreferences, fetchApartmentViews, fetchFavorites as fetchDashboardFavorites, fetchTenantPreferences } from "@/services/dashboardSupabaseService";
import { uploadReportEvidence } from "@/services/reportEvidenceService";
import { getAvailableRoomCount, isTenantVisibleApartment } from "@/utils/listingVisibility";
import { hasMeaningfulPreferences, rankApartments } from "@/tenant/rankingEngine";
import { AlertTriangle, Menu, Loader2, RotateCcw, X, ChevronRight, Clock, Heart, LayoutDashboard, Search, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState } from "@/tenant/EmptyState";
const DASHBOARD_SECTIONS = ["overview", "favorites", "suggested", "popular", "notifications", "settings", "report", "help"];
export function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { favorites: favoriteIds, toggleFavorite, refreshFavorites } = useFavorites();
    const tenantNotifications = useTenantNotifications();
    const [activeSection, setActiveSection] = useState("suggested");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [favoriteFilter, setFavoriteFilter] = useState("all");
    const [favoriteSort, setFavoriteSort] = useState("newest");
    const [favoriteView, setFavoriteView] = useState("grid");
    const [removingFavoriteId, setRemovingFavoriteId] = useState(null);
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const [reportForm, setReportForm] = useState({
        apartment: "",
        details: "",
        contact: user?.email || "",
    });
    const [reportEvidenceFiles, setReportEvidenceFiles] = useState([]);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [supportSubmitted, setSupportSubmitted] = useState(false);
    const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
    const [supportForm, setSupportForm] = useState({
        topic: "",
        message: "",
        contact: user?.email || "",
    });
    const [tenantPreferences, setTenantPreferences] = useState(defaultTenantPreferences);
    const [preferencesLoading, setPreferencesLoading] = useState(true);
    const [dashboardFavoriteRows, setDashboardFavoriteRows] = useState([]);
    const [dashboardViewRows, setDashboardViewRows] = useState([]);
    const [dashboardRatingRows, setDashboardRatingRows] = useState([]);
    const [ratingsLoading, setRatingsLoading] = useState(true);
    const { apartments: allApartments, isLoading: apartmentsLoading, error: apartmentsError, refreshApartments, } = useApartmentsContext();
    const applyTenantPreferences = (preferences) => {
        setTenantPreferences(preferences);
    };
    useEffect(() => {
        const section = new URLSearchParams(location.search).get("section");
        if (section && DASHBOARD_SECTIONS.includes(section)) {
            setActiveSection(section);
        }
    }, [location.search]);
    useEffect(() => {
        let mounted = true;
        const loadRankingData = () => Promise.all([fetchDashboardFavorites(), fetchApartmentViews(), fetchApartmentRatings()])
            .then(([favorites, views, ratings]) => {
            if (!mounted)
                return;
            setDashboardFavoriteRows(favorites);
            setDashboardViewRows(views);
            setDashboardRatingRows(ratings);
            setRatingsLoading(false);
        })
            .catch(() => {
            if (!mounted)
                return;
            setDashboardFavoriteRows([]);
            setDashboardViewRows([]);
            setDashboardRatingRows([]);
            setRatingsLoading(false);
        });
        void loadRankingData();
        const unsubscribe = subscribeToApartmentRatings(() => { void loadRankingData(); });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);
    useEffect(() => {
        setPreferencesLoading(true);
        applyTenantPreferences(defaultTenantPreferences);
        if (!user?.id || !isTenantRole(user.role)) {
            setPreferencesLoading(false);
            return;
        }
        let mounted = true;
        const tenantId = user.id;
        void fetchTenantPreferences(tenantId)
            .then((preferences) => {
            if (!mounted)
                return;
            applyTenantPreferences(preferences ?? defaultTenantPreferences);
            setPreferencesLoading(false);
        })
            .catch(() => {
            if (!mounted)
                return;
            setPreferencesLoading(false);
            toast.error("Unable to load tenant preferences.");
        });
        return () => {
            mounted = false;
        };
    }, [user?.id, user?.role]);
    const publishedApartments = useMemo(() => {
        return allApartments.filter(isTenantVisibleApartment);
    }, [allApartments]);
    const ratingSummary = useMemo(() => summarizeApartmentRatings(dashboardRatingRows), [dashboardRatingRows]);
    const isApartmentAvailable = isTenantVisibleApartment;
    const availableApartments = useMemo(() => {
        return publishedApartments.filter(isApartmentAvailable);
    }, [publishedApartments]);
    const availableRoomsCount = useMemo(() => {
        return publishedApartments.reduce((total, apt) => total + getAvailableRoomCount(apt), 0);
    }, [publishedApartments]);
    const tenantRankingPreferences = useMemo(() => {
        const parsedBudget = Number(tenantPreferences.maxBudget);
        return {
            hasSavedPreferences: tenantPreferences.hasSavedPreferences,
            maxBudget: tenantPreferences.saveBudgetPreferences && Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
            preferredArea: tenantPreferences.recommendationLocation && tenantPreferences.preferredArea.trim() ? tenantPreferences.preferredArea.trim() : undefined,
            minBedrooms: tenantPreferences.minBedrooms,
            roomCapacity: tenantPreferences.roomCapacity,
            petFriendly: tenantPreferences.petFriendly,
            parking: tenantPreferences.parking,
            furnished: tenantPreferences.furnished,
            wifi: tenantPreferences.wifi,
            ac: tenantPreferences.ac,
            laundryArea: tenantPreferences.laundryArea,
            recommendationLocation: tenantPreferences.recommendationLocation,
            saveBudgetPreferences: tenantPreferences.saveBudgetPreferences,
        };
    }, [tenantPreferences]);
    const hasPersonalizationPreferences = hasMeaningfulPreferences(tenantRankingPreferences);
    // Personalized recommendations based on saved tenant preferences
    const suggestedApartments = useMemo(() => {
        if (isTenantRole(user?.role) && hasPersonalizationPreferences) {
            const apartmentViewCounts = new Map();
            dashboardViewRows.forEach((row) => {
                const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
                if (apartmentId)
                    apartmentViewCounts.set(apartmentId, (apartmentViewCounts.get(apartmentId) ?? 0) + (Number(row.view_count) || 1));
            });
            const apartmentFavoriteCounts = new Map();
            dashboardFavoriteRows.forEach((row) => {
                const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
                if (apartmentId)
                    apartmentFavoriteCounts.set(apartmentId, (apartmentFavoriteCounts.get(apartmentId) ?? 0) + 1);
            });
            const ratingSummary = summarizeApartmentRatings(dashboardRatingRows);
            return rankApartments(publishedApartments, tenantRankingPreferences, {
                apartmentViewCounts,
                apartmentFavoriteCounts,
                apartmentRatingStats: ratingSummary.byApartment,
                platformAverageRating: ratingSummary.platformAverage,
            }).slice(0, 6);
        }
        return [];
    }, [dashboardFavoriteRows, dashboardRatingRows, dashboardViewRows, hasPersonalizationPreferences, publishedApartments, tenantRankingPreferences, user?.role]);
    // Popular apartments (most viewed, most favorited, highest engagement)
    const popularApartments = useMemo(() => {
        const getApartmentId = (row) => row.apartment_id ?? row.apartmentId ?? "";
        const getViewWeight = (row) => Number(row.view_count) || 1;
        const engagementByApartment = new Map();
        dashboardFavoriteRows.forEach((row) => {
            const apartmentId = getApartmentId(row);
            if (apartmentId)
                engagementByApartment.set(apartmentId, (engagementByApartment.get(apartmentId) ?? 0) + 2);
        });
        dashboardViewRows.forEach((row) => {
            const apartmentId = getApartmentId(row);
            if (apartmentId)
                engagementByApartment.set(apartmentId, (engagementByApartment.get(apartmentId) ?? 0) + getViewWeight(row));
        });
        if (!hasPersonalizationPreferences)
            return publishedApartments.slice(0, 6);
        const relevance = new Map(rankApartments(publishedApartments, tenantRankingPreferences).map((apartment) => [apartment.id, apartment.rankingScore]));
        return [...publishedApartments]
            .filter((apartment) => (engagementByApartment.get(apartment.id) ?? 0) > 0)
            .sort((a, b) => {
            return ((engagementByApartment.get(b.id) ?? 0) + (relevance.get(b.id) ?? 0)) - ((engagementByApartment.get(a.id) ?? 0) + (relevance.get(a.id) ?? 0));
        })
            .slice(0, 6);
    }, [dashboardFavoriteRows, dashboardViewRows, publishedApartments, hasPersonalizationPreferences, tenantRankingPreferences]);
    const favoriteApartments = publishedApartments.filter((apt) => favoriteIds.includes(apt.id));
    const visibleFavoriteApartments = useMemo(() => {
        return [...favoriteApartments]
            .filter((apartment) => {
            if (favoriteFilter === "available")
                return isApartmentAvailable(apartment);
            return true;
        })
            .sort((a, b) => {
            if (favoriteSort === "price-low")
                return Number(a.price || 0) - Number(b.price || 0);
            if (favoriteSort === "price-high")
                return Number(b.price || 0) - Number(a.price || 0);
            if (favoriteSort === "name")
                return a.title.localeCompare(b.title);
            const bDate = new Date(b.updatedAt || b.createdAt || b.availableDate).getTime();
            const aDate = new Date(a.updatedAt || a.createdAt || a.availableDate).getTime();
            return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
        });
    }, [favoriteApartments, favoriteFilter, favoriteSort]);
    const displayName = user?.name?.trim();
    const tenantGreeting = getTimeBasedGreeting(user?.name);
    const dashboardSubtitle = "Find verified apartments that fit your needs.";
    const handleLogout = () => { logout?.(); navigate("/"); };
    const removeFavorite = async (apartmentId) => {
        setRemovingFavoriteId(apartmentId);
        try {
            await toggleFavorite(apartmentId);
            await refreshFavorites();
        }
        finally {
            setRemovingFavoriteId(null);
        }
    };
    const handleReportSubmit = async () => {
        if (isSubmittingReport)
            return;
        if (!reportForm.apartment) {
            toast.error("Please select the apartment you want to report.");
            return;
        }
        if (!reportForm.details.trim()) {
            toast.error("Please describe the problem before submitting.");
            return;
        }
        if (reportEvidenceFiles.length === 0) {
            toast.error("Please upload at least one image or evidence file.");
            return;
        }
        if (!user?.id) {
            toast.error("Please sign in to submit a report.");
            return;
        }
        const apartment = allApartments.find((apt) => apt.id === reportForm.apartment);
        setIsSubmittingReport(true);
        try {
            const createdReport = await createReport({
                reporter_id: user.id,
                reporter_role: "tenant",
                apartment_id: reportForm.apartment,
                category: "Apartment problem",
                issue_type: "Tenant-submitted problem",
                severity: "med",
                tags: [],
                details: reportForm.details.trim(),
                contact: reportForm.contact.trim() || user.email,
                landlord_id: apartment?.landlordId,
                has_evidence: reportEvidenceFiles.length > 0,
                evidence_count: reportEvidenceFiles.length,
            });
            if (!createdReport?.id) {
                throw new Error("Unable to save report.");
            }
            const reportId = createdReport.id;
            const uploadResults = await Promise.all(reportEvidenceFiles.map((evidence) => uploadReportEvidence({
                reportId,
                file: evidence.file,
                fileName: evidence.fileName,
                fileType: evidence.fileType,
                mimeType: evidence.mimeType,
                uploadedBy: user.id,
            })));
            if (uploadResults.some((result) => !result)) {
                throw new Error("Report saved, but one or more evidence files could not be uploaded. Please contact support.");
            }
            setReportSubmitted(true);
            toast.success("Report submitted successfully. Admin will review it.");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to submit report.";
            toast.error(message);
        }
        finally {
            setIsSubmittingReport(false);
        }
    };
    const resetReport = () => {
        setReportSubmitted(false);
        setReportForm({ apartment: "", details: "", contact: user?.email || "" });
        setReportEvidenceFiles([]);
    };
    const handleSupportSubmit = async () => {
        if (isSubmittingSupport)
            return;
        if (!supportForm.topic || !supportForm.message.trim()) {
            toast.error("Please choose a topic and describe your concern.");
            return;
        }
        if (!user?.id)
            return void toast.error("Please sign in to contact support.");
        setIsSubmittingSupport(true);
        try {
            await createSupportTicket({
                userId: user.id,
                topic: supportForm.topic,
                message: supportForm.message,
                contact: supportForm.contact,
            });
            setSupportSubmitted(true);
            setSupportForm({ topic: "", message: "", contact: user.email || "" });
            toast.success("Support request sent!");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to send the support request.");
        }
        finally {
            setIsSubmittingSupport(false);
        }
    };
    const renderSettings = () => <AccountSettings embedded/>;
    const sectionMap = {
        overview: () => (<DashboardOverview tenantGreeting={tenantGreeting} dashboardSubtitle={dashboardSubtitle} favoriteIds={favoriteIds} availableApartments={availableApartments} availableRoomsCount={availableRoomsCount} hasPersonalizationPreferences={hasPersonalizationPreferences} suggestedApartments={suggestedApartments} popularApartments={popularApartments} setActiveSection={setActiveSection} navigate={navigate}/>),
        favorites: () => (<FavoritesOverview favoriteApartments={favoriteApartments} visibleFavoriteApartments={visibleFavoriteApartments} favoriteFilter={favoriteFilter} setFavoriteFilter={setFavoriteFilter} favoriteSort={favoriteSort} setFavoriteSort={setFavoriteSort} favoriteView={favoriteView} setFavoriteView={setFavoriteView} removingFavoriteId={removingFavoriteId} removeFavorite={removeFavorite} ratingSummary={ratingSummary} ratingsLoading={ratingsLoading} navigate={navigate}/>),
        suggested: () => (<SuggestedSection hasPersonalizationPreferences={hasPersonalizationPreferences} preferencesLoading={preferencesLoading} suggestedApartments={suggestedApartments} ratingSummary={ratingSummary} ratingsLoading={ratingsLoading} navigate={navigate}/>),
        popular: () => (<PopularSection popularApartments={popularApartments} ratingSummary={ratingSummary} ratingsLoading={ratingsLoading} navigate={navigate}/>),
        notifications: () => <Notifications state={tenantNotifications}/>,
        report: () => (<ReportProblem reportSubmitted={reportSubmitted} resetReport={resetReport} reportForm={reportForm} setReportForm={setReportForm} publishedApartments={publishedApartments} reportEvidenceFiles={reportEvidenceFiles} setReportEvidenceFiles={setReportEvidenceFiles} user={user} handleReportSubmit={handleReportSubmit} isSubmittingReport={isSubmittingReport}/>),
        settings: renderSettings,
        help: () => (<HelpSupport navigate={navigate} setActiveSection={setActiveSection} supportSubmitted={supportSubmitted} setSupportSubmitted={setSupportSubmitted} supportForm={supportForm} setSupportForm={setSupportForm} handleSupportSubmit={handleSupportSubmit} isSubmittingSupport={isSubmittingSupport}/>),
    };
    const renderDashboardLoading = () => (<div className="tenant-dashboard-container">
      <section className="tenant-dashboard-section">
        <div className="tenant-dashboard-content">
          <div className="tenant-dashboard-panel">
            <div className="tenant-dashboard-loading-dashboard">
              <Loader2 className="tenant-dashboard-loader2-icon"/>
              Loading Dashboard
            </div>
            <div className="tenant-dashboard-panel-2"/>
            <div className="tenant-dashboard-panel-3"/>
          </div>
          <div className="tenant-dashboard-grid">
            <div className="tenant-dashboard-panel-4"/>
            <div className="tenant-dashboard-panel-5"/>
          </div>
        </div>
      </section>

      <section className="tenant-dashboard-section-2">
        {[0, 1].map((item) => (<div key={item} className="tenant-dashboard-card">
            <div className="tenant-dashboard-row">
              <div className="tenant-dashboard-panel-6"/>
              <div className="tenant-dashboard-panel-7">
                <div className="tenant-dashboard-panel-8"/>
                <div className="tenant-dashboard-panel-9"/>
                <div className="tenant-dashboard-panel-10"/>
              </div>
            </div>
          </div>))}
      </section>

      <section className="tenant-dashboard-section-3">
        {[0, 1, 2].map((item) => (<div key={item} className="tenant-dashboard-card-2">
            <div className="tenant-dashboard-panel-11"/>
            <div className="tenant-dashboard-panel-12"/>
            <div className="tenant-dashboard-panel-13"/>
            <div className="tenant-dashboard-panel-14"/>
            <div className="tenant-dashboard-panel-15"/>
          </div>))}
      </section>
    </div>);
    const renderDashboardError = () => (<div className="tenant-dashboard-container-2">
      <section className="tenant-dashboard-section-4">
        <span className="tenant-dashboard-row-2">
          <AlertTriangle className="tenant-dashboard-alert-triangle-icon"/>
        </span>
        <h1 className="tenant-dashboard-dashboard-data-could-not-load">Dashboard data could not load</h1>
        <p className="tenant-dashboard-text">
          {apartmentsError || "We could not load the latest apartment records. Please try again."}
        </p>
        <Button onClick={() => void refreshApartments()} className="tenant-dashboard-try-again">
          <RotateCcw className="tenant-dashboard-rotate-ccw-icon"/>
          Try Again
        </Button>
      </section>
    </div>);
    const activeContent = apartmentsError && allApartments.length === 0
        ? renderDashboardError()
        : apartmentsLoading && allApartments.length === 0
            ? renderDashboardLoading()
            : (sectionMap[activeSection] ?? sectionMap.overview)();
    return (<div className="tenant-browse app-shell">
      <div className="app-shell-frame">
        <aside className="app-shell-sidebar">
          <Sidebar mode="dashboard" displayName={displayName} favoriteIds={favoriteIds} tenantNotifications={tenantNotifications} activeSection={activeSection} setActiveSection={setActiveSection} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout}/>
        </aside>

        {sidebarOpen && (<div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)}/>)}

        <aside className={`app-sidebar-drawer ${sidebarOpen ? "tenant-dashboard-aside" : "tenant-dashboard-aside-2"}`}>
          <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close">
            <X className="tenant-dashboard-x-icon"/>
          </button>
          <Sidebar mode="dashboard" displayName={displayName} favoriteIds={favoriteIds} tenantNotifications={tenantNotifications} activeSection={activeSection} setActiveSection={setActiveSection} setSidebarOpen={setSidebarOpen} handleLogout={handleLogout}/>
        </aside>

        <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger">
          <Menu className="tenant-dashboard-menu-icon"/>
        </button>

        <div className="app-shell-main">
          <main className="app-shell-content app-shell-content-mobile-nav">
            {activeContent}
          </main>
        </div>
      </div>
    </div>);
}

const DashboardOverview = ({ tenantGreeting, dashboardSubtitle, favoriteIds, availableApartments, availableRoomsCount, hasPersonalizationPreferences, suggestedApartments, popularApartments, setActiveSection, navigate, }) => (<div className="overview-section-container">
    <section className="overview-section-section">
      <div className="overview-section-panel">
        <div className="overview-section-your-dashboard">
          <LayoutDashboard className="overview-section-layout-dashboard-icon"/>
          Your Dashboard
        </div>
        <h1 className="overview-section-title">{tenantGreeting}</h1>
        <p className="overview-section-text">{dashboardSubtitle}</p>
      </div>
      <div className="overview-section-panel-2"/>
      <div className="overview-section-card">
        <div className="overview-section-panel-3"/>
        <div className="overview-section-panel-4"/>
        <div className="overview-section-panel-5"/>
        <div className="overview-section-panel-6"/>
      </div>
    </section>

    <section className="overview-section-section-2">
      <SummaryCard title="Your Favorites" value={favoriteIds.length} detail="Apartments saved" icon={Heart} tone="tenant-summary-brand" onClick={() => setActiveSection("favorites")}/>
      <SummaryCard title="Available Now" value={availableApartments.length} detail={`${availableRoomsCount.toLocaleString()} available ${availableRoomsCount === 1 ? "room" : "rooms"}`} icon={Clock} tone="tenant-summary-available" onClick={() => navigate("/browse")}/>
    </section>

    {availableApartments.length === 0 && (<EmptyState icon={Clock} message="No available apartments at the moment."/>)}

    <section className="overview-section-section-3">
      <FeatureCard setActiveSection={setActiveSection} title={hasPersonalizationPreferences ? "Recommended for You" : "Find Apartments for You"} description={hasPersonalizationPreferences ? "Apartment suggestions based on your preferences." : "Set your preferences to receive personalized apartment suggestions."} count={suggestedApartments.length} icon={Sparkles} section="suggested" accent="orange"/>
      <FeatureCard setActiveSection={setActiveSection} title="Popular Apartments" description="Apartments receiving more interest from AptFindr users through views and favorites." count={popularApartments.length} icon={TrendingUp} section="popular" accent="indigo"/>
    </section>

    <section className="overview-section-section-4">
      <span className="overview-section-row">
        <Search className="overview-section-search-icon"/>
      </span>
      <div className="overview-section-panel-7">
        <h2 className="overview-section-looking-for-something-specific">Looking for something specific?</h2>
        <p className="overview-section-text-2">Use View Apartments to find apartments from the live listing database.</p>
      </div>
      <Button onClick={() => navigate("/browse")} className="overview-section-browse-all-apartments">
        View Apartments
        <ChevronRight className="overview-section-chevron-right-icon"/>
      </Button>
    </section>
  </div>);
const SummaryCard = ({ title, value, detail, icon: Icon, tone, onClick, }) => (<button onClick={onClick} className="summary-card-button">
    <span className={`summary-card-row ${tone}`}>
      <Icon className="summary-card-icon-icon"/>
    </span>
    <span className="summary-card-span">
      <span className="summary-card-span-2">{title}</span>
      <strong className="summary-card-strong">{value.toLocaleString()}</strong>
      <span className="summary-card-span-3">{detail}</span>
    </span>
    <span className="summary-card-row-2">
      <ChevronRight className="summary-card-chevron-right-icon"/>
    </span>
  </button>);
const FeatureCard = ({ title, description, count, icon: Icon, section, accent, setActiveSection, }) => {
    const accentClass = {
        orange: "feature-card-button-2",
        indigo: "feature-card-button-3",
        green: "feature-card-button-4",
    }[accent];
    return (<button onClick={() => setActiveSection(section)} className={`feature-card-button ${accentClass}`}>
      <div className="feature-card-panel">
        <span className="feature-card-card">
          <Icon className="feature-card-icon-icon"/>
        </span>
        <h3 className="feature-card-heading">{title}</h3>
        <p className="feature-card-text">{description}</p>
        <div className="feature-card-panel-2">
          {count.toLocaleString()} {count === 1 ? "listing" : "listings"}
        </div>
        <div className="feature-card-explore-now">
          Explore Now
          <ChevronRight className="feature-card-chevron-right-icon"/>
        </div>
      </div>
      <div className="feature-card-panel-3"/>
      <div className="feature-card-panel-4"/>
    </button>);
};
