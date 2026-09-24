export class GeocodingError extends Error {
    reason;

    constructor(message, reason) {
        super(message);
        this.name = "GeocodingError";
        this.reason = reason;
    }
}


/* =========================================================
   LA PAZ BOUNDS
========================================================= */

const BOUNDS = {
    south: 10.68,
    north: 10.75,
    west: 122.535,
    east: 122.595,
};

const OUTSIDE_SCOPE_MESSAGE =
    "This location is outside AptFindr's supported area. Search within La Paz, Iloilo City.";


/* =========================================================
   LA PAZ BARANGAY REFERENCE POINTS

   referenceType:
   - "barangay-hall" = exact/near-exact government point found
   - "barangay-government" = barangay council / multipurpose government point
   - "barangay-center" = representative barangay coordinate

   These are used for Preferred Area ranking.

   IMPORTANT:
   These coordinates do NOT represent the full barangay boundary.
   They are reference points used to calculate proximity.
========================================================= */

export const LA_PAZ_AREA_FALLBACKS = [
    {
        canonicalName: "Aguinaldo",
        aliases: [
            "aguinaldo",
            "brgy aguinaldo",
            "barangay aguinaldo",
        ],
        lat: 10.7067,
        lng: 122.5721,
        label: "Aguinaldo, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Baldoza",
        aliases: [
            "baldoza",
            "brgy baldoza",
            "barangay baldoza",
        ],
        lat: 10.7126,
        lng: 122.5787,
        label: "Baldoza, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Bantud",
        aliases: [
            "bantud",
            "brgy bantud",
            "barangay bantud",
        ],
        lat: 10.7082,
        lng: 122.5648,
        label: "Bantud, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Banuyao",
        aliases: [
            "banuyao",
            "brgy banuyao",
            "barangay banuyao",
        ],
        lat: 10.7293,
        lng: 122.5857,
        label: "Banuyao, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Burgos-Mabini-Plaza",
        aliases: [
            "burgos mabini plaza",
            "burgos-mabini-plaza",
            "burgos mabini",
            "brgy burgos mabini plaza",
            "barangay burgos mabini plaza",
        ],
        lat: 10.7118,
        lng: 122.5695,
        label: "Burgos-Mabini-Plaza, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Caingin",
        aliases: [
            "caingin",
            "caing-in",
            "brgy caingin",
            "barangay caingin",
        ],
        lat: 10.7176,
        lng: 122.5748,
        label: "Caingin, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Divinagracia",
        aliases: [
            "divinagracia",
            "brgy divinagracia",
            "barangay divinagracia",
        ],
        lat: 10.7098,
        lng: 122.5718,
        label: "Divinagracia, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Gustilo",
        aliases: [
            "gustilo",
            "brgy gustilo",
            "barangay gustilo",
        ],
        lat: 10.71616,
        lng: 122.57194,
        label: "Gustilo Barangay Hall, La Paz, Iloilo City",
        referenceType: "barangay-hall",
    },

    {
        canonicalName: "Hinactacan",
        aliases: [
            "hinactacan",
            "hinaktacan",
            "hinaktakan",
            "brgy hinactacan",
            "barangay hinactacan",
        ],
        lat: 10.7367,
        lng: 122.5898,
        label: "Hinactacan, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Ingore",
        aliases: [
            "ingore",
            "brgy ingore",
            "barangay ingore",
        ],
        lat: 10.7137,
        lng: 122.5862,
        label: "Ingore, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Jereos",
        aliases: [
            "jereos",
            "brgy jereos",
            "barangay jereos",
        ],
        lat: 10.71905,
        lng: 122.56630,
        label: "Jereos Barangay Hall, La Paz, Iloilo City",
        referenceType: "barangay-hall",
    },

    {
        canonicalName: "Laguda",
        aliases: [
            "laguda",
            "brgy laguda",
            "barangay laguda",
        ],
        lat: 10.7080,
        lng: 122.5674,
        label: "Laguda, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Lopez Jaena Norte",
        aliases: [
            "lopez jaena norte",
            "lopez-jaena norte",
            "brgy lopez jaena norte",
            "barangay lopez jaena norte",
        ],
        lat: 10.7138,
        lng: 122.5732,
        label: "Lopez Jaena Norte, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Lopez Jaena Sur",
        aliases: [
            "lopez jaena sur",
            "lopez-jaena sur",
            "brgy lopez jaena sur",
            "barangay lopez jaena sur",
        ],
        lat: 10.7098,
        lng: 122.5757,
        label: "Lopez Jaena Sur, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Luna",
        aliases: [
            "luna",
            "luna la paz",
            "luna lapaz",
            "brgy luna",
            "barangay luna",
        ],
        lat: 10.7072,
        lng: 122.5659,
        label: "Luna, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Macarthur",
        aliases: [
            "macarthur",
            "mac arthur",
            "macarthur la paz",
            "brgy macarthur",
            "barangay macarthur",
        ],
        lat: 10.7090,
        lng: 122.5702,
        label: "Macarthur, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Magdalo",
        aliases: [
            "magdalo",
            "brgy magdalo",
            "barangay magdalo",
            "magdalo la paz",
        ],
        lat: 10.7139,
        lng: 122.5668,
        label: "Magdalo, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Magsaysay Village",
        aliases: [
            "magsaysay village",
            "magsaysay",
            "brgy magsaysay village",
            "barangay magsaysay village",
        ],
        lat: 10.70986,
        lng: 122.56213,
        label: "Magsaysay Village Barangay Council, La Paz, Iloilo City",
        referenceType: "barangay-government",
    },

    {
        canonicalName: "Nabitasan",
        aliases: [
            "nabitasan",
            "brgy nabitasan",
            "barangay nabitasan",
        ],
        lat: 10.7050,
        lng: 122.5631,
        label: "Nabitasan, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Railway",
        aliases: [
            "railway",
            "brgy railway",
            "barangay railway",
            "railway la paz",
        ],
        lat: 10.70990,
        lng: 122.56797,
        label: "Railway Barangay Hall, La Paz, Iloilo City",
        referenceType: "barangay-hall",
    },

    {
        canonicalName: "Rizal",
        aliases: [
            "rizal",
            "rizal la paz",
            "rizal lapaz",
            "brgy rizal",
            "barangay rizal",
        ],
        lat: 10.70238,
        lng: 122.57170,
        label: "Rizal Barangay Hall, La Paz, Iloilo City",
        referenceType: "barangay-hall",
    },

    {
        canonicalName: "San Isidro",
        aliases: [
            "san isidro",
            "san isidro la paz",
            "san isidro lapaz",
            "brgy san isidro",
            "barangay san isidro",
        ],
        lat: 10.7227,
        lng: 122.5801,
        label: "San Isidro, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "San Nicolas",
        aliases: [
            "san nicolas",
            "san nicolas la paz",
            "san nicolas lapaz",
            "brgy san nicolas",
            "barangay san nicolas",
        ],
        lat: 10.7117285,
        lng: 122.5661832,
        label: "San Nicolas Multi-Purpose Hall, La Paz, Iloilo City",
        referenceType: "barangay-government",
    },

    {
        canonicalName: "Tabuc Suba",
        aliases: [
            "tabuc suba",
            "tabuc suba la paz",
            "tabuc suba lapaz",
            "brgy tabuc suba",
            "barangay tabuc suba",
        ],
        lat: 10.7245,
        lng: 122.5726,
        label: "Tabuc Suba, La Paz, Iloilo City",
        referenceType: "barangay-center",
    },

    {
        canonicalName: "Ticud",
        aliases: [
            "ticud",
            "ticud la paz",
            "ticud lapaz",
            "brgy ticud",
            "barangay ticud",
        ],
        lat: 10.71745,
        lng: 122.57844,
        label: "Ticud Barangay Hall, La Paz, Iloilo City",
        referenceType: "barangay-hall",
    },
];


