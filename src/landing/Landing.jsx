import { AppLogo } from "@/components/AppLogo";
import { LandingListingsSection } from "./LandingApartmentPreview";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger, } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { BedDouble, Building2, CalendarCheck, CheckCircle2, PhilippinePeso, Mail, MapPin, Menu, Search, SlidersHorizontal, UserCheck } from "lucide-react";
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
Browse verified apartment listings, compare rental options, explore locations, and review room details and amenities all in one place.</p>

            <div className="landing-search-box">
              <form className="landing-search-form" onSubmit={handleLandingSearch}>
                <div className="landing-search-row">
                  <div className="landing-search-field">
                    <Search className="landing-search-icon"/>
                    <input value={landingSearch} onChange={(e) => setLandingSearch(e.target.value)} placeholder="Search by area, address, or apartment name..." className="landing-search-input"/>
                  </div>
  
                  <Button type="submit" className="landing-search-button">
                    Search
                  </Button>
                </div>
          
              </form>
            </div>

          </div>
          </div>
        </div>
      </section>

      <div className="landing-listings-wrapper">
        <LandingListingsSection onBrowseClick={handleProtectedAction}/>
      </div>

  
    
      <section className="landing-final-cta">
        <div className="landing-cta-decoration">
          <div className="landing-cta-glow-top"/>
          <div className="landing-cta-glow-bottom"/>
        </div>
        <div className="landing-cta-container">
          <div>
            
            
            <div className="landing-cta-actions">
              <Link to="/login">
                <Button size="lg" className="landing-create-button">
                  Load More
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
                <span className="landing-brand-name">AptFindr</span>
              </div>
              <p className="landing-footer-description">
                Lapaz,Iloilo City
              </p>
              <div className="landing-footer-contact">
                <a href="mailto:rentiloilo@example.com" className="landing-footer-email">
                  <Mail className="landing-small-icon"/>rentiloilo@example.com
                </a>
              </div>
            </div>

            <div>
              <h4 className="landing-footer-heading">Support</h4>
              <ul className="landing-footer-links">
                <li><span className="landing-footer-link">Help Desk</span></li>
                <li><span className="landing-footer-link">Contact Us</span></li>
                <li><span className="landing-footer-link">Terms of Service</span></li>
           
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
