import { Button } from "@/components/ui/button";
import { fetchPlatformUsers, setUserAccountActive } from "@/super-admin/superAdminService";
import { Search, UserRoundSearch, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
export function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("all");
    const [status, setStatus] = useState("all");
    const load = async () => {
        setLoading(true);
        try {
            setUsers(await fetchPlatformUsers());
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to load users.");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { void load(); }, []);
    const visible = useMemo(() => users.filter((user) => {
        const userRole = String(user.role ?? "tenant").toLowerCase();
        const normalizedRole = userRole === "super_admin" ? "admin" : userRole;
        const userStatus = String(user.status ?? "active").toLowerCase();
        const needle = search.trim().toLowerCase();
        return (role === "all" || normalizedRole === role)
            && (status === "all" || userStatus === status)
            && (!needle || `${String(user.name ?? "")} ${String(user.email ?? "")}`.toLowerCase().includes(needle));
    }), [users, search, role, status]);
    const toggle = async (user) => {
        const activate = String(user.status ?? "active").toLowerCase() === "disabled";
        try {
            await setUserAccountActive(String(user.id), activate);
            toast.success(activate ? "Account reactivated." : "Account deactivated.");
            await load();
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update account.");
        }
    };
    return <div className="user-management-container">
    <header className="user-management-header"><p className="user-management-super-admin">Super Admin</p><h1 className="user-management-user-management">User Management</h1><p className="user-management-text">Monitor Admin, Landlord, and Tenant accounts across AptFindr.</p></header>
    <section className="user-management-section">
      <label className="user-management-label"><Search className="user-management-search-icon"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="user-management-input"/></label>
      <select value={role} onChange={(e) => setRole(e.target.value)} className="user-management-select"><option value="all">All roles</option><option value="admin">Admins</option><option value="landlord">Landlords</option><option value="tenant">Tenants</option></select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="user-management-select"><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option><option value="pending">Pending</option></select>
    </section>
    <section className="user-management-section-2">{loading ? <div className="user-management-loading-users">Loading users...</div> : visible.length === 0 ? <div className="user-management-content"><UserRoundSearch className="user-management-user-round-search-icon"/><h2 className="user-management-no-users-found">No users found</h2><p className="user-management-text">No account matches the current search and filters.</p></div> : <div className="user-management-panel"><table className="user-management-table"><thead className="user-management-thead"><tr><th className="user-management-user">User</th><th className="user-management-role">Role</th><th className="user-management-status">Status</th><th className="user-management-date-joined">Date Joined</th><th className="user-management-action">Action</th></tr></thead><tbody className="user-management-tbody">{visible.map((account) => { const disabled = String(account.status ?? "active").toLowerCase() === "disabled"; const protectedAccount = String(account.role) === "super_admin"; return <tr key={String(account.id)}><td className="user-management-td"><strong className="user-management-strong">{String(account.name ?? "Unnamed user")}</strong><span className="user-management-span">{String(account.email ?? "")}</span></td><td className="user-management-td-2">{String(account.role ?? "tenant").replace("_", " ")}</td><td className="user-management-td"><span className={`user-management-span-2 ${disabled ? "user-management-span-3" : "user-management-span-4"}`}>{disabled ? "Disabled" : String(account.status ?? "Active")}</span></td><td className="user-management-td-3">{account.created_at ? new Date(String(account.created_at)).toLocaleDateString("en-PH") : "—"}</td><td className="user-management-td-4"><Button variant="outline" disabled={protectedAccount} onClick={() => void toggle(account)} className={disabled ? "user-management-button" : "user-management-button-2"}>{disabled ? "Reactivate" : <><XCircle className="user-management-xcircle-icon"/>Deactivate</>}</Button></td></tr>; })}</tbody></table></div>}</section>
  </div>;
}
