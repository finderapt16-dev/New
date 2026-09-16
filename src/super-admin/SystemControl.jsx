import { Button } from "@/components/ui/button";
import { fetchMaintenanceHistory, fetchMaintenanceState, runSuperAdminAction } from "@/super-admin/superAdminService";
import { CheckCircle2, Megaphone, ShieldAlert, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export function SystemControl() {
    const [state, setState] = useState(null), [history, setHistory] = useState([]), [busy, setBusy] = useState(false);
    const [title, setTitle] = useState("Scheduled System Maintenance"), [message, setMessage] = useState("AptFindr is temporarily unavailable while we perform system improvements."), [expectedEnd, setExpectedEnd] = useState(""), [notify, setNotify] = useState(true);
    const [audience, setAudience] = useState("all"), [noticeTitle, setNoticeTitle] = useState(""), [noticeMessage, setNoticeMessage] = useState("");
    const load = async () => { try {
        const [current, records] = await Promise.all([fetchMaintenanceState(), fetchMaintenanceHistory()]);
        setState(current);
        setHistory(records);
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : "Unable to load system status.");
    } };
    useEffect(() => { void load(); }, []);
    const maintenance = state?.status === "maintenance";
    const execute = async (body, success) => { setBusy(true); try {
        await runSuperAdminAction(body);
        toast.success(success);
        await load();
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : "System action failed.");
    }
    finally {
        setBusy(false);
    } };
    return <div className="system-control-container"><header className="system-control-header"><p className="system-control-super-admin">Super Admin</p><h1 className="system-control-system-control">System Control</h1><p className="system-control-text">Manage platform availability and persistent announcements.</p></header>
    <section className="system-control-section"><div className={`system-control-card ${maintenance ? "system-control-panel" : "system-control-panel-2"}`}>{maintenance ? <ShieldAlert className="system-control-shield-alert-icon"/> : <CheckCircle2 className="system-control-check-circle2-icon"/>}<div><p className="system-control-platform-status">Platform Status</p><h2 className="system-control-heading">{maintenance ? "Under Maintenance" : "Operational"}</h2>{maintenance && <p className="system-control-text">{String(state?.message ?? "")}</p>}</div></div>
      {!maintenance ? <div className="system-control-grid"><label className="system-control-maintenance-title">Maintenance Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="system-control-maintenance-title-2"/></label><label className="system-control-maintenance-message">Maintenance Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} className="system-control-maintenance-message-2"/></label><label className="system-control-expected-end-optional">Expected End (optional)<input type="datetime-local" value={expectedEnd} onChange={(e) => setExpectedEnd(e.target.value)} className="system-control-expected-end-optional-2"/></label><label className="system-control-notify-all-users"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)}/>Notify all users</label><Button disabled={busy || !title.trim() || !message.trim()} onClick={() => void execute({ action: "maintenance-start", title, message, expectedEnd: expectedEnd || null, notify }, "Maintenance mode enabled.")} className="system-control-start-maintenance"><Wrench className="system-control-wrench-icon"/>Start Maintenance</Button></div> : <div className="system-control-panel-3"><p className="system-control-started">Started: {state?.started_at ? new Date(String(state.started_at)).toLocaleString("en-PH") : "—"}<br />Expected end: {state?.expected_end_at ? new Date(String(state.expected_end_at)).toLocaleString("en-PH") : "Not specified"}</p><Button disabled={busy} onClick={() => void execute({ action: "maintenance-end", notify }, "Maintenance ended and normal access restored.")} className="system-control-end-maintenance">End Maintenance</Button></div>}
    </section>
    <section className="system-control-section"><h2 className="system-control-send-platform-notification"><Megaphone className="system-control-megaphone-icon"/>Send Platform Notification</h2><div className="system-control-grid-2"><select value={audience} onChange={(e) => setAudience(e.target.value)} className="system-control-select"><option value="all">All Users</option><option value="admin">Admins</option><option value="landlord">Landlords</option><option value="tenant">Tenants</option></select><input value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="Notification title" className="system-control-input"/><textarea value={noticeMessage} onChange={(e) => setNoticeMessage(e.target.value)} placeholder="Notification message" className="system-control-textarea"/><Button disabled={busy || !noticeTitle.trim() || !noticeMessage.trim()} onClick={() => void execute({ action: "platform-notification", audience, title: noticeTitle, message: noticeMessage }, "Platform notification sent.")} className="system-control-send-notification">Send Notification</Button></div></section>
    <section className="system-control-section-2"><h2 className="system-control-maintenance-history">Maintenance History</h2>{history.length === 0 ? <p className="system-control-text-2">No maintenance history. System maintenance records will appear here after maintenance events.</p> : <div className="system-control-panel-4"><table className="system-control-table"><thead className="system-control-thead"><tr><th className="system-control-title">Title</th><th className="system-control-started-2">Started</th><th className="system-control-ended">Ended</th><th className="system-control-expected-end">Expected End</th></tr></thead><tbody>{history.map((item) => <tr key={String(item.id)} className="system-control-tr"><td className="system-control-td">{String(item.title ?? "Maintenance")}</td><td className="system-control-td-2">{item.started_at ? new Date(String(item.started_at)).toLocaleString("en-PH") : "—"}</td><td className="system-control-td-2">{item.ended_at ? new Date(String(item.ended_at)).toLocaleString("en-PH") : "—"}</td><td className="system-control-td-2">{item.expected_end_at ? new Date(String(item.expected_end_at)).toLocaleString("en-PH") : "—"}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