/* =========================================================
   LANDMARKS

   These are used mainly for nearby searches such as:

   "near ISAT U"
   "apartments near WVSU"
   "near Gaisano La Paz"
========================================================= */

const LA_PAZ_LANDMARKS = [
    {
        canonicalName: "Gaisano La Paz",
        aliases: [
            "gaisano",
            "gaisano lapaz",
            "gaisano la paz",
            "gaisano city lapaz",
            "gaisano city la paz",
        ],
        lat: 10.70703,
        lng: 122.56659,
        label:
            "Gaisano La Paz, Luna Street, La Paz, Iloilo City",
    },

    {
        canonicalName: "La Paz Plaza",
        aliases: [
            "lapaz plaza",
            "la paz plaza",
            "plaza lapaz",
            "plaza la paz",
        ],
        lat: 10.711825,
        lng: 122.570903,
        label:
            "La Paz Plaza, La Paz, Iloilo City",
    },

    {
        canonicalName: "La Paz Public Market",
        aliases: [
            "lapaz public market",
            "la paz public market",
            "lapaz market",
            "la paz market",
        ],
        lat: 10.70882,
        lng: 122.568154,
        label:
            "La Paz Public Market, La Paz, Iloilo City",
    },

    {
        canonicalName: "ISAT U",
        aliases: [
            "isat",
            "isat u",
            "isat-u",
            "iloilo science and technology university",
        ],
        lat: 10.7153,
        lng: 122.5659,
        label:
            "ISAT U Main Campus, La Paz, Iloilo City",
    },

    {
        canonicalName: "Iloilo Mission Hospital",
        aliases: [
            "iloilo mission hospital",
            "mission hospital",
            "cpu imh",
            "cpu-imh",
        ],
        lat: 10.71423,
        lng: 122.56019,
        label:
            "Iloilo Mission Hospital, Iloilo City",
    },

    {
        canonicalName:
            "West Visayas State University",

        aliases: [
            "west visayas state university",
            "wvsu",
            "west visayas",
            "west visayas university",
        ],

        lat: 10.71431,
        lng: 122.562089,

        label:
            "West Visayas State University, La Paz, Iloilo City",
    },

    {
        canonicalName:
            "St. Clement's Church",

        aliases: [
            "st clements church",
            "st clement's church",
            "saint clements church",
            "saint clement's church",
            "st clements",
            "st clement",
        ],

        lat: 10.709997,
        lng: 122.565041,

        label:
            "St. Clement's Church, La Paz, Iloilo City",
    },
];


