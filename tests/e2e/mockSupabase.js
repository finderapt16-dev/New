// The real app, router, auth, mappers, storage client, and CRUD services run in the
// browser. Only the HTTP/WebSocket boundary is replaced; no live data is touched.
export const PROPERTY_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const AUTH_ID = "33333333-3333-4333-8333-333333333333";
export const roomId = (number) => `44444444-4444-4444-8444-${String(number).padStart(12, "0")}`;
export const listPath = `/landlord/properties/${PROPERTY_ID}/rooms`;
export const editPath = (number = 101) => `${listPath}/${roomId(number)}/edit`;
const SUPABASE = "https://aptfindr-room-tests.supabase.co";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nAAAAABJRU5ErkJggg==", "base64");

export async function mockSupabase(page, { count = 0, owner = true } = {}) {
    const profile = { id: OWNER_ID, auth_id: AUTH_ID, name: "Luna Landlord", email: "landlord@example.test", role: "landlord", status: "active", is_verified: true };
    const authUser = { id: AUTH_ID, aud: "authenticated", role: "authenticated", email: profile.email, email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: { name: profile.name, role: "landlord" } };
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: AUTH_ID, aud: "authenticated", role: "authenticated", exp: expiresAt })}.test-only-signature`;
    const session = { access_token: accessToken, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 86400, expires_at: expiresAt, user: authUser };
    await page.addInitScript(({ session }) => localStorage.setItem("sb-aptfindr-room-tests-auth-token", JSON.stringify(session)), { session });
    const db = {
        rooms: Array.from({ length: count }, (_, index) => ({ id: roomId(101 + index), apartment_id: PROPERTY_ID, name: `Room ${101 + index}`,
            room_type: ["Single Room", "Double Room", "Double Room", "Studio Unit"][index % 4], rent: 3500 + index * 1000,
            max_occupants: 1 + index % 4, sqft: 220, has_private_bath: false, bathroom_type: null, shared_bath_location: "Hallway",
            has_ac: false, status: ["available", "occupied", "maintenance", "available"][index % 4], is_occupied: index % 4 === 1,
            description: "Spacious room with a balcony, good natural lighting, and a study area. Ideal for students and working professionals.",
            images: [], created_at: "2026-01-01T00:00:00Z" })),
        property: { id: PROPERTY_ID, title: "Luna Apartment", landlord_id: owner ? OWNER_ID : "other-owner", address: "La Paz", city: "Iloilo City", price: 3500,
            features: { verification: { permit: "existing-document.pdf" }, customFeatures: ["Parking"] }, amenities: [], utilities: ["Water"],
            is_published: true, approval_status: "approved", apartment_images: [], status: "available", created_at: "2026-01-01T00:00:00Z" },
        nextRoom: 101 + count, writes: [], failNext: null, uploadCount: 0,
    };
    const rowsFor = (table) => {
        if (table === "apartments") return [{ ...db.property, apartment_rooms: structuredClone(db.rooms) }];
        if (table === "apartment_rooms") return db.rooms;
        if (table === "app_users" || table === "public_landlords") return [profile];
        if (table === "landlord_profiles") return [{ user_id: OWNER_ID, is_verified: true }];
        return [];
    };
    await page.route(`${SUPABASE}/**`, async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();
        const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
        if (url.pathname.startsWith("/auth/")) return json(url.pathname.includes("token") ? session : authUser);
        if (url.pathname.startsWith("/storage/")) {
            if (method === "POST") {
                db.uploadCount += 1;
                return json({ Key: url.pathname.split("/object/")[1], Id: "test-upload" });
            }
            return route.fulfill({ contentType: "image/png", body: png });
        }
        const table = url.pathname.split("/rest/v1/")[1];
        if (table?.startsWith("rpc/")) return json("accessible");
        const selected = () => rowsFor(table).filter((row) => [...url.searchParams].every(([key, value]) => {
            if (value.startsWith("eq.")) return (typeof row[key] === "object" ? JSON.stringify(row[key]) : String(row[key])) === value.slice(3);
            if (value === "is.null") return row[key] == null;
            return true;
        }));
        const format = (rows) => request.headers().accept?.includes("vnd.pgrst.object") ? rows[0] ?? null : rows;
        if (method === "GET" || method === "HEAD") return json(format(selected()));
        if (db.failNext && (db.failNext.table === table || !db.failNext.table)) {
            const failure = db.failNext;
            db.failNext = null;
            return json({ message: failure.message || "Test network failure", code: "TEST_ERROR" }, 400);
        }
        const body = method === "DELETE" ? null : request.postDataJSON();
        db.writes.push({ table, method, body });
        if (table === "apartment_rooms") {
            if (method === "POST") {
                const saved = { ...body, id: roomId(db.nextRoom++), created_at: new Date().toISOString() };
                db.rooms.push(saved);
                return json(format([saved]));
            }
            const matching = selected();
            if (method === "PATCH") matching.forEach((room) => Object.assign(room, body));
            if (method === "DELETE") db.rooms = db.rooms.filter((room) => !matching.includes(room));
            return json(format(matching));
        }
        if (table === "apartments" && method === "PATCH") {
            if (!selected().length) return json(format([]));
            Object.assign(db.property, body);
            return json(format([db.property]));
        }
        return json(format([]));
    });
    await page.routeWebSocket(`${SUPABASE.replace("https", "wss")}/realtime/**`, (socket) => {
        socket.onMessage((message) => {
            try {
                const event = JSON.parse(String(message));
                if (Array.isArray(event)) {
                    const [joinRef, ref, topic, , payload] = event;
                    socket.send(JSON.stringify([joinRef, ref, topic, "phx_reply", { status: "ok", response: payload?.config ? { postgres_changes: [] } : {} }]));
                } else {
                    socket.send(JSON.stringify({ topic: event.topic, event: "phx_reply", ref: event.ref, payload: { status: "ok", response: {} } }));
                }
            } catch { /* No live realtime server is contacted by the test. */ }
        });
    });
    return db;
}
