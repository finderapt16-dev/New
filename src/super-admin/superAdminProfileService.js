import { uploadUserAvatar } from "@/services/dashboardSupabaseService";
import { supabase } from "@/services/supabaseClient";
export async function fetchMySuperAdminProfile() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user)
        throw new Error("Your session has expired. Please sign in again.");
    const { data: account, error: accountError } = await supabase.from("app_users").select("id,name,email,role,status,avatar_url,department,admin_level,created_at").eq("auth_id", authData.user.id).single();
    if (accountError || !account)
        throw new Error(accountError?.message || "Super Admin account profile was not found.");
    if (account.role !== "super_admin")
        throw new Error("Super Admin access is required.");
    const [{ data: adminProfile, error: profileError }, { data: activity, error: activityError }] = await Promise.all([
        supabase.from("admin_profiles").select("admin_level,department,created_at,updated_at").eq("user_id", account.id).maybeSingle(),
        supabase.from("audit_logs").select("created_at").eq("admin_id", account.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (profileError)
        throw new Error(profileError.message || "Unable to load the administrative profile.");
    if (activityError)
        throw new Error(activityError.message || "Unable to load profile activity.");
    return {
        id: account.id,
        name: account.name ?? "",
        email: account.email ?? "",
        role: account.role,
        status: account.status ?? "active",
        avatarUrl: account.avatar_url ?? "",
        department: adminProfile?.department ?? account.department ?? "",
        adminLevel: adminProfile?.admin_level ?? account.admin_level ?? "Super Administrator",
        joinedAt: account.created_at,
        lastActivityAt: activity?.created_at ?? null,
        hasAdminProfile: Boolean(adminProfile),
    };
}
export async function saveMySuperAdminProfile(input) {
    const { data, error } = await supabase.rpc("fn_upsert_my_super_admin_profile", {
        p_name: input.name.trim(),
        p_department: input.department.trim() || null,
        p_avatar_url: input.avatarUrl.trim() || null,
    });
    if (error)
        throw new Error(error.message || "Unable to save the Super Admin profile.");
    if (!data)
        throw new Error("The Super Admin profile update was not accepted.");
}
export async function uploadSuperAdminAvatar(userId, file) {
    return uploadUserAvatar(userId, file);
}
