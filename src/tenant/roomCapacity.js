import { isRoomAvailable } from "../utils/listingVisibility";

export function getAvailableRoomCapacities(apartment) {
    return [...new Set((apartment.rooms ?? [])
        .filter(isRoomAvailable)
        .map((room) => Number(room.maxOccupants))
        .filter((capacity) => Number.isInteger(capacity) && capacity > 0))].sort((a, b) => a - b);
}

export function matchesRoomCapacity(apartment, capacity) {
    return !capacity || capacity === "any"
        || getAvailableRoomCapacities(apartment).includes(Number(capacity));
}
