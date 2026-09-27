import { AuthDialog } from "./AuthDialog";

/**
 * Floating registration panel; the signup screen reveals the selected
 * role's form. "Sign in here" switches back to the floating sign-in view.
 */
export function SignupDialog(props) {
  return <AuthDialog defaultView="signup" {...props} />;
}
