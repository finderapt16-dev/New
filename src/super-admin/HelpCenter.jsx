import { Button } from "@/components/ui/button";
import { fetchPlatformUsers, fetchSupportRequests, updateSupportRequest } from "@/super-admin/superAdminService";
import { LifeBuoy, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
export function HelpCenter() {
    const [tickets, setTickets] = useState([]), [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true), [search, setSearch] = useState(""), [status, setStatus] = useState("all");
    const [selected, setSelected] = useState(null), [response, setResponse] = useState("");
    const load = async () => { setLoading(true); try {
        const [requests, accounts] = await Promise.all([fetchSupportRequests(), fetchPlatformUsers()]);
        setTickets(requests);
        setUsers(accounts);
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : "Unable to load support requests.");
    }
    finally {
        setLoading(false);
    } };
    useEffect(() => { void load(); }, []);
    const visible = useMemo(() => tickets.filter((ticket) => { const owner = users.find((u) => u.id === ticket.user_id); const haystack = `${ticket.topic} ${ticket.message} ${owner?.name} ${owner?.email}`.toLowerCase(); return (status === "all" || ticket.status === status) && haystack.includes(search.trim().toLowerCase()); }), [tickets, users, status, search]);
    const changeStatus = async (next) => { if (!selected?.id)
        return; try {
        await updateSupportRequest(selected.id, next, response.trim() || undefined);
        toast.success(`Request marked ${next.replace("_", " ")}.`);
        setSelected(null);
        setResponse("");
        await load();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : "Unable to update request.");
    } };
    return <div className="help-center-container"><header className="help-center-header"><p className="help-center-super-admin">Super Admin</p><h1 className="help-center-help-center">Help Center</h1><p className="help-center-text">Review and resolve support requests submitted by AptFindr users.</p></header>
    <div className="help-center-card"><label className="help-center-label"><Search className="help-center-search-icon"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests or users" className="help-center-input"/></label><select value={status} onChange={(e) => setStatus(e.target.value)} className="help-center-select"><option value="all">All statuses</option><option value="open">New</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>
    <section className="help-center-section">{loading ? <div className="help-center-loading-support-requests">Loading support requests...</div> : visible.length === 0 ? <div className="help-center-content"><LifeBuoy className="help-center-life-buoy-icon"/><h2 className="help-center-no-support-requests">No support requests</h2><p className="help-center-text">There are currently no Help Center requests matching this view.</p></div> : <div className="help-center-panel"><table className="help-center-table"><thead className="help-center-thead"><tr><th className="help-center-request">Request</th><th className="help-center-user">User</th><th className="help-center-role">Role</th><th className="help-center-status">Status</th><th className="help-center-submitted">Submitted</th><th className="help-center-th"></th></tr></thead><tbody className="help-center-tbody">{visible.map((ticket) => { const owner = users.find((u) => u.id === ticket.user_id); return <tr key={ticket.id}><td className="help-center-td"><strong>{ticket.topic}</strong><span className="help-center-span">{ticket.message}</span></td><td className="help-center-td"><strong className="help-center-strong">{String(owner?.name ?? "Unknown user")}</strong><span className="help-center-span-2">{String(owner?.email ?? ticket.contact ?? "")}</span></td><td className="help-center-td-2">{String(owner?.role ?? "user").replace("_", " ")}</td><td className="help-center-td-2">{String(ticket.status ?? "open").replace("_", " ")}</td><td className="help-center-td-3">{ticket.created_at ? new Date(ticket.created_at).toLocaleString("en-PH") : "—"}</td><td className="help-center-td"><Button variant="outline" onClick={() => setSelected(ticket)}>View</Button></td></tr>; })}</tbody></table></div>}</section>
    {selected && <div className="help-center-overlay"><section className="help-center-section-2"><button onClick={() => setSelected(null)} className="help-center-button"><X /></button><h2 className="help-center-support-request">Support Request</h2><p className="help-center-submitted-2">Submitted {selected.created_at ? new Date(selected.created_at).toLocaleString("en-PH") : "—"}</p><dl className="help-center-dl"><div><dt className="help-center-category-subject">Category / Subject</dt><dd className="help-center-dd">{selected.topic}</dd></div><div><dt className="help-center-description">Description</dt><dd className="help-center-dd-2">{selected.message}</dd></div><div><dt className="help-center-contact">Contact</dt><dd className="help-center-dd">{selected.contact || "Not provided"}</dd></div></dl><textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Optional response to the requester" className="help-center-textarea"/><div className="help-center-row"><Button variant="outline" onClick={() => void changeStatus("in_progress")}>Mark In Progress</Button><Button onClick={() => void changeStatus("resolved")} className="help-center-resolve">Resolve</Button><Button variant="outline" onClick={() => void changeStatus("closed")}>Close</Button></div></section></div>}
  </div>;
}
