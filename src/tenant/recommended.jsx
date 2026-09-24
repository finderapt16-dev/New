import { isTenantRole } from "@/services/authService";

import {
    hasMeaningfulPreferences,
    rankApartments,
} from "@/tenant/rankingEngine";


/**
 * Builds the tenant preference object used by the ranking engine.
 */
function buildRankingPreferences(
    savedPreferences
) {
    return {
        minBudget:
            savedPreferences.minBudget,

        minBedrooms:
            savedPreferences.minBedrooms,

        ownBathroom:
            savedPreferences.ownBathroom,

        hasSavedPreferences:
            savedPreferences.hasSavedPreferences,

        maxBudget:
            savedPreferences.saveBudgetPreferences
                ? savedPreferences.maxBudget ||
                  undefined
                : undefined,

        preferredArea:
            savedPreferences.recommendationLocation
                ? savedPreferences.preferredArea ||
                  undefined
                : undefined,

        preferredLat:
            savedPreferences.preferredLat,

        preferredLng:
            savedPreferences.preferredLng,

        roomCapacity:
            savedPreferences.roomCapacity,

        petFriendly:
            savedPreferences.petFriendly,

        parking:
            savedPreferences.parking,

        furnished:
            savedPreferences.furnished,

        wifi:
            savedPreferences.wifi,

        ac:
            savedPreferences.ac,

        laundryArea:
            savedPreferences.laundryArea,

        recommendationLocation:
            savedPreferences.recommendationLocation,

        saveBudgetPreferences:
            savedPreferences.saveBudgetPreferences,
    };
}


/**
 * Returns the apartment list sorted by the weighted
 * ranking algorithm.
 *
 * Apartments.jsx is responsible for general browsing,
 * searching, nearby search, and UI.
 *
 * Recommended.jsx is responsible only for preparing
 * the data needed by rankingEngine.js for Recommended.
 */
export function getRecommendedApartments({
    apartments = [],
    savedPreferences,
    userRole,
}) {
    if (
        !isTenantRole(
            userRole
        )
    ) {
        return [];
    }

    if (
        !savedPreferences
    ) {
        return [];
    }

    const preferences =
        buildRankingPreferences(
            savedPreferences
        );

    if (
        !hasMeaningfulPreferences(
            preferences
        )
    ) {
        return [];
    }

    return rankApartments(
        apartments,
        preferences
    );
}
