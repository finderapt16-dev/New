import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
if (!hasSupabaseConfig) {
    console.error("Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel Environment Variables.");
}
export const supabase = createClient(supabaseUrl || "https://missing-project-ref.supabase.co", supabaseAnonKey || "missing-supabase-anon-key");
