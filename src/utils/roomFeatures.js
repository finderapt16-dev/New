// Room-specific extras live in the existing apartments.features JSON column.
// This keeps deployed databases compatible; no new columns or migration are needed.
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const AMENITY_NAMES = {
    wifi: "Wi-Fi",
    "wi-fi": "Wi-Fi",
    "air conditioning": "Air Conditioning",
    "private bathroom": "Private Bathroom",
};

export function normalizeRoomList(values, { amenities = false } = {}) {
    if (!Array.isArray(values)) return [];
    const seen = new Set();
    return values.flatMap((value) => {
        if (typeof value !== "string") return [];
        const trimmed = value.trim().replace(/\s+/g, " ");
        const label = amenities ? AMENITY_NAMES[trimmed.toLowerCase()] || trimmed : trimmed;
        const key = label.toLowerCase();
        if (!key || seen.has(key)) return [];
        seen.add(key);
        return [label];
    });
}

export function getRoomAmenities(room) {
    const amenities = normalizeRoomList(room?.amenities, { amenities: true })
        .filter((value) => !["Air Conditioning", "Private Bathroom"].includes(value));
    // Keep the existing tenant filters and bathroom/AC fields authoritative.
    if (room?.hasAC) amenities.push("Air Conditioning");
    if (room?.hasPrivateBath) amenities.push("Private Bathroom");
    return amenities;
}

export function roomWithFeatures(room, features) {
    const details = isRecord(features?.roomDetails?.[room.id]) ? features.roomDetails[room.id] : {};
    const result = {
        ...room,
        amenities: getRoomAmenities({ ...room, amenities: details.amenities ?? room.amenities }),
    };
    // Undefined means "inherit property utilities"; [] explicitly means none.
    const utilities = details.utilities ?? room.utilities;
    if (Array.isArray(utilities)) result.utilities = normalizeRoomList(utilities);
    return result;
}

export function mergeRoomFeatures(features, roomId, details) {
    const current = isRecord(features)
        ? features
        : { customFeatures: Array.isArray(features) ? features : [] };
    const roomDetails = { ...(isRecord(current.roomDetails) ? current.roomDetails : {}) };
    if (details === null) {
        delete roomDetails[roomId];
    } else {
        roomDetails[roomId] = {
            ...(isRecord(roomDetails[roomId]) ? roomDetails[roomId] : {}),
            amenities: normalizeRoomList(details.amenities, { amenities: true }),
            utilities: normalizeRoomList(details.utilities),
        };
    }
    return { ...current, roomDetails };
}
