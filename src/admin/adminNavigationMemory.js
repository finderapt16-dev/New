const keyFor = (adminId) => `aptfindr:admin-navigation:${adminId}`;
function readMemory(adminId) {
    if (!adminId)
        return {};
    try {
        const value = sessionStorage.getItem(keyFor(adminId));
        return value ? JSON.parse(value) : {};
    }
    catch {
        return {};
    }
}
export function getAdminModuleLocation(adminId, module) {
    return readMemory(adminId)[module] ?? null;
}
export function rememberAdminModuleLocation(adminId, module, location) {
    if (!adminId)
        return;
    try {
        const memory = readMemory(adminId);
        memory[module] = location;
        sessionStorage.setItem(keyFor(adminId), JSON.stringify(memory));
    }
    catch {
        // Navigation memory is an enhancement; storage failures must not block navigation.
    }
}
export function clearAdminNavigationMemory(adminId) {
    if (!adminId)
        return;
    try {
        sessionStorage.removeItem(keyFor(adminId));
    }
    catch {
        // Preserve the existing logout flow even when browser storage is unavailable.
    }
}
export function getAdminModulePath(adminId, module) {
    const remembered = getAdminModuleLocation(adminId, module);
    if (module === "apartments" && remembered?.view === "apartment-inspection") {
        return `/admin/apartment/${encodeURIComponent(remembered.apartmentId)}`;
    }
    return `/admin?section=${module}`;
}
