import { getNormalizedApartmentAmenities } from "./apartmentAmenities";
import { matchesRoomCapacity } from "./roomCapacity";
import {
    getLowestAvailableRoomPrice,
    isRoomAvailable,
} from "../utils/listingVisibility";
import {
    calculateDistanceMeters,
    normalizeCoordinates,
} from "./geospatialSearch";
import { hasValidApartmentCoordinates } from "../utils/mapCoordinates";

/** The sole source of truth for Recommended ranking. */
export const RANKING_WEIGHTS = {
    location: 0.70,
    budget: 0.10,
    availability: 0.05,
    amenities: 0.05,
    verification: 0.05,
    recency: 0.05,
};

export const MAX_DISTANCE_METERS = 1500;

/** Whether the tenant has explicitly saved a usable recommendation preference. */
export function hasMeaningfulPreferences(preferences) {
    if (!preferences?.hasSavedPreferences) return false;

    return Boolean(
        (preferences.recommendationLocation !== false && preferences.preferredArea?.trim()) ||
        (preferences.saveBudgetPreferences !== false &&
            (Number(preferences.minBudget) > 0 || Number(preferences.maxBudget) > 0)) ||
        (preferences.minBedrooms && preferences.minBedrooms !== "any") ||
        (preferences.roomCapacity === "4+" || Number(preferences.roomCapacity) > 0) ||
        preferences.petFriendly || preferences.parking || preferences.furnished ||
        preferences.ownBathroom || preferences.wifi || preferences.ac ||
        preferences.studyArea || preferences.laundryArea || preferences.kitchenAccess
    );
}

const clampScore = (value) => Math.max(0, Math.min(100, value));

function getPreferredCoordinates(preferences) {
    return normalizeCoordinates({
        lat: preferences?.preferredLat,
        lng: preferences?.preferredLng,
    });
}

function getApartmentCoordinates(apartment) {
    const coordinates = normalizeCoordinates({ lat: apartment?.lat, lng: apartment?.lng });
    return coordinates && hasValidApartmentCoordinates(coordinates.lat, coordinates.lng)
        ? coordinates
        : null;
}

function calculateLocationScore(apartment, preferences) {
    // A disabled location preference is neutral: every listing receives the same score.
    if (preferences?.recommendationLocation === false || !preferences?.preferredArea?.trim()) {
        return { locationScore: 50, distanceMeters: null };
    }

    const preferredCoordinates = getPreferredCoordinates(preferences);
    const apartmentCoordinates = getApartmentCoordinates(apartment);
    if (!preferredCoordinates || !apartmentCoordinates) {
        return { locationScore: 0, distanceMeters: null };
    }

    const distanceMeters = calculateDistanceMeters(preferredCoordinates, apartmentCoordinates);
    return {
        distanceMeters,
        locationScore: clampScore(100 * (1 - distanceMeters / MAX_DISTANCE_METERS)),
    };
}

function calculateBudgetScore(apartment, preferences) {
    if (preferences?.saveBudgetPreferences === false ||
        (!Number(preferences?.minBudget) && !Number(preferences?.maxBudget))) {
        return 50;
    }

    // Deliberately do not fall back to apartment.price: it may describe an occupied room.
    const price = getLowestAvailableRoomPrice(apartment);
    if (!Number.isFinite(price)) return 0;

    const min = Math.max(0, Number(preferences.minBudget) || 0);
    const max = Math.max(0, Number(preferences.maxBudget) || 0);

    if ((!min || price >= min) && (!max || price <= max)) return 100;
    if (min && price < min) return clampScore(100 * (price / min));

    // A price one full maximum-budget amount above the range scores zero.
    return max ? clampScore(100 * (1 - (price - max) / max)) : 100;
}

function calculateAvailabilityScore(apartment) {
    const rooms = apartment.rooms ?? [];
    const availableRooms = rooms.filter(isRoomAvailable).length;
    if (apartment.status !== "available" || availableRooms === 0) return 0;
    return rooms.length ? (availableRooms / rooms.length) * 100 : 0;
}

const AMENITY_PREFERENCES = [
    ["ownBathroom", "own_bathroom"],
    ["wifi", "wifi"],
    ["ac", "air_conditioning"],
    ["studyArea", "study area"],
    ["parking", "parking"],
    ["laundryArea", "laundry_area"],
    ["kitchenAccess", "kitchen access"],
    ["furnished", "furnished"],
    ["petFriendly", "pet_friendly"],
];

function calculateAmenitiesScore(apartment, preferences) {
    const requested = AMENITY_PREFERENCES
        .filter(([key]) => preferences?.[key])
        .map(([, amenity]) => amenity);
    if (requested.length === 0) return 50;

    const apartmentAmenities = getNormalizedApartmentAmenities(apartment);
    const matched = requested.filter((amenity) => apartmentAmenities.has(amenity)).length;
    return (matched / requested.length) * 100;
}

