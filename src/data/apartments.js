function utilitiesToFormFlag(utilities) {
    return Array.isArray(utilities) ? utilities.length > 0 : utilities;
}
const EMPTY_FORM_VALUES = {
    title: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    image: '',
    images: '',
    description: '',
    amenities: '',
    availableDate: new Date().toISOString().slice(0, 10),
    petFriendly: false,
    parking: false,
    furnished: false,
    utilities: false,
    lat: '',
    lng: '',
    isPublished: false,
    landlordId: '',
    status: 'available',
};
export const apartments = [];
export const createEmptyApartmentFormValues = () => ({
    ...EMPTY_FORM_VALUES,
});
const toNumber = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
};
const toBoolean = (value) => value === true;
const toString = (value, fallback = '') => {
    if (typeof value === 'string') {
        return value;
    }
    return fallback;
};
const toApartmentStatus = (value) => {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    // Preserve legacy data safely: old reservations are unavailable/occupied.
    if (normalized === 'reserved')
        return 'occupied';
    return normalized === 'occupied' || normalized === 'maintenance' ? normalized : 'available';
};
export const parseStringList = (value) => {
    if (Array.isArray(value)) {
        return value
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};
const getAvailableDate = (row) => {
    const featureDate = row.features && typeof row.features.availableDate === 'string' ? row.features.availableDate : null;
    return toString(row.available_date ?? featureDate ?? row.created_at, new Date().toISOString().slice(0, 10));
};
const getPrimaryImage = (images, fallback = '') => {
    if (images.length > 0) {
        return images[0];
    }
    return fallback;
};
export const apartmentRowToApartment = (row) => {
    const images = row.apartment_images
        ? row.apartment_images
            .slice()
            .sort((left, right) => {
            const leftPrimary = left.is_primary === true ? 1 : 0;
            const rightPrimary = right.is_primary === true ? 1 : 0;
            if (leftPrimary !== rightPrimary) {
                return rightPrimary - leftPrimary;
            }
            return (left.sort_order ?? 0) - (right.sort_order ?? 0);
        })
            .map((image) => toString(image.url))
            .filter(Boolean)
        : [];
    const rooms = row.apartment_rooms?.map((room) => ({
        id: room.id ?? undefined,
        name: toString(room.room_name ?? room.name ?? room.room_type),
        type: toString(room.type ?? room.room_type),
        price: toNumber(room.rent),
        sqft: toNumber(room.sqft),
        maxOccupants: toNumber(room.max_occupants, 1),
        status: toApartmentStatus(room.status ?? (room.is_occupied ? 'occupied' : 'available')),
        // Keep the persisted occupancy flag independent from the room status. Tenant
        // visibility requires both `status = available` and `is_occupied = false`;
        // deriving one from the other can make an inconsistent/transitioning room
        // appear available on the client even though the database correctly hides it.
        isOccupied: room.is_occupied === true,
        hasPrivateBath: toBoolean(room.has_private_bath),
        bathroomType: toString(room.bathroom_type),
        sharedBathLocation: toString(room.shared_bath_location),
        hasAC: toBoolean(room.has_ac),
        description: toString(room.description),
        images: parseStringList(room.images ?? room.image_url),
        createdAt: room.created_at ?? undefined,
    }));
    const roomImages = rooms?.flatMap((room) => room.images ?? []) ?? [];
    const displayImages = images.length > 0 ? images : roomImages;
    const primaryImage = getPrimaryImage(displayImages);
    return {
        id: row.id ?? '',
        title: toString(row.title),
        price: toNumber(row.price),
        bedrooms: toNumber(row.bedrooms),
        bathrooms: toNumber(row.bathrooms),
        sqft: toNumber(row.sqft),
        address: toString(row.address),
        city: toString(row.city),
        state: toString(row.state),
        zip: toString(row.zip),
        image: primaryImage,
        images: displayImages.length > 0 ? displayImages : primaryImage ? [primaryImage] : [],
        description: toString(row.description),
        amenities: parseStringList(row.amenities),
        availableDate: getAvailableDate(row),
        petFriendly: toBoolean(row.pet_friendly),
        parking: toBoolean(row.parking),
        furnished: toBoolean(row.furnished),
        utilities: row.utilities ?? [],
        lat: toNumber(row.lat),
        lng: toNumber(row.lng),
        landlordId: row.landlord_id ?? undefined,
        isPublished: row.is_published ?? undefined,
        approvalStatus: row.approval_status === 'approved' || row.approval_status === 'rejected' ? row.approval_status : 'pending',
        publishedAt: row.published_at ?? undefined,
        isArchived: row.is_archived === true,
        deletedAt: row.deleted_at ?? undefined,
        status: toApartmentStatus(row.status),
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
        propertyType: row.features && typeof row.features.propertyType === 'string' ? row.features.propertyType : undefined,
        features: row.features ?? undefined,
        rooms,
    };
};
export const apartmentFormValuesFromApartment = (apartment) => {
    if (!apartment) {
        return createEmptyApartmentFormValues();
    }
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
};
export const apartmentFormValuesToInsertRow = (values, landlordId) => {
    const resolvedLandlordId = (landlordId ?? values.landlordId ?? '').trim();
    if (!resolvedLandlordId) {
        throw new Error('Landlord ID is required to create an apartment.');
    }
    const customFeatures = (values.customFeatures ?? [])
        .map((feature) => feature.trim())
        .filter(Boolean);
    const verification = Object.fromEntries(Object.entries(values.verification ?? {}).filter(([, value]) => value.trim().length > 0));
    const address = values.address.trim();
    const lat = toNumber(values.lat, Number.NaN);
    const lng = toNumber(values.lng, Number.NaN);
    const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
    if (hasCoordinates && !address) {
        throw new Error('Complete address is required when saving a map location.');
    }
    return {
        title: values.title.trim(),
        price: toNumber(values.price),
        bedrooms: toNumber(values.bedrooms),
        bathrooms: toNumber(values.bathrooms),
        sqft: toNumber(values.sqft),
        address,
        city: values.city.trim(),
        state: values.state.trim(),
        zip: values.zip.trim(),
        description: values.description.trim(),
        amenities: parseStringList(values.amenities),
        pet_friendly: values.petFriendly,
        parking: values.parking,
        furnished: values.furnished,
        utilities: values.utilityItems?.length
            ? values.utilityItems.map((item) => item.trim()).filter(Boolean)
            : values.utilities
                ? ['Utilities Included']
                : [],
        lat: toNumber(values.lat),
        lng: toNumber(values.lng),
        landlord_id: resolvedLandlordId,
        // Every new property enters the administrator approval queue. Publishing
        // is performed through fn_set_apartment_publication after approval.
        is_published: false,
        status: values.status ?? 'available',
        features: {
            availableDate: values.availableDate,
            customFeatures,
            verification,
        },
    };
};
export const apartmentFormValuesToUpdateRow = (values) => {
    const customFeatures = (values.customFeatures ?? []).map((feature) => feature.trim()).filter(Boolean);
    const verification = Object.fromEntries(Object.entries(values.verification ?? {}).filter(([, value]) => value.trim().length > 0));
    const address = values.address.trim();
    const lat = toNumber(values.lat, Number.NaN);
    const lng = toNumber(values.lng, Number.NaN);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !address)
        throw new Error('Complete address is required when saving a map location.');
    return {
        title: values.title.trim(),
        sqft: toNumber(values.sqft),
        address,
        city: values.city.trim(),
        state: values.state.trim(),
        zip: values.zip.trim(),
        description: values.description.trim(),
        amenities: parseStringList(values.amenities),
        pet_friendly: values.petFriendly,
        parking: values.parking,
        furnished: values.furnished,
        utilities: values.utilityItems?.length ? values.utilityItems.map((item) => item.trim()).filter(Boolean) : values.utilities ? ['Utilities Included'] : [],
        lat: toNumber(values.lat),
        lng: toNumber(values.lng),
        features: { ...values.featureMetadata, availableDate: values.availableDate, customFeatures, verification },
    };
};
export { createApartment, createApartmentRoom, deleteApartment, deleteApartmentRoom, fetchApartmentDetailAccessState, fetchApartmentInspectionDetails, fetchApartmentRooms, fetchApartmentWithImages, fetchApartments, fetchApartmentsForLandlord, getApartmentById, getCurrentSessionUser, getCurrentUserId, getFavoriteApartmentIds, getLandlordVerification, insertApartmentImages, insertApartmentRooms, isApartmentFavorite, listFavoriteApartments, persistApartmentImages, recordApartmentView, replaceApartmentImages, reportApartment, resolveAppUserId, toggleFavorite, updateApartment, updateApartmentPublication, updateApartmentRoom, updateApartmentRoomStatus, updateApartmentStatus, uploadApartmentImage, uploadApartmentRoomImage } from '../services/apartmentsService';
