import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ManageRooms, EditRoom } from "../../src/landlord/ManageRooms";
import { createApartmentRoom, deleteApartmentRoom, fetchApartmentWithImages, updateApartmentRoom, uploadApartmentRoomImage } from "@/data/apartments";

const mocks = vi.hoisted(() => ({ user: { id: "owner", role: "landlord" }, refresh: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/contexts/ApartmentsContext", () => ({ useApartmentsContext: () => ({ refreshApartments: mocks.refresh }) }));
vi.mock("@/services/supabaseClient", () => ({ supabase: { channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; }, removeChannel: vi.fn() } }));
vi.mock("@/data/apartments", () => ({ fetchApartmentWithImages: vi.fn(), createApartmentRoom: vi.fn(), deleteApartmentRoom: vi.fn(), updateApartmentRoom: vi.fn(), uploadApartmentRoomImage: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const listPath = "/landlord/properties/p/rooms";
const room = (number = 101) => ({ id: `r${number}`, name: `Room ${number}`, type: "Single Room", price: 4500,
    maxOccupants: 1, sqft: 220, hasAC: false, hasPrivateBath: false, sharedBathLocation: "Hallway", description: "Bright room.", status: "available", images: [] });
let property;
const renderPage = (path = listPath) => {
    const router = createMemoryRouter([
        { path: "/landlord/properties/:id/rooms", element: <ManageRooms /> },
        { path: "/landlord/properties/:id/rooms/:roomId/edit", element: <EditRoom /> },
        { path: "/apartment/:id", element: <h1>View Property</h1> },
        { path: "/dashboard", element: <h1>Dashboard</h1> },
    ], { initialEntries: [path] });
    render(<RouterProvider router={router} />);
    return router;
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: "owner", role: "landlord" };
    property = { id: "p", title: "Luna Apartment", landlordId: "owner", rooms: [], utilities: ["Water"] };
    fetchApartmentWithImages.mockImplementation(async () => structuredClone(property));
    createApartmentRoom.mockImplementation(async (_, payload) => { const saved = { ...payload, id: "new-room" }; property.rooms.push(saved); return saved; });
    deleteApartmentRoom.mockImplementation(async (_, id) => { property.rooms = property.rooms.filter((item) => item.id !== id); return {}; });
    updateApartmentRoom.mockImplementation(async (_, id, payload) => { const saved = { ...payload, id }; property.rooms = property.rooms.map((item) => item.id === id ? saved : item); return saved; });
    uploadApartmentRoomImage.mockResolvedValue("https://images.test/saved.png");
    mocks.refresh.mockResolvedValue(undefined);
});

describe("Manage Rooms list and quick add", () => {
    it("shows the reference empty state and saves a room through the modal", async () => {
        const user = userEvent.setup();
        renderPage();
        expect(await screen.findByText("No rooms added yet")).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Add Room" }));
        expect(screen.getByRole("dialog", { name: "Add New Room for Luna Apartment" })).toBeVisible();
        await user.type(screen.getByLabelText(/Room Number/), "Room 103");
        await user.type(screen.getByLabelText(/Monthly Rent/), "5000");
        await user.selectOptions(screen.getByLabelText("Status"), "occupied");
        await user.click(screen.getByRole("button", { name: "Save Room" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(screen.getByRole("heading", { name: "Rooms (1)" })).toBeVisible();
        expect(screen.getByRole("rowheader", { name: "Room 103" })).toBeVisible();
        expect(createApartmentRoom).toHaveBeenCalledWith("p", expect.objectContaining({ name: "Room 103", price: 5000, maxOccupants: 1, isOccupied: true }), "owner");
    });
    it("validates required fields and duplicate room names without sending a write", async () => {
        property.rooms = [room()];
        const user = userEvent.setup();
        renderPage();
        await user.click(await screen.findByRole("button", { name: "Add Room" }));
        await user.click(screen.getByRole("button", { name: "Save Room" }));
        expect(screen.getByText("Enter a room number or name.")).toBeVisible();
        await user.type(screen.getByLabelText(/Room Number/), "room 101");
        await user.type(screen.getByLabelText(/Monthly Rent/), "4500");
        await user.click(screen.getByRole("button", { name: "Save Room" }));
        expect(screen.getByText(/already exists/)).toBeVisible();
        expect(createApartmentRoom).not.toHaveBeenCalled();
    });
    it("retains a failed add draft and allows retry without closing the dialog", async () => {
        const user = userEvent.setup();
        createApartmentRoom.mockRejectedValueOnce(new Error("Connection interrupted"));
        renderPage();
        await user.click(await screen.findByRole("button", { name: "Add Room" }));
        await user.type(screen.getByLabelText(/Room Number/), "Room 103");
        await user.type(screen.getByLabelText(/Monthly Rent/), "5000");
        await user.click(screen.getByRole("button", { name: "Save Room" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Connection interrupted");
        expect(screen.getByLabelText(/Room Number/)).toHaveValue("Room 103");
        await user.click(screen.getByRole("button", { name: "Save Room" }));
        expect(await screen.findByRole("rowheader", { name: "Room 103" })).toBeVisible();
    });
    it("prevents duplicate add submissions and closing while the write is pending", async () => {
        let resolve;
        createApartmentRoom.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
        const user = userEvent.setup();
        renderPage();
        await user.click(await screen.findByRole("button", { name: "Add Room" }));
        await user.type(screen.getByLabelText(/Room Number/), "Room 104");
        await user.type(screen.getByLabelText(/Monthly Rent/), "3500");
        await user.dblClick(screen.getByRole("button", { name: "Save Room" }));
        expect(createApartmentRoom).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
        await user.keyboard("{Escape}");
        expect(screen.getByRole("dialog")).toBeVisible();
        await act(async () => resolve({ ...room(104), id: "new-room" }));
    });
    it("uses real pagination and clamps the last page after deleting its last room", async () => {
        property.rooms = [101, 102, 103, 104, 105].map(room);
        const user = userEvent.setup();
        renderPage();
        expect(await screen.findByText("Page 1 of 2")).toBeVisible();
        expect(screen.getAllByRole("rowheader")).toHaveLength(4);
        await user.click(screen.getByRole("button", { name: "Next page" }));
        expect(screen.getByRole("rowheader", { name: "Room 105" })).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Delete Room 105" }));
        await user.click(screen.getByRole("button", { name: "Delete Room", exact: true }));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        expect(screen.getByText("Page 1 of 1")).toBeVisible();
        expect(screen.getAllByRole("rowheader")).toHaveLength(4);
    });
    it("requires deletion confirmation, retains the row on failure, and allows retry", async () => {
        property.rooms = [room()];
        deleteApartmentRoom.mockRejectedValueOnce(new Error("Delete denied"));
        const user = userEvent.setup();
        renderPage();
        await user.click(await screen.findByRole("button", { name: "Delete Room 101" }));
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(deleteApartmentRoom).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", { name: "Delete Room 101" }));
        await user.click(screen.getByRole("button", { name: "Delete Room", exact: true }));
        expect(await screen.findByText("Delete denied")).toBeVisible();
        expect(property.rooms).toHaveLength(1);
        await user.click(screen.getByRole("button", { name: "Delete Room", exact: true }));
        expect(await screen.findByText("No rooms added yet")).toBeVisible();
    });
    it("does not expose another landlord's room controls", async () => {
        property.landlordId = "other-owner";
        renderPage();
        expect(await screen.findByRole("heading", { name: "Property not available" })).toBeVisible();
        expect(screen.queryByRole("button", { name: "Add Room" })).not.toBeInTheDocument();
    });
    it("offers a retry after a load failure instead of claiming the property is missing", async () => {
        fetchApartmentWithImages.mockRejectedValueOnce(new Error("Network unavailable"));
        const user = userEvent.setup();
        renderPage();
        expect(await screen.findByRole("heading", { name: "Unable to load rooms" })).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Try again" }));
        expect(await screen.findByText("No rooms added yet")).toBeVisible();
    });
    it("returns to the correct property", async () => {
        const user = userEvent.setup();
        const router = renderPage();
        await user.click(await screen.findByRole("link", { name: "Back to View Property" }));
        expect(router.state.location.pathname).toBe("/apartment/p");
    });
});

describe("Edit Room", () => {
    beforeEach(() => { property.rooms = [room()]; });
    it("updates preview, amenities, utilities, and status and persists all changes together", async () => {
        const user = userEvent.setup();
        const router = renderPage(`${listPath}/r101/edit`);
        expect(await screen.findByRole("heading", { name: "Edit Room" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
        await user.clear(screen.getByLabelText(/Monthly Rent/));
        await user.type(screen.getByLabelText(/Monthly Rent/), "5500");
        await user.click(screen.getByRole("button", { name: "Balcony", exact: true }));
        await user.click(screen.getByRole("button", { name: "Air Conditioning", exact: true }));
        await user.click(screen.getByRole("button", { name: "Water", exact: true }));
        await user.type(screen.getByLabelText(/Other utility/), "Laundry{Enter}");
        expect(updateApartmentRoom).not.toHaveBeenCalled();
        const preview = within(screen.getByRole("article", { name: "Room preview" }));
        expect(preview.getByText("Balcony")).toBeVisible();
        expect(preview.getByText(/5,500/)).toBeVisible();
        await user.click(screen.getByRole("radio", { name: /Under Maintenance/ }));
        await user.click(screen.getByRole("button", { name: "Save Changes" }));
        await waitFor(() => expect(router.state.location.pathname).toBe(listPath));
        expect(updateApartmentRoom).toHaveBeenCalledWith("p", "r101", expect.objectContaining({ price: 5500, status: "maintenance", isOccupied: false,
            hasAC: true, amenities: expect.arrayContaining(["Balcony", "Air Conditioning"]), utilities: ["Laundry"], sqft: 220, sharedBathLocation: "Hallway" }), "owner");
    });
    it("retains a draft on save failure and does not navigate away", async () => {
        updateApartmentRoom.mockRejectedValueOnce(new Error("Save failed"));
        const user = userEvent.setup();
        renderPage(`${listPath}/r101/edit`);
        await user.type(await screen.findByLabelText(/Room Number \/ Name/), "A");
        await user.click(screen.getByRole("button", { name: "Save Changes" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
        expect(screen.getByLabelText(/Room Number \/ Name/)).toHaveValue("Room 101A");
    });
    it("guards cancel/back navigation and keeps or discards a draft as requested", async () => {
        const user = userEvent.setup();
        const router = renderPage(`${listPath}/r101/edit`);
        await user.type(await screen.findByLabelText(/Room Number \/ Name/), "B");
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(await screen.findByRole("alertdialog")).toHaveTextContent("Discard unsaved changes?");
        await user.click(screen.getByRole("button", { name: "Keep editing" }));
        expect(screen.getByLabelText(/Room Number \/ Name/)).toHaveValue("Room 101B");
        await user.click(screen.getByRole("link", { name: "Back to Manage Rooms" }));
        await user.click(screen.getByRole("button", { name: "Discard changes" }));
        await waitFor(() => expect(router.state.location.pathname).toBe(listPath));
        expect(updateApartmentRoom).not.toHaveBeenCalled();
    });
    it("keeps unsaved changes during a background room refresh", async () => {
        const user = userEvent.setup();
        renderPage(`${listPath}/r101/edit`);
        await user.type(await screen.findByLabelText(/Room Number \/ Name/), "C");
        property.rooms[0].price = 6000;
        fireEvent.focus(window);
        await screen.findByText(/This room was updated elsewhere/);
        expect(screen.getByLabelText(/Room Number \/ Name/)).toHaveValue("Room 101C");
        expect(screen.getByLabelText(/Monthly Rent/)).toHaveValue(4500);
    });
    it("uploads real files and saves permanent image URLs", async () => {
        const user = userEvent.setup();
        renderPage(`${listPath}/r101/edit`);
        const picker = await screen.findByLabelText("Select room photos");
        await user.upload(picker, new File(["png data"], "room.png", { type: "image/png" }));
        expect(screen.getByAltText("Room photo 1 (cover)")).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Save Changes" }));
        await waitFor(() => expect(updateApartmentRoom).toHaveBeenCalled());
        expect(uploadApartmentRoomImage).toHaveBeenCalledTimes(1);
        expect(updateApartmentRoom.mock.calls[0][2].images).toEqual(["https://images.test/saved.png"]);
    });
    it("handles an invalid/deleted room URL", async () => {
        renderPage(`${listPath}/missing/edit`);
        expect(await screen.findByRole("heading", { name: "Room not available" })).toBeVisible();
    });
});
