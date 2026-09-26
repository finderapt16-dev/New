import { describe, expect, it, vi } from "vitest";
import { buildRoomPayload, emptyRoomForm, persistRoomPhotos, roomToForm, sortRooms, validateRoomForm } from "../../src/landlord/ManageRooms";
import { getRoomAmenities, mergeRoomFeatures, normalizeRoomList, roomWithFeatures } from "../../src/utils/roomFeatures";

// Helpers now share the page module; pure unit tests must not initialize a backend client.
vi.mock("@/services/supabaseClient", () => ({ supabase: {} }));

const validForm = () => ({ ...emptyRoomForm(), name: "Room 101", price: "4500", maxOccupants: "1" });

describe("room form validation and backwards compatibility", () => {
    it("accepts zero rent and preserves it when reopening a saved room", () => {
        expect(validateRoomForm({ ...validForm(), price: "0" })).toEqual({});
        expect(roomToForm({ price: 0, maxOccupants: 1 }).price).toBe("0");
    });
    it.each(["", " ", "NaN", "Infinity", "-1"])("rejects invalid rent %j", (price) => {
        expect(validateRoomForm({ ...validForm(), price }).price).toBeTruthy();
    });
    it.each(["", "0", "-1", "1.5", "Infinity"])("rejects invalid capacity %j", (maxOccupants) => {
        expect(validateRoomForm({ ...validForm(), maxOccupants }).maxOccupants).toBeTruthy();
    });
    it("rejects whitespace names and duplicate names, but allows editing the same room", () => {
        const rooms = [{ id: "room-1", name: "Room 101" }];
        expect(validateRoomForm({ ...validForm(), name: " " }).name).toBeTruthy();
        expect(validateRoomForm({ ...validForm(), name: " room 101 " }, rooms).name).toBeTruthy();
        expect(validateRoomForm(validForm(), rooms, rooms[0])).toEqual({});
    });
    it("preserves legacy room types, bathroom data, floor area, and long descriptions", () => {
        const room = { type: "Shared room", name: "B", price: 4200, maxOccupants: 4, sqft: 320,
            description: "x".repeat(610), hasPrivateBath: true, bathroomType: "separate", hasAC: true };
        const form = roomToForm(room);
        expect(validateRoomForm(form, [], room)).toEqual({});
        const payload = buildRoomPayload(form, ["https://images.test/photo.jpg"]);
        expect(payload).toMatchObject({ type: "Shared room", bathroomType: "separate", hasPrivateBath: true, sqft: 320, hasAC: true });
        expect(payload.description).toHaveLength(610);
    });
    it("keeps status and occupancy synchronized", () => {
        expect(buildRoomPayload({ ...validForm(), status: "occupied" })).toMatchObject({ status: "occupied", isOccupied: true });
        expect(buildRoomPayload({ ...validForm(), status: "maintenance" }).isOccupied).toBe(false);
    });
    it("sorts room numbers naturally for stable pagination", () => {
        expect(sortRooms([{ name: "Room 10" }, { name: "Room 2" }, { name: "Room 1" }]).map((r) => r.name))
            .toEqual(["Room 1", "Room 2", "Room 10"]);
    });
});

describe("persistent amenities and utilities", () => {
    it("normalizes and deduplicates custom amenities", () => {
        expect(normalizeRoomList([" WiFi ", "wi-fi", "Bed", "bed", null], { amenities: true })).toEqual(["Wi-Fi", "Bed"]);
    });
    it("does not let stale amenity strings disagree with the existing AC/bathroom flags", () => {
        expect(getRoomAmenities({ hasAC: false, hasPrivateBath: true, amenities: ["Air Conditioning", "Balcony"] }))
            .toEqual(["Balcony", "Private Bathroom"]);
    });
    it("merges one room without losing other rooms, verification documents, or property features", () => {
        const features = { verification: { permit: "document.pdf" }, customFeatures: ["Parking"], roomDetails: { b: { utilities: ["Water"] } } };
        const merged = mergeRoomFeatures(features, "a", { amenities: ["Balcony"], utilities: ["Internet"] });
        expect(merged.verification).toEqual(features.verification);
        expect(merged.roomDetails.b).toEqual(features.roomDetails.b);
        expect(merged.roomDetails.a).toEqual({ amenities: ["Balcony"], utilities: ["Internet"] });
        expect(features.roomDetails.a).toBeUndefined();
        expect(mergeRoomFeatures(merged, "a", null).roomDetails).toEqual(features.roomDetails);
    });
    it("preserves legacy property feature arrays", () => {
        expect(mergeRoomFeatures(["Parking"], "a", { amenities: [], utilities: [] }).customFeatures).toEqual(["Parking"]);
    });
    it("distinguishes explicit no-utilities from inherited property utilities", () => {
        const property = { utilities: ["Water"] };
        const legacy = roomWithFeatures({ id: "a" }, {});
        expect(legacy.utilities).toBeUndefined();
        expect(roomToForm(legacy, property).utilities).toEqual(["Water"]);
        const explicitNone = roomWithFeatures({ id: "a" }, { roomDetails: { a: { utilities: [] } } });
        expect(roomToForm(explicitNone, property).utilities).toEqual([]);
    });
});

describe("photo persistence", () => {
    it("saves the cover first and only uploads new files", async () => {
        const upload = vi.fn().mockResolvedValue("https://images.test/new.png");
        const progress = vi.fn();
        const urls = await persistRoomPhotos("p", "r", [
            { id: "existing", url: "https://images.test/old.png", sortOrder: 0, isPrimary: false },
            { id: "new", file: new File(["image"], "new.png", { type: "image/png" }), url: "blob:new", sortOrder: 1, isPrimary: true },
        ], upload, progress);
        expect(urls).toEqual(["https://images.test/new.png", "https://images.test/old.png"]);
        expect(upload).toHaveBeenCalledTimes(1);
        expect(progress).toHaveBeenLastCalledWith(100);
    });
    it("reuses completed uploads when a subsequent upload fails and the landlord retries", async () => {
        const upload = vi.fn().mockResolvedValueOnce("https://images.test/one.png").mockRejectedValueOnce(new Error("Upload failed"))
            .mockResolvedValueOnce("https://images.test/two.png");
        const images = [1, 2].map((id) => ({ id, file: new File(["image"], `${id}.png`), url: `blob:${id}`, isPrimary: id === 1, sortOrder: id - 1 }));
        await expect(persistRoomPhotos("p", "r", images, upload, vi.fn())).rejects.toThrow("Upload failed");
        await expect(persistRoomPhotos("p", "r", images, upload, vi.fn())).resolves.toEqual(["https://images.test/one.png", "https://images.test/two.png"]);
        expect(upload).toHaveBeenCalledTimes(3);
    });
    it("never stores a temporary blob URL without its source file", async () => {
        await expect(persistRoomPhotos("p", "r", [{ url: "blob:lost", sortOrder: 0 }], vi.fn(), vi.fn())).rejects.toThrow("Please select it again");
    });
});
