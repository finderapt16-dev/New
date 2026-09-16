import { supabase } from "@/services/supabaseClient";
export class SuperAdminFunctionError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "SuperAdminFunctionError";
    }
}
async function invokeSuperAdminFunction(body) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken)
        throw new SuperAdminFunctionError("Your session has expired. Please sign in again.", "unauthorized");
    try {
        const { data, error } = await supabase.functions.invoke("super-admin-users", {
            body,
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!error && data?.success !== false)
            return;
        let status = Number(error?.context?.status ?? 0);
        let serverMessage = typeof data?.error === "string" ? data.error : "";
        const response = error?.context;
        if (response) {
            try {
                const payload = await response.clone().json();
                serverMessage = payload.error || serverMessage;
            }
            catch { /* Non-JSON gateway response. */ }
        }
        if (status === 401)
            throw new SuperAdminFunctionError(serverMessage || "Your session is invalid or expired. Please sign in again.", "unauthorized");
        if (status === 403)
            throw new SuperAdminFunctionError(serverMessage || "Super Admin access is required for this action.", "forbidden");
        if (status >= 500)
            throw new SuperAdminFunctionError(serverMessage || "The maintenance service encountered a server or database error.", "database");
        if (status === 404 || /not found|failed to send/i.test(error?.message ?? ""))
            throw new SuperAdminFunctionError("The Super Admin Edge Function is not reachable. Deploy 'super-admin-users' to the Supabase project configured by this app.", "not_reachable");
        throw new SuperAdminFunctionError(serverMessage || error?.message || "The Super Admin action failed.", "server");
    }
    catch (error) {
        if (error instanceof SuperAdminFunctionError)
            throw error;
        if (error instanceof TypeError || /fetch|network|connection/i.test(error instanceof Error ? error.message : ""))
            throw new SuperAdminFunctionError("Network error while contacting Supabase. Check your connection and project URL.", "network");
        throw new SuperAdminFunctionError(error instanceof Error ? error.message : "Unexpected Super Admin service error.", "server");
    }
}
export async function fetchAdminAccounts() {
    const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: false });
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
export async function fetchPlatformUsers() {
    const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .order("created_at", { ascending: false });
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
export async function setUserAccountActive(userId, active) {
    await invokeSuperAdminFunction({ action: "user-status", userId, active });
}
export async function createAdminAccount(input) {
    await invokeSuperAdminFunction({ action: "create", ...input });
}
export async function updateAdminAccount(adminId, input) {
    await invokeSuperAdminFunction({ action: "update", adminId, ...input });
}
export async function setAdminAccountActive(adminId, active) {
    await invokeSuperAdminFunction({ action: "status", adminId, active });
}
export async function fetchSuperAdminAuditLogs(limit = 200) {
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
export async function fetchSupportRequests() {
    const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
export async function updateSupportRequest(ticketId, status, response) {
    await invokeSuperAdminFunction({ action: "support-status", ticketId, status, response });
}
export async function fetchMaintenanceState() {
    const { data, error } = await supabase.from("platform_status").select("*").eq("id", true).maybeSingle();
    if (error)
        throw new Error(error.message);
    return data;
}
export async function fetchMaintenanceHistory() {
    const { data, error } = await supabase.from("maintenance_history").select("*").order("started_at", { ascending: false }).limit(50);
    if (error)
        throw new Error(error.message);
    return data ?? [];
}
export async function runSuperAdminAction(body) {
    await invokeSuperAdminFunction(body);
}
