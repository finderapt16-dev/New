import { AuthDialog } from "./AuthDialog";

/**
 * Floating sign-in panel used by the public landing page.
 * "Create account" and "Forgot password?" switch views inside this same
 * floating dialog instead of navigating to the old full-page routes.
 */
export function LoginDialog(props) {
  return <AuthDialog defaultView="login" {...props} />;
}
