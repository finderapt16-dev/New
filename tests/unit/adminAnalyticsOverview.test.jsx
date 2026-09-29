import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AdminAnalyticsOverview } from "@/admin/AdminAnalyticsOverview";

const landlords = [
    { id: "l1", name: "Ana Reyes", email: "ana@example.com", mobile: "0917", created_at: "2026-01-02" },
    { id: "l2", name: "Ben Cruz", email: "ben@example.com", created_at: "2026-02-02" },
];
const allApartments = [
    { id: "a1", isPublished: true, rooms: [{ rent: 8000 }, { rent: 9500 }] },
    { id: "a2", approvalStatus: "pending" },
    { id: "a3", approvalStatus: "rejected" },
    { id: "a4", isArchived: true },
];

const renderPage = (props) => render(
    <MemoryRouter>
        <AdminAnalyticsOverview
            landlords={landlords}
            allApartments={allApartments}
            violations={[{ active: true }, { active: false }]}
            pendingReports={4}
            activeAppealsCount={2}
            unreadNotifsCount={3}
            landlordSearch=""
            setLandlordSearch={vi.fn()}
            landlordStatusFilter="all"
            setLandlordStatusFilter={vi.fn()}
            onSelectLandlord={vi.fn()}
            {...props}
        />
    </MemoryRouter>,
);

// The KPI card for a label: the number is the <strong> next to the label <b>.
// Scoped to the metrics row, because the labels repeat inside the verification list.
const kpi = (label) => within(document.querySelector(".admin-analytics-metrics")).getByText(label)
    .parentElement.querySelector("strong");
// The legend row for a listing status: the count is the <strong> beside the label <b>.
const legend = (label) => within(document.querySelector(".admin-analytics-legend")).getByText(label)
    .parentElement.querySelector("strong");

describe("AdminAnalyticsOverview", () => {
    it("renders the analytics KPIs derived from the portal data", () => {
        renderPage();
        expect(screen.getByRole("heading", { name: "Analytics Overview" })).toBeInTheDocument();
        expect(kpi("Total Landlords")).toHaveTextContent("2");
        expect(kpi("Published Listings")).toHaveTextContent("1");
        expect(kpi("Pending Review")).toHaveTextContent("1");
        expect(kpi("Open Reports")).toHaveTextContent("4");
        expect(kpi("Open Appeals")).toHaveTextContent("2");
        // Only the still-active violation counts; the revoked one is filtered out.
        expect(kpi("Active Violations")).toHaveTextContent("1");
    });

    it("breaks the listings down by review status", () => {
        renderPage();
        expect(legend("Published")).toHaveTextContent("1");
        expect(legend("Pending review")).toHaveTextContent("1");
        expect(legend("Needs changes")).toHaveTextContent("1");
        expect(legend("Archived")).toHaveTextContent("1");
        // Unpublished and deleted have no listings, so they are left out entirely.
        const legendList = document.querySelector(".admin-analytics-legend");
        expect(within(legendList).queryByText("Unpublished")).not.toBeInTheDocument();
        expect(within(legendList).queryByText("Deleted")).not.toBeInTheDocument();
    });

    it("summarises the work waiting on the admin", () => {
        renderPage();
        expect(screen.getByText("7 items need attention")).toBeInTheDocument();
        expect(screen.getByText("3 unread notifications waiting in the Notifications section.")).toBeInTheDocument();
    });

    it("hands off to the landlord verification list", () => {
        renderPage();
        expect(screen.getByRole("heading", { name: "Landlord Verification" })).toBeInTheDocument();
        expect(screen.getByText("Ana Reyes")).toBeInTheDocument();
        expect(screen.getByText("Ben Cruz")).toBeInTheDocument();
    });

    it("says everything is clear when there is nothing to review", () => {
        renderPage({ pendingReports: 0, activeAppealsCount: 0, allApartments: [{ id: "a1", isPublished: true }] });
        expect(screen.getByText("Nothing is waiting for review")).toBeInTheDocument();
        expect(screen.queryByText(/need attention/)).not.toBeInTheDocument();
    });

    it("does not blow up before any data has loaded", () => {
        renderPage({ landlords: [], allApartments: [], violations: [], pendingReports: 0, activeAppealsCount: 0, unreadNotifsCount: 0 });
        expect(screen.getByText("No apartment listings have been submitted yet.")).toBeInTheDocument();
        expect(screen.getByText("No landlords match the selected filters.")).toBeInTheDocument();
    });
});