/* =========================================================
   KNOWN OUTSIDE-SCOPE LOCATIONS
========================================================= */

const OUTSIDE_SCOPE_ALIASES = [
    "jaro plaza",
    "sm city",
    "sm city iloilo",
    "festive walk",
    "molo plaza",
    "oton",
    "pavia",
];


/* =========================================================
   NORMALIZATION
========================================================= */

const normalizePlaceName = (value = "") =>
    String(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[’']/g, "")
        .replace(
            /\bla[\s-]*paz\b/g,
            "lapaz"
        )
        .replace(
            /\bbarangay\b/g,
            ""
        )
        .replace(
            /\bbrgy\.?\b/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .trim()
        .replace(
            /\s+/g,
            " "
        );


/* =========================================================
   FIND BARANGAY
========================================================= */

const findAreaFallback = (target) => {
    const normalized =
        normalizePlaceName(target);

    return LA_PAZ_AREA_FALLBACKS.find(
        (area) =>
            [
                area.canonicalName,
                ...area.aliases,
            ].some(
                (alias) =>
                    normalizePlaceName(
                        alias
                    ) === normalized
            )
    );
};


/* =========================================================
   FIND LANDMARK
========================================================= */

const findLandmark = (target) => {
    const normalized =
        normalizePlaceName(target);

    return LA_PAZ_LANDMARKS.find(
        (landmark) =>
            [
                landmark.canonicalName,
                ...landmark.aliases,
            ].some(
                (alias) =>
                    normalizePlaceName(
                        alias
                    ) === normalized
            )
    );
};


/* =========================================================
   PREFERRED AREA SUGGESTIONS
========================================================= */

export function getLaPazAreaSuggestions(
    value,
    limit = 25
) {
    const normalized =
        normalizePlaceName(value);

    if (
        normalized.length < 1
    ) {
        return LA_PAZ_AREA_FALLBACKS
            .slice(0, limit)
            .map(
                (area) =>
                    area.canonicalName
            );
    }

    return LA_PAZ_AREA_FALLBACKS
        .filter(
            (area) =>
                [
                    area.canonicalName,
                    ...area.aliases,
                ].some(
                    (alias) =>
                        normalizePlaceName(
                            alias
                        ).includes(
                            normalized
                        )
                )
        )
        .slice(
            0,
            limit
        )
        .map(
            (area) =>
                area.canonicalName
        );
}


/* =========================================================
   LANDMARK SUGGESTIONS
========================================================= */

export function getLaPazLandmarkSuggestions(
    value,
    limit = 6
) {
    const cleaned =
        String(value || "")
            .replace(
                /^(?:apartments?\s+)?(?:near(?:est)?(?:\s+to)?\s+)?/i,
                ""
            )
            .replace(
                /\s+near$/i,
                ""
            );

    const normalized =
        normalizePlaceName(
            cleaned
        );

    if (
        normalized.length < 2
    ) {
        return [];
    }

    return LA_PAZ_LANDMARKS
        .filter(
            (landmark) =>
                [
                    landmark.canonicalName,
                    ...landmark.aliases,
                ].some(
                    (alias) =>
                        normalizePlaceName(
                            alias
                        ).includes(
                            normalized
                        )
                )
        )
        .slice(
            0,
            limit
        )
        .map(
            (landmark) =>
                landmark.canonicalName
        );
}


/* =========================================================
   CACHE
========================================================= */

const cache =
    new Map();

const reverseCache =
    new Map();


/* =========================================================
   CHECK IF COORDINATE IS INSIDE SUPPORTED BOUNDS
========================================================= */

const inside = ({
    lat,
    lng,
}) =>
    lat >= BOUNDS.south &&
    lat <= BOUNDS.north &&
    lng >= BOUNDS.west &&
    lng <= BOUNDS.east;


/* =========================================================
   NOMINATIM LOOKUP
========================================================= */

async function lookup(
    query,
    bounded,
    signal
) {
    const params =
        new URLSearchParams({
            q: query,
            format: "jsonv2",
            limit: "5",
            countrycodes: "ph",
            addressdetails: "1",
        });

    if (
        bounded
    ) {
        params.set(
            "viewbox",
            `${BOUNDS.west},${BOUNDS.north},${BOUNDS.east},${BOUNDS.south}`
        );

        params.set(
            "bounded",
            "1"
        );
    }

    const response =
        await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            {
                signal,

                headers: {
                    Accept:
                        "application/json",
                },
            }
        );

    if (
        !response.ok
    ) {
        throw new GeocodingError(
            "Location search is temporarily unavailable.",
            "network"
        );
    }

    const rows =
        await response.json();

    return rows
        .map(
            (row) => ({
                lat:
                    Number(
                        row.lat
                    ),

                lng:
                    Number(
                        row.lon
                    ),

                label:
                    row.display_name,
            })
        )
        .filter(
            (row) =>
                Number.isFinite(
                    row.lat
                ) &&
                Number.isFinite(
                    row.lng
                )
        );
}


/* =========================================================
   GEOCODE WITHIN LA PAZ
========================================================= */

export async function geocodeLocationWithinLaPaz(
    target,
    signal
) {
    const cleanTarget =
        String(
            target || ""
        ).trim();

    if (
        !cleanTarget
    ) {
        throw new GeocodingError(
            "Please select or enter a location.",
            "not-found"
        );
    }

    const key =
        cleanTarget
            .toLowerCase();

    const cached =
        cache.get(
            key
        );

    if (
        cached
    ) {
        return cached;
    }

    try {
        const normalizedTarget =
            normalizePlaceName(
                cleanTarget
            );


        /* =========================
           OUTSIDE SCOPE
        ========================= */

        if (
            OUTSIDE_SCOPE_ALIASES.some(
                (alias) =>
                    normalizedTarget ===
                    normalizePlaceName(
                        alias
                    )
            )
        ) {
            throw new GeocodingError(
                OUTSIDE_SCOPE_MESSAGE,
                "outside-scope"
            );
        }


        /* =========================
           BARANGAY FALLBACK

           This happens BEFORE
           Nominatim.

           Example:
           Magdalo -> immediately
           returns its reference point.
        ========================= */

        const area =
            findAreaFallback(
                cleanTarget
            );

        if (
            area
        ) {
            const result = {
                lat:
                    area.lat,

                lng:
                    area.lng,

                label:
                    area.label,

                canonicalName:
                    area.canonicalName,

                referenceType:
                    area.referenceType,

                source:
                    "la-paz-area-fallback",
            };

            if (
                cache.size >= 100
            ) {
                cache.delete(
                    cache
                        .keys()
                        .next()
                        .value
                );
            }

            cache.set(
                key,
                result
            );

            return result;
        }


        /* =========================
           LANDMARK FALLBACK
        ========================= */

        const landmark =
            findLandmark(
                cleanTarget
            );

        if (
            landmark
        ) {
            const result = {
                lat:
                    landmark.lat,

                lng:
                    landmark.lng,

                label:
                    landmark.label,

                canonicalName:
                    landmark.canonicalName,

                referenceType:
                    "landmark",

                source:
                    "la-paz-landmark",
            };

            if (
                cache.size >= 100
            ) {
                cache.delete(
                    cache
                        .keys()
                        .next()
                        .value
                );
            }

            cache.set(
                key,
                result
            );

            return result;
        }


        /* =========================
           NOMINATIM SEARCH
        ========================= */

        const scopedQuery =
            /la\s*paz/i.test(
                cleanTarget
            )
                ? cleanTarget
                : `${cleanTarget}, La Paz, Iloilo City`;


        const candidates =
            await lookup(
                scopedQuery,
                true,
                signal
            );


        const match =
            candidates.find(
                (candidate) =>
                    inside(
                        candidate
                    ) &&
                    /\b(?:la paz|lapaz)\b/i.test(
                        candidate.label
                    )
            );


        if (
            match
        ) {
            if (
                cache.size >= 100
            ) {
                cache.delete(
                    cache
                        .keys()
                        .next()
                        .value
                );
            }

            cache.set(
                key,
                match
            );

            return match;
        }


        /* =========================
           BROADER CHECK

           Used mainly to determine
           whether result is outside
           La Paz.
        ========================= */

        const broadResults =
            await lookup(
                `${cleanTarget}, Philippines`,
                false,
                signal
            );

        const broad =
            broadResults[0];


        if (
            broad &&
            (
                !inside(
                    broad
                ) ||
                !/\b(?:la paz|lapaz)\b/i.test(
                    broad.label
                )
            )
        ) {
            throw new GeocodingError(
                OUTSIDE_SCOPE_MESSAGE,
                "outside-scope"
            );
        }


        throw new GeocodingError(
            "We couldn't find that location. Try a more specific La Paz landmark or street.",
            "not-found"
        );
    }

    catch (
        error
    ) {
        if (
            error instanceof
                DOMException &&
            error.name ===
                "AbortError"
        ) {
            throw error;
        }

        if (
            error instanceof
            GeocodingError
        ) {
            throw error;
        }

        throw new GeocodingError(
            "Location search is temporarily unavailable.",
            "network"
        );
    }
}


/* =========================================================
   REVERSE GEOCODING
========================================================= */

export async function reverseGeocodeWithinLaPaz(
    lat,
    lng,
    signal
) {
    const point = {
        lat,
        lng,
        label: "",
    };


    if (
        !Number.isFinite(
            lat
        ) ||
        !Number.isFinite(
            lng
        ) ||
        !inside(
            point
        )
    ) {
        throw new GeocodingError(
            "That location is outside the supported La Paz area.",
            "outside-scope"
        );
    }


    const key =
        `${lat.toFixed(
            5
        )},${lng.toFixed(
            5
        )}`;


    const cached =
        reverseCache.get(
            key
        );


    if (
        cached
    ) {
        return cached;
    }


    try {
        const params =
            new URLSearchParams({
                lat:
                    String(
                        lat
                    ),

                lon:
                    String(
                        lng
                    ),

                format:
                    "jsonv2",

                addressdetails:
                    "1",

                zoom:
                    "18",
            });


        const response =
            await fetch(
                `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
                {
                    signal,

                    headers: {
                        Accept:
                            "application/json",
                    },
                }
            );


        if (
            !response.ok
        ) {
            throw new GeocodingError(
                "Location lookup is temporarily unavailable.",
                "network"
            );
        }


        const row =
            await response.json();


        const label =
            String(
                row.display_name ??
                ""
            ).trim();


        if (
            !label
        ) {
            throw new GeocodingError(
                "No address was found for that map point.",
                "not-found"
            );
        }


        const result = {
            lat,
            lng,
            label,
        };


        if (
            reverseCache.size >=
            100
        ) {
            reverseCache.delete(
                reverseCache
                    .keys()
                    .next()
                    .value
            );
        }


        reverseCache.set(
            key,
            result
        );


        return result;
    }

    catch (
        error
    ) {
        if (
            error instanceof
                DOMException &&
            error.name ===
                "AbortError"
        ) {
            throw error;
        }


        if (
            error instanceof
            GeocodingError
        ) {
            throw error;
        }


        throw new GeocodingError(
            "Location lookup is temporarily unavailable.",
            "network"
        );
    }
}


/* =========================================================
   OPTIONAL HELPERS
========================================================= */

export function getLaPazAreaByName(
    name
) {
    return (
        findAreaFallback(
            name
        ) ?? null
    );
}


export function getLaPazAreas() {
    return LA_PAZ_AREA_FALLBACKS.map(
        ({
            canonicalName,
            lat,
            lng,
            label,
            referenceType,
        }) => ({
            name:
                canonicalName,

            lat,

            lng,

            label,

            referenceType,
        })
    );
}