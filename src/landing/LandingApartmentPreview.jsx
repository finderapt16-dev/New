import {ArrowRight,Loader2,} from "lucide-react";
import {useEffect,useMemo,useState,} from "react";
import { Link } from "react-router-dom";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { getApartmentImageUrl } from "@/utils/images";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Button } from "@/components/ui/button";
import {fetchApartmentViews,} from "@/services/dashboardSupabaseService";


const PREVIEW_LIMIT = 4;
function getRandomApartments(apartments) {
    const shuffled = [...apartments];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(
            Math.random() * (i + 1)
        );

        [
            shuffled[i],
            shuffled[randomIndex],
        ] = [
            shuffled[randomIndex],
            shuffled[i],
        ];
    }

    return shuffled.slice(0, PREVIEW_LIMIT);
}

function getApartmentPriceLabel(apartment) {
    const prices = (apartment.rooms || [])
        .map((room) => Number(room.price))
        .filter(
            (price) =>
                Number.isFinite(price) &&
                price > 0
        );

    if (prices.length === 0) {
        const fallbackPrice =
            Number(apartment.price);

        if (
            Number.isFinite(fallbackPrice) &&
            fallbackPrice > 0
        ) {
            return `₱${fallbackPrice.toLocaleString(
                "en-PH"
            )} / month`;
        }

        return "Price unavailable";
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
        return `₱${minPrice.toLocaleString(
            "en-PH"
        )} / month`;
    }

    return `₱${minPrice.toLocaleString(
        "en-PH"
    )}–₱${maxPrice.toLocaleString(
        "en-PH"
    )} / month`;
}


/* =========================================================
   VIEW LABEL
========================================================= */

const viewLabel = (count = 0) =>
    `${Number(count).toLocaleString()} ${
        Number(count) === 1
            ? "view"
            : "views"
    }`;


function PreviewCard({
    apartment,
    onApartmentClick,
    viewCount = 0,
}) {
    const location = [
        apartment.address || apartment.location,
        apartment.city,
        apartment.state,
    ]
        .filter(Boolean)
        .map((value) => value.trim())
        .join(", ");

    return (
        <div className="landing-preview-wrapper">
            <Link
                to={`/apartment/${apartment.id}`}
                onClick={onApartmentClick}
                className="landing-preview-card"
            >
                {/* IMAGE */}
                <div className="landing-preview-image-wrap">
                    <ImageWithFallback
                        src={getApartmentImageUrl(apartment)}
                        alt={
                            apartment.title ||
                            "Apartment"
                        }
                        className="landing-preview-image"
                    />

                    {/* AVAILABLE BADGE */}
                    {apartment.status === "available" && (
                        <span className="landing-preview-available">
                            Available
                        </span>
                    )}
                </div>


                {/* BODY */}
                <div className="landing-preview-body">

                    {/* TITLE + VIEWS */}
                    <div className="landing-preview-heading">
                        <h3 className="landing-preview-title">
                            {apartment.title ||
                                "Untitled Apartment"}
                        </h3>
                    </div>


                    {/* LOCATION */}
                    <div className="landing-preview-location">
                        <span className="landing-preview-address">
                            {location ||
                                "La Paz, Iloilo City"}
                        </span>
                    </div>


                    <span className="landing-preview-views">
                            {viewLabel(viewCount)}
                        </span>

                    {/* PRICE */}
                    <p className="landing-preview-price">
                        {getApartmentPriceLabel(
                            apartment
                        )}
                    </p>
                </div>
            </Link>
        </div>
    );
}


/* =========================================================
   SKELETON
========================================================= */

function PreviewSkeleton() {
    return (
        <div className="landing-preview-skeleton">
            <div className="landing-skeleton-image" />

            <div className="landing-skeleton-body">
                <span className="landing-skeleton-title" />

                <div className="landing-skeleton-location" />

                <div className="landing-skeleton-details" />
            </div>
        </div>
    );
}


/* =========================================================
   LANDING APARTMENT PREVIEW
========================================================= */

