import { supabase } from "./supabaseClient";
export async function generateBackupCodes() {
    const { data, error } = await supabase.rpc("fn_generate_backup_codes");
    if (error)
        throw new Error(error.message || "Unable to generate backup codes.");
    if (!Array.isArray(data) || !data.every((code) => typeof code === "string")) {
        throw new Error("The backup-code service returned an invalid response.");
    }
    return data;
}
