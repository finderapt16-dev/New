import { getNormalizedApartmentAmenities } from "./apartmentAmenities";
import { matchesRoomCapacity } from "./roomCapacity";
import { getLowestAvailableRoomPrice, isRoomAvailable } from "../utils/listingVisibility";
/** Whether the tenant has explicitly saved at least one real personalization signal. */
export function hasMeaningfulPreferences(preferences) {
    if (!preferences?.hasSavedPreferences)
        return false;
    const hasBudget = preferences.saveBudgetPreferences !== false
        && (Number(preferences.maxBudget) > 0 || Number(preferences.minBudget) > 0);
    const hasLocation = preferences.recommendationLocation !== false
        && Boolean(preferences.preferredArea?.trim());
    const hasBedroomPreference = Boolean(preferences.minBedrooms && preferences.minBedrooms !== "any");
    const hasAmenityPreference = Boolean(preferences.petFriendly
        || preferences.parking
        || preferences.furnished
        || preferences.ownBathroom
        || preferences.wifi
        || preferences.ac
        || preferences.studyArea
        || preferences.laundryArea
        || preferences.kitchenAccess);
    const hasCapacityPreference = preferences.roomCapacity === "4+" || Number(preferences.roomCapacity) > 0;
    return hasBudget || hasLocation || hasBedroomPreference || hasCapacityPreference || hasAmenityPreference;
}
export const RATING_PRIOR_COUNT = 5;
export function calculateRatingScore(apartmentId, context) {
    const stats = context?.apartmentRatingStats?.get(apartmentId);
    if (!stats || stats.count <= 0) {
        return { ratingScore: 50, ratingAverage: null, ratingCount: 0, adjustedRating: null };
    }
    const priorAverage = Math.min(5, Math.max(1, context?.platformAverageRating ?? 3));
    const average = Math.min(5, Math.max(1, stats.average));
    const adjustedRating = ((stats.count * average) + (RATING_PRIOR_COUNT * priorAverage)) / (stats.count + RATING_PRIOR_COUNT);
    return {
        ratingScore: Math.round(((adjustedRating - 1) / 4) * 100),
        ratingAverage: average,
        ratingCount: stats.count,
        adjustedRating,
    };
}
// ============================================================================
// LOCATION MATCH SCORING (30% weight)
// ============================================================================
/**
 * Calculate location match score from the tenant's preferred area. La Paz is
 * an eligibility boundary, not a personalized preference signal.
 */
function calculateLocationScore(apartment, preferences) {
    const preferredArea = preferences?.recommendationLocation === false
        ? ""
        : preferences?.preferredArea?.trim();
    if (preferredArea) {
        const query = preferredArea.toLowerCase();
        if (apartment.city.toLowerCase().includes(query) ||
            apartment.address.toLowerCase().includes(query)) {
            return 100;
        }
        else if (apartment.description.toLowerCase().includes(query)) {
            return 50;
        }
        return 0;
    }
    return 50; // Neutral when location was not selected.
}
// ============================================================================
// BUDGET COMPATIBILITY SCORING (25% weight)
// ============================================================================
/**
 * Calculate budget compatibility score
 */
function calculateBudgetScore(apartment, preferences) {
    if (preferences?.saveBudgetPreferences === false || (!preferences?.maxBudget && !preferences?.minBudget)) {
        return 50; // Neutral if no preference
    }
    const price = getLowestAvailableRoomPrice(apartment) ?? apartment.price;
    const minBudget = Number(preferences.minBudget) || 0;
    if (minBudget > 0 && price < minBudget) return Math.max(0, 50 * price / minBudget);
    if (!preferences.maxBudget) return 100;
    const { maxBudget } = preferences;
    // Within budget: highest score
    if (price <= maxBudget) {
        const ratio = price / maxBudget;
        // Apartments at 80-100% of budget get full score
        if (ratio >= 0.8)
            return 100;
        // Cheaper options still get high scores
        return 50 + ratio * 50;
    }
    // Slightly above budget: moderate penalty
    const overage = (price - maxBudget) / maxBudget;
    if (overage <= 0.15) { // Up to 15% over budget
        return 50 - (overage * 100);
    }
    // Significantly above budget: minimal score
    if (overage <= 0.5) { // Up to 50% over budget
        return 20 - (overage * 20);
    }
    // Way over budget: negligible score
    return Math.max(0, 5 - (overage * 5));
}
// ============================================================================
// ROOM AVAILABILITY SCORING (15% weight)
// ============================================================================
/**
 * Calculate availability score based on room status and availability date
 */
