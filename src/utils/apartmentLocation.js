const cleanPart = (value) => {
    if (typeof value !== "string")
        return "";
    return value.trim().replace(/\s+/g, " ");
};
const pushUnique = (parts, value) => {
    const cleaned = cleanPart(value);
    if (!cleaned)
        return;
    const normalized = cleaned.toLowerCase();
    if (parts.some((part) => part.toLowerCase() === normalized))
        return;
    parts.push(cleaned);
};
export function formatApartmentLocation(apartment, fallback = "Location not provided") {
    if (!apartment)
        return fallback;
    const parts = [];
    pushUnique(parts, apartment.address);
    pushUnique(parts, apartment.city);
    pushUnique(parts, apartment.state);
    pushUnique(parts, apartment.zip);
    if (parts.length > 0)
        return parts.join(", ");
    const legacyLocation = cleanPart(apartment.location);
    return legacyLocation || fallback;
}
export function hasReadableApartmentLocation(apartment) {
    return formatApartmentLocation(apartment, "") !== "";
}
