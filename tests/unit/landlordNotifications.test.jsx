import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandlordNotifications } from "@/landlord/LandlordNotifications";

afterEach(() => cleanup());

function makeProps(overrides = {}) {
    return {
        notifications: [
            {
                id: "unread-1",
                title: "Admin decision issued",
                message: "The admin changes requested for Sunrise Residence.",
                is_read: false,
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: "read-1",
                title: "Property published",
                message: "Riverside Apartment is now live on AptFindr.",
                is_read: true,
                created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ],
        notifCategory: "all",
        isMarkingAllNotifs: false,
        markAllLandlordNotificationsRead: vi.fn(),
        setNotifCategory: vi.fn(),
        isLoadingNotifications: false,
        handleNotificationClick: vi.fn(),
        setOpenNotifMenuId: vi.fn(),
        openNotifMenuId: null,
        setNotificationReadStatus: vi.fn(),
        deletingNotifId: null,
        deleteNotif: vi.fn(),
        ...overrides,
    };
}

describe("Landlord notifications", () => {
    it("shows the compact All and Unread notification list", () => {
        render(<LandlordNotifications {...makeProps()} />);

        expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
        expect(screen.getByText("Stay updated about your properties, reports, and account activity.")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: "Unread 1" })).toHaveAttribute("aria-selected", "false");
        expect(screen.getByText("Admin decision issued")).toBeInTheDocument();
        expect(screen.getByText("Property published")).toBeInTheDocument();
        expect(screen.getByText("1 day ago")).toBeInTheDocument();
    });

    it("shows both read-state actions and Delete in the three-dot menu", async () => {
        const user = userEvent.setup();
        const props = makeProps({ openNotifMenuId: "unread-1" });
        const { rerender } = render(<LandlordNotifications {...props} />);

        const menu = screen.getByRole("menu");
        expect(menu).toHaveTextContent("Mark as unread");
        expect(menu).toHaveTextContent("Mark as read");
        expect(menu).toHaveTextContent("Delete");

        await user.click(screen.getByRole("menuitem", { name: "Mark as read" }));
        expect(props.setNotificationReadStatus).toHaveBeenCalledWith("unread-1", true, false);

        rerender(<LandlordNotifications {...props} openNotifMenuId="read-1" />);
        await user.click(screen.getByRole("menuitem", { name: "Mark as unread" }));
        expect(props.setNotificationReadStatus).toHaveBeenCalledWith("read-1", false, true);

        await user.click(screen.getByRole("menuitem", { name: "Delete" }));
        expect(props.deleteNotif).toHaveBeenCalledWith("read-1");
    });
});
