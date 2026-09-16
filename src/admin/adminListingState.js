const normalizedText = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const booleanValue = (primary, fallback) => typeof primary === "boolean" ? primary : typeof fallback === "boolean" ? fallback : undefined;
export function getAdminListingState(listing) {
    if (listing.deletedAt || listing.deleted_at)
        return "deleted";
    if (booleanValue(listing.isArchived, listing.is_archived) === true)
        return "archived";
    const approval = normalizedText(listing.approvalStatus ?? listing.approval_status);
    if (approval === "rejected")
        return "rejected";
    if (booleanValue(listing.isPublished, listing.is_published) === true)
        return "published";
    if (approval === "pending" || approval === "under_review")
        return "pending";
    return "unpublished";
}
export const ADMIN_LISTING_LABELS = {
    pending: "Pending Review",
    published: "Published",
    rejected: "Rejected",
    unpublished: "Unpublished",
    archived: "Archived",
    deleted: "Deleted",
};
export function getAdminListingLabel(listing) {
    return ADMIN_LISTING_LABELS[getAdminListingState(listing)];
}
export function getAdminRoomState(room) {
    const status = normalizedText(room.status);
    if (status === "reserved")
        return "occupied";
    if (status === "occupied" || status === "maintenance")
        return status;
    return booleanValue(room.isOccupied, room.is_occupied) === true ? "occupied" : "available";
}
export function getListingRooms(listing) {
    return Array.isArray(listing.rooms)
        ? listing.rooms.filter((room) => typeof room === "object" && room !== null)
        : [];
}
export function getAdminAvailabilityLabel(listing) {
    const rooms = getListingRooms(listing);
    if (rooms.length === 0)
        return "No rooms configured";
    const states = rooms.map(getAdminRoomState);
    const available = states.filter((status) => status === "available").length;
    if (available > 0)
        return `${available} Available Room${available === 1 ? "" : "s"}`;
    if (states.every((status) => status === "occupied"))
        return "Fully Occupied";
    if (states.every((status) => status === "maintenance"))
        return "Under Maintenance";
    return "No Available Rooms";
}
export function getLowestRoomRent(listing) {
    const rents = getListingRooms(listing)
        .map((room) => Number(room.rent ?? room.price))
        .filter((rent) => Number.isFinite(rent) && rent > 0);
    return rents.length > 0 ? Math.min(...rents) : null;
}
