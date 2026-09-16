export const DEFAULT_LA_PAZ_MAP_CENTER = {
    lat: 10.7202,
    lng: 122.5621,
};
const COORDINATE_PRECISION = 6;
const normalizeCoordinate = (value) => Number(value.toFixed(COORDINATE_PRECISION));
export function isDefaultMapCenter(lat, lng) {
    const numericLat = Number(lat);
    const numericLng = Number(lng);
    return (Number.isFinite(numericLat) &&
        Number.isFinite(numericLng) &&
        normalizeCoordinate(numericLat) === normalizeCoordinate(DEFAULT_LA_PAZ_MAP_CENTER.lat) &&
        normalizeCoordinate(numericLng) === normalizeCoordinate(DEFAULT_LA_PAZ_MAP_CENTER.lng));
}
export function hasValidApartmentCoordinates(lat, lng) {
    const numericLat = Number(lat);
    const numericLng = Number(lng);
    return (Number.isFinite(numericLat) &&
        Number.isFinite(numericLng) &&
        numericLat >= -90 &&
        numericLat <= 90 &&
        numericLng >= -180 &&
        numericLng <= 180 &&
        !(numericLat === 0 && numericLng === 0) &&
        !isDefaultMapCenter(numericLat, numericLng));
}
