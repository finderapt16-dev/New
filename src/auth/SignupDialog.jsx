import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Signup } from "./Signup";
import "./signup-dialog.css";

/** Floating registration panel; the signup screen reveals the selected role's form. */
export function SignupDialog({ trigger }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="signup-dialog-content">
        <DialogTitle className="signup-dialog-accessible-title">Create your AptFindr account</DialogTitle>
        <DialogDescription className="signup-dialog-accessible-description">
          Choose Tenant or Landlord to see the matching registration form.
        </DialogDescription>
        <Signup />
      </DialogContent>
    </Dialog>
  );
}
