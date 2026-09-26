import { supabase } from "./supabaseClient";
import { mergeRoomFeatures } from "../utils/roomFeatures";

// Use an optimistic JSON compare-and-swap, not a blind whole-property write.
// A retry merges the latest property metadata and other rooms' selections.
export async function saveRoomFeatures(apartmentId, roomId, details) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data: apartment, error: readError } = await supabase.from("apartments")
            .select("features").eq("id", apartmentId).single();
        if (readError || !apartment) throw new Error(readError?.message || "Unable to load room amenities and utilities.");
        const previous = apartment.features;
        if (details === null && !previous?.roomDetails?.[roomId]) return previous;
        const features = mergeRoomFeatures(previous, roomId, details);
        if (JSON.stringify(features) === JSON.stringify(previous)) return features;
        let query = supabase.from("apartments").update({ features }).eq("id", apartmentId);
        query = previous == null ? query.is("features", null) : query.eq("features", JSON.stringify(previous));
        const { data: updated, error } = await query.select("features").maybeSingle();
        if (error) throw new Error(error.message || "Unable to save room amenities and utilities.");
        if (updated) return updated.features;
    }
    throw new Error("The property changed while saving. Please try saving your room again.");
}
