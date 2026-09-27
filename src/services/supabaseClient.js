import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
if (!hasSupabaseConfig) {
    console.error("Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel Environment Variables.");
}
export const supabase = createClient(supabaseUrl || "https://missing-project-ref.supabase.co", supabaseAnonKey || "missing-supabase-anon-key");
/**
 * Public Supabase Auth settings (for example which sign-in providers are
 * enabled). Resolves to null when they cannot be read, so callers can fall
 * back to letting Supabase decide.
 */
export async function fetchAuthSettings({ timeoutMs = 4000 } = {}) {
    if (!hasSupabaseConfig || typeof fetch !== "function")
        return null;
    const controller = typeof AbortController === "undefined" ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/settings`, {
            headers: { apikey: supabaseAnonKey },
            signal: controller?.signal,
        });
        if (!response.ok)
            return null;
        return await response.json();
    }
    catch {
        return null;
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