function calculateVerificationScore(apartment, verificationMap) {
    const landlordVerified = apartment.landlordVerified === true ||
        (apartment.landlordId && verificationMap?.get(apartment.landlordId) === true);
    const listingVerified = apartment.isVerified === true ||
        apartment.features?.verification?.apartment_verified === true ||
        apartment.features?.isVerified === true;
    // Only explicit listing or landlord verification state is considered.
    return landlordVerified || listingVerified ? 100 : 25;
}

function getListingDate(apartment) {
    for (const value of [apartment.publishedAt, apartment.updatedAt, apartment.createdAt]) {
        const timestamp = new Date(value).getTime();
        if (Number.isFinite(timestamp)) return timestamp;
    }
    return null;
}

function calculateRecencyScore(apartment) {
    const timestamp = getListingDate(apartment);
    if (!timestamp) return 0;
    const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);
    // Deterministic, bounded decay: new is 100; 90+ days is 0.
    return clampScore(100 * (1 - ageDays / 90));
}

function passesHardFilters(apartment, preferences) {
    const minimumBedrooms = preferences?.minBedrooms === "4+"
        ? 4
        : Number(preferences?.minBedrooms);
    if (Number.isFinite(minimumBedrooms) && minimumBedrooms > 0 &&
        Number(apartment.bedrooms) < minimumBedrooms) return false;
    return matchesRoomCapacity(apartment, preferences?.roomCapacity);
}

export function calculateRankingScoreBreakdown(apartment, preferences, context = {}) {
    const { locationScore, distanceMeters } = calculateLocationScore(apartment, preferences);
    const budgetScore = calculateBudgetScore(apartment, preferences);
    const availabilityScore = calculateAvailabilityScore(apartment);
    const amenitiesScore = calculateAmenitiesScore(apartment, preferences);
    const verificationScore = calculateVerificationScore(
        apartment,
        new Map(context.landlordVerifications ?? [])
    );
    const recencyScore = calculateRecencyScore(apartment);
    const finalScore =
        locationScore * RANKING_WEIGHTS.location +
        budgetScore * RANKING_WEIGHTS.budget +
        availabilityScore * RANKING_WEIGHTS.availability +
        amenitiesScore * RANKING_WEIGHTS.amenities +
        verificationScore * RANKING_WEIGHTS.verification +
        recencyScore * RANKING_WEIGHTS.recency;

    return {
        distanceMeters,
        locationScore,
        budgetScore,
        availabilityScore,
        amenitiesScore,
        verificationScore,
        recencyScore,
        finalScore,
    };
}

/** Returns only hard-filter-compatible apartments, ranked deterministically. */
export function rankApartments(apartments = [], preferences = {}, context = {}) {
    const ranked = apartments
        .filter((apartment) => passesHardFilters(apartment, preferences))
        .map((apartment) => {
            const scoreBreakdown = calculateRankingScoreBreakdown(apartment, preferences, context);
            return { ...apartment, rankingScore: scoreBreakdown.finalScore, scoreBreakdown };
        })
        .sort((a, b) =>
            b.rankingScore - a.rankingScore || String(a.id).localeCompare(String(b.id))
        );

    // Temporary diagnostic output for verifying every recommendation score.
    console.debug("Recommended preference coordinates", {
        preferredArea: preferences.preferredArea ?? "",
        preferredLat: preferences.preferredLat ?? null,
        preferredLng: preferences.preferredLng ?? null,
    });
    console.table(ranked.map((apartment) => ({
        apartment: apartment.title,
        preferredArea: preferences.preferredArea ?? "",
        preferredLat: preferences.preferredLat ?? null,
        preferredLng: preferences.preferredLng ?? null,
        apartmentLat: apartment.lat ?? null,
        apartmentLng: apartment.lng ?? null,
        distanceMeters: apartment.scoreBreakdown.distanceMeters,
        locationScore: apartment.scoreBreakdown.locationScore,
        budgetScore: apartment.scoreBreakdown.budgetScore,
        availabilityScore: apartment.scoreBreakdown.availabilityScore,
        amenitiesScore: apartment.scoreBreakdown.amenitiesScore,
        verificationScore: apartment.scoreBreakdown.verificationScore,
        recencyScore: apartment.scoreBreakdown.recencyScore,
        rankingScore: apartment.rankingScore,
    })));

    return ranked;
}

export function getRecommendationExplanation(breakdown) {
    const factors = [
        ["Location", "location", breakdown.locationScore],
        ["Budget fit", "budget", breakdown.budgetScore],
        ["Availability", "availability", breakdown.availabilityScore],
        ["Amenities", "amenities", breakdown.amenitiesScore],
        ["Verification", "verification", breakdown.verificationScore],
        ["Listing recency", "recency", breakdown.recencyScore],
    ]
        .filter(([, , score]) => score > 0)
        .sort((a, b) => RANKING_WEIGHTS[b[1]] - RANKING_WEIGHTS[a[1]])
        .slice(0, 3)
        .map(([label]) => label);
    return `Recommended based on your preferences: ${factors.join(", ") || "available listings"}.`;
}
