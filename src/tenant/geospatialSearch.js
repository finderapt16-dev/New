/**
 * Only apartments inside this radius will appear
 * in Nearby Search results.
 */
export const MAX_NEARBY_DISTANCE_METERS = 500;
const DISTANCE_COMPARISON_EPSILON_METERS = 0.000001;
/**
 * Detect nearby-search queries.
 *
 * Supported examples:
 * - near ISAT U
 * - nearest ISAT U
 * - nearest to ISAT U
 * - nearby ISAT U
 * - closest to ISAT U
 * - close to ISAT U
 * - apartments near ISAT U
 * - rooms near ISAT U
 */
export function parseNearbySearchIntent(value) {
    const query = value.trim();
    if (!query) {
        return null;
    }
    const patterns = [
        /^(?:apartments?|units?|rooms?)\s+(?:near|nearby|nearest(?:\s+to)?|closest(?:\s+to)?|close\s+to)\s+(.+)$/i,
        /^(?:nearest(?:\s+to)?|nearby|closest(?:\s+to)?|close\s+to)\s+(.+)$/i,
        /^near\s+(.+)$/i,
        // Natural trailing form: "gaisano near".
        /^(.+?)\s+near$/i,
    ];
    for (const pattern of patterns) {
        const match = query.match(pattern);
        const target = match?.[1]?.trim().replace(/[.,!?]+$/g, "");
        if (target &&
            target.length >= 2 &&
            !/^market apartment$/i.test(target)) {
            return {
                target,
            };
        }
    }
    return null;
}
/**
 * Safely converts possible string coordinates
 * coming from Supabase into numbers.
 */
export function normalizeCoordinates(value) {
    const lat = typeof value.lat === "number"
        ? value.lat
        : Number(value.lat);
    const lng = typeof value.lng === "number"
        ? value.lng
        : Number(value.lng);
    if (!Number.isFinite(lat) ||
        !Number.isFinite(lng)) {
        return null;
    }
    if (lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180) {
        return null;
    }
    return {
        lat,
        lng,
    };
}
/**
 * Checks if the provided coordinates are valid.
 */
export function hasValidCoordinates(value) {
    return normalizeCoordinates(value) !== null;
}
/**
 * Calculates straight-line geographic distance
 * between two coordinates using Haversine.
 *
 * IMPORTANT:
 * Return value is METERS.
 */
export function calculateDistanceMeters(left, right) {
    const EARTH_RADIUS_METERS = 6_371_000;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const lat1 = toRadians(left.lat);
    const lat2 = toRadians(right.lat);
    const deltaLat = toRadians(right.lat - left.lat);
    const deltaLng = toRadians(right.lng - left.lng);
    const a = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(deltaLng / 2) ** 2;
    /**
     * Protect against floating-point values
     * slightly above 1 or below 0.
     */
    const safeA = Math.min(1, Math.max(0, a));
    const angularDistance = 2 *
        Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));
    return (EARTH_RADIUS_METERS *
        angularDistance);
}
/**
 * Display distance using METERS only.
 *
 * Examples:
 * 85.45 -> "85 m away"
 * 499.8 -> "500 m away"
 *
 * NOTE:
 * Anything above 500 meters should already
 * have been removed from Nearby Search.
 */
export function formatDistance(meters) {
    if (!Number.isFinite(meters) ||
        meters < 0) {
        return "Distance unavailable";
    }
    return `${Math.round(meters)} m away`;
}
/**
 * Finds apartments inside the 500-meter
 * proximity radius and sorts them
 * from nearest to farthest.
 */
export function findNearbyApartments(apartments, searchedLocation, maxDistanceMeters = MAX_NEARBY_DISTANCE_METERS) {
    const referenceCoordinates = normalizeCoordinates(searchedLocation);
    if (!referenceCoordinates) {
        return [];
    }
    return apartments
        .map((apartment) => {
        const apartmentCoordinates = normalizeCoordinates({
            lat: apartment.lat,
            lng: apartment.lng,
        });
        if (!apartmentCoordinates) {
            return null;
        }
        const distanceMeters = calculateDistanceMeters(referenceCoordinates, apartmentCoordinates);
        return {
            ...apartment,
            distanceMeters,
        };
    })
        // Remove apartments without valid coordinates
        .filter((apartment) => apartment !== null)
        // STRICT 500-METER PROXIMITY
        .filter((apartment) => apartment.distanceMeters <=
        maxDistanceMeters + DISTANCE_COMPARISON_EPSILON_METERS)
        // Nearest first
        .sort((a, b) => a.distanceMeters -
        b.distanceMeters);
}
