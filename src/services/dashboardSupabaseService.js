import { supabase } from "./supabaseClient";
import { safeRandomId } from "../utils/safeRandomId";
import { apartmentRowToApartment } from "../data/apartments";
import { resolveAppUserId } from "./apartmentsService";
export const defaultTenantPreferences = {
    hasSavedPreferences: false,
    preferredArea: "",
    preferredLat: null,
    preferredLng: null,
    minBudget: 0,
    maxBudget: 0,
    minBedrooms: "any",
    roomCapacity: "any",
    petFriendly: false,
    parking: false,
    furnished: false,
    ownBathroom: false,
    wifi: false,
    ac: false,
    laundryArea: false,
    sortBy: "recommended",
    recommendationLocation: true,
    saveBudgetPreferences: false,
    emailNotifications: true,
};
function safeJsonParse(value, fallback) {
    if (!value) {
        return fallback;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function readCachedValue(key) {
    void key;
    return null;
}
function writeCachedValue(key, value) {
    void key;
    void value;
}
function normalizeRecord(record) {
    return record;
}
function getStringValue(value) {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    return undefined;
}
function getNumberValue(value) {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
function assignIfProvided(target, key, value) {
    if (value !== undefined) {
        target[key] = value;
    }
}
function toNullableInteger(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value === "") {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}
async function fetchRows(table) {
    const { data, error } = await supabase.from(table).select("*");
    if (error || !Array.isArray(data)) {
        return [];
    }
    return data.map((row) => normalizeRecord(row));
}
async function fetchRowsByColumn(table, column, value) {
    const { data, error } = await supabase.from(table).select("*").eq(column, value);
    if (error || !Array.isArray(data)) {
        return [];
    }
    return data.map((row) => normalizeRecord(row));
}
async function fetchSingleRowByColumn(table, column, value) {
    const { data, error } = await supabase.from(table).select("*").eq(column, value).maybeSingle();
    if (error || !data) {
        return null;
    }
    return normalizeRecord(data);
}
function toReportRow(row) {
    return {
        ...row,
        id: getStringValue(row.id),
        reporter_id: getStringValue(row.reporter_id),
        reporter_role: getStringValue(row.reporter_role),
        user_id: getStringValue(row.user_id),
        apartment_id: getStringValue(row.apartment_id),
        issue_type: getStringValue(row.issue_type),
        tags: Array.isArray(row.tags) ? row.tags.filter((tag) => typeof tag === "string") : null,
        details: getStringValue(row.details),
        contact: getStringValue(row.contact),
        severity: getStringValue(row.severity),
        submitted_at: getStringValue(row.submitted_at),
        status: getStringValue(row.status),
        resolved_at: getStringValue(row.resolved_at),
        reviewed_by: getStringValue(row.reviewed_by),
        reviewed_at: getStringValue(row.reviewed_at),
        landlord_id: getStringValue(row.landlord_id),
        is_archived: typeof row.is_archived === "boolean" ? row.is_archived : null,
        archived_at: getStringValue(row.archived_at),
        archived_by: getStringValue(row.archived_by),
        apartment_title: getStringValue(row.apartment_title),
        reporter_name: getStringValue(row.reporter_name),
        apartment: getStringValue(row.apartment),
        reporter: getStringValue(row.reporter),
        role: getStringValue(row.role),
        issueType: getStringValue(row.issueType),
        submittedAt: getStringValue(row.submittedAt),
        apartmentId: getStringValue(row.apartmentId),
    };
}
function toViolationRow(row) {
    return {
        ...row,
        id: getStringValue(row.id),
        landlord_id: getStringValue(row.landlord_id),
        admin_id: getStringValue(row.admin_id),
        mode: getStringValue(row.mode),
        type: getStringValue(row.type),
        message: getStringValue(row.message),
        issued_at: getStringValue(row.issued_at),
        expires_at: getStringValue(row.expires_at),
        related_report_id: getStringValue(row.related_report_id),
        apartment_id: getStringValue(row.apartment_id),
        active: typeof row.active === "boolean" ? row.active : null,
        landlordId: getStringValue(row.landlordId),
        landlordName: getStringValue(row.landlordName),
        apartmentTitle: getStringValue(row.apartmentTitle),
        reportId: getStringValue(row.reportId),
        issuedAt: getStringValue(row.issuedAt),
        expiresAt: getStringValue(row.expiresAt),
        report_id: getStringValue(row.report_id),
    };
}
function toNotificationRow(row) {
    return {
        ...row,
        id: getStringValue(row.id),
        user_id: getStringValue(row.user_id),
        type: getStringValue(row.type),
        title: getStringValue(row.title),
        message: getStringValue(row.message),
        payload: typeof row.payload === "object" && row.payload !== null ? row.payload : null,
        read: typeof row.read === "boolean" ? row.read : null,
        created_at: getStringValue(row.created_at),
        createdAt: getStringValue(row.createdAt),
        userId: getStringValue(row.userId),
        is_read: typeof row.is_read === "boolean" ? row.is_read : null,
        read_at: getStringValue(row.read_at),
        is_deleted: typeof row.is_deleted === "boolean" ? row.is_deleted : null,
        deleted_at: getStringValue(row.deleted_at),
        action_url: getStringValue(row.action_url),
        action_target_id: getStringValue(row.action_target_id),
        action_target_type: getStringValue(row.action_target_type),
    };
}
function toApartmentRow(row) {
    const apartment = apartmentRowToApartment(row);
    return {
        ...row,
        ...apartment,
        id: getStringValue(row.id),
        landlord_id: getStringValue(row.landlord_id),
        landlordId: apartment.landlordId ?? getStringValue(row.landlordId),
        is_published: typeof row.is_published === "boolean" ? row.is_published : null,
        isPublished: apartment.isPublished ?? (typeof row.isPublished === "boolean" ? row.isPublished : null),
        price: typeof row.price === "string" || typeof row.price === "number" ? row.price : null,
    };
}
function toFavoriteRow(row) {
    return {
        ...row,
        apartment_id: getStringValue(row.apartment_id),
        user_id: getStringValue(row.user_id),
        created_at: getStringValue(row.created_at),
        apartmentId: getStringValue(row.apartmentId),
        userId: getStringValue(row.userId),
        name: getStringValue(row.name),
        role: getStringValue(row.role),
    };
}
function toApartmentViewRow(row) {
    return {
        ...row,
        apartment_id: getStringValue(row.apartment_id),
        viewer_id: getStringValue(row.viewer_id),
        viewed_at: getStringValue(row.viewed_at),
        apartmentId: getStringValue(row.apartmentId),
        viewerId: getStringValue(row.viewerId),
        viewer_role: getStringValue(row.viewer_role),
        view_count: row.view_count === undefined || row.view_count === null ? 1 : getNumberValue(row.view_count),
        view_date: getStringValue(row.view_date),
    };
}
function toUserRow(row) {
    return {
        ...row,
        id: getStringValue(row.id),
        email: getStringValue(row.email),
        name: getStringValue(row.name),
        role: getStringValue(row.role),
        status: getStringValue(row.status),
        verification_status: getStringValue(row.verification_status),
        landlord_status: getStringValue(row.landlord_status),
        is_verified: typeof row.is_verified === "boolean" ? row.is_verified : null,
        isVerified: typeof row.isVerified === "boolean" ? row.isVerified : null,
        mobile: getStringValue(row.mobile),
        mobileNumber: getStringValue(row.mobileNumber),
        middle_initial: getStringValue(row.middle_initial),
        address: getStringValue(row.address),
        avatar_url: getStringValue(row.avatar_url),
        bio: getStringValue(row.bio),
        permit_number: getStringValue(row.permit_number),
        permitNumber: getStringValue(row.permitNumber),
        department: getStringValue(row.department),
        admin_level: getStringValue(row.admin_level),
        adminLevel: getStringValue(row.adminLevel),
        other_occupation: getStringValue(row.other_occupation),
        other_organization: getStringValue(row.other_organization),
        other_workplace: getStringValue(row.other_workplace),
        preferences: typeof row.preferences === "object" && row.preferences !== null ? normalizeTenantPreferences(row.preferences) : null,
    };
}
export async function fetchAdminReports() {
    const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("is_archived", false)
        .order("submitted_at", { ascending: false });
    if (error) {
        console.error("Error fetching active reports:", error);
        return safeJsonParse(readCachedValue("reports"), []).filter((report) => report.is_archived !== true);
    }
    const reports = (data ?? []);
    const normalized = reports.map((row) => toReportRow(row));
    const active = normalized.filter((report) => report.is_archived !== true);
    writeCachedValue("reports", JSON.stringify(active));
    return active;
}
export async function fetchArchivedReports() {
    const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("is_archived", true)
        .order("archived_at", { ascending: false });
    if (error) {
        console.error("Error fetching archived reports:", error);
        return [];
    }
    return (data ?? []).map((row) => toReportRow(row));
}
export async function fetchViolations() {
    const violations = await fetchRows("violations");
    const normalized = violations.map((row) => toViolationRow(row));
    if (normalized.length > 0) {
        writeCachedValue("violations", JSON.stringify(normalized));
        return normalized;
    }
    return safeJsonParse(readCachedValue("violations"), []);
}
export async function createViolation(violation) {
    const payload = {
        landlord_id: violation.landlord_id ?? violation.landlordId ?? null,
        admin_id: violation.admin_id ?? null,
        mode: violation.mode ?? "violation",
        type: violation.type ?? null,
        message: violation.message ?? null,
        issued_at: violation.issued_at ?? violation.issuedAt ?? new Date().toISOString(),
        expires_at: violation.expires_at ?? violation.expiresAt ?? null,
        related_report_id: violation.related_report_id ?? violation.reportId ?? violation.report_id ?? null,
        apartment_id: violation.apartment_id ?? null,
        active: violation.active ?? true,
    };
    const { data, error } = await supabase.from("violations").insert(payload).select("*").single();
    if (error || !data) {
        return null;
    }
    const normalized = toViolationRow(data);
    if (normalized.admin_id) {
        await createAuditLog({
            admin_id: normalized.admin_id,
            action: "create_violation",
            target_type: "violation",
            target_id: normalized.id ?? null,
            details: payload,
        });
    }
    const cached = await fetchViolations();
    cached.unshift(normalized);
    writeCachedValue("violations", JSON.stringify(cached));
    return normalized;
}
export async function deleteViolation(violationId) {
    const { error } = await supabase.from("violations").delete().eq("id", violationId);
    if (error) {
        return false;
    }
    const cached = await fetchViolations();
    const next = cached.filter((violation) => violation.id !== violationId);
    writeCachedValue("violations", JSON.stringify(next));
    return true;
}
export async function fetchNotifications(userId, includeArchived = false) {
    try {
        if (userId) {
            let query = supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
            if (!includeArchived) {
                query = query.eq("is_deleted", false);
            }
            const { data, error } = await query;
            if (error) {
                console.error("Error fetching notifications:", error);
                const cacheKey = includeArchived ? `notifications:${userId}:all` : `notifications:${userId}`;
                return safeJsonParse(readCachedValue(cacheKey), []);
            }
            const normalized = (data || []).map((row) => toNotificationRow(row));
            const cacheKey = includeArchived ? `notifications:${userId}:all` : `notifications:${userId}`;
            writeCachedValue(cacheKey, JSON.stringify(normalized));
            return normalized;
        }
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(100);
        if (error) {
            console.error("Error fetching all notifications:", error);
            return safeJsonParse(readCachedValue("notifications"), []);
        }
        const normalized = (data || []).map((row) => toNotificationRow(row));
        if (normalized.length > 0) {
            writeCachedValue("notifications", JSON.stringify(normalized));
        }
        return normalized;
    }
    catch (error) {
        console.error("Unexpected error in fetchNotifications:", error);
        return [];
    }
}
export async function getUnreadNotificationCount(userId) {
    try {
        const { data, error } = await supabase
            .from("notifications")
            .select("id", { count: "exact" })
            .eq("user_id", userId)
            .eq("read", false)
            .eq("is_deleted", false);
        if (error) {
            console.error("Error getting unread count:", error);
            return 0;
        }
        return data?.length ?? 0;
    }
    catch (error) {
        console.error("Unexpected error in getUnreadNotificationCount:", error);
        return 0;
    }
}
export async function markNotificationRead(notificationId, userId) {
    try {
        let query = supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", notificationId)
            .eq("is_deleted", false);
        if (userId) {
            query = query.eq("user_id", userId);
        }
        const { data, error } = await query
            .select("*")
            .single();
        if (error || !data) {
            console.error("Error marking notification as read:", error);
            return null;
        }
        // Invalidate all notification caches
        if (userId) {
            writeCachedValue(`notifications:${userId}`, "");
            writeCachedValue(`notifications:${userId}:all`, "");
        }
        writeCachedValue("notifications", "");
        return toNotificationRow(data);
    }
    catch (error) {
        console.error("Unexpected error in markNotificationRead:", error);
        return null;
    }
}
export async function markAllNotificationsRead(userId) {
    try {
        const { data, error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("user_id", userId)
            .eq("read", false)
            .eq("is_deleted", false)
            .select("id");
        if (error || !Array.isArray(data)) {
            console.error("Error marking all notifications as read:", error);
            return 0;
        }
        // Invalidate all notification caches for this user
        writeCachedValue(`notifications:${userId}`, "");
        writeCachedValue(`notifications:${userId}:all`, "");
        writeCachedValue("notifications", "");
        return data.length;
    }
    catch (error) {
        console.error("Unexpected error in markAllNotificationsRead:", error);
        return 0;
    }
}
export async function markNotificationUnread(notificationId, userId) {
    try {
        let query = supabase
            .from("notifications")
            .update({ read: false })
            .eq("id", notificationId)
            .eq("is_deleted", false);
        if (userId) {
            query = query.eq("user_id", userId);
        }
        const { data, error } = await query
            .select("*")
            .single();
        if (error || !data) {
            console.error("Error marking notification as unread:", error);
            return null;
        }
        // Invalidate all notification caches
        if (userId) {
            writeCachedValue(`notifications:${userId}`, "");
            writeCachedValue(`notifications:${userId}:all`, "");
        }
        writeCachedValue("notifications", "");
        return toNotificationRow(data);
    }
    catch (error) {
        console.error("Unexpected error in markNotificationUnread:", error);
        return null;
    }
}
export async function deleteNotification(notificationId, userId) {
    try {
        let query = supabase
            .from("notifications")
            .update({
            is_deleted: true,
            deleted_at: new Date().toISOString()
        })
            .eq("id", notificationId);
        if (userId) {
            query = query.eq("user_id", userId);
        }
        const { data, error } = await query.select("id").maybeSingle();
        if (error || !data) {
            console.error("Error deleting notification:", error);
            return false;
        }
        // Clear all notification caches
        if (userId) {
            writeCachedValue(`notifications:${userId}`, "");
            writeCachedValue(`notifications:${userId}:all`, "");
        }
        writeCachedValue("notifications", "");
        return true;
    }
    catch (error) {
        console.error("Unexpected error in deleteNotification:", error);
        return false;
    }
}
function getOptionalBooleanValue(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
}
function getPositiveNumberValue(value, fallback) {
    const parsed = getNumberValue(value);
    return parsed >= 0 ? parsed : fallback;
}
function getNullableCoordinate(value, fallback = null) {
    if (value === null || value === undefined || value === "")
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function isTenantPreferenceSortOption(value) {
    return value === "recommended" || value === "price_low" || value === "price_high" || value === "newest" || value === "popular";
}
function normalizeTenantPreferences(value, fallback = defaultTenantPreferences) {
    const source = typeof value === "object" && value !== null ? value : {};
    const minBedrooms = ["1", "2", "3", "4+"].includes(source.minBedrooms) ? source.minBedrooms : "any";
    const sortBy = isTenantPreferenceSortOption(source.sortBy) ? source.sortBy : fallback.sortBy;
    return {
        hasSavedPreferences: getOptionalBooleanValue(source.hasSavedPreferences, fallback.hasSavedPreferences),
        preferredArea: typeof source.preferredArea === "string" ? source.preferredArea : fallback.preferredArea,
        preferredLat: getNullableCoordinate(source.preferredLat, fallback.preferredLat),
        preferredLng: getNullableCoordinate(source.preferredLng, fallback.preferredLng),
        maxBudget: getPositiveNumberValue(source.maxBudget, fallback.maxBudget),
        minBudget: getPositiveNumberValue(source.minBudget, fallback.minBudget),
        minBedrooms,
        roomCapacity: source.roomCapacity === "4+" ? "4+" : Number.isInteger(Number(source.roomCapacity)) && Number(source.roomCapacity) > 0 ? String(source.roomCapacity) : "any",
        petFriendly: getOptionalBooleanValue(source.petFriendly, fallback.petFriendly),
        parking: getOptionalBooleanValue(source.parking, fallback.parking),
        furnished: getOptionalBooleanValue(source.furnished, fallback.furnished),
        ownBathroom: getOptionalBooleanValue(source.ownBathroom, fallback.ownBathroom),
        wifi: getOptionalBooleanValue(source.wifi, fallback.wifi),
        ac: getOptionalBooleanValue(source.ac, fallback.ac),
        laundryArea: getOptionalBooleanValue(source.laundryArea, fallback.laundryArea),
        sortBy,
        recommendationLocation: getOptionalBooleanValue(source.recommendationLocation, fallback.recommendationLocation),
        saveBudgetPreferences: getOptionalBooleanValue(source.saveBudgetPreferences, fallback.saveBudgetPreferences),
        emailNotifications: getOptionalBooleanValue(source.emailNotifications, fallback.emailNotifications),
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : fallback.updatedAt,
    };
}
function isMissingTenantPreferencesColumn(error) {
    if (!error)
        return false;
    const message = error.message?.toLowerCase() ?? "";
    return error.code === "PGRST204" || (message.includes("preferences") && message.includes("schema cache"));
}
export async function permanentlyDeleteNotification(notificationId, userId) {
    try {
        let query = supabase.from("notifications").delete().eq("id", notificationId);
        if (userId) {
            query = query.eq("user_id", userId);
        }
        const { data, error } = await query.select("id").maybeSingle();
        if (error || !data) {
            console.error("Error permanently deleting notification:", error);
            return false;
        }
        if (userId) {
            writeCachedValue(`notifications:${userId}`, "");
            writeCachedValue(`notifications:${userId}:all`, "");
        }
        writeCachedValue("notifications", "");
        return true;
    }
    catch (error) {
        console.error("Unexpected error in permanentlyDeleteNotification:", error);
        return false;
    }
}
export async function unarchiveNotification(notificationId, userId) {
    try {
        let query = supabase
            .from("notifications")
            .update({ is_deleted: false, deleted_at: null })
            .eq("id", notificationId)
            .eq("is_deleted", true);
        if (userId) {
            query = query.eq("user_id", userId);
        }
        const { data, error } = await query.select("id").maybeSingle();
        if (error || !data) {
            console.error("Error unarchiving notification:", error);
            return false;
        }
        if (userId) {
            writeCachedValue(`notifications:${userId}`, "");
            writeCachedValue(`notifications:${userId}:all`, "");
        }
        writeCachedValue("notifications", "");
        return true;
    }
    catch (error) {
        console.error("Unexpected error unarchiving notification:", error);
        return false;
    }
}
export async function deleteAllNotifications(userId) {
    try {
        const { data, error } = await supabase
            .from("notifications")
            .update({
            is_deleted: true,
            deleted_at: new Date().toISOString()
        })
            .eq("user_id", userId)
            .eq("is_deleted", false)
            .select("id");
        if (error || !Array.isArray(data)) {
            console.error("Error deleting all notifications:", error);
            return 0;
        }
        // Clear all notification caches
        writeCachedValue(`notifications:${userId}`, "");
        writeCachedValue(`notifications:${userId}:all`, "");
        writeCachedValue("notifications", "");
        return data.length;
    }
    catch (error) {
        console.error("Unexpected error in deleteAllNotifications:", error);
        return 0;
    }
}
export async function createNotification(notification) {
    const { data, error } = await supabase
        .from("notifications")
        .insert({
        user_id: notification.user_id,
        type: notification.type ?? "info",
        title: notification.title ?? null,
        message: notification.message ?? null,
        payload: notification.payload ?? {},
        read: false,
        action_url: notification.action_url ?? null,
        action_target_id: notification.action_target_id ?? null,
        action_target_type: notification.action_target_type ?? null,
    })
        .select("*")
        .single();
    if (error || !data) {
        return null;
    }
    return toNotificationRow(data);
}
export async function createSupportTicket(input) {
    const { data, error } = await supabase
        .from("support_tickets")
        .insert({
        user_id: input.userId,
        topic: input.topic.trim(),
        message: input.message.trim(),
        contact: input.contact?.trim() || null,
    })
        .select("*")
        .single();
    if (error || !data) {
        throw new Error(error?.message || "Unable to save the support request.");
    }
    return data;
}
export async function fetchSupportTicketById(ticketId) {
    const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
    if (error) {
        console.error("Error fetching support request:", error);
        return null;
    }
    return data ? data : null;
}
async function hydrateAppealDocuments(appeal) {
    const documents = Array.isArray(appeal.supporting_docs) ? appeal.supporting_docs : [];
    const supporting_docs = await Promise.all(documents.map(async (entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
            return entry;
        const document = entry;
        const path = typeof document.path === "string" ? document.path : "";
        const bucket = typeof document.bucket === "string" ? document.bucket : "verification-documents";
        if (!path || document.kind !== "evidence")
            return entry;
        const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
        return { ...document, file_url: data?.signedUrl || "" };
    }));
    return { ...appeal, supporting_docs };
}
export async function createAppeal(appeal) {
    try {
        const { data, error } = await supabase
            .from("appeals")
            .insert({
            ...(appeal.id ? { id: appeal.id } : {}),
            landlord_id: appeal.landlord_id,
            report_id: appeal.report_id ?? null,
            violation_id: appeal.violation_id ?? null,
            reason: appeal.reason,
            description: appeal.description ?? null,
            supporting_docs: appeal.supporting_docs ?? [],
            status: "pending",
        })
            .select("*")
            .single();
        if (error || !data) {
            throw new Error(error?.message || "Unable to save the appeal.");
        }
        return hydrateAppealDocuments(data);
    }
    catch (error) {
        console.error("Unexpected error in createAppeal:", error);
        throw error;
    }
}
export async function createAppealWithEvidence(appeal, evidenceFiles) {
    const appealId = appeal.id || safeRandomId();
    const uploadedPaths = [];
    const evidenceDocuments = [];
    try {
        for (const evidence of evidenceFiles) {
            const extension = evidence.fileName.split(".").pop()?.toLowerCase() || "bin";
            const safeBaseName = evidence.fileName.replace(/[^a-z0-9._-]+/gi, "-").slice(-100);
            const path = `${appeal.landlord_id}/appeals/${appealId}/${safeRandomId()}-${safeBaseName || `evidence.${extension}`}`;
            const { error } = await supabase.storage.from("verification-documents").upload(path, evidence.file, {
                contentType: evidence.mimeType || undefined,
                upsert: false,
            });
            if (error)
                throw new Error(error.message || `Unable to upload ${evidence.fileName}.`);
            uploadedPaths.push(path);
            evidenceDocuments.push({
                kind: "evidence",
                bucket: "verification-documents",
                path,
                file_name: evidence.fileName,
                mime_type: evidence.mimeType,
                file_size: evidence.file.size,
            });
        }
        const created = await createAppeal({
            ...appeal,
            id: appealId,
            supporting_docs: [...(appeal.supporting_docs ?? []), ...evidenceDocuments],
        });
        return created;
    }
    catch (error) {
        if (uploadedPaths.length > 0) {
            await supabase.storage.from("verification-documents").remove(uploadedPaths);
        }
        throw error;
    }
}
export async function submitAppealFollowupWithEvidence(appealId, landlordId, description, contact, evidenceFiles) {
    const uploadedPaths = [];
    const documents = [{ kind: "contact", value: contact }];
    try {
        for (const evidence of evidenceFiles) {
            const safeName = evidence.fileName.replace(/[^a-z0-9._-]+/gi, "-").slice(-100) || "evidence.bin";
            const path = `${landlordId}/appeals/${appealId}/${safeRandomId()}-${safeName}`;
            const { error } = await supabase.storage.from("verification-documents").upload(path, evidence.file, {
                contentType: evidence.mimeType || undefined,
                upsert: false,
            });
            if (error)
                throw new Error(error.message || `Unable to upload ${evidence.fileName}.`);
            uploadedPaths.push(path);
            documents.push({ kind: "evidence", bucket: "verification-documents", path, file_name: evidence.fileName, mime_type: evidence.mimeType, file_size: evidence.file.size });
        }
        const { data, error } = await supabase.rpc("fn_submit_appeal_followup", {
            p_appeal_id: appealId,
            p_description: description,
            p_supporting_docs: documents,
        });
        if (error || !data)
            throw new Error(error?.message || "Unable to submit additional appeal information.");
        return hydrateAppealDocuments(data);
    }
    catch (error) {
        if (uploadedPaths.length > 0)
            await supabase.storage.from("verification-documents").remove(uploadedPaths);
        throw error;
    }
}
export async function fetchAppealsByLandlord(landlordId) {
    try {
        const { data, error } = await supabase
            .from("appeals")
            .select("*")
            .eq("landlord_id", landlordId)
            .order("submitted_at", { ascending: false });
        if (error) {
            console.error("Error fetching appeals:", error);
            return [];
        }
        return Promise.all((data ?? []).map(hydrateAppealDocuments));
    }
    catch (error) {
        console.error("Unexpected error in fetchAppealsByLandlord:", error);
        return [];
    }
}
export async function fetchPendingAppeals() {
    try {
        const { data, error } = await supabase
            .from("appeals")
            .select("*")
            .eq("is_archived", false)
            .order("submitted_at", { ascending: false });
        if (error) {
            console.error("Error fetching pending appeals:", error);
            return [];
        }
        return Promise.all((data ?? []).map(hydrateAppealDocuments));
    }
    catch (error) {
        console.error("Unexpected error in fetchPendingAppeals:", error);
        return [];
    }
}
export async function fetchArchivedAppeals() {
    try {
        const { data, error } = await supabase
            .from("appeals")
            .select("*")
            .eq("is_archived", true)
            .order("archived_at", { ascending: false });
        if (error) {
            console.error("Error fetching archived appeals:", error);
            return [];
        }
        return Promise.all((data ?? []).map(hydrateAppealDocuments));
    }
    catch (error) {
        console.error("Unexpected error in fetchArchivedAppeals:", error);
        return [];
    }
}
export async function updateAppealStatus(appealId, status, adminId, adminResponse) {
    try {
        const { data, error } = await supabase
            .from("appeals")
            .update({
            status,
            admin_id: adminId ?? null,
            admin_response: adminResponse ?? null,
            reviewed_at: new Date().toISOString(),
        })
            .eq("id", appealId)
            .select("*")
            .single();
        if (error || !data) {
            console.error("Error updating appeal status:", error);
            return null;
        }
        return hydrateAppealDocuments(data);
    }
    catch (error) {
        console.error("Unexpected error in updateAppealStatus:", error);
        return null;
    }
}
const PROCESSED_REPORT_STATUSES = new Set(["resolved", "closed", "approved", "rejected", "completed", "violation_issued", "notice_issued", "dismissed"]);
const PROCESSED_APPEAL_STATUSES = new Set(["resolved", "closed", "approved", "rejected", "completed", "violation_issued", "notice_issued", "dismissed"]);
export const canArchiveReportStatus = (status) => PROCESSED_REPORT_STATUSES.has(String(status ?? "").trim().toLowerCase());
export const canArchiveAppealStatus = (status) => PROCESSED_APPEAL_STATUSES.has(String(status ?? "").trim().toLowerCase());
export async function archiveReport(reportId, adminId) {
    const { data: current, error: currentError } = await supabase.from("reports").select("*").eq("id", reportId).maybeSingle();
    if (currentError || !current)
        throw new Error(currentError?.message || "Report not found.");
    const currentReport = toReportRow(current);
    if (!canArchiveReportStatus(currentReport.status)) {
        throw new Error("Only processed reports can be moved to History.");
    }
    const archivedAt = new Date().toISOString();
    const { data, error } = await supabase
        .from("reports")
        .update({ is_archived: true, archived_at: archivedAt, archived_by: adminId, last_action_at: archivedAt })
        .eq("id", reportId)
        .select("*")
        .single();
    if (error || !data)
        throw new Error(error?.message || "Unable to archive report.");
    const archived = toReportRow(data);
    await createAuditLog({
        admin_id: adminId,
        action: "archived_report",
        target_type: "report",
        target_id: reportId,
        details: {
            report_id: reportId,
            apartment_id: archived.apartment_id ?? archived.apartmentId ?? null,
            landlord_id: archived.landlord_id ?? null,
            tenant_id: archived.reporter_id ?? archived.user_id ?? null,
            status: archived.status ?? null,
            archived_at: archived.archived_at ?? archivedAt,
        },
    });
    writeCachedValue("reports", JSON.stringify((await fetchAdminReports())));
    return archived;
}
export async function restoreReport(reportId, adminId) {
    const { data, error } = await supabase
        .from("reports")
        .update({ is_archived: false, archived_at: null, archived_by: null, last_action_at: new Date().toISOString() })
        .eq("id", reportId)
        .select("*")
        .single();
    if (error || !data)
        throw new Error(error?.message || "Unable to restore report.");
    const restored = toReportRow(data);
    await createAuditLog({
        admin_id: adminId,
        action: "restored_report",
        target_type: "report",
        target_id: reportId,
        details: {
            report_id: reportId,
            apartment_id: restored.apartment_id ?? restored.apartmentId ?? null,
            landlord_id: restored.landlord_id ?? null,
            tenant_id: restored.reporter_id ?? restored.user_id ?? null,
            status: restored.status ?? null,
        },
    });
    return restored;
}
export async function permanentlyDeleteReport(reportId, adminId) {
    const { data: current, error: currentError } = await supabase.from("reports").select("*").eq("id", reportId).maybeSingle();
    if (currentError || !current)
        throw new Error(currentError?.message || "Report not found.");
    const report = toReportRow(current);
    if (report.is_archived !== true)
        throw new Error("Only archived reports can be permanently deleted.");
    const { error } = await supabase.from("reports").delete().eq("id", reportId).eq("is_archived", true);
    if (error)
        throw new Error(error.message || "Unable to permanently delete report.");
    await createAuditLog({
        admin_id: adminId,
        action: "permanently_deleted_report",
        target_type: "report",
        target_id: reportId,
        details: {
            report_id: reportId,
            apartment_id: report.apartment_id ?? report.apartmentId ?? null,
            landlord_id: report.landlord_id ?? null,
            tenant_id: report.reporter_id ?? report.user_id ?? null,
            status: report.status ?? null,
        },
    });
    return true;
}
export async function archiveAppeal(appealId, adminId) {
    const { data: current, error: currentError } = await supabase.from("appeals").select("*").eq("id", appealId).maybeSingle();
    if (currentError || !current)
        throw new Error(currentError?.message || "Appeal not found.");
    const currentAppeal = await hydrateAppealDocuments(current);
    if (!canArchiveAppealStatus(currentAppeal.status)) {
        throw new Error("Only processed appeals can be moved to History.");
    }
    const archivedAt = new Date().toISOString();
    const { data, error } = await supabase
        .from("appeals")
        .update({ is_archived: true, archived_at: archivedAt, archived_by: adminId })
        .eq("id", appealId)
        .select("*")
        .single();
    if (error || !data)
        throw new Error(error?.message || "Unable to archive appeal.");
    const archived = await hydrateAppealDocuments(data);
    await createAuditLog({
        admin_id: adminId,
        action: "archived_appeal",
        target_type: "appeal",
        target_id: appealId,
        details: {
            appeal_id: appealId,
            report_id: archived.report_id ?? null,
            landlord_id: archived.landlord_id ?? null,
            status: archived.status ?? null,
            archived_at: archived.archived_at ?? archivedAt,
        },
    });
    return archived;
}
export async function restoreAppeal(appealId, adminId) {
    const { data, error } = await supabase
        .from("appeals")
        .update({ is_archived: false, archived_at: null, archived_by: null })
        .eq("id", appealId)
        .select("*")
        .single();
    if (error || !data)
        throw new Error(error?.message || "Unable to restore appeal.");
    const restored = await hydrateAppealDocuments(data);
    await createAuditLog({
        admin_id: adminId,
        action: "restored_appeal",
        target_type: "appeal",
        target_id: appealId,
        details: {
            appeal_id: appealId,
            report_id: restored.report_id ?? null,
            landlord_id: restored.landlord_id ?? null,
            status: restored.status ?? null,
        },
    });
    return restored;
}
export async function permanentlyDeleteAppeal(appealId, adminId) {
    const { data: current, error: currentError } = await supabase.from("appeals").select("*").eq("id", appealId).maybeSingle();
    if (currentError || !current)
        throw new Error(currentError?.message || "Appeal not found.");
    const appeal = current;
    if (appeal.is_archived !== true)
        throw new Error("Only archived appeals can be permanently deleted.");
    const { error } = await supabase.from("appeals").delete().eq("id", appealId).eq("is_archived", true);
    if (error)
        throw new Error(error.message || "Unable to permanently delete appeal.");
    await createAuditLog({
        admin_id: adminId,
        action: "permanently_deleted_appeal",
        target_type: "appeal",
        target_id: appealId,
        details: {
            appeal_id: appealId,
            report_id: appeal.report_id ?? null,
            landlord_id: appeal.landlord_id ?? null,
            status: appeal.status ?? null,
        },
    });
    return true;
}
export async function createAuditLog(auditLog) {
    const { data, error } = await supabase
        .from("audit_logs")
        .insert({
        admin_id: auditLog.admin_id ?? null,
        action: auditLog.action,
        target_type: auditLog.target_type ?? null,
        target_id: auditLog.target_id ?? null,
        details: auditLog.details ?? {},
    })
        .select("*")
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
export async function fetchApartmentChangeLogs(apartmentId) {
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("target_type", "apartment")
        .eq("target_id", apartmentId)
        .order("created_at", { ascending: false });
    if (error) {
        console.error("Error fetching apartment change logs:", error);
        return [];
    }
    return (data ?? []);
}
export async function fetchAdminActivityLogs(adminId) {
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("admin_id", adminId)
        .order("created_at", { ascending: false })
        .limit(100);
    if (error) {
        console.error("Error fetching admin activity logs:", error);
        return [];
    }
    return (data ?? []);
}
export async function sendAdminMessageToLandlord(input) {
    const notification = await createNotification({
        user_id: input.landlordId,
        type: "admin_message",
        title: `Message about ${input.apartmentTitle}`,
        message: input.message,
        payload: {
            action: "admin_message",
            admin_id: input.adminId,
            apartment_id: input.apartmentId,
            apartment_title: input.apartmentTitle,
            report_id: input.reportId ?? null,
            violation_id: input.violationId ?? null,
            related_type: input.reportId ? "report" : input.violationId ? "violation" : "apartment_issue",
            status: "open",
            category: "reports",
            sent_at: new Date().toISOString(),
        },
    });
    if (!notification)
        return false;
    await createAuditLog({
        admin_id: input.adminId,
        action: "admin_message_sent",
        target_type: "apartment",
        target_id: input.apartmentId,
        details: {
            actor_id: input.adminId,
            landlord_id: input.landlordId,
            message: input.message,
            report_id: input.reportId ?? null,
            violation_id: input.violationId ?? null,
            notification_id: notification.id ?? null,
        },
    });
    return true;
}
export async function fetchUsers() {
    const [{ data: userRows, error: usersError }, { data: publicLandlordRows, error: publicLandlordsError }] = await Promise.all([
        supabase.from("app_users").select("*"),
        supabase.from("public_landlords").select("*"),
    ]);
    if (usersError || publicLandlordsError) {
        console.error("Error fetching admin users:", usersError ?? publicLandlordsError);
        return [];
    }
    const publicLandlordsById = new Map((publicLandlordRows ?? [])
        .map((row) => toUserRow(row))
        .filter((row) => Boolean(row.id))
        .map((row) => [row.id, row]));
    const usersById = new Map();
    (userRows ?? []).forEach((row) => {
        const normalizedUser = toUserRow(row);
        if (!normalizedUser.id)
            return;
        const publicLandlord = publicLandlordsById.get(normalizedUser.id);
        usersById.set(normalizedUser.id, {
            ...publicLandlord,
            ...normalizedUser,
            // public_landlords is the read model used for landlord verification.
            // Keep its boolean when app_users does not expose that column.
            is_verified: publicLandlord?.is_verified ?? normalizedUser.is_verified,
            isVerified: publicLandlord?.isVerified ?? normalizedUser.isVerified,
        });
    });
    publicLandlordsById.forEach((landlord, id) => {
        if (!usersById.has(id))
            usersById.set(id, landlord);
    });
    const normalized = [...usersById.values()];
    if (normalized.length > 0) {
        writeCachedValue("users", JSON.stringify(normalized));
        return normalized;
    }
    return safeJsonParse(readCachedValue("users"), []);
}
export async function fetchUserById(userId) {
    const user = await fetchSingleRowByColumn("app_users", "id", userId);
    return user ? toUserRow(user) : null;
}
export async function fetchUserProfileDetails(userId) {
    if (!userId)
        return null;
    const { data: userData, error: userError } = await supabase
        .from("app_users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
    if (userError)
        throw new Error(userError.message || "Unable to load profile.");
    if (!userData)
        return null;
    const user = toUserRow(userData);
    const role = user.role;
    const details = { user };
    if (role === "landlord") {
        const { data, error } = await supabase.from("landlord_profiles").select("*").eq("user_id", userId).maybeSingle();
        if (error)
            throw new Error(error.message || "Unable to load landlord profile.");
        details.landlordProfile = data;
    }
    if (role === "admin") {
        const { data, error } = await supabase.from("admin_profiles").select("*").eq("user_id", userId).maybeSingle();
        if (error)
            throw new Error(error.message || "Unable to load admin profile.");
        details.adminProfile = data;
    }
    return details;
}
export async function fetchPublicLandlordById(userId) {
    const { data, error } = await supabase.from("public_landlords").select("*").eq("id", userId).maybeSingle();
    if (error || !data)
        return null;
    return toUserRow(data);
}
export async function fetchTenantPreferences(userId) {
    if (!userId)
        return null;
    const { data, error } = await supabase.from("app_users").select("preferences").eq("id", userId).maybeSingle();
    if (isMissingTenantPreferencesColumn(error)) {
        throw new Error("Tenant preferences are unavailable because the database schema is not up to date.");
    }
    if (error) {
        throw new Error(error.message || "Unable to load tenant preferences.");
    }
    if (!data) {
        return defaultTenantPreferences;
    }
    const stored = data.preferences;
    const source = typeof stored === "object" && stored !== null && !Array.isArray(stored) && "tenant" in stored
        ? stored.tenant
        : stored;
    return normalizeTenantPreferences(source, defaultTenantPreferences);
}
export async function saveTenantPreferences(userId, preferences) {
    if (!userId)
        return null;
    const current = await fetchTenantPreferences(userId) ?? defaultTenantPreferences;
    const merged = normalizeTenantPreferences({
        ...current,
        ...preferences,
        hasSavedPreferences: true,
        updatedAt: new Date().toISOString(),
    }, defaultTenantPreferences);
    const { data, error } = await supabase.rpc("fn_merge_user_preference_section", {
        p_user_id: userId,
        p_section: "tenant",
        p_value: merged,
    });
    if (error) {
        if (isMissingTenantPreferencesColumn(error)) {
            throw new Error("Tenant preferences cannot be saved because the database schema is not up to date.");
        }
        throw new Error(error.message || "Unable to save tenant preferences.");
    }
    const savedRoot = typeof data === "object" && data !== null && !Array.isArray(data) ? data : {};
    const saved = normalizeTenantPreferences(savedRoot.tenant, merged);
    return saved;
}
export async function fetchUserPreferenceSections(userId) {
    if (!userId)
        return {};
    const { data, error } = await supabase.from("app_users").select("preferences").eq("id", userId).maybeSingle();
    if (error)
        throw new Error(error.message || "Unable to load account preferences.");
    const value = data?.preferences;
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value
        : {};
}
export async function saveUserPreferenceSection(userId, section, value) {
    const { data, error } = await supabase.rpc("fn_merge_user_preference_section", {
        p_user_id: userId,
        p_section: section,
        p_value: value,
    });
    if (error)
        throw new Error(error.message || "Unable to save account preferences.");
    return typeof data === "object" && data !== null && !Array.isArray(data)
        ? data
        : {};
}
export async function updateUserProfile(payload) {
    const updatePayload = {
        email: payload.email,
        name: payload.name,
    };
    assignIfProvided(updatePayload, "mobile", payload.mobile);
    assignIfProvided(updatePayload, "avatar_url", payload.avatar_url);
    assignIfProvided(updatePayload, "bio", payload.bio);
    assignIfProvided(updatePayload, "middle_initial", payload.middle_initial);
    assignIfProvided(updatePayload, "address", payload.address);
    assignIfProvided(updatePayload, "is_verified", payload.is_verified);
    assignIfProvided(updatePayload, "permit_number", payload.permit_number);
    assignIfProvided(updatePayload, "department", payload.department);
    assignIfProvided(updatePayload, "admin_level", payload.admin_level);
    assignIfProvided(updatePayload, "other_occupation", payload.other_occupation);
    assignIfProvided(updatePayload, "other_organization", payload.other_organization);
    assignIfProvided(updatePayload, "other_workplace", payload.other_workplace);
    const { data, error } = await supabase.from("app_users").update(updatePayload).eq("id", payload.id).select("*").single();
    if (error || !data) {
        throw new Error(error?.message || "Unable to update the user profile.");
    }
    const normalized = toUserRow(data);
    const role = payload.role ?? normalized.role;
    await syncRoleProfile(normalized.id ?? payload.id, role ?? null, payload);
    const cached = await fetchUsers();
    const next = cached.map((user) => (user.id === payload.id ? normalized : user));
    writeCachedValue("users", JSON.stringify(next));
    return normalized;
}
export async function uploadUserAvatar(userId, file) {
    if (!file.type.startsWith("image/"))
        throw new Error("Please select a valid image file.");
    if (file.size > 5 * 1024 * 1024)
        throw new Error("Profile photo must be 5MB or smaller.");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("user-avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
    });
    if (error)
        throw new Error(error.message || "Unable to upload profile photo.");
    return supabase.storage.from("user-avatars").getPublicUrl(path).data.publicUrl;
}
async function syncRoleProfile(userId, role, payload) {
    if (role === "landlord") {
        const profilePayload = { user_id: userId };
        assignIfProvided(profilePayload, "permit_number", payload.permit_number);
        assignIfProvided(profilePayload, "business_permit_number", payload.business_permit_number ?? payload.permit_number);
        assignIfProvided(profilePayload, "is_verified", payload.is_verified);
        assignIfProvided(profilePayload, "business_name", payload.business_name);
        assignIfProvided(profilePayload, "tin_number", payload.tin_number);
        assignIfProvided(profilePayload, "id_type", payload.id_type);
        assignIfProvided(profilePayload, "id_number", payload.id_number);
        assignIfProvided(profilePayload, "permit_expiry", payload.permit_expiry);
        assignIfProvided(profilePayload, "business_type", payload.business_type);
        assignIfProvided(profilePayload, "years_active", toNullableInteger(payload.years_active));
        assignIfProvided(profilePayload, "total_units", toNullableInteger(payload.total_units));
        assignIfProvided(profilePayload, "service_areas", payload.service_areas);
        assignIfProvided(profilePayload, "deposit_months", toNullableInteger(payload.deposit_months));
        assignIfProvided(profilePayload, "advance_months", toNullableInteger(payload.advance_months));
        assignIfProvided(profilePayload, "min_lease_months", toNullableInteger(payload.min_lease_months));
        assignIfProvided(profilePayload, "pet_policy", payload.pet_policy);
        assignIfProvided(profilePayload, "smoking_policy", payload.smoking_policy);
        assignIfProvided(profilePayload, "maintenance_response_hours", toNullableInteger(payload.maintenance_response_hours));
        assignIfProvided(profilePayload, "listing_visibility", payload.listing_visibility);
        await supabase.from("landlord_profiles").upsert(profilePayload, { onConflict: "user_id" });
    }
    if (role === "admin") {
        const profilePayload = { user_id: userId };
        assignIfProvided(profilePayload, "department", payload.department);
        assignIfProvided(profilePayload, "admin_level", payload.admin_level);
        const { error } = await supabase.from("admin_profiles").upsert(profilePayload, { onConflict: "user_id" });
        if (error)
            throw new Error(error.message || "Unable to save the administrator profile.");
    }
}
export async function fetchApartments() {
    const { data, error } = await supabase
        .from("apartments")
        .select("*, apartment_images(url, is_primary, sort_order), apartment_rooms(id, name, room_type, sqft, max_occupants, rent, has_private_bath, bathroom_type, shared_bath_location, has_ac, is_occupied, status, description, images, created_at)")
        .order("created_at", { ascending: false });
    if (error || !Array.isArray(data)) {
        console.error("Error fetching dashboard apartments:", error);
        return safeJsonParse(readCachedValue("apartments"), []);
    }
    const normalized = data.map((row) => toApartmentRow(row));
    if (normalized.length > 0) {
        writeCachedValue("apartments", JSON.stringify(normalized));
        return normalized;
    }
    writeCachedValue("apartments", "[]");
    return [];
}
export async function fetchFavorites() {
    const favorites = await fetchRows("favorites");
    const normalized = favorites.map((row) => toFavoriteRow(row));
    if (normalized.length > 0) {
        writeCachedValue("favorites", JSON.stringify(normalized));
        return normalized;
    }
    return safeJsonParse(readCachedValue("favorites"), []);
}
export async function fetchFavoritesForApartments(apartmentIds) {
    if (apartmentIds.length === 0)
        return [];
    const { data, error } = await supabase.from("favorites").select("*").in("apartment_id", apartmentIds);
    if (error)
        throw new Error(error.message);
    return (data ?? []).map((row) => toFavoriteRow(row));
}
export async function fetchViewActivityForApartments(apartmentIds) {
    if (apartmentIds.length === 0)
        return [];
    const { data, error } = await supabase.from("apartment_views").select("*").in("apartment_id", apartmentIds);
    if (error)
        throw new Error(error.message);
    return (data ?? []).map((row) => toApartmentViewRow(row));
}
export async function fetchApartmentViews() {
    const { data: countData, error: countError } = await supabase.rpc("get_apartment_view_counts");
    if (!countError && Array.isArray(countData)) {
        const normalized = countData.map((row) => toApartmentViewRow(row));
        writeCachedValue("apartment_views", JSON.stringify(normalized));
        return normalized;
    }
    const { data, error } = await supabase.from("apartment_views").select("*");
    if (error || !Array.isArray(data)) {
        return safeJsonParse(readCachedValue("apartment_views"), []);
    }
    const normalized = data.map((row) => toApartmentViewRow(row));
    writeCachedValue("apartment_views", JSON.stringify(normalized));
    return normalized;
}
export async function updateReportStatus(reportId, status) {
    const { data, error } = await supabase
        .from("reports")
        .update({
        status,
        resolved_at: status === "pending" ? null : new Date().toISOString(),
    })
        .eq("id", reportId)
        .select("*")
        .single();
    if (error || !data) {
        return null;
    }
    const normalized = toReportRow(data);
    const cached = await fetchAdminReports();
    const next = cached.map((report) => (report.id === reportId ? normalized : report));
    writeCachedValue("reports", JSON.stringify(next));
    return normalized;
}

/**
 * Notify landlord and reporter after an admin verifies a report.
 * Creates notifications for both the landlord (apartment owner) and the reporting tenant
 */
export async function notifyReportResolved(reportId, landlordId, reporterId, apartmentTitle) {
    try {
        // Notify landlord
        await createNotification({
            user_id: landlordId,
            type: "report_verified",
            title: "Verified Property Report",
            message: `A report for "${apartmentTitle}" was verified by admin and is now available for your review.`,
            payload: {
                report_id: reportId,
                apartment_title: apartmentTitle,
                action_type: "resolved",
                resolved_at: new Date().toISOString(),
            },
        });
        // Notify reporting tenant
        await createNotification({
            user_id: reporterId,
            type: "report_status_updated",
            title: "Your Report Was Verified",
            message: `Your report for "${apartmentTitle}" was verified by admin and shared with the landlord.`,
            payload: {
                report_id: reportId,
                apartment_title: apartmentTitle,
                status: "resolved",
                resolved_at: new Date().toISOString(),
            },
        });
    }
    catch (err) {
        console.error("Error notifying report resolution:", err);
    }
}

/**
 * Notify reporter when a report is dismissed
 * Creates notification for the reporting tenant with dismissal details
 */
export async function notifyReportDismissed(reportId, reporterId, apartmentTitle, dismissalReason) {
    try {
        // Notify reporting tenant
        await createNotification({
            user_id: reporterId,
            type: "report_dismissed",
            title: "Your Report Was Dismissed",
            message: dismissalReason
                ? `Your report for "${apartmentTitle}" was dismissed. Reason: ${dismissalReason}`
                : `Your report for "${apartmentTitle}" was dismissed after admin review.`,
            payload: {
                report_id: reportId,
                apartment_title: apartmentTitle,
                status: "dismissed",
                reason: dismissalReason || null,
                dismissed_at: new Date().toISOString(),
            },
        });
    }
    catch (err) {
        console.error("Error notifying report dismissal:", err);
    }
}

/**
 * Fetch complete report details with all relationships
 * Returns report data along with reporter info, apartment info, and landlord info
 */
export async function fetchReportDetails(reportId) {
    try {
        const { data, error } = await supabase
            .from("reports")
            .select("*")
            .eq("id", reportId)
            .single();
        if (error || !data) {
            return null;
        }
        return toReportRow(data);
    }
    catch (err) {
        console.error("Error fetching report details:", err);
        return null;
    }
}

/**
 * Fetch all necessary information for a report detail view
 * Includes apartment and landlord info without exposing reporter identity.
 */
export async function fetchReportWithDetails(reportId) {
    try {
        const report = await fetchReportDetails(reportId);
        if (!report)
            return null;
        // Try to fetch apartment details
        const apartmentId = report.apartment_id || report.apartmentId;
        let apartment = null;
        if (apartmentId) {
            try {
                const { data: aptData } = await supabase
                    .from("apartments")
                    .select("*")
                    .eq("id", apartmentId)
                    .single();
                apartment = aptData;
            }
            catch {
                // Apartment might not exist
            }
        }
        // Get landlord if apartment exists
        let landlord = null;
        if (apartment?.user_id || apartment?.landlord_id) {
            landlord = await fetchUserById(apartment.user_id || apartment.landlord_id);
        }
        return { report, apartment, landlord };
    }
    catch (err) {
        console.error("Error fetching report with details:", err);
        return null;
    }
}
export async function createReport(report) {
    const reporterId = report.reporter_id ? await resolveAppUserId(report.reporter_id) : null;
    const landlordId = report.landlord_id ? await resolveAppUserId(report.landlord_id) : null;
    if (!reporterId) {
        throw new Error("Please sign in to submit a report.");
    }
    const { data, error } = await supabase
        .from("reports")
        .insert({
        reporter_id: reporterId,
        user_id: reporterId,
        reporter_role: report.reporter_role ?? null,
        apartment_id: report.apartment_id ?? null,
        issue_type: report.issue_type ?? null,
        category: report.category ?? null,
        tags: report.tags ?? [],
        details: report.details ?? null,
        contact: report.contact ?? null,
        date_of_incident: report.date_of_incident ?? null,
        landlord_id: landlordId,
        has_evidence: report.has_evidence ?? false,
        evidence_count: report.evidence_count ?? 0,
        severity: report.severity ?? "med",
        status: "pending",
        last_action_at: new Date().toISOString(),
    })
        .select("*")
        .single();
    if (error) {
        throw new Error(error.message || "Unable to save report.");
    }
    if (!data) {
        throw new Error("Unable to save report.");
    }
    const normalized = toReportRow(data);
    const cached = await fetchAdminReports();
    cached.unshift(normalized);
    writeCachedValue("reports", JSON.stringify(cached));
    return normalized;
}

/**
 * Fetch landlord profile information from landlord_profiles table
 */
export async function fetchLandlordProfile(landlordId) {
    try {
        const { data, error } = await supabase
            .from("landlord_profiles")
            .select("*")
            .eq("user_id", landlordId)
            .single();
        if (error || !data) {
            return null;
        }
        const profile = data;
        const signDocument = async (value) => {
            if (typeof value !== "string" || !value)
                return null;
            if (value.startsWith("https://") || value.startsWith("http://"))
                return value;
            const { data: signed } = await supabase.storage.from("verification-documents").createSignedUrl(value, 15 * 60);
            return signed?.signedUrl ?? null;
        };
        const [verificationUrl, idUrl] = await Promise.all([
            signDocument(profile.verification_document_url),
            signDocument(profile.id_document_url),
        ]);
        return { ...profile, verification_document_url: verificationUrl, id_document_url: idUrl };
    }
    catch (err) {
        console.error("Error fetching landlord profile:", err);
        return null;
    }
}

/**
 * Fetch complete landlord details with all relationships
 * Returns landlord info, profile, properties, violations, reports, and statistics
 */
export async function fetchLandlordWithDetails(landlordId) {
    try {
        // Fetch user info
        const user = await fetchUserById(landlordId);
        if (!user)
            return null;
        // Older accounts may have the permit on app_users but no matching
        // landlord_profiles row yet. Keep verification details visible before the
        // administrator approves the account instead of relying on verification to
        // create/repair the profile first.
        const [storedProfile, properties, allViolations, allReports, views, favorites] = await Promise.all([
            fetchLandlordProfile(landlordId),
            fetchRowsByColumn("apartments", "landlord_id", landlordId),
            fetchViolations(),
            fetchAdminReports(),
            fetchApartmentViews(),
            fetchFavorites(),
        ]);
        const userPermit = getStringValue(user.permit_number ?? user.permitNumber);
        const profile = {
            ...(storedProfile ?? {}),
            user_id: storedProfile?.user_id ?? landlordId,
            permit_number: storedProfile?.permit_number || userPermit || null,
            business_permit_number: storedProfile?.business_permit_number || storedProfile?.permit_number || userPermit || null,
            is_verified: storedProfile?.is_verified ?? user.is_verified ?? user.isVerified ?? false,
        };
        const normalizedProperties = properties.map((row) => toApartmentRow(row));
        const violations = allViolations.filter((v) => (v.landlord_id ?? v.landlordId) === landlordId);
        const reports = allReports.filter((report) => report.status === "resolved"
            && normalizedProperties.some((property) => property.id === (report.apartment_id ?? report.apartmentId)));
        const totalViews = views
            .filter((v) => normalizedProperties.some((p) => p.id === (v.apartment_id ?? v.apartmentId)))
            .reduce((total, view) => total + (view.view_count === undefined || view.view_count === null ? 1 : getNumberValue(view.view_count)), 0);
        const totalFavorites = favorites.filter((f) => normalizedProperties.some((p) => p.id === (f.apartment_id ?? f.apartmentId))).length;
        const averagePrice = normalizedProperties.length > 0
            ? normalizedProperties.reduce((sum, p) => sum + getNumberValue(p.price), 0) / normalizedProperties.length
            : 0;
        return {
            user,
            profile,
            properties: normalizedProperties,
            violations,
            reports,
            propertyStats: {
                totalProperties: normalizedProperties.length,
                publishedProperties: normalizedProperties.filter((p) => (p.is_published ?? p.isPublished) === true).length,
                totalViews,
                totalFavorites,
                averagePrice: Number.isFinite(averagePrice) ? averagePrice : 0,
            },
        };
    }
    catch (err) {
        console.error("Error fetching landlord with details:", err);
        return null;
    }
}