export function LandingApartmentPreview({
    onBrowseClick,
}) {
    const {
        apartments,
        isLoading,
        error,
    } = useApartmentsContext();


    /* =========================
       VIEW DATA
    ========================= */

    const [
        viewRows,
        setViewRows,
    ] = useState([]);


    useEffect(() => {
        let mounted = true;

        const loadViews = async () => {
            try {
                const views =
                    await fetchApartmentViews();

                if (!mounted) {
                    return;
                }

                setViewRows(
                    Array.isArray(views)
                        ? views
                        : []
                );
            }
            catch (error) {
                console.error(
                    "Unable to load apartment views:",
                    error
                );

                if (mounted) {
                    setViewRows([]);
                }
            }
        };

        void loadViews();

        return () => {
            mounted = false;
        };
    }, []);


    /* =========================
       VIEW COUNT PER APARTMENT
    ========================= */

    const getViewCount = (apartmentId) =>
        viewRows
            .filter(
                (view) =>
                    (
                        view.apartment_id ??
                        view.apartmentId
                    ) === apartmentId
            )
            .reduce(
                (total, view) =>
                    total +
                    Math.max(
                        0,
                        Number(
                            view.view_count
                        ) || 0
                    ),
                0
            );


    /* =========================
       VISIBLE APARTMENTS
    ========================= */

    const publishedApartments =
        useMemo(
            () =>
                apartments.filter(
                    isTenantVisibleApartment
                ),
            [apartments]
        );


    /* =========================
       RANDOM PREVIEW
    ========================= */

    const previewApartments =
        useMemo(
            () =>
                getRandomApartments(
                    publishedApartments
                ),
            [publishedApartments]
        );


    /* =========================
       LOADING
    ========================= */

    if (isLoading) {
        return (
            <section className="landing-listings-section">
                <div className="landing-listings-container">

                    <div className="landing-section-heading">
                        <h2 className="landing-listings-title">
                            Available Apartment Listings
                        </h2>

                        <p className="landing-listings-loading">
                            <Loader2 className="landing-loading-icon" />

                            Loading apartment records...
                        </p>
                    </div>


                    <div className="landing-skeleton-grid">
                        {Array.from({
                            length: PREVIEW_LIMIT,
                        }).map(
                            (_, index) => (
                                <PreviewSkeleton
                                    key={index}
                                />
                            )
                        )}
                    </div>
                </div>
            </section>
        );
    }


    /* =========================
       ERROR
    ========================= */

    if (
        error &&
        publishedApartments.length === 0
    ) {
        return (
            <section className="landing-listings-section">
                <div className="landing-listings-container">

                    <p className="landing-listings-loading">
                        Unable to load apartment listings.
                    </p>

                </div>
            </section>
        );
    }


    /* =========================
       NO APARTMENTS
    ========================= */

    if (
        previewApartments.length === 0
    ) {
        return null;
    }


    /* =========================
       LISTINGS
    ========================= */

    return (
        <section className="landing-listings-section">
            <div className="landing-section-container">

                <section className="landing-listings-heading">

                    <div className="landing-listings-copy">
                        <h2 className="landing-section-title">
                            Available Apartments in La Paz
                        </h2>
                    </div>


                    <Link
                        to="/browse"
                        onClick={onBrowseClick}
                        className="landing-listings-link"
                    >
      
                    </Link>

                </section>


                <div className="landing-listings-grid">

                    {previewApartments.map(
                        (apartment) => (
                            <PreviewCard
                                key={apartment.id}
                                apartment={apartment}
                                onApartmentClick={
                                    onBrowseClick
                                }
                                viewCount={
                                    getViewCount(
                                        apartment.id
                                    )
                                }
                            />
                        )
                    )}

                </div>
            </div>
        </section>
    );
}


/* =========================================================
   LANDING LISTINGS SECTION
========================================================= */

export function LandingListingsSection({
    onBrowseClick,
}) {
    const {
        apartments,
        isLoading,
    } = useApartmentsContext();


    const hasPublishedApartments =
        useMemo(
            () =>
                apartments.some(
                    isTenantVisibleApartment
                ),
            [apartments]
        );


    if (
        isLoading ||
        hasPublishedApartments
    ) {
        return (
            <LandingApartmentPreview
                onBrowseClick={
                    onBrowseClick
                }
            />
        );
    }


    return (
        <LandingListingsPlaceholder
            onBrowseClick={
                onBrowseClick
            }
        />
    );
}


/* =========================================================
   PLACEHOLDER
========================================================= */

export function LandingListingsPlaceholder({
    onBrowseClick,
}) {
    return (
        <section className="landing-placeholder-section">

            <div className="landing-listings-container">

                <div className="landing-section-heading">

                    <h2 className="landing-listings-title">
                        Explore Apartment Listings
                    </h2>

                    <p className="landing-placeholder-description">
                        No published apartments yet.
                        Landlords can submit apartment
                        and permit information for
                        admin review.
                    </p>

                </div>


                <div className="landing-placeholder-grid">

                    {/* APARTMENT PLACEHOLDER */}

                    <article
                        className="landing-placeholder-card"
                        onClick={onBrowseClick}
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter"
                            ) {
                                onBrowseClick?.(
                                    event
                                );
                            }
                        }}
                        role="button"
                        tabIndex={0}
                    >

                        <ImageWithFallback
                            src="https://images.unsplash.com/photo-1654506012740-09321c969dc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGFydG1lbnQlMjBpbnRlcmlvciUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzcyMTg1Njk0fDA&ixlib=rb-4.1.0&q=80&w=1080"
                            alt="Apartment interior example"
                            className="landing-placeholder-image"
                        />

                        <div className="landing-placeholder-overlay" />


                        <div className="landing-placeholder-content">

                            <h3 className="landing-placeholder-title">
                                Apartment information
                            </h3>

                            <p className="landing-placeholder-copy">
                                Photos, amenities,
                                rent, availability,
                                and landlord details
                            </p>

                            <span className="landing-placeholder-link">
                                Browse listings

                                <ArrowRight className="landing-placeholder-arrow" />
                            </span>

                        </div>

                    </article>


                    {/* MAP PLACEHOLDER */}

                    <div
                        className="landing-placeholder-card"
                        onClick={onBrowseClick}
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter"
                            ) {
                                onBrowseClick?.(
                                    event
                                );
                            }
                        }}
                        role="button"
                        tabIndex={0}
                    >

                        <ImageWithFallback
                            src="https://images.unsplash.com/photo-1754298994778-514e0a285479?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9wZXJ0eSUyMG1hcCUyMGxvY2F0aW9uJTIwcGlufGVufDF8fHx8MTc3MjE5MjMzOHww&ixlib=rb-4.1.0&q=80&w=1080"
                            alt="Map location example"
                            className="landing-placeholder-image"
                        />

                        <div className="landing-placeholder-overlay" />


                        <div className="landing-placeholder-content">

                            <h3 className="landing-placeholder-title">
                                GIS map browsing
                            </h3>

                            <p className="landing-placeholder-copy">
                                Compare apartment
                                locations within
                                La Paz before visiting
                            </p>

                            <span className="landing-placeholder-link">
                                Open map view

                                <ArrowRight className="landing-placeholder-arrow" />
                            </span>

                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}