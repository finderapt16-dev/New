import { Button } from "@/components/ui/button";
import { createAdminAccount, fetchAdminAccounts, setAdminAccountActive, updateAdminAccount } from "@/super-admin/superAdminService";
import { CheckCircle2, Plus, ShieldCheck, UserCog, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
const EMPTY_FORM = { name: "", email: "", department: "Platform Administration", adminLevel: "Administrator", password: "" };
export function AdminManagement() {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const load = async () => {
        setLoading(true);
        try {
            setAdmins(await fetchAdminAccounts());
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to load Admin accounts.");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { void load(); }, []);
    const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
    const openEdit = (admin) => {
        setEditing(admin);
        setForm({ name: String(admin.name ?? ""), email: String(admin.email ?? ""), department: String(admin.department ?? ""), adminLevel: String(admin.admin_level ?? admin.adminLevel ?? "Administrator"), password: "" });
        setShowForm(true);
    };
    const save = async (event) => {
        event.preventDefault();
        if (!form.name.trim() || !form.email.trim() || (!editing && form.password.length < 12)) {
            toast.error(editing ? "Name and email are required." : "Name, email, and a password of at least 12 characters are required.");
            return;
        }
        setSaving(true);
        try {
            if (editing?.id)
                await updateAdminAccount(String(editing.id), form);
            else
                await createAdminAccount(form);
            toast.success(editing ? "Admin account updated." : "Admin account created.");
            setShowForm(false);
            setEditing(null);
            setForm(EMPTY_FORM);
            await load();
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save the Admin account.");
        }
        finally {
            setSaving(false);
        }
    };
    const toggleStatus = async (admin) => {
        const active = String(admin.status ?? "active").toLowerCase() === "disabled";
        try {
            await setAdminAccountActive(String(admin.id), active);
            toast.success(active ? "Admin activated." : "Admin deactivated.");
            await load();
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update account status.");
        }
    };
    return <div className="admin-management-container">
    <header className="admin-management-header"><div><p className="admin-management-super-admin">Super Admin</p><h1 className="admin-management-admin-management">Admin Management</h1><p className="admin-management-text">Create and manage regular AptFindr Administrator accounts.</p></div><Button onClick={openCreate} className="admin-management-create-admin"><Plus className="admin-management-plus-icon"/>Create Admin</Button></header>
    {showForm && <form onSubmit={save} className="admin-management-form"><h2 className="admin-management-heading">{editing ? "Edit Administrator" : "Create Administrator"}</h2>{["name", "email", "department", "adminLevel"].map((field) => <label key={field} className="admin-management-label">{field === "adminLevel" ? "Admin level" : field}<input type={field === "email" ? "email" : "text"} value={form[field]} onChange={(e) => setForm((current) => ({ ...current, [field]: e.target.value }))} className="admin-management-input" required={field === "name" || field === "email"}/></label>)}{!editing && <label className="admin-management-initial-password">Initial password<input type="password" minLength={12} value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} className="admin-management-initial-password-2" required autoComplete="new-password"/><span className="admin-management-span">The password is sent only to the protected server function and is never displayed or stored by this portal.</span></label>}<div className="admin-management-row"><Button type="submit" disabled={saving} className="admin-management-button">{saving ? "Saving..." : "Save Admin"}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div></form>}
    <section className="admin-management-section">{loading ? <div className="admin-management-loading-admin-accounts">Loading Admin accounts...</div> : admins.length === 0 ? <div className="admin-management-content"><ShieldCheck className="admin-management-shield-check-icon"/><h2 className="admin-management-no-admin-accounts-found">No Admin accounts found</h2><p className="admin-management-text">Create the first regular Administrator account.</p></div> : <div className="admin-management-panel">{admins.map((admin) => { const disabled = String(admin.status ?? "active").toLowerCase() === "disabled"; return <article key={String(admin.id)} className="admin-management-article"><span className="admin-management-row-2"><UserCog className="admin-management-user-cog-icon"/></span><div className="admin-management-panel-2"><h3 className="admin-management-heading-2">{String(admin.name ?? "Administrator")}</h3><p className="admin-management-text-2">{String(admin.email ?? "")}</p><p className="admin-management-text-3">{String(admin.department ?? "No department")} · {String(admin.admin_level ?? admin.adminLevel ?? "Administrator")}</p></div><span className={`admin-management-span-2 ${disabled ? "admin-management-span-3" : "admin-management-span-4"}`}>{disabled ? <XCircle className="admin-management-xcircle-icon"/> : <CheckCircle2 className="admin-management-check-circle2-icon"/>}{disabled ? "Inactive" : "Active"}</span><Button variant="outline" onClick={() => openEdit(admin)}>View / Edit</Button><Button variant="outline" onClick={() => void toggleStatus(admin)} className={disabled ? "admin-management-button-2" : "admin-management-button-3"}>{disabled ? "Activate" : "Deactivate"}</Button></article>; })}</div>}</section>
  </div>;
}
