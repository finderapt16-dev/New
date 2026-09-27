import { AppLogo } from "@/components/AppLogo";
import { AuthDialog } from "@/auth/AuthDialog";
import { LoginDialog } from "@/auth/LoginDialog";
import { SignupDialog } from "@/auth/SignupDialog";
import { LandingListingsSection } from "./LandingApartmentPreview";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger, } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, MapPin, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./landing.css";
const LANDING_LOGIN_MESSAGE = "Please sign in or create an account to view apartment details.";
export function Landing() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [landingSearch, setLandingSearch] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    // Floating auth prompt opened by protected landing actions (search,
    // browse, listing cards). Null when closed.
    const [authPrompt, setAuthPrompt] = useState(null);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    const dashboardPath = user?.role === "admin" ? "/admin" : "/dashboard";
    const openAuthPrompt = (view, { redirect = null, message = null } = {}) => {
        setAuthPrompt({ view, redirect, message });
    };
    const handleProtectedAction = (e) => {
        if (!user) {
            e.preventDefault();
            const destination = e.currentTarget.getAttribute("href") || "/browse";
            openAuthPrompt("login", { redirect: destination, message: LANDING_LOGIN_MESSAGE });
        }
    };
    const handleMobileProtectedAction = (e) => {
        handleProtectedAction(e);
        if (!user)
            setMenuOpen(false);
    };
    const handleSignupAction = (e) => {
        e?.preventDefault?.();
        setMenuOpen(false);
        openAuthPrompt("signup");
    };
    const handleLandingSearch = (e) => {
        e.preventDefault();
        const destination = landingSearch.trim()
            ? `/browse?search=${encodeURIComponent(landingSearch.trim())}`
            : "/browse";
        if (!user) {
            openAuthPrompt("login", { redirect: destination, message: LANDING_LOGIN_MESSAGE });
            return;
        }
        navigate(destination);
    };
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
                    <LoginDialog trigger={<Button variant="ghost" size="sm" className="landing-login-button">Login</Button>} />
                    <SignupDialog trigger={<Button size="sm" className="landing-account-button">Sign Up</Button>} />
                  </>) : (<Link to={dashboardPath}>
                    <Button size="sm" className="landing-account-button">
                      Dashboard
                    </Button>
                  </Link>)}
              </div>
            </nav>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger className="landing-menu-trigger">
                <Menu className="landing-menu-icon"/>
              </SheetTrigger>
              <SheetContent className="landing-menu-panel">
                <SheetTitle className="landing-menu-title">Menu</SheetTitle>
                <SheetDescription className="landing-menu-description">AptFindr — La Paz, Iloilo City</SheetDescription>
                <nav className="landing-mobile-nav">
                  <Link to="/browse" onClick={handleMobileProtectedAction} className="landing-mobile-link">
                    Browse Apartments
                  </Link>
                  <Link to="/favorites" onClick={handleMobileProtectedAction} className="landing-mobile-link">
                    Favorites
                  </Link>
                  {!user ? (<>
                    <button type="button" onClick={() => { setMenuOpen(false); openAuthPrompt("login"); }} className="landing-mobile-link">
                      Login
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); openAuthPrompt("signup"); }} className="landing-mobile-link">
                      Sign Up
                    </button>
                  </>) : (<Link to={dashboardPath} className="landing-mobile-link">
                    Dashboard
                  </Link>)}
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
        <LandingListingsSection onBrowseClick={handleProtectedAction} onSignupClick={handleSignupAction}/>
      </div>

  
    
      <section className="landing-final-cta">
        <div className="landing-cta-decoration">
          <div className="landing-cta-glow-top"/>
          <div className="landing-cta-glow-bottom"/>
        </div>
        <div className="landing-cta-container">
          <div>
            
            
            <div className="landing-cta-actions">
              <Button size="lg" className="landing-create-button" onClick={() => openAuthPrompt("login")}>
                Load More
              </Button>
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

      {authPrompt ? (<AuthDialog defaultView={authPrompt.view} open onOpenChange={(next) => { if (!next)
                setAuthPrompt(null); }} initialLoginMessage={authPrompt.message ? { message: authPrompt.message } : null} redirectTo={authPrompt.redirect}/>) : null}
    </div>);
}
