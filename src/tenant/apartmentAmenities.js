import { isRoomAvailable } from "../utils/listingVisibility";
const aliases = {
    "own bathroom": "own_bathroom", "private bathroom": "own_bathroom", "en-suite bathroom": "own_bathroom",
    wifi: "wifi", "wi-fi": "wifi", "wifi ready": "wifi",
    ac: "air_conditioning", aircon: "air_conditioning", "air conditioning": "air_conditioning",
    laundry: "laundry_area", "laundry area": "laundry_area",
    parking: "parking", furnished: "furnished", "pet friendly": "pet_friendly",
};
const normalize = (value) => aliases[value.trim().toLowerCase()] ?? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
export function getNormalizedApartmentAmenities(apartment) {
    const result = new Set((apartment.amenities ?? []).map(normalize));
    if (apartment.rooms?.some(room => isRoomAvailable(room) && room.hasPrivateBath))
        result.add("own_bathroom");
    if (apartment.parking)
        result.add("parking");
    if (apartment.furnished)
        result.add("furnished");
    if (apartment.petFriendly)
        result.add("pet_friendly");
    if (apartment.wifi)
        result.add("wifi");
    if (apartment.rooms?.some((room) => room.hasAC))
        result.add("air_conditioning");
    if (apartment.features && typeof apartment.features === "object" && !Array.isArray(apartment.features)) {
        Object.entries(apartment.features).forEach(([key, enabled]) => { if (enabled)
            result.add(normalize(key)); });
    }
    return result;
}
