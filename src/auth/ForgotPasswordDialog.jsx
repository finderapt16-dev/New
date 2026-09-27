import { AuthDialog } from "./AuthDialog";

/** Floating password-recovery panel; "Back to Sign In" returns to the sign-in view. */
export function ForgotPasswordDialog(props) {
  return <AuthDialog defaultView="forgot" {...props} />;
}
