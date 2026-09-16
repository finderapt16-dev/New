import { supabase } from "@/services/supabaseClient";
import { safeRandomId } from "../utils/safeRandomId";
export async function fetchApartmentRatings(apartmentId) {
    let query = supabase.from("apartment_ratings").select("id, apartment_id, tenant_id, rating, created_at, updated_at");
    if (apartmentId)
        query = query.eq("apartment_id", apartmentId);
    const { data, error } = await query;
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
export async function fetchRatingsForApartments(apartmentIds) {
    if (apartmentIds.length === 0)
        return [];
    const { data, error } = await supabase
        .from("apartment_ratings")
        .select("id, apartment_id, tenant_id, rating, created_at, updated_at")
        .in("apartment_id", apartmentIds);
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
export function summarizeApartmentRatings(ratings) {
    const totals = new Map();
    let platformTotal = 0;
    let platformCount = 0;
    ratings.forEach(({ apartment_id: apartmentId, rating }) => {
        const numericRating = Number(rating);
        if (!apartmentId || !Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5)
            return;
        const current = totals.get(apartmentId) ?? { total: 0, count: 0 };
        totals.set(apartmentId, { total: current.total + numericRating, count: current.count + 1 });
        platformTotal += numericRating;
        platformCount += 1;
    });
    return {
        byApartment: new Map([...totals].map(([apartmentId, value]) => [apartmentId, {
                average: value.total / value.count,
                count: value.count,
            }])),
        // Three stars maps to the neutral 50/100 contribution when the platform has no ratings yet.
        platformAverage: platformCount > 0 ? platformTotal / platformCount : 3,
    };
}
export function subscribeToApartmentRatings(onChange, apartmentId) {
    let hasConnected = false;
    const changeConfig = apartmentId
        ? { event: "*", schema: "public", table: "apartment_ratings", filter: `apartment_id=eq.${apartmentId}` }
        : { event: "*", schema: "public", table: "apartment_ratings" };
    const channel = supabase
        .channel(`apartment-ratings-ranking-${safeRandomId()}`)
        .on("postgres_changes", changeConfig, onChange)
        .subscribe((status) => {
        // Revalidate after a reconnect because changes may have occurred while the client was offline.
        if (status === "SUBSCRIBED") {
            if (hasConnected)
                onChange();
            hasConnected = true;
        }
    });
    return () => { void supabase.removeChannel(channel); };
}
export async function saveApartmentRating(apartmentId, tenantId, rating) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        throw new Error("Choose a rating from 1 to 5 stars.");
    const { error } = await supabase.from("apartment_ratings").upsert({ apartment_id: apartmentId, tenant_id: tenantId, rating, updated_at: new Date().toISOString() }, { onConflict: "tenant_id,apartment_id" });
    if (error)
        throw new Error(error.message);
}
export async function removeApartmentRating(apartmentId, tenantId) {
    const { error } = await supabase.from("apartment_ratings").delete().eq("apartment_id", apartmentId).eq("tenant_id", tenantId);
    if (error)
        throw new Error(error.message);
}
