import { Button } from "@/components/ui/button";
import { fetchMySuperAdminProfile, saveMySuperAdminProfile, uploadSuperAdminAvatar } from "@/super-admin/superAdminProfileService";
import { Camera, KeyRound, Mail, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
const formatDate = (value) => value ? new Date(value).toLocaleString("en-PH") : "Not available";
export function SuperAdminProfile() {
    const navigate = useNavigate();
    const fileInput = useRef(null);
    const [profile, setProfile] = useState(null), [loading, setLoading] = useState(true), [editing, setEditing] = useState(false), [saving, setSaving] = useState(false);
    const [name, setName] = useState(""), [department, setDepartment] = useState(""), [avatarUrl, setAvatarUrl] = useState(""), [avatarFile, setAvatarFile] = useState(null);
    const load = async () => { setLoading(true); try {
        const value = await fetchMySuperAdminProfile();
        setProfile(value);
        setName(value.name);
        setDepartment(value.department);
        setAvatarUrl(value.avatarUrl);
        setEditing(!value.hasAdminProfile);
    }
    catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load profile.");
    }
    finally {
        setLoading(false);
    } };
    useEffect(() => { void load(); }, []);
    const selectAvatar = (file) => { if (!file)
        return; if (!file.type.startsWith("image/"))
        return void toast.error("Please select a valid image file."); if (file.size > 5 * 1024 * 1024)
        return void toast.error("Profile photo must be 5MB or smaller."); setAvatarFile(file); setAvatarUrl(URL.createObjectURL(file)); };
    const save = async () => { if (!profile || !name.trim())
        return void toast.error("Full Name is required."); setSaving(true); try {
        const uploadedUrl = avatarFile ? await uploadSuperAdminAvatar(profile.id, avatarFile) : avatarUrl;
        await saveMySuperAdminProfile({ name, department, avatarUrl: uploadedUrl });
        toast.success(profile.hasAdminProfile ? "Profile updated." : "Profile completed.");
        setAvatarFile(null);
        setEditing(false);
        await load();
    }
    catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save profile.");
    }
    finally {
        setSaving(false);
    } };
    if (loading)
        return <div className="super-admin-profile-loading-super-admin-profile">Loading Super Admin profile...</div>;
    if (!profile)
        return <div className="super-admin-profile-panel">The Super Admin profile could not be loaded.</div>;
    const field = (label, value) => <div><dt className="super-admin-profile-dt">{label}</dt><dd className="super-admin-profile-dd">{value || "Not provided"}</dd></div>;
    return <div className="super-admin-profile-container"><header className="super-admin-profile-header"><div><p className="super-admin-profile-account">Account</p><h1 className="super-admin-profile-title">{profile.hasAdminProfile ? "Super Admin Profile" : "Complete Your Profile"}</h1><p className="super-admin-profile-text">Your identity and administrative account information.</p></div>{!editing && <Button onClick={() => setEditing(true)} className="super-admin-profile-edit-profile"><Pencil className="super-admin-profile-pencil-icon"/>Edit Profile</Button>}</header>
    <section className="super-admin-profile-section"><div className="super-admin-profile-panel-2">{avatarUrl ? <img src={avatarUrl} alt="Super Admin profile" className="super-admin-profile-image"/> : <span className="super-admin-profile-row">{name[0]?.toUpperCase() || <UserRound />}</span>}{editing && <button type="button" onClick={() => fileInput.current?.click()} className="super-admin-profile-choose-profile-photo" aria-label="Choose profile photo"><Camera className="super-admin-profile-camera-icon"/></button>}<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="super-admin-profile-input" onChange={(e) => selectAvatar(e.target.files?.[0])}/></div><div className="super-admin-profile-panel-3">{editing ? <div className="super-admin-profile-grid"><label className="super-admin-profile-full-name">Full Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="super-admin-profile-full-name-2"/></label><label className="super-admin-profile-department-position">Department / Position<input value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={120} className="super-admin-profile-department-position-2"/></label></div> : <><h2 className="super-admin-profile-heading">{profile.name}</h2><p className="super-admin-profile-text-2">{profile.email}</p></>}<span className="super-admin-profile-super-admin"><ShieldCheck className="super-admin-profile-shield-check-icon"/>SUPER ADMIN</span></div></section>
    {editing && <div className="super-admin-profile-row-2"><Button variant="outline" disabled={saving || !profile.hasAdminProfile} onClick={() => { setEditing(false); setName(profile.name); setDepartment(profile.department); setAvatarUrl(profile.avatarUrl); setAvatarFile(null); }}>Cancel</Button><Button disabled={saving || !name.trim()} onClick={() => void save()} className="super-admin-profile-button">{saving ? "Saving..." : profile.hasAdminProfile ? "Save Changes" : "Complete Profile"}</Button></div>}
    <section className="super-admin-profile-section-2"><h2 className="super-admin-profile-account-information">Account Information</h2><dl className="super-admin-profile-grid-2">{field("Full Name", profile.name)}{field("Email", profile.email)}{field("Role", "Super Admin")}{field("Admin Level", profile.adminLevel)}{field("Department / Position", profile.department)}{field("Account Status", profile.status)}{field("Date Joined", formatDate(profile.joinedAt))}{field("Last Activity", formatDate(profile.lastActivityAt))}</dl></section>
    <section className="super-admin-profile-section-3"><div><h2 className="super-admin-profile-security">Security</h2><p className="super-admin-profile-text">Email and password changes use AptFindr’s existing secure account flows.</p></div><div className="super-admin-profile-row-3"><Button variant="outline" onClick={() => navigate("/super-admin?section=admininfo")}><KeyRound className="super-admin-profile-key-round-icon"/>Change Password</Button><Button variant="outline" onClick={() => navigate("/super-admin?section=admininfo")}><Mail className="super-admin-profile-mail-icon"/>Account Settings</Button></div></section>
  </div>;
}
