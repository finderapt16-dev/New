import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Login } from "./Signin";
import { Signup } from "./Signup";
import { ForgotPassword } from "./ForgotPassword";
import "./auth-dialog.css";

const VIEW_META = {
  login: {
    title: "Sign in to AptFindr",
    description: "Sign in to browse apartments or manage your property listings.",
  },
  signup: {
    title: "Create your AptFindr account",
    description: "Choose Tenant or Landlord to see the matching registration form.",
  },
  forgot: {
    title: "Reset your AptFindr password",
    description: "Enter your account email to request password reset instructions.",
  },
};

/**
 * The one and only auth UI: a floating panel where sign-in, sign-up and
 * forgot-password switch views in the same dialog. Used by the landing page
 * and by the /login, /signup and /forgot-password routes.
 */
export function AuthDialog({
  trigger,
  defaultView = "login",
  open: controlledOpen,
  onOpenChange,
  initialLoginMessage = null,
  redirectTo = null,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [view, setView] = useState(defaultView);
  // Message shown by the sign-in view (protected-page notice or the result
  // handed over by the signup view).
  const [loginMessage, setLoginMessage] = useState(initialLoginMessage);

  const handleOpenChange = (next) => {
    if (next) {
      setView(defaultView);
      setLoginMessage(initialLoginMessage);
    }
    setOpen(next);
  };

  const switchToLogin = (state) => {
    setLoginMessage(state ?? null);
    setView("login");
  };

  const meta = VIEW_META[view] ?? VIEW_META.login;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={`auth-dialog-content auth-dialog-content--${view}`}>
        <DialogTitle className="auth-dialog-accessible-title">{meta.title}</DialogTitle>
        <DialogDescription className="auth-dialog-accessible-description">{meta.description}</DialogDescription>
        {view === "login" && (
          <Login
            initialMessage={loginMessage}
            redirectTo={redirectTo}
            onSwitchToSignup={() => setView("signup")}
            onSwitchToForgot={() => setView("forgot")}
          />
        )}
        {view === "signup" && (
          <Signup
            onSwitchToLogin={switchToLogin}
            onSwitchToForgot={() => setView("forgot")}
          />
        )}
        {view === "forgot" && (
          <ForgotPassword onSwitchToLogin={() => switchToLogin()} />
        )}
      </DialogContent>
    </Dialog>
  );
}
