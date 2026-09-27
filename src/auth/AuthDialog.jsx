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
 * Single floating auth panel. "Create account" and "Forgot password?" switch
 * views inside this same dialog instead of navigating to the old full-page
 * /signup and /forgot-password routes.
 */
export function AuthDialog({ trigger, defaultView = "login", open: controlledOpen, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [view, setView] = useState(defaultView);
  // Result handed by the signup view so the sign-in view can show it
  // (verification message + resend link), same as the page flow.
  const [loginMessage, setLoginMessage] = useState(null);

  const handleOpenChange = (next) => {
    if (next) {
      setView(defaultView);
      setLoginMessage(null);
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
            variant="dialog"
            initialMessage={loginMessage}
            onSwitchToSignup={() => setView("signup")}
            onSwitchToForgot={() => setView("forgot")}
          />
        )}
        {view === "signup" && (
          <Signup
            variant="dialog"
            onSwitchToLogin={switchToLogin}
            onSwitchToForgot={() => setView("forgot")}
          />
        )}
        {view === "forgot" && (
          <ForgotPassword variant="dialog" onSwitchToLogin={() => switchToLogin()} />
        )}
      </DialogContent>
    </Dialog>
  );
}
