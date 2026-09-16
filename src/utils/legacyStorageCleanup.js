const LEGACY_EXACT_KEYS = new Set([
    "apartment_finder_current_user",
    "apartmentViews",
    "favorites",
    "users",
    "dashboard-supabase-cache",
    "rentiloilo:storage-schema",
]);
const LEGACY_PREFIXES = [
    "rentiloilo:add-property-draft:",
    "rentiloilo_chat_history:",
    "rentiloilo:geocode:",
    "userPreferences_",
    "userAlerts_",
    "userSecurity_",
    "landlordProfile_",
    "landlordBusiness_",
    "landlordAlerts_",
    "landlordSecurity_",
    "landlordSessions_",
    "landlordAuditLog_",
    "2fa_backup_codes_",
];
export function clearLegacyApplicationStorage() {
    if (typeof window === "undefined")
        return;
    try {
        const keys = [];
        for (let index = 0; index < window.localStorage.length; index += 1) {
            const key = window.localStorage.key(index);
            if (key && (LEGACY_EXACT_KEYS.has(key) || LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix)))) {
                keys.push(key);
            }
        }
        keys.forEach((key) => window.localStorage.removeItem(key));
    }
    catch {
        // Authentication and application startup must continue when storage is unavailable.
    }
}
