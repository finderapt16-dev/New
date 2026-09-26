import { test, expect } from "@playwright/test";
import { editPath, listPath, mockSupabase, roomId } from "./mockSupabase";

const assertNoOverflow = async (page) => {
    const overflow = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        outside: [...document.querySelectorAll(".rm-page, .rm-section, .rm-room-list, .rm-dialog, .rm-table-wrap")]
            .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && (box.left < -1 || box.right > window.innerWidth + 1); })
            .map((element) => element.className),
    }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.outside).toEqual([]);
};

for (const width of [320, 390, 768, 1024, 1440]) {
    test(`add, edit, persist, reload, and delete at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 960 });
        const db = await mockSupabase(page);
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(listPath);
        await expect(page.getByRole("heading", { name: "No rooms added yet" })).toBeVisible();
        await assertNoOverflow(page);
        if (width === 1440) await page.screenshot({ path: ".cache/room-empty-desktop.png", fullPage: true });
        await page.getByRole("button", { name: "Add Room", exact: true }).click();
        await expect(page.getByRole("dialog", { name: "Add New Room for Luna Apartment" })).toBeVisible();
        await page.getByLabel("Room Number", { exact: false }).fill("Room 101");
        await page.getByLabel(/Monthly Rent/).fill("4500");
        await assertNoOverflow(page);
        if (width === 1440) await page.screenshot({ path: ".cache/room-add-desktop.png", fullPage: true });
        await page.getByRole("button", { name: "Save Room", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Rooms (1)" })).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(db.rooms).toHaveLength(1);
        await page.getByRole("link", { name: "Edit Room 101" }).click();
        await expect(page.getByRole("heading", { name: "Edit Room", exact: true })).toBeVisible();
        await page.getByLabel(/Monthly Rent/).fill("5500");
        await page.getByRole("button", { name: "Balcony", exact: true }).click();
        await page.getByRole("button", { name: "Wi-Fi", exact: true }).click();
        await page.getByRole("button", { name: "Study Table", exact: true }).click();
        await page.getByRole("button", { name: "Window", exact: true }).click();
        await page.getByRole("button", { name: "Water", exact: true }).click();
        await page.getByRole("button", { name: "Internet", exact: true }).click();
        await page.getByLabel("Description", { exact: true }).fill("Spacious room with balcony, good natural lighting, and study area. Ideal for students and working professionals.");
        await page.getByRole("radio", { name: /Under Maintenance/ }).check();
        await assertNoOverflow(page);
        if (width === 1440 || width === 390) {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: `.cache/room-edit-${width}.png`, fullPage: true });
        }
        await page.getByRole("button", { name: "Save Changes" }).click();
        await expect(page).toHaveURL(listPath);
        expect(db.rooms[0].rent).toBe(5500);
        expect(db.rooms[0].status).toBe("maintenance");
        expect(db.rooms[0].is_occupied).toBe(false);
        expect(db.property.features.verification.permit).toBe("existing-document.pdf");
        expect(db.property.features.roomDetails[roomId(101)].utilities).toEqual(["Internet"]);
        await page.reload();
        await expect(page.getByRole("rowheader", { name: "Room 101" })).toBeVisible();
        await assertNoOverflow(page);
        await page.getByRole("link", { name: "Edit Room 101" }).click();
        await expect(page.getByRole("button", { name: "Balcony", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("button", { name: "Water", exact: true })).toHaveAttribute("aria-pressed", "false");
        await expect(page.getByRole("radio", { name: /Under Maintenance/ })).toBeChecked();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await page.getByRole("button", { name: "Delete Room 101", exact: true }).click();
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await page.getByRole("button", { name: "Delete Room", exact: true }).click();
        await expect(page.getByText("No rooms added yet", { exact: true })).toBeVisible();
        expect(db.rooms).toHaveLength(0);
        expect(db.property.features.roomDetails[roomId(101)]).toBeUndefined();
        expect(errors).toEqual([]);
    });
}

test("paginated table and mobile cards use the same real room data", async ({ page }) => {
    await mockSupabase(page, { count: 9 });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(listPath);
    await expect(page.getByText("Page 1 of 3", { exact: true })).toBeVisible();
    await page.screenshot({ path: ".cache/room-list-desktop.png", fullPage: true });
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByRole("rowheader", { name: "Room 105" })).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByRole("rowheader", { name: "Room 109" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(page.getByRole("rowheader", { name: "Room 105" })).toBeVisible();
    await assertNoOverflow(page);
    await page.screenshot({ path: ".cache/room-list-mobile.png", fullPage: true });
    await page.getByRole("link", { name: "Edit Room 105" }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Page 2 of 3", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Edit Room 105" }).click();
    await page.getByLabel(/Monthly Rent/).fill("7800");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Page 2 of 3", { exact: true })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Room 105" })).toBeVisible();
});

test("a failed save retains changes, and cancel does not save draft status", async ({ page }) => {
    const db = await mockSupabase(page, { count: 1 });
    await page.goto(editPath());
    await page.getByRole("radio", { name: /Occupied/ }).check();
    db.failNext = { table: "apartment_rooms", message: "Unable to save. Try again." };
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("alert")).toContainText("Unable to save. Try again.");
    await expect(page.getByRole("radio", { name: /Occupied/ })).toBeChecked();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Discard unsaved changes?");
    await page.getByRole("button", { name: "Keep editing" }).click();
    await page.getByRole("link", { name: "Back to Manage Rooms" }).click();
    await page.getByRole("button", { name: "Discard changes" }).click();
    await expect(page).toHaveURL(listPath);
    expect(db.rooms[0].status).toBe("available");
});

test("photo upload, cover ordering, and removal are persisted through the storage service", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    const db = await mockSupabase(page, { count: 1 });
    await page.goto(editPath());
    const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nAAAAABJRU5ErkJggg==", "base64");
    await page.getByLabel("Select room photos", { exact: true }).setInputFiles([
        { name: "one.png", mimeType: "image/png", buffer: image },
        { name: "two.png", mimeType: "image/png", buffer: image },
    ]);
    await expect(page.getByAltText("Room photo 1 (cover)")).toBeVisible();
    await assertNoOverflow(page);
    await page.getByRole("button", { name: "Set photo 2 as cover" }).click();
    await page.getByRole("button", { name: "Remove photo 2" }).click();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page).toHaveURL(listPath);
    expect(db.uploadCount).toBe(1);
    expect(db.rooms[0].images).toHaveLength(1);
    expect(db.rooms[0].images[0]).toMatch(/^https:\/\/.+\/rooms\//);
    await page.reload();
    await page.getByRole("link", { name: "Edit Room 101" }).click();
    await expect(page.getByAltText("Room photo 1 (cover)")).toBeVisible();
});

test("mobile landscape dialog stays usable and traps keyboard focus", async ({ page }) => {
    await mockSupabase(page);
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto(listPath);
    await page.getByRole("button", { name: "Add Room" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await assertNoOverflow(page);
    await page.getByLabel(/Room Number/).fill("Room 101");
    await page.getByLabel(/Monthly Rent/).fill("4500");
    for (let count = 0; count < 10; count += 1) {
        await page.keyboard.press("Tab");
        expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    await page.getByRole("button", { name: "Save Room", exact: true }).click();
    await expect(page.getByRole("rowheader", { name: "Room 101" })).toBeVisible();
});

// File organization must keep both the landlord routes and components used by
// the shared browse/property-detail routes connected to their original behavior.
for (const width of [390, 1280]) {
    test(`landlord feature navigation remains connected at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await mockSupabase(page, { count: 1 });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto("/dashboard");
        await expect(page.getByRole("heading", { name: "Your Properties", exact: true })).toBeVisible();

        const sidebar = async () => {
            if (width < 1024) {
                await page.getByRole("button", { name: "Open navigation", exact: true }).click();
                return page.locator(".app-sidebar-drawer.is-open");
            }
            return page.locator(".app-shell-sidebar");
        };
        await (await sidebar()).getByRole("button", { name: "Notifications", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
        await (await sidebar()).getByRole("button", { name: "Settings", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
        for (const name of ["Profile", "Alerts", "Business", "Security"]) {
            const tab = page.getByRole("tab", { name, exact: true });
            await tab.click();
            await expect(tab).toHaveAttribute("aria-selected", "true");
            await expect(page.getByRole("tabpanel")).toBeVisible();
        }
        await (await sidebar()).getByRole("button", { name: "Help & Support", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Help & Support", exact: true })).toBeVisible();
        await (await sidebar()).getByRole("link", { name: "Market Trends", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Market Trends", exact: true })).toBeVisible();

        await page.goto("/dashboard?section=activity");
        await expect(page.getByRole("heading", { name: "Property Activity", exact: true })).toBeVisible();
        // The old "Your Listings" layout is gone from the code; its legacy URL falls back
        // to the default dashboard.
        await page.goto("/dashboard?section=properties");
        await expect(page.getByRole("heading", { name: "Your Properties", exact: true })).toBeVisible();
        await page.getByRole("link", { name: "Manage Rooms", exact: true }).click();
        await expect(page).toHaveURL(listPath);
        await expect(page.getByRole("rowheader", { name: "Room 101" })).toBeVisible();
        // Manage Rooms stays inside the landlord shell: sidebar on desktop,
        // menu bar trigger on phones.
        if (width < 1024) {
            await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toBeVisible();
            await page.getByRole("button", { name: "Open navigation", exact: true }).click();
            await expect(page.locator(".app-sidebar-drawer.is-open")).toBeVisible();
            await page.getByRole("button", { name: "Close navigation", exact: true }).click();
        } else {
            await expect(page.locator(".app-shell-sidebar")).toBeVisible();
            await expect(page.locator(".app-shell-sidebar").getByRole("button", { name: "My Properties", exact: true })).toBeVisible();
        }
        await page.getByRole("link", { name: "Back to My Properties" }).click();
        await expect(page).toHaveURL(/\/dashboard\?section=overview$/);
        await expect(page.getByRole("heading", { name: "Your Properties", exact: true })).toBeVisible();
        await page.goto("/add-apartment");
        await expect(page.getByRole("heading", { name: "Add Property", exact: true })).toBeVisible();
        expect(errors).toEqual([]);
    });
}
