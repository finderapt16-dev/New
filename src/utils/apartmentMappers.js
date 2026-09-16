function utilitiesToFormFlag(utilities) {
    return Array.isArray(utilities) ? utilities.length > 0 : utilities;
}
export function apartmentToFormValues(apartment) {
    const customFeatures = Array.isArray(apartment.features)
        ? apartment.features.filter((item) => typeof item === 'string')
        : apartment.features && Array.isArray(apartment.features.customFeatures)
            ? apartment.features.customFeatures.filter((item) => typeof item === 'string')
            : [];
    const verification = apartment.features && !Array.isArray(apartment.features)
        && apartment.features.verification && typeof apartment.features.verification === 'object'
        && !Array.isArray(apartment.features.verification)
        ? Object.fromEntries(Object.entries(apartment.features.verification).filter((entry) => typeof entry[1] === 'string'))
        : {};
    return {
        title: apartment.title,
        price: String(apartment.price),
        bedrooms: String(apartment.bedrooms),
        bathrooms: String(apartment.bathrooms),
        sqft: String(apartment.sqft),
        address: apartment.address,
        city: apartment.city,
        state: apartment.state,
        zip: apartment.zip,
        image: apartment.image,
        images: apartment.images.join(', '),
        description: apartment.description,
        amenities: apartment.amenities.join(', '),
        availableDate: apartment.availableDate,
        petFriendly: apartment.petFriendly,
        parking: apartment.parking,
        furnished: apartment.furnished,
        utilities: utilitiesToFormFlag(apartment.utilities),
        utilityItems: Array.isArray(apartment.utilities) ? apartment.utilities : [],
        customFeatures,
        verification,
        lat: String(apartment.lat),
        lng: String(apartment.lng),
        isPublished: apartment.isPublished ?? true,
        landlordId: apartment.landlordId ?? '',
        status: apartment.status ?? 'available',
        rooms: apartment.rooms ?? [],
    };
}
