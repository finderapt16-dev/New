import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveRoomFeatures } from "../../src/services/roomFeaturesService";
import { createApartmentRoom, deleteApartmentRoom, updateApartment, updateApartmentRoom } from "../../src/services/apartmentsService";
import { apartmentRowToApartment, apartmentFormValuesToUpdateRow } from "../../src/data/apartments";
import { apartmentToFormValues } from "../../src/utils/apartmentMappers";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../../src/services/supabaseClient", () => ({ supabase: { from: mocks.from } }));

// Minimal thenable query builder: each query consumes one queued database reply.
let responses;
let queries;
beforeEach(() => {
    responses = [];
    queries = [];
    mocks.from.mockImplementation((table) => {
        const query = { table, filters: [], method: "read", payload: null };
        queries.push(query);
        const builder = {
            select: () => builder,
            eq: (key, value) => { query.filters.push([key, value]); return builder; },
            is: (key, value) => { query.filters.push([key, value]); return builder; },
            update: (payload) => { query.method = "update"; query.payload = payload; return builder; },
            insert: (payload) => { query.method = "insert"; query.payload = payload; return builder; },
            delete: () => { query.method = "delete"; return builder; },
            single: () => builder,
            maybeSingle: () => builder,
            then: (resolve, reject) => {
                const response = responses.shift();
                if (!response) return Promise.reject(new Error(`Unexpected database query: ${table}`)).then(resolve, reject);
                return Promise.resolve(response).then(resolve, reject);
            },
        };
        return builder;
    });
});
const ok = (data = null) => ({ data, error: null });
const row = { id: "r", name: "Room 101", room_type: "Single Room", rent: 4500, max_occupants: 1, status: "available", is_occupied: false, has_ac: true, images: [] };

describe("room feature persistence", () => {
    it("retries concurrent edits and merges the newest metadata instead of overwriting it", async () => {
        const first = { verification: { permit: "a" }, roomDetails: { other: { utilities: ["Water"] } } };
        const latest = { ...first, roomDetails: { other: { utilities: ["Electricity"] } } };
        const details = { amenities: ["Balcony"], utilities: ["Internet"] };
        responses.push(ok({ features: first }), ok(null), ok({ features: latest }), ok({ features: { ...latest, roomDetails: { ...latest.roomDetails, r: details } } }));
        const saved = await saveRoomFeatures("p", "r", details);
        expect(saved.roomDetails.other.utilities).toEqual(["Electricity"]);
        expect(queries[3].payload.features.verification).toEqual(first.verification);
        expect(queries[3].filters).toContainEqual(["features", JSON.stringify(latest)]);
    });
    it("reports persistence errors rather than silently dropping selections", async () => {
        responses.push(ok({ features: {} }), { data: null, error: { message: "Permission denied" } });
        await expect(saveRoomFeatures("p", "r", { amenities: ["Balcony"], utilities: [] })).rejects.toThrow("Permission denied");
    });
    it("reads extras back through the common apartment mapper and preserves them during property edits", () => {
        const features = { propertyType: "Apartment", verification: { permit: "keep.pdf" }, roomDetails: { r: { amenities: ["WiFi", "Balcony"], utilities: [] } } };
        const property = apartmentRowToApartment({ id: "p", landlord_id: "u", features, apartment_rooms: [row] });
        expect(property.rooms[0]).toMatchObject({ amenities: ["Wi-Fi", "Balcony", "Air Conditioning"], utilities: [] });
        expect(apartmentFormValuesToUpdateRow(apartmentToFormValues(property)).features.roomDetails).toEqual(features.roomDetails);
    });
    it("protects the latest room metadata when a stale property form is saved concurrently", async () => {
        const landlordId = "22222222-2222-4222-8222-222222222222";
        const stale = { roomDetails: { r: { amenities: ["Balcony"], utilities: ["Water"] } } };
        const latest = { roomDetails: { r: { amenities: ["Balcony"], utilities: ["Internet"] } } };
        const newer = { roomDetails: { r: { amenities: ["Balcony", "Window"], utilities: ["Internet"] } } };
        const property = { id: "p", title: "Luna", landlord_id: landlordId, features: stale, apartment_rooms: [row] };
        responses.push(ok({ id: landlordId }), ok({ ...property, features: latest }), ok(null),
            ok({ ...property, features: newer }), ok({ id: "p" }), ok({ ...property, features: newer }), ok());
        await updateApartment("p", apartmentToFormValues(apartmentRowToApartment(property)), landlordId);
        const updates = queries.filter((query) => query.table === "apartments" && query.method === "update");
        expect(updates).toHaveLength(2);
        expect(updates[1].payload.features.roomDetails).toEqual(newer.roomDetails);
        expect(updates[1].filters).toContainEqual(["features", JSON.stringify(newer)]);
    });
    it("does not change the independent occupancy visibility flag when mapping a room", () => {
        const property = apartmentRowToApartment({ apartment_rooms: [{ ...row, status: "available", is_occupied: true }] });
        expect(property.rooms[0].isOccupied).toBe(true);
    });
});

describe("committed room mutations", () => {
    it("does not turn a successful insert into a failure when only summary refresh fails", async () => {
        const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
        responses.push(ok(row), { data: null, error: { message: "Summary temporarily unavailable" } }, ok());
        const saved = await createApartmentRoom("p", { name: "Room 101", type: "Single Room", price: 4500, maxOccupants: 1 }, "owner");
        expect(saved.id).toBe("r");
        expect(saved.syncWarning).toMatch(/room was saved/i);
        expect(queries.filter((q) => q.table === "apartment_rooms" && q.method === "insert")).toHaveLength(1);
        expect(warning).toHaveBeenCalled();
    });
    it("updates occupancy and saves extras without requiring new database columns", async () => {
        const details = { amenities: ["Balcony", "Air Conditioning"], utilities: ["Water"] };
        responses.push(ok(row), ok({ ...row, status: "occupied", is_occupied: true }), ok({ features: {} }), ok({ features: { roomDetails: { r: details } } }), ok([row]), ok(), ok());
        const saved = await updateApartmentRoom("p", "r", { name: "Room 101", type: "Single Room", price: 4500, maxOccupants: 1,
            status: "occupied", hasAC: true, ...details }, "owner");
        expect(saved).toMatchObject({ status: "occupied", isOccupied: true, utilities: ["Water"] });
        expect(queries[1].payload).toMatchObject({ status: "occupied", is_occupied: true });
        expect(queries[1].payload).not.toHaveProperty("amenities");
        expect(queries[3].payload.features.roomDetails.r).toEqual(details);
    });
    it("reports partial room/metadata failure explicitly so the draft can be retried", async () => {
        responses.push(ok(row), ok(row), { data: null, error: { message: "Metadata unavailable" } });
        await expect(updateApartmentRoom("p", "r", { name: "Room 101", amenities: ["Balcony"], utilities: [] }, "owner"))
            .rejects.toThrow("room details were saved, but amenities and utilities could not be saved");
    });
    it("clears property totals when its last room is deleted", async () => {
        responses.push(ok(row), ok({ id: "r" }), ok({ features: {} }), ok([]), ok(), ok());
        await deleteApartmentRoom("p", "r", "owner");
        expect(queries.find((query) => query.table === "apartments" && query.method === "update").payload)
            .toMatchObject({ price: 0, bedrooms: 0, bathrooms: 0 });
    });
    it("does not claim a room was deleted when RLS or a stale ID matched no record", async () => {
        responses.push(ok(row), ok(null));
        await expect(deleteApartmentRoom("p", "r", "owner")).rejects.toThrow("could not be deleted");
    });
});
