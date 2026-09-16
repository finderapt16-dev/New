export class GeocodingError extends Error {
    reason;
    constructor(message, reason) { super(message); this.name = "GeocodingError"; this.reason = reason; }
}
const BOUNDS = { south: 10.68, north: 10.75, west: 122.535, east: 122.595 };
const OUTSIDE_SCOPE_MESSAGE = "This location is outside AptFindr's supported area. Search within La Paz, Iloilo City.";
// These coordinates are reference points for well-known local places only.
// Apartment coordinates and results continue to come exclusively from Supabase.
const LA_PAZ_LANDMARKS = [
    { canonicalName: "Gaisano La Paz", aliases: ["gaisano", "gaisano lapaz", "gaisano la paz", "gaisano city lapaz", "gaisano city la paz"], lat: 10.70703, lng: 122.56659, label: "Gaisano La Paz, Luna Street, La Paz, Iloilo City" },
    { canonicalName: "La Paz Plaza", aliases: ["lapaz plaza", "la paz plaza", "plaza lapaz", "plaza la paz"], lat: 10.711825, lng: 122.570903, label: "La Paz Plaza, La Paz, Iloilo City" },
    { canonicalName: "La Paz Public Market", aliases: ["lapaz public market", "la paz public market", "lapaz market", "la paz market"], lat: 10.70882, lng: 122.568154, label: "La Paz Public Market, La Paz, Iloilo City" },
    { canonicalName: "ISAT U", aliases: ["isat", "isat u", "isat-u", "iloilo science and technology university"], lat: 10.7153, lng: 122.5659, label: "ISAT U Main Campus, La Paz, Iloilo City" },
    { canonicalName: "Iloilo Mission Hospital", aliases: ["iloilo mission hospital", "mission hospital", "cpu imh", "cpu-imh"], lat: 10.71423, lng: 122.56019, label: "Iloilo Mission Hospital, Iloilo City" },
    { canonicalName: "West Visayas State University", aliases: ["west visayas state university", "wvsu", "west visayas", "west visayas university"], lat: 10.7161, lng: 122.5614, label: "West Visayas State University, La Paz, Iloilo City" },
    { canonicalName: "St. Clement's Church", aliases: ["st clements church", "st clement's church", "saint clements church", "saint clement's church", "st clements", "st clement"], lat: 10.709997, lng: 122.565041, label: "St. Clement's Church, La Paz, Iloilo City" },
];
const OUTSIDE_SCOPE_ALIASES = ["jaro plaza", "sm city", "sm city iloilo", "festive walk", "molo plaza", "oton", "pavia"];
const normalizePlaceName = (value) => value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/la[\s-]*paz/g, "lapaz")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
const findLandmark = (target) => {
    const normalized = normalizePlaceName(target);
    return LA_PAZ_LANDMARKS.find((landmark) => [landmark.canonicalName, ...landmark.aliases].some((alias) => normalizePlaceName(alias) === normalized));
};
export function getLaPazLandmarkSuggestions(value, limit = 6) {
    const normalized = normalizePlaceName(value.replace(/^(?:apartments?\s+)?(?:near(?:est)?(?:\s+to)?\s+)?/i, "").replace(/\s+near$/i, ""));
    if (normalized.length < 2)
        return [];
    return LA_PAZ_LANDMARKS
        .filter((landmark) => [landmark.canonicalName, ...landmark.aliases]
        .some((alias) => normalizePlaceName(alias).includes(normalized)))
        .slice(0, limit)
        .map((landmark) => landmark.canonicalName);
}
const cache = new Map();
const reverseCache = new Map();
const inside = ({ lat, lng }) => lat >= BOUNDS.south && lat <= BOUNDS.north && lng >= BOUNDS.west && lng <= BOUNDS.east;
async function lookup(query, bounded, signal) {
    const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "5", countrycodes: "ph", addressdetails: "1" });
    if (bounded) {
        params.set("viewbox", `${BOUNDS.west},${BOUNDS.north},${BOUNDS.east},${BOUNDS.south}`);
        params.set("bounded", "1");
    }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal, headers: { Accept: "application/json" } });
    if (!response.ok)
        throw new GeocodingError("Location search is temporarily unavailable.", "network");
    return (await response.json()).map((row) => ({ lat: Number(row.lat), lng: Number(row.lon), label: row.display_name })).filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
}
export async function geocodeLocationWithinLaPaz(target, signal) {
    const key = target.trim().toLowerCase();
    const cached = cache.get(key);
    if (cached)
        return cached;
    try {
        const normalizedTarget = normalizePlaceName(target);
        if (OUTSIDE_SCOPE_ALIASES.some((alias) => normalizedTarget === normalizePlaceName(alias))) {
            throw new GeocodingError(OUTSIDE_SCOPE_MESSAGE, "outside-scope");
        }
        const landmark = findLandmark(target);
        if (landmark) {
            const result = { lat: landmark.lat, lng: landmark.lng, label: landmark.label };
            cache.set(key, result);
            return result;
        }
        const scopedQuery = /la paz/i.test(target) ? target : `${target}, La Paz, Iloilo City`;
        const match = (await lookup(scopedQuery, true, signal)).find((candidate) => inside(candidate) && /\b(?:la paz|lapaz)\b/i.test(candidate.label));
        if (match) {
            if (cache.size >= 100)
                cache.delete(cache.keys().next().value);
            cache.set(key, match);
            return match;
        }
        const broad = (await lookup(`${target}, Philippines`, false, signal))[0];
        if (broad && (!inside(broad) || !/\b(?:la paz|lapaz)\b/i.test(broad.label)))
            throw new GeocodingError(OUTSIDE_SCOPE_MESSAGE, "outside-scope");
        throw new GeocodingError("We couldn't find that location. Try a more specific landmark or street.", "not-found");
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
            throw error;
        if (error instanceof GeocodingError)
            throw error;
        throw new GeocodingError("Location search is temporarily unavailable.", "network");
    }
}
export async function reverseGeocodeWithinLaPaz(lat, lng, signal) {
    const point = { lat, lng, label: "" };
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inside(point)) {
        throw new GeocodingError("That location is outside the supported La Paz area.", "outside-scope");
    }
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = reverseCache.get(key);
    if (cached)
        return cached;
    try {
        const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lng),
            format: "jsonv2",
            addressdetails: "1",
            zoom: "18",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
            signal,
            headers: { Accept: "application/json" },
        });
        if (!response.ok)
            throw new GeocodingError("Location lookup is temporarily unavailable.", "network");
        const row = await response.json();
        const label = String(row.display_name ?? "").trim();
        if (!label)
            throw new GeocodingError("No address was found for that map point.", "not-found");
        const result = { lat, lng, label };
        if (reverseCache.size >= 100)
            reverseCache.delete(reverseCache.keys().next().value);
        reverseCache.set(key, result);
        return result;
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
            throw error;
        if (error instanceof GeocodingError)
            throw error;
        throw new GeocodingError("Location lookup is temporarily unavailable.", "network");
    }
}
