import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Login } from "./Signin";
import "./login-dialog.css";

/** Floating sign-in panel used by the public landing page. */
export function LoginDialog({ trigger, open: controlledOpen, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="login-dialog-content">
        <DialogTitle className="login-dialog-accessible-title">Sign in to AptFindr</DialogTitle>
        <DialogDescription className="login-dialog-accessible-description">
          Sign in to browse apartments or manage your property listings.
        </DialogDescription>
        <Login />
      </DialogContent>
    </Dialog>
  );
}
