export const isRoomAvailable = (room) => {
    const status = room.status ?? (room.isOccupied ? "occupied" : "available");
    return status === "available" && room.isOccupied !== true;
};
export const getAvailableRoomCount = (apartment) => (apartment.rooms ?? []).filter(isRoomAvailable).length;
export const getLowestAvailableRoomPrice = (apartment) => {
    const prices = (apartment.rooms ?? [])
        .filter(isRoomAvailable)
        .map((room) => Number(room.price))
        .filter((price) => Number.isFinite(price) && price > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
};
/**
 * Shared client-side listing rule. Landlord verification is enforced by
 * database RLS, so tenant clients never receive published rows belonging to
 * an unverified landlord.
 *
 * Tenant discovery is intentionally stricter than internal Admin/Landlord
 * management. A listing must be fully approved, active, published, live, and
 * backed by at least one real available room before tenants can see it.
 */
export const isTenantVisibleApartment = (apartment) => {
    if (apartment.landlordVerified !== true)
        return false;
    if (apartment.isPublished !== true)
        return false;
    if (apartment.approvalStatus !== "approved")
        return false;
    if (apartment.isArchived === true || apartment.deletedAt)
        return false;
    if (apartment.status !== "available")
        return false;
    if (!apartment.rooms?.length)
        return false;
    const availableDate = new Date(apartment.availableDate);
    if (!Number.isNaN(availableDate.getTime()) && availableDate > new Date())
        return false;
    return getAvailableRoomCount(apartment) > 0;
};
