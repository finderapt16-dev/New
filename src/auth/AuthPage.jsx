import { useLocation, useNavigate } from "react-router-dom";
import { AuthDialog } from "./AuthDialog";

/**
 * The /login, /signup and /forgot-password routes render the same floating
 * auth panel (used for direct links, bookmarks and protected-page redirects).
 * Closing the panel returns to the landing page.
 */
export function AuthPage({ view = "login" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get("redirect");
  const state = location.state;
  const initialLoginMessage = state?.message
    ? {
        message: state.message,
        verificationEmail:
          typeof state.verificationEmail === "string" ? state.verificationEmail : undefined,
        verificationHelp: state.verificationHelp === true,
      }
    : null;

  return (
    <div className="auth-page-backdrop">
      <AuthDialog
        defaultView={view}
        open
        showBackToHome
        onOpenChange={(next) => {
          if (!next) navigate("/", { replace: true });
        }}
        initialLoginMessage={initialLoginMessage}
        redirectTo={redirect}
      />
    </div>
  );
}
