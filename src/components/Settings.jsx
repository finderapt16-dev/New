import { ArrowLeft, Bell, BriefcaseBusiness, Camera, Check, ChevronRight, Clock, Eye, EyeOff, HelpCircle, Lock, Settings as SettingsIcon, Shield, Trash2, Upload, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { deleteUser as deleteUserAccount, isTenantRole } from "@/services/authService";
import { fetchUserPreferenceSections, fetchUserProfileDetails, saveUserPreferenceSection, updateUserProfile, uploadUserAvatar } from "@/services/dashboardSupabaseService";
import { Settings as TenantSettings } from "@/tenant/Settings";
const inputClass = "settings-input";
const textareaClass = "settings-textarea";
function SettingsLineArt() {
    return (<svg aria-hidden="true" className="tenant-architecture" viewBox="0 0 520 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className="tenant-architecture-lines" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 194h484M95 194v-70h268v70M76 124h307M113 194v-43h45v43m171 0v-43h24v43"/>
        <path d="M141 124V48h102v76M156 64h72v45h-72M173 78h38m-30 15h22"/>
        <path d="M272 124V67h99v57M288 83h67m-67 18h67M306 76v14m29 4v14"/>
        <path d="M407 194V80m0 0c0-17 13-29 30-29h20M394 80h26M457 51l18 11-18 11"/>
        <path d="M48 194v-34h39v34M68 160c-1-25-6-46-16-64m16 64c2-28 9-51 23-69m-23 69c-10-18-23-32-39-42m39 26c11-13 24-22 39-27"/>
        <path d="M405 120h66v53h-66zM425 120v-12c0-9 7-16 13-16s13 7 13 16v12M430 145h16M438 139v13"/>
        <path d="m477 31 2.5 6.5L486 40l-6.5 2.5L477 49l-2.5-6.5L468 40l6.5-2.5L477 31Z"/>
      </g>
    </svg>);
}
const Toggle = ({ checked, onChange, disabled }) => (<button type="button" onClick={() => !disabled && onChange(!checked)} className={`settings-toggle ${checked ? "settings-toggle-on" : "settings-toggle-off"} ${disabled ? "settings-toggle-disabled" : "settings-toggle-enabled"}`}>
    <span className={`settings-toggle-thumb ${checked ? "settings-toggle-thumb-on" : "settings-toggle-thumb-off"}`}/>
  </button>);
const Field = ({ label, hint, children }) => (<div className="settings-style-1">
    <label className="settings-style-2">{label}</label>
    {children}
    {hint && <p className="settings-style-3">{hint}</p>}
  </div>);
const CardTitle = ({ icon: Icon, title, subtitle, tone = "settings-tone-brand" }) => (<div className="settings-style-4">
    <div className={`settings-dynamic-3 ${tone}`}>
      <Icon className="settings-style-5"/>
    </div>
    <div>
      <h3 className="settings-style-6">{title}</h3>
      {subtitle && <p className="settings-style-7">{subtitle}</p>}
    </div>
  </div>);
function profileStateFromUser(user) {
    return {
        firstName: user?.name?.split(" ")[0] || "",
        lastName: user?.name?.split(" ").slice(1).join(" ") || "",
        middleInitial: user?.middleInitial || "",
        email: user?.email || "",
        mobile: user?.mobileNumber || user?.mobile || "",
        bio: user?.bio || "",
        avatar: user?.avatar || "",
        address: user?.address || "",
        department: user?.department || "",
        adminLevel: user?.adminLevel || "",
    };
}
const AlertRow = ({ label, hint, pushVal, onPush }) => (<div className="settings-style-8 settings-alert-row">
    <div className="settings-flex-fill">
      <p className="settings-style-9">{label}</p>
      {hint && <p className="settings-style-10">{hint}</p>}
    </div>
    <Toggle checked={pushVal} onChange={onPush}/>
  </div>);
export function Settings({ embedded = false } = {}) {
    const navigate = useNavigate();
    const { user, updateUser, logout } = useAuth();
    const isTenantAccount = isTenantRole(user?.role);
    const [settingsTab, setSettingsTab] = useState("profile");
    const [settingsMenu, setSettingsMenu] = useState("personal");
    const [profile, setProfile] = useState(() => profileStateFromUser(user));
    const [alerts, setAlerts] = useState(() => {
        return {
            newListings: true,
            priceDrop: true,
            favoriteAvailable: true,
            recommendations: true,
            systemPush: false,
            digest: "daily",
            quietStart: "22:00",
            quietEnd: "07:00",
            quietEnabled: true,
        };
    });
    const [tenantNotifications, setTenantNotifications] = useState({ newApartments: true, favoriteAvailability: true });
    const [preferencesLoading, setPreferencesLoading] = useState(true);
    const [notificationSaving, setNotificationSaving] = useState(false);
    const [security, setSecurity] = useState(() => {
        return { passwordLastChanged: "" };
    });
    const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
    const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirm: false });
    useEffect(() => {
        let active = true;
        if (!user?.id)
            return () => { active = false; };
        void Promise.all([
            fetchUserPreferenceSections(user.id),
            fetchUserProfileDetails(user.id),
        ])
            .then(([sections, details]) => {
            if (!active)
                return;
            if (details?.user) {
                const nameParts = String(details.user.name ?? "").trim().split(/\s+/).filter(Boolean);
                const middleInitial = String(details.user.middle_initial ?? "").trim();
                const lastName = middleInitial
                    ? nameParts.filter((part, index) => index !== 0 && part.replace(".", "").toLowerCase() !== middleInitial.toLowerCase()).join(" ")
                    : nameParts.slice(1).join(" ");
                setProfile((current) => ({
                    ...current,
                    firstName: nameParts[0] ?? "",
                    lastName,
                    middleInitial,
                    email: String(details.user.email ?? ""),
                    mobile: String(details.user.mobile ?? details.user.mobileNumber ?? ""),
                    bio: String(details.user.bio ?? ""),
                    avatar: String(details.user.avatar_url ?? ""),
                    address: String(details.user.address ?? ""),
                    department: String(details.adminProfile?.department ?? details.user.department ?? ""),
                    adminLevel: String(details.adminProfile?.admin_level ?? details.user.admin_level ?? ""),
                }));
            }
            if (sections.alerts && typeof sections.alerts === "object" && !Array.isArray(sections.alerts)) {
                setAlerts((current) => ({ ...current, ...sections.alerts }));
            }
            if (sections.notifications && typeof sections.notifications === "object" && !Array.isArray(sections.notifications)) {
                const saved = sections.notifications;
                setTenantNotifications({
                    newApartments: typeof saved.newApartments === "boolean" ? saved.newApartments : true,
                    favoriteAvailability: typeof saved.favoriteAvailability === "boolean" ? saved.favoriteAvailability : true,
                });
            }
            if (sections.security && typeof sections.security === "object" && !Array.isArray(sections.security)) {
                const saved = sections.security;
                if (typeof saved.passwordLastChanged === "string")
                    setSecurity({ passwordLastChanged: saved.passwordLastChanged });
            }
        })
            .catch((error) => {
            console.error("Unable to load account preferences:", error);
            toast.error("Unable to load your saved settings.");
        })
            .finally(() => { if (active)
            setPreferencesLoading(false); });
        return () => { active = false; };
    }, [user?.id]);
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const roleLabel = user?.role === "admin" ? "Admin" : user?.role === "landlord" ? "Landlord" : "Tenant";
    const roleProfileLabel = user?.role === "landlord"
        ? "Landlord Account Information"
        : user?.role === "admin"
            ? "Admin Profile Information"
            : "Tenant Account Information";
    const roleProfileSubtitle = user?.role === "landlord"
        ? "Account-level information. Property permits are managed separately for each listing."
        : user?.role === "admin"
            ? "Administrative account details."
            : "Your tenant account details.";
    const updateProfile = (updater) => {
        setProfile((p) => updater(p));
    };
    const setA = (key, val) => {
        setAlerts((p) => {
            const updated = { ...p, [key]: val };
            return updated;
        });
    };
    const updateSecurity = (updater) => {
        setSecurity((p) => {
            const updated = updater(p);
            return updated;
        });
    };
    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file.");
            event.target.value = "";
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Profile photo must be 2MB or smaller.");
            event.target.value = "";
            return;
        }
        if (!user)
            return;
        try {
            const avatar = await uploadUserAvatar(user.id, file);
            updateProfile((p) => ({ ...p, avatar }));
            const synced = await updateUserProfile({ id: user.id, email: user.email, name: user.name, avatar_url: avatar });
            if (!synced)
                throw new Error("Unable to update the profile photo.");
            toast.success("Profile photo uploaded!");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to upload the profile photo.");
        }
        finally {
            event.target.value = "";
        }
    };
    const handleRemoveAvatar = async () => {
        updateProfile((p) => ({ ...p, avatar: "" }));
        if (user) {
            try {
                await updateUserProfile({ id: user.id, email: user.email, name: user.name, avatar_url: "" });
            }
            catch {
                // Profile UI still updates locally.
            }
        }
        toast.success("Profile photo removed.");
    };
    const handleUpdateProfile = async () => {
        if (!user)
            return;
        if (!profile.firstName.trim() || !profile.lastName.trim()) {
            toast.error("Please enter your first and last name.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
            toast.error("Please enter a valid email address.");
            return;
        }
        try {
            const name = `${profile.firstName.trim()} ${profile.middleInitial.trim() ? `${profile.middleInitial.trim()}. ` : ""}${profile.lastName.trim()}`.trim();
            await updateUser(user.id, {
                name,
                email: profile.email.trim(),
                mobileNumber: profile.mobile.trim(),
                middleInitial: profile.middleInitial.trim(),
                address: profile.address.trim(),
                department: profile.department?.trim(),
                adminLevel: profile.adminLevel?.trim(),
            });
            const updated = await updateUserProfile({
                id: user.id,
                email: profile.email.trim(),
                name,
                role: user.role,
                mobile: profile.mobile.trim(),
                avatar_url: profile.avatar,
                bio: profile.bio,
                middle_initial: profile.middleInitial.trim(),
                address: profile.address.trim(),
                department: profile.department?.trim(),
                admin_level: profile.adminLevel?.trim(),
            });
            if (updated) {
                const refreshed = await fetchUserProfileDetails(user.id);
                if (refreshed?.user) {
                    const nameParts = String(refreshed.user.name ?? "").trim().split(/\s+/).filter(Boolean);
                    const middleInitial = String(refreshed.user.middle_initial ?? "").trim();
                    const lastName = middleInitial
                        ? nameParts.filter((part, index) => index !== 0 && part.replace(".", "").toLowerCase() !== middleInitial.toLowerCase()).join(" ")
                        : nameParts.slice(1).join(" ");
                    setProfile((current) => ({
                        ...current,
                        firstName: nameParts[0] ?? "",
                        lastName,
                        middleInitial,
                        email: String(refreshed.user.email ?? ""),
                        mobile: String(refreshed.user.mobile ?? refreshed.user.mobileNumber ?? ""),
                        address: String(refreshed.user.address ?? ""),
                    }));
                }
            }
            toast.success("Profile updated successfully!");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to update profile.";
            toast.error(message);
        }
    };
    const handlePasswordChange = async () => {
        if (!user)
            return;
        if (passwordForm.next.length < 6) {
            toast.error("New password must be at least 6 characters.");
            return;
        }
        if (passwordForm.next !== passwordForm.confirm) {
            toast.error("New passwords do not match.");
            return;
        }
        try {
            await updateUser(user.id, { password: passwordForm.next });
            const passwordLastChanged = new Date().toISOString();
            updateSecurity(() => ({ passwordLastChanged }));
            await saveUserPreferenceSection(user.id, "security", { passwordLastChanged });
            setPasswordForm({ current: "", next: "", confirm: "" });
            toast.success("Password updated successfully!");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unable to update password.";
            toast.error(message);
        }
    };
    const handleSaveAlerts = async () => {
        if (!user?.id)
            return;
        try {
            await saveUserPreferenceSection(user.id, "alerts", alerts);
            toast.success("Settings saved!");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save alert preferences.");
        }
    };
    const handleSaveTenantNotifications = async () => {
        if (!user?.id || notificationSaving)
            return;
        setNotificationSaving(true);
        try {
            await saveUserPreferenceSection(user.id, "notifications", tenantNotifications);
            toast.success("Notification preferences saved.");
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save notification preferences.");
        }
        finally {
            setNotificationSaving(false);
        }
    };
    const handleDeleteAccount = async () => {
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            if (!user)
                return;
            try {
                await deleteUserAccount(user.id);
                logout();
                toast.success("Account deleted successfully");
                navigate("/");
            }
            catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to delete the account.");
            }
        }
    };
    const renderProfileTab = () => (<div className="settings-style-11">
      <section className="settings-profile-summary settings-style-12">
        <div className="settings-style-13 settings-profile-layout">
          <div className="settings-style-14">
            <div className="settings-style-15">
              {profile.avatar ? <img src={profile.avatar} alt="Profile" className="settings-style-16"/> : (profile.firstName[0] || user?.name?.[0] || "U").toUpperCase()}
            </div>
            <div className="settings-style-17 settings-avatar-camera">
              <Camera className="settings-style-18"/>
            </div>
          </div>
          <div className="settings-flex-fill">
            <h2 className="settings-style-19">{fullName || "Not provided"}</h2>
            <Badge className="settings-style-20">{roleLabel}</Badge>
            <p className="settings-style-21">{profile.email || "Not provided"}</p>
            {!profile.avatar && <p className="settings-style-22">No profile photo uploaded</p>}
          </div>
          <div className="settings-style-23 settings-profile-actions">
            <label className="settings-style-24">
              <Upload className="settings-style-25"/>
              Upload Photo
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="settings-style-26"/>
            </label>
            <button type="button" onClick={handleRemoveAvatar} className="settings-style-27">
              <Trash2 className="settings-style-28"/>
              Remove Photo
            </button>
            <p className="settings-style-29 settings-text-center">JPG, PNG, or WebP up to 2MB</p>
          </div>
        </div>
      </section>

      <div className="settings-style-30 settings-main-grid">
        <aside className="settings-style-31">
          <h3 className="settings-style-32">Settings Menu</h3>
          <MenuButton icon={User} label="Personal Information" active={settingsMenu === "personal"} onClick={() => setSettingsMenu("personal")}/>
          <MenuButton icon={BriefcaseBusiness} label={roleProfileLabel} active={settingsMenu === "employment"} onClick={() => setSettingsMenu("employment")}/>
          <div className="settings-style-33">
            <HelpCircle className="settings-style-34"/>
            <p className="settings-style-35">Need help?</p>
            <p className="settings-style-36">If you need assistance, please visit our Help Center.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard?section=help")} className="settings-style-37">
              Go to Help Center
            </Button>
          </div>
        </aside>

        <div className="settings-style-38">
          {settingsMenu === "personal" && (<section className="settings-style-39">
              <CardTitle icon={User} title="Personal Information" subtitle="Update your personal details."/>
              <div className="settings-style-40 settings-two-column">
                <Field label="First Name">
                  <input className={inputClass} value={profile.firstName} onChange={(e) => updateProfile((p) => ({ ...p, firstName: e.target.value }))} placeholder="Not provided"/>
                </Field>
                <Field label="Last Name">
                  <input className={inputClass} value={profile.lastName} onChange={(e) => updateProfile((p) => ({ ...p, lastName: e.target.value }))} placeholder="Not provided"/>
                </Field>
                <Field label="Middle Initial">
                  <input className={inputClass} value={profile.middleInitial} onChange={(e) => updateProfile((p) => ({ ...p, middleInitial: e.target.value.slice(0, 3) }))} placeholder="Not provided"/>
                </Field>
                <Field label="Home Address">
                  <input className={inputClass} value={profile.address} onChange={(e) => updateProfile((p) => ({ ...p, address: e.target.value }))} placeholder="Not provided"/>
                </Field>
              </div>
              <div className="settings-style-41">
                <Field label="Email Address" hint={isTenantAccount ? "Managed securely through your authenticated account" : "Used for account login and notifications"}>
                  <input className={inputClass} type="email" value={profile.email} onChange={(e) => updateProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Not provided" readOnly={isTenantAccount} disabled={isTenantAccount}/>
                </Field>
                <Field label="Mobile Number" hint="Optional contact number">
                  <input className={inputClass} type="tel" value={profile.mobile} onChange={(e) => updateProfile((p) => ({ ...p, mobile: e.target.value }))} placeholder="Not provided"/>
                </Field>
                <Field label="Bio / About You" hint="Short description (max 200 characters)">
                  <textarea className={textareaClass} value={profile.bio} onChange={(e) => updateProfile((p) => ({ ...p, bio: e.target.value.slice(0, 200) }))} placeholder="Not provided"/>
                  <p className="settings-style-42 settings-text-right">{profile.bio.length}/200</p>
                </Field>
              </div>
            </section>)}

          {settingsMenu === "employment" && (<DisclosureCard icon={BriefcaseBusiness} title={roleProfileLabel} subtitle={roleProfileSubtitle} tone="settings-tone-brand">
              {user?.role === "landlord" ? (<div className="settings-style-43">
                  Manage each property&apos;s business permit, expiry, and verification documents from the landlord portal. Account identity verification remains separate.
                </div>) : user?.role === "admin" ? (<div className="settings-style-44 settings-two-column">
                  <Field label="Department">
                    <input className={inputClass} value={profile.department || ""} onChange={(e) => updateProfile((p) => ({ ...p, department: e.target.value }))} placeholder="Not provided"/>
                  </Field>
                  <Field label="Admin Level">
                    <input className={inputClass} value={profile.adminLevel || ""} onChange={(e) => updateProfile((p) => ({ ...p, adminLevel: e.target.value }))} placeholder="Not provided"/>
                  </Field>
                </div>) : (<div className="settings-style-45">Your tenant account does not require a separate tenant type.</div>)}
            </DisclosureCard>)}
        </div>
      </div>

      <SaveBar onSave={handleUpdateProfile}/>
    </div>);
    const renderAlertsTab = () => (<div className="settings-style-46">
      {isTenantAccount ? <>
        <section className="settings-style-47">
          <CardTitle icon={Bell} title="Apartment Notification Preferences" subtitle="Choose which optional apartment updates you want to receive."/>
          {preferencesLoading ? <div className="settings-style-48" aria-label="Loading notification preferences"><div className="settings-style-49 settings-loading-pulse"/><div className="settings-style-50 settings-loading-pulse"/></div> : <>
            <AlertRow label="New Apartment Updates" hint="Notify me when new apartments become available." pushVal={tenantNotifications.newApartments} onPush={(newApartments) => setTenantNotifications((current) => ({ ...current, newApartments }))}/>
            <AlertRow label="Favorite Availability" hint="Notify me when a saved apartment or room becomes available." pushVal={tenantNotifications.favoriteAvailability} onPush={(favoriteAvailability) => setTenantNotifications((current) => ({ ...current, favoriteAvailability }))}/>
          </>}
          <p className="settings-style-51">Important account and report-status updates are always sent and cannot be disabled.</p>
        </section>
        <div className="settings-style-52"><Button disabled={preferencesLoading || notificationSaving} onClick={() => void handleSaveTenantNotifications()} className="settings-style-53">{notificationSaving ? "Saving..." : "Save Notification Preferences"}</Button></div>
      </> : <>
      <section className="settings-style-54">
        <CardTitle icon={Bell} title="Apartment Alerts" subtitle="Get notified about new listings and updates."/>
        <AlertRow label="New Listings" hint="Notify when new apartments match your preferences" pushVal={alerts.newListings} onPush={(v) => setA("newListings", v)}/>
        <AlertRow label="Price Drops" hint="Alert when saved apartments reduce their price" pushVal={alerts.priceDrop} onPush={(v) => setA("priceDrop", v)}/>
        <AlertRow label="Favorite Available" hint="Notify when favorited apartments become available" pushVal={alerts.favoriteAvailable} onPush={(v) => setA("favoriteAvailable", v)}/>
        <AlertRow label="Personalized Recommendations" hint="Get apartment suggestions based on your activity" pushVal={alerts.recommendations} onPush={(v) => setA("recommendations", v)}/>
      </section>

      <section className="settings-style-55">
        <CardTitle icon={Clock} title="Delivery Preferences" subtitle="Digest schedule and quiet hours."/>
        <div className="settings-style-56 settings-two-column">
          <Field label="Activity Digest">
            <select className={inputClass} value={alerts.digest} onChange={(e) => setA("digest", e.target.value)}>
              <option value="realtime">Real-time</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </Field>
          <div className="settings-style-57">
            <div>
              <p className="settings-style-58">Quiet Hours</p>
              <p className="settings-style-59">Pause notifications during rest hours</p>
            </div>
            <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)}/>
          </div>
        </div>
        {alerts.quietEnabled && (<div className="settings-style-60 settings-two-column">
            <Field label="Quiet From">
              <input className={inputClass} type="time" value={alerts.quietStart} onChange={(e) => setA("quietStart", e.target.value)}/>
            </Field>
            <Field label="Quiet Until">
              <input className={inputClass} type="time" value={alerts.quietEnd} onChange={(e) => setA("quietEnd", e.target.value)}/>
            </Field>
          </div>)}
      </section>

      <SaveBar onSave={() => void handleSaveAlerts()}/>
      </>}
    </div>);
    const PasswordField = ({ id, value, visible, placeholder, onChange, }) => (<div className="settings-style-61">
      <input className={`settings-dynamic-4 ${inputClass}`} type={visible ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/>
      <button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisiblePasswords((current) => ({ ...current, [id]: !current[id] }))} className="settings-style-62 settings-password-toggle">
        {visible ? <EyeOff className="settings-style-63"/> : <Eye className="settings-style-64"/>}
      </button>
    </div>);
    const renderSecurityTab = () => (<div className="settings-style-65">
      <section className="settings-style-66">
        <CardTitle icon={Lock} title="Password" subtitle={security.passwordLastChanged ? `Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}` : "Password change date not provided."} tone="settings-tone-brand"/>
        <div className="settings-style-67">
          <Field label="Current Password">
            <PasswordField id="current" value={passwordForm.current} visible={visiblePasswords.current} onChange={(value) => setPasswordForm((p) => ({ ...p, current: value }))} placeholder="Current password"/>
          </Field>
          <Field label="New Password" hint="At least 6 characters">
            <PasswordField id="next" value={passwordForm.next} visible={visiblePasswords.next} onChange={(value) => setPasswordForm((p) => ({ ...p, next: value }))} placeholder="New password"/>
          </Field>
          <Field label="Confirm New Password">
            <PasswordField id="confirm" value={passwordForm.confirm} visible={visiblePasswords.confirm} onChange={(value) => setPasswordForm((p) => ({ ...p, confirm: value }))} placeholder="Repeat new password"/>
          </Field>
          <Button onClick={handlePasswordChange} className="settings-style-68">Update Password</Button>
        </div>
      </section>

      {isTenantAccount ? <section className="settings-style-69"><CardTitle icon={ArrowLeft} title="Account Session" subtitle="Sign out of your account on this device."/><Button variant="outline" onClick={() => { logout(); navigate("/login", { replace: true }); }} className="settings-style-70">Log Out</Button></section> : <section className="settings-danger-zone settings-style-71">
        <CardTitle icon={Trash2} title="Danger Zone" subtitle="Irreversible account actions." tone="settings-tone-danger"/>
        <p className="settings-style-72">Once you delete your account, there is no going back. Please be certain.</p>
        <Button variant="destructive" onClick={handleDeleteAccount} className="settings-style-73">
          <Trash2 className="settings-style-74"/>
          Delete My Account
        </Button>
      </section>}
    </div>);
    if (isTenantAccount) {
        return <TenantSettings profile={profile} setProfile={setProfile} user={user} onUpload={handleAvatarUpload} onRemove={handleRemoveAvatar} onSave={handleUpdateProfile} loading={preferencesLoading}/>;
    }
    return (<div className={`${isTenantAccount ? "tenant-settings " : ""}${embedded ? "settings-embedded" : "settings-page"}`}>
      <div className={embedded ? "" : "settings-page-inner"}>
        {!embedded && (<Button variant="ghost" onClick={() => navigate(-1)} className="settings-style-75">
            <ArrowLeft className="settings-style-76"/>
            Back
          </Button>)}

        <div className="settings-style-77">
          <header className="settings-hero settings-style-78">
            <div className="settings-style-79 settings-hero-copy">
              {!isTenantAccount && <div className="settings-style-80">
                <SettingsIcon className="settings-style-81"/>
                Account Management
              </div>}
              <h1 className="settings-style-82">Settings</h1>
              <p className="settings-style-83">{isTenantAccount ? "Manage your profile, notification preferences, and account security." : "Manage your profile, preferences, security, and account options."}</p>
              {!isTenantAccount && <div className="settings-style-84">
              <button className="settings-style-85">
                <Bell className="settings-style-86"/>
              </button>
              <button onClick={() => navigate("/dashboard?section=help")} className="settings-style-87">
                <HelpCircle className="settings-style-88"/>
              </button>
              </div>}
            </div>
            {!isTenantAccount && <div className="settings-style-89"><SettingsLineArt /></div>}
          </header>

          <nav className="settings-style-90 settings-tabs-grid">
            <TabButton icon={User} label="Profile" active={settingsTab === "profile"} onClick={() => setSettingsTab("profile")}/>
            <TabButton icon={Bell} label={isTenantAccount ? "Notifications" : "Alerts"} active={settingsTab === "alerts"} onClick={() => setSettingsTab("alerts")}/>
            <TabButton icon={Shield} label="Security" active={settingsTab === "security"} onClick={() => setSettingsTab("security")}/>
          </nav>

          {settingsTab === "profile" && renderProfileTab()}
          {settingsTab === "alerts" && renderAlertsTab()}
          {settingsTab === "security" && renderSecurityTab()}
        </div>
      </div>
    </div>);
}
function TabButton({ icon: Icon, label, active, onClick }) {
    return (<button onClick={onClick} className={`settings-tab-button ${active ? "settings-tab-button-active" : "settings-tab-button-idle"}`}>
      <Icon className="settings-style-91"/>
      {label}
    </button>);
}
function MenuButton({ icon: Icon, label, active, onClick }) {
    return (<button onClick={onClick} className={`settings-menu-button ${active ? "settings-menu-button-active" : "settings-menu-button-idle"}`}>
      <Icon className="settings-style-92"/>
      {label}
    </button>);
}
function DisclosureCard({ icon: Icon, title, subtitle, tone, children }) {
    return (<section className="settings-style-93">
      <div className="settings-style-94">
        <div className={`settings-dynamic-7 settings-card-icon ${tone}`}>
          <Icon className="settings-style-95"/>
        </div>
        <div className="settings-flex-fill">
          <h3 className="settings-style-96">{title}</h3>
          <p className="settings-style-97">{subtitle}</p>
        </div>
        <ChevronRight className="settings-style-98"/>
      </div>
      {children}
    </section>);
}
function SaveBar({ onSave }) {
    return (<section className="settings-save-bar settings-style-99">
      <div className="settings-style-100">
        <Shield className="settings-style-101"/>
      </div>
      <div className="settings-flex-fill">
        <p className="settings-style-102">Your changes are saved securely.</p>
        <p className="settings-style-103">Make sure to save your changes before leaving.</p>
      </div>
      <Button onClick={onSave} className="settings-style-104">
        <Check className="settings-style-105"/>
        Save Changes
      </Button>
    </section>);
}
