import { AppLogo } from "@/components/AppLogo";
import { LandingListingsSection } from "./LandingApartmentPreview";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger, } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { BedDouble, Building2, CalendarCheck, CheckCircle2, DollarSign, Heart, Mail, MapPin, Menu, Search, SlidersHorizontal, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./landing.css";
/* ─── Barangay data ─────────────────────────────────────── */
const normalizeLocationKey = (value) => value
    .toLocaleLowerCase("en-PH")
    .replace(/\b(?:barangay|brgy)\.?\s*/g, "")
    .replace(/\b(?:sto|santo)\.?\s+/g, "sto ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const getLocationSearchTerm = (value) => normalizeLocationKey(value).replace(/^sto\s+/, "");
const formatLocationName = (value) => value
    .replace(/\b(?:barangay|brgy)\.?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-PH")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-PH"))
    .replace(/^Sto\s+/i, "Sto. ");
const genericLocationKey = /^(?:la paz|lapaz|iloilo|iloilo city|iloilo province|western visayas|philippines|5000)$/;
const streetAddressPattern = /^\d|\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|block|blk\.?|lot|house|unit)\b/i;
const getInventoryLocation = (apartment) => {
    const scopeText = [apartment.city, apartment.state, apartment.address, apartment.location].filter(Boolean).join(" ");
    if (!/\bla\s*paz\b/i.test(scopeText) || !/\biloilo\b/i.test(scopeText))
        return null;
    const candidates = [apartment.location, apartment.city]
        .filter((value) => Boolean(value?.trim()))
        .flatMap((value) => value.split(","))
        .concat((apartment.address || "").split(",").reverse());
    for (const candidate of candidates) {
        const displayName = formatLocationName(candidate);
        const key = normalizeLocationKey(displayName);
        if (!key || genericLocationKey.test(key) || streetAddressPattern.test(displayName))
            continue;
        return displayName;
    }
    return null;
};
export function Landing() {
    const { user } = useAuth();
    const { apartments, isLoading: apartmentsLoading } = useApartmentsContext();
    const navigate = useNavigate();
    const [landingSearch, setLandingSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [budget, setBudget] = useState("");
    const [roomType, setRoomType] = useState("");
    const [rooms, setRooms] = useState("");
    const [availability, setAvailability] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const inventoryLocations = useMemo(() => {
        const grouped = new Map();
        apartments.filter(isTenantVisibleApartment).forEach((apartment) => {
            const name = getInventoryLocation(apartment);
            if (!name)
                return;
            const key = normalizeLocationKey(name);
            const existing = grouped.get(key);
            grouped.set(key, existing ? { ...existing, count: existing.count + 1 } : { name, count: 1 });
        });
        return [...grouped.values()]
            .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "en-PH"))
            .slice(0, 6);
    }, [apartments]);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    const dashboardPath = user?.role === "admin" ? "/admin" : "/dashboard";
    const handleProtectedAction = (e) => {
        if (!user) {
            e.preventDefault();
            const destination = e.currentTarget.getAttribute("href") || "/browse";
            navigate(`/login?redirect=${encodeURIComponent(destination)}`, {
                state: { message: "Please sign in or create an account to view apartment details." },
            });
        }
    };
    const handleLandingSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (landingSearch.trim())
            params.set("search", landingSearch.trim());
        if (budget)
            params.set("budget", budget);
        if (roomType)
            params.set("type", roomType);
        if (rooms)
            params.set("rooms", rooms);
        if (availability)
            params.set("availability", availability);
        const destination = params.toString() ? `/browse?${params}` : "/browse";
        if (!user) {
            navigate(`/login?redirect=${encodeURIComponent(destination)}`, {
                state: { message: "Please sign in or create an account to view apartment details." },
            });
            return;
        }
        navigate(destination);
    };
    const activeFiltersCount = [budget, roomType, rooms, availability].filter(Boolean).length;
    return (<div className="landing-palette landing-page">

      <header className={`landing-header ${scrolled ? "landing-header-scrolled" : "landing-header-top"}`}>
        <div className="landing-container">
          <div className="landing-header-row">
            <Link to="/" className="landing-brand">
              <AppLogo className="landing-brand-logo"/>
              <div>
                <span className="landing-brand-name">
                  AptFindr
                </span>
                <p className="landing-brand-location">La Paz, Iloilo City</p>
              </div>
            </Link>

            <nav className="landing-header-nav">
              {[
            { to: "/browse", label: "Browse", protected: true },
            { to: "/favorites", label: "Favorites", protected: true, icon: <Heart className="landing-small-icon"/> },
        ].map(({ to, label, protected: isProtected, icon }) => (<Link key={to} to={to} onClick={isProtected ? handleProtectedAction : undefined} className="landing-nav-link">
                  {icon}{label}
                </Link>))}
              <div className="landing-account-nav">
                {!user ? (<>
                    <Link to="/login">
                      <Button variant="ghost" size="sm" className="landing-login-button">
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button size="sm" className="landing-account-button">
                        Sign Up
                      </Button>
                    </Link>
                  </>) : (<Link to={dashboardPath}>
                    <Button size="sm" className="landing-account-button">
                      Dashboard
                    </Button>
                  </Link>)}
              </div>
            </nav>

            <Sheet>
              <SheetTrigger className="landing-menu-trigger">
                <Menu className="landing-menu-icon"/>
              </SheetTrigger>
              <SheetContent className="landing-menu-panel">
                <SheetTitle className="landing-menu-title">Menu</SheetTitle>
                <SheetDescription className="landing-menu-description">AptFindr — La Paz, Iloilo City</SheetDescription>
                <nav className="landing-mobile-nav">
                  {[
            { to: "/browse", label: "Browse Apartments", protected: true },
            { to: "/favorites", label: "Favorites", protected: true },
            ...(!user ? [{ to: "/login", label: "Login", protected: false }, { to: "/signup", label: "Sign Up", protected: false }] : [{ to: dashboardPath, label: "Dashboard", protected: false }]),
        ].map(({ to, label, protected: isProtected }) => (<Link key={to} to={to} onClick={isProtected ? handleProtectedAction : undefined} className="landing-mobile-link">
                      {label}
                    </Link>))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <section className="landing-hero-section">
        <div className="landing-container">
          <div className="landing-hero-grid">
          <div className="landing-hero-content">


            <h1 className="landing-hero-title">
  <span className="landing-title-line">Find Apartments</span>
  <span className="landing-title-line">
    in <span className="location-highlight">La Paz</span>
  </span>
  <span className="landing-title-line">That Fit Your Needs</span>
    </h1>

            <p className="landing-hero-description">
              Browse apartments, compare rental options, view locations, and review room, amenity, and verification information.
            </p>

            <div className="landing-search-box">
              <form className="landing-search-form" onSubmit={handleLandingSearch}>
                <div className="landing-search-row">
                  <div className="landing-search-field">
                    <Search className="landing-search-icon"/>
                    <input value={landingSearch} onChange={(e) => setLandingSearch(e.target.value)} placeholder="Search by area, address, or apartment name..." className="landing-search-input"/>
                  </div>
                  <button type="button" onClick={() => setShowFilters(!showFilters)} className={`landing-filter-button ${showFilters || activeFiltersCount > 0 ? "landing-filter-active" : "landing-filter-idle"}`}>
                    <SlidersHorizontal className="landing-icon-small"/>
                    Filters
                    {activeFiltersCount > 0 && (<span className="landing-filter-count">
                        {activeFiltersCount}
                      </span>)}
                  </button>
                  <Button type="submit" className="landing-search-button">
                    Search
                  </Button>
                </div>
                  {showFilters && (<div className="landing-filter-panel">
                      <div className="landing-filter-grid">
                        <div>
                          <label className="landing-filter-label">
                            <DollarSign className="landing-filter-icon"/>Budget
                          </label>
                          <select value={budget} onChange={(e) => setBudget(e.target.value)} className="landing-filter-select">
                            <option value="">Any budget</option>
                            <option value="0-3000">Under ₱3,000</option>
                            <option value="3000-5000">₱3,000–5,000</option>
                            <option value="5000-8000">₱5,000–8,000</option>
                            <option value="8000+">₱8,000+</option>
                          </select>
                        </div>
                        <div>
                          <label className="landing-filter-label">
                            <Building2 className="landing-filter-icon"/>Type
                          </label>
                          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="landing-filter-select">
                            <option value="">All types</option>
                            <option value="apartment">Apartment</option>
                            <option value="studio">Studio</option>
                            <option value="family">Family Unit</option>
                            <option value="furnished">Furnished Unit</option>
                          </select>
                        </div>
                        <div>
                          <label className="landing-filter-label">
                            <BedDouble className="landing-filter-icon"/>Rooms
                          </label>
                          <select value={rooms} onChange={(e) => setRooms(e.target.value)} className="landing-filter-select">
                            <option value="">Any</option>
                            <option value="1">1 Room</option>
                            <option value="2">2 Rooms</option>
                            <option value="3">3 Rooms</option>
                            <option value="4+">4+ Rooms</option>
                          </select>
                        </div>
                        <div>
                          <label className="landing-filter-label">
                            <CalendarCheck className="landing-filter-icon"/>Available
                          </label>
                          <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="landing-filter-select">
                            <option value="">Any time</option>
                            <option value="now">Available now</option>
                            <option value="soon">Available soon</option>
                          </select>
                        </div>
                      </div>
                    </div>)}
              </form>
            </div>

          </div>
          </div>
        </div>
      </section>

      <div className="landing-listings-wrapper">
        <LandingListingsSection onBrowseClick={handleProtectedAction}/>
      </div>

  
      <section className="landing-process-section">
        <div className="landing-section-container">
          <div className="landing-process-heading">
            <h2 className="landing-section-title">How AptFindr Works</h2>
            <p className="landing-section-description">Create an account, review listings, and compare suitable options.</p>
          </div>

          <div className="landing-process-grid">
            <div className="landing-process-connector"/>

            {[
            { icon: UserCheck, title: "Create your account", desc: "Register as a renter or landlord. Landlords can then submit verification information for review." },
            { icon: Search, title: "Browse and compare", desc: "Filter apartments, review rooms and amenities, save favorites, and compare locations on the map." },
            { icon: CheckCircle2, title: "Review your options", desc: "Use listing details, availability, verification status, and personalized suggestions to compare rentals." },
        ].map(({ icon: Icon, title, desc }, i) => (<div key={title}>
                <div className="landing-process-card">
                  <div className="landing-process-icon">
                    <Icon className="landing-icon-process"/>
                  </div>
                  <div className="landing-process-number">
                    0{i + 1}
                  </div>
                  <h3 className="landing-card-title">{title}</h3>
                  <p className="landing-card-description">{desc}</p>
                </div>
              </div>))}
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div className="landing-cta-decoration">
          <div className="landing-cta-glow-top"/>
          <div className="landing-cta-glow-bottom"/>
        </div>
        <div className="landing-cta-container">
          <div>
            
            <h2 className="landing-cta-title">
              Explore apartment<br />listings in La Paz
            </h2>
            <p className="landing-cta-description">
              Create an account to browse listings, use the map view, save favorites, and receive suggestions based on your preferences.
            </p>
            <div className="landing-cta-actions">
              <Link to="/signup">
                <Button size="lg" className="landing-create-button">
                  <UserCheck className="landing-icon"/>
                  Create Account
                </Button>
              </Link>
              <Link to="/browse" onClick={handleProtectedAction}>
                <Button size="lg" variant="outline" className="landing-browse-button">
                  <Building2 className="landing-icon"/>
                  Browse Listings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-section-container">
          <div className="landing-footer-grid">
            <div className="landing-footer-about">
              <div className="landing-footer-brand">
                <AppLogo className="landing-footer-logo"/>
                <span className="landing-brand-name">AptFindr</span>
              </div>
              <p className="landing-footer-description">
                A Progressive Web Application for apartment discovery and listing management in La Paz, Iloilo City. Academic thesis project.
              </p>
              <div className="landing-footer-contact">
                <a href="mailto:rentiloilo@example.com" className="landing-footer-email">
                  <Mail className="landing-small-icon"/>rentiloilo@example.com
                </a>
              </div>
            </div>

            <div>
              <h4 className="landing-footer-heading">About</h4>
              <ul className="landing-footer-links">
                <li><span className="landing-footer-link">About Us</span></li>
                <li><span className="landing-footer-link">Privacy Policy</span></li>
                <li><span className="landing-footer-link">Terms & Conditions</span></li>
                <li><span className="landing-footer-link">Contact Us</span></li>
              </ul>
              <div className="landing-footer-coverage">
                <p className="landing-coverage-heading">Coverage Area</p>
                <div className="landing-coverage-row">
                  <MapPin className="landing-coverage-icon"/>
                  <span className="landing-coverage-text">La Paz, Iloilo City, Philippines</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>);
}
