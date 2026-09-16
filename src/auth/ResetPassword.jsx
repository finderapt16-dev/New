import "./reset_password.css";
import { AppLogo } from "@/components/AppLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exchangeAuthCode, getAuthSession, signOutAuthSession, updateAuthPassword } from "@/services/authService";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
export function ResetPassword() {
    const navigate = useNavigate();
    const [checkingSession, setCheckingSession] = useState(true);
    const [hasRecoverySession, setHasRecoverySession] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        let active = true;
        void (async () => {
            const params = new URLSearchParams(window.location.search);
            const callbackError = params.get("error_description") || params.get("error");
            if (callbackError) {
                console.error("Password recovery link was rejected:", callbackError);
                if (active)
                    setError("This password reset link is invalid or has expired. Request a new one.");
                if (active)
                    setCheckingSession(false);
                return;
            }
            const code = params.get("code");
            if (code) {
                const { error: exchangeError } = await exchangeAuthCode(code);
                if (exchangeError)
                    console.error("Unable to exchange password recovery code:", exchangeError);
            }
            const { data, error: sessionError } = await getAuthSession();
            if (sessionError)
                console.error("Unable to read password recovery session:", sessionError);
            if (!active)
                return;
            setHasRecoverySession(Boolean(data.session));
            if (!data.session)
                setError("This password reset link is invalid or has expired. Request a new one.");
            setCheckingSession(false);
        })();
        return () => { active = false; };
    }, []);
    const submit = async (event) => {
        event.preventDefault();
        setError("");
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setSaving(true);
        const { error: updateError } = await updateAuthPassword(password);
        if (updateError) {
            console.error("Password update failed:", updateError);
            setError(/same password/i.test(updateError.message) ? "Choose a password you have not used before." : "Unable to change your password. Request a new reset link and try again.");
            setSaving(false);
            return;
        }
        await signOutAuthSession();
        navigate("/login", { replace: true, state: { message: "Your password has been changed successfully." } });
    };
    return (<main className="reset-password-page">
      <section className="reset-password-card">
        <Link to="/" className="reset-password-brand">
          <AppLogo className="reset-password-logo" iconClassName="reset-password-icon"/>
          <span className="reset-password-brand-name">RentIloilo</span>
        </Link>
        <KeyRound className="reset-password-heading-icon"/>
        <h1 className="reset-password-title">Choose a new password</h1>
        <p className="reset-password-description">Enter and confirm the new password for your account.</p>

        {checkingSession ? (<div className="reset-password-loading"><Loader2 className="reset-password-spinner"/> Validating reset link...</div>) : hasRecoverySession ? (<form onSubmit={submit} className="reset-password-form">
            {error && <Alert variant="destructive"><AlertCircle className="reset-password-icon-small"/><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="reset-password-field"><Label htmlFor="new-password">New Password</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required/></div>
            <div className="reset-password-field"><Label htmlFor="confirm-password">Confirm New Password</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required/></div>
            <Button type="submit" disabled={saving} className="reset-password-submit-button">{saving ? <><Loader2 className="reset-password-button-spinner"/> Changing password...</> : <><CheckCircle2 className="reset-password-button-icon"/> Change Password</>}</Button>
          </form>) : (<div className="reset-password-error-panel"><Alert variant="destructive"><AlertCircle className="reset-password-icon-small"/><AlertDescription>{error}</AlertDescription></Alert><Link to="/forgot-password" className="reset-password-recovery-link">Request a new reset link</Link></div>)}
      </section>
    </main>);
}