function calculateAvailabilityScore(apartment, preferences) {
    let score = 0;
    // Check apartment status
    if (apartment.status === 'available') {
        score += 50;
    }
    else if (apartment.status === 'occupied') {
        score += 10;
    }
    else if (apartment.status === 'maintenance') {
        score += 0;
    }
    // Check room availability
    if (apartment.rooms && apartment.rooms.length > 0) {
        const availableRooms = apartment.rooms.filter(isRoomAvailable).length;
        const totalRooms = apartment.rooms.length;
        const availabilityRatio = availableRooms / totalRooms;
        // More available rooms = higher score
        score += availabilityRatio * 50;
    }
    else {
        score += 0; // Tenant-visible listings require at least one actual room.
    }
    // Availability date bonus (recently available or immediately available)
    const availableDate = new Date(apartment.availableDate);
    const now = new Date();
    const daysUntilAvailable = Math.floor((availableDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilAvailable <= 0) {
        score += 0; // Already available, no bonus needed
    }
    else if (daysUntilAvailable <= 7) {
        score += 10; // Available very soon
    }
    else if (daysUntilAvailable <= 30) {
        score += 5; // Available within a month
    }
    const minimum = preferences?.minBedrooms === "4+" ? 4 : Number(preferences?.minBedrooms);
    if (!matchesRoomCapacity(apartment, preferences?.roomCapacity))
        score *= 0.65;
    if (Number.isFinite(minimum) && minimum > 0 && apartment.bedrooms < minimum)
        score *= 0.65;
    return Math.min(score, 100);
}
// ============================================================================
// AMENITIES MATCH SCORING (10% weight)
// ============================================================================
/**
 * Extract amenities from apartment (normalize from various formats)
 */
/**
 * Calculate amenities match score based on tenant preferences
 */
function calculateAmenitiesScore(apartment, preferences) {
    const preferredAmenities = [];
    if (preferences?.ownBathroom)
        preferredAmenities.push('own_bathroom');
    // Collect preferences
    if (preferences?.wifi)
        preferredAmenities.push('wifi');
    if (preferences?.ac)
        preferredAmenities.push('air_conditioning');
    if (preferences?.studyArea)
        preferredAmenities.push('study area');
    if (preferences?.parking)
        preferredAmenities.push('parking');
    if (preferences?.laundryArea)
        preferredAmenities.push('laundry_area');
    if (preferences?.kitchenAccess)
        preferredAmenities.push('kitchen access');
    if (preferences?.furnished)
        preferredAmenities.push('furnished');
    if (preferences?.petFriendly)
        preferredAmenities.push('pet_friendly');
    if (preferredAmenities.length === 0) {
        return 50; // Neutral if no preferences
    }
    const apartmentAmenities = getNormalizedApartmentAmenities(apartment);
    let matchCount = 0;
    preferredAmenities.forEach(pref => {
        if (apartmentAmenities.has(pref.toLowerCase())) {
            matchCount++;
        }
    });
    const matchRatio = matchCount / preferredAmenities.length;
    return Math.round(matchRatio * 100);
}
// ============================================================================
// PROPERTY VERIFICATION SCORING (10% weight)
// ============================================================================
/**
 * Calculate verification score for apartment and landlord
 */
function calculateVerificationScore(apartment, verificationMap) {
    let score = 0;
    // Landlord verification (primary factor)
    if (apartment.landlordVerified === true || (apartment.landlordId && verificationMap?.get(apartment.landlordId))) {
        score += 60;
    }
    // Apartment verification (check features)
    if (apartment.features && typeof apartment.features === 'object' && !Array.isArray(apartment.features)) {
        const features = apartment.features;
        if (features.verification?.landlord_verified)
            score += 20;
        if (features.verification?.apartment_verified)
            score += 20;
        if (features.isVerified)
            score += 20;
    }
    // Check if apartment status indicates verification
    if (apartment.isPublished) {
        score += 10; // Published apartments have gone through some review
    }
    return Math.min(score, 100);
}
// ============================================================================
// POPULARITY & ENGAGEMENT SCORING (3% weight)
// ============================================================================
/**
 * Calculate popularity score based on current views and favorites.
 */
function calculatePopularityScore(apartment, context) {
    let score = 0;
    // View count (up to 50 views)
    const views = context?.apartmentViewCounts?.get(apartment.id) ?? 0;
    const normalizedViews = Math.min(views / 50, 1);
    score += normalizedViews * 50;
    // Favorite count (up to 20 favorites)
    const favorites = context?.apartmentFavoriteCounts?.get(apartment.id) ?? 0;
    const normalizedFavorites = Math.min(favorites / 20, 1);
    score += normalizedFavorites * 50;
    return Math.min(score, 100);
}
// ============================================================================
// RECENT ACTIVITY SCORING (2% weight)
// ============================================================================
/**
 * Calculate recent activity score for apartments
 */
function calculateActivityScore(apartment) {
    const now = new Date();
    const createdDate = apartment.createdAt ? new Date(apartment.createdAt) : null;
    const availableDate = new Date(apartment.availableDate);
    let score = 0;
    // Recently updated/created listings get boost
    if (createdDate) {
        const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceCreated <= 3) {
            score += 100; // Newest listings
        }
        else if (daysSinceCreated <= 7) {
            score += 80; // Last week
        }
        else if (daysSinceCreated <= 14) {
            score += 60; // Last two weeks
        }
        else if (daysSinceCreated <= 30) {
            score += 40; // Last month
        }
        else if (daysSinceCreated <= 60) {
            score += 20; // Last two months
        }
        else {
            score += 10; // Older listings
        }
    }
    // Recently became available
    const daysSinceAvailable = Math.floor((now.getTime() - availableDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceAvailable <= 3 && daysSinceAvailable >= 0) {
        score = Math.min(score + 30, 100);
    }
    return Math.min(score, 100);
}
// ============================================================================
// MAIN RANKING FUNCTIONS
// ============================================================================
/**
 * Calculate detailed breakdown for an apartment
 */
export function calculateRankingScoreBreakdown(apartment, preferences, context) {
    const verificationMap = new Map(context?.landlordVerifications);
    const locationScore = calculateLocationScore(apartment, preferences);
    const budgetScore = calculateBudgetScore(apartment, preferences);
    const availabilityScore = calculateAvailabilityScore(apartment, preferences);
    const amenitiesScore = calculateAmenitiesScore(apartment, preferences);
    const verificationScore = calculateVerificationScore(apartment, verificationMap);
    const rating = calculateRatingScore(apartment.id, context);
    const popularityScore = calculatePopularityScore(apartment, context);
    const activityScore = calculateActivityScore(apartment);
    // Apply weights: 30%, 25%, 15%, 10%, 10%, 5%, 3%, 2%
    const finalScore = Math.round((locationScore * 0.30) +
        (budgetScore * 0.25) +
        (availabilityScore * 0.15) +
        (amenitiesScore * 0.10) +
        (verificationScore * 0.10) +
        (rating.ratingScore * 0.05) +
        (popularityScore * 0.03) +
        (activityScore * 0.02));
    return {
        locationScore,
        budgetScore,
        availabilityScore,
        amenitiesScore,
        verificationScore,
        ...rating,
        popularityScore,
        activityScore,
        finalScore,
    };
}
/**
 * Main ranking function - returns apartments sorted by relevance
 */
export function rankApartments(apartments, preferences, context) {
    const rankingContext = {
        userPreferences: preferences,
        landlordVerifications: context?.landlordVerifications,
        apartmentViewCounts: context?.apartmentViewCounts,
        apartmentFavoriteCounts: context?.apartmentFavoriteCounts,
        apartmentRatingStats: context?.apartmentRatingStats,
        platformAverageRating: context?.platformAverageRating,
    };
    return apartments
        .map(apt => {
        const scoreBreakdown = calculateRankingScoreBreakdown(apt, preferences, rankingContext);
        return {
            ...apt,
            rankingScore: scoreBreakdown.finalScore,
            scoreBreakdown,
        };
    })
        .sort((a, b) => b.rankingScore - a.rankingScore);
}
/**
 * Get recommendation explanation for UI display
 */
export function getRecommendationExplanation(breakdown) {
    const factors = [
        { label: 'Location', score: breakdown.locationScore, weight: 0.30 },
        { label: 'Budget fit', score: breakdown.budgetScore, weight: 0.25 },
        { label: 'Availability', score: breakdown.availabilityScore, weight: 0.15 },
        { label: 'Amenities', score: breakdown.amenitiesScore, weight: 0.10 },
        { label: 'Verification', score: breakdown.verificationScore, weight: 0.10 },
        { label: breakdown.ratingCount > 0 ? `Tenant rating (${breakdown.ratingAverage?.toFixed(1)}/5)` : 'Tenant rating', score: breakdown.ratingScore, weight: 0.05 },
        { label: 'Popularity', score: breakdown.popularityScore, weight: 0.03 },
        { label: 'Recent activity', score: breakdown.activityScore, weight: 0.02 },
    ]
        .filter(f => f.score > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3);
    const topFactors = factors.map(f => f.label).join(', ');
    return `Recommended based on your preferences, ${topFactors}, and apartment availability.`;
}
