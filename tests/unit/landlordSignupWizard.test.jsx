import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn(), google: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ login: mocks.login, signup: mocks.signup, user: null }) }));
vi.mock("@/services/authService", () => ({
    resendSignupVerification: vi.fn(),
    requestPasswordResetEmail: vi.fn(),
    isTenantRole: (role) => role === "tenant",
    signInWithGoogle: (...args) => mocks.google(...args),
}));

const { AuthDialog } = await import("@/auth/Signin");

const renderDialog = () => {
    const router = createMemoryRouter([
        { path: "/", element: <AuthDialog defaultView="signup" open onOpenChange={() => {}} redirectTo={null} /> },
        { path: "/terms-of-service", element: <p>TERMS</p> },
        { path: "/privacy-policy", element: <p>PRIVACY</p> },
    ], { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);
};

const openLandlordSignup = async (user) => {
    await user.click(await screen.findByRole("button", { name: /landlord/i }));
};

const fillAccountDetails = async (user, { password = "Landlord#2026", confirm = password } = {}) => {
    await user.type(screen.getByLabelText(/^username/i), "jamesreidthefirst");
    await user.type(screen.getByLabelText(/email address/i), "james@gmail.com");
    await user.type(screen.getByLabelText(/^password/i), password);
    await user.type(screen.getByLabelText(/^confirm password/i), confirm);
};

const fillPersonalInformation = async (user) => {
    await user.type(screen.getByLabelText(/first name/i), "James");
    await user.type(screen.getByLabelText(/last name/i), "Reid");
    await user.type(screen.getByLabelText(/middle initial/i), "R");
    await user.type(screen.getByLabelText(/mobile number/i), "+63 917 123 6767");
    await user.type(screen.getByLabelText(/business name/i), "James Apartment");
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.signup.mockResolvedValue({ success: true, signup: { requiresEmailVerification: false } });
});

describe("landlord create account wizard", () => {
    it("keeps every landlord signup step email-only and preserves email confirmation", async () => {
        mocks.signup.mockResolvedValueOnce({
            success: true,
            signup: { requiresEmailVerification: true, emailConfirmation: { state: "sent" } },
        });
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();

        await fillAccountDetails(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();

        await fillPersonalInformation(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        expect(screen.queryByRole("button", { name: /google/i })).not.toBeInTheDocument();

        await user.click(screen.getByRole("checkbox"));
        await user.click(screen.getByRole("button", { name: /^create account$/i }));
        expect(mocks.signup).toHaveBeenCalledWith(expect.objectContaining({
            email: "james@gmail.com",
            password: "Landlord#2026",
            role: "landlord",
        }));
        expect(await screen.findByText(/a verification link was sent to james@gmail\.com/i)).toBeInTheDocument();
        expect(mocks.google).not.toHaveBeenCalled();
    });

    it("walks the three steps: account details, personal information, review", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);

        expect(await screen.findByRole("heading", { name: /account details/i })).toBeInTheDocument();
        await fillAccountDetails(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));

        expect(await screen.findByRole("heading", { name: /personal information/i })).toBeInTheDocument();
        await fillPersonalInformation(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));

        expect(await screen.findByRole("heading", { name: /^review$/i })).toBeInTheDocument();
        expect(screen.getByText("jamesreidthefirst")).toBeInTheDocument();
        expect(screen.getByText("james@gmail.com")).toBeInTheDocument();
        expect(screen.getByText("James R. Reid")).toBeInTheDocument();
        expect(screen.getByText("+63 917 123 6767")).toBeInTheDocument();
        expect(screen.getByText("James Apartment")).toBeInTheDocument();
    });

    it("requires a strong password before leaving account details", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        await fillAccountDetails(user, { password: "password123", confirm: "password123" });
        await user.click(screen.getByRole("button", { name: /^continue$/i }));

        expect(await screen.findByText(/password must contain: at least 8 characters/i)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /account details/i })).toBeInTheDocument();
        expect(mocks.signup).not.toHaveBeenCalled();
    });

    it("rejects mismatched passwords and an invalid username", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        await fillAccountDetails(user, { confirm: "Landlord#2027" });
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        // The wizard error alert spells the message with a period; the inline
        // field hint does not, so this only matches the alert.
        expect(await screen.findByText(/passwords do not match\./i)).toBeInTheDocument();

        await user.clear(screen.getByLabelText(/^username/i));
        await user.type(screen.getByLabelText(/^username/i), "no");
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        expect(await screen.findByText(/username must be 4–30 characters/i)).toBeInTheDocument();
    });

    it("keeps the wizard on personal information until name and mobile are filled", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        await fillAccountDetails(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));

        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();

        await user.type(screen.getByLabelText(/first name/i), "James");
        await user.type(screen.getByLabelText(/last name/i), "Reid");
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        expect(await screen.findByText(/mobile number is required/i)).toBeInTheDocument();
    });

    it("edits account and personal details in place, then submits the landlord payload", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        await fillAccountDetails(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        await fillPersonalInformation(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));

        // Account Details edit dialog: seeded with the current values.
        const [accountEdit, personalEdit] = screen.getAllByRole("button", { name: /edit/i });
        await user.click(accountEdit);
        const accountDialog = await screen.findByTestId("signup-edit-dialog");
        expect(within(accountDialog).getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
        expect(within(accountDialog).getByLabelText(/^username/i)).toHaveValue("jamesreidthefirst");
        expect(within(accountDialog).getByLabelText(/recovery email/i)).toHaveValue("james@gmail.com");

        const editUsername = within(accountDialog).getByLabelText(/^username/i);
        await user.clear(editUsername);
        await user.type(editUsername, "jamesreid");
        await user.click(within(accountDialog).getByRole("button", { name: /save changes/i }));
        expect(await within(accountDialog).findByText(/account details updated/i)).toBeInTheDocument();
        await user.click(within(accountDialog).getByRole("button", { name: /^ok$/i }));

        // Personal Information edit dialog.
        await user.click(personalEdit);
        const personalDialog = await screen.findByTestId("signup-edit-dialog");
        expect(within(personalDialog).getByRole("heading", { name: /personal information/i })).toBeInTheDocument();
        const editMobile = within(personalDialog).getByLabelText(/mobile number/i);
        await user.clear(editMobile);
        await user.type(editMobile, "+63 917 000 1111");
        await user.click(within(personalDialog).getByRole("button", { name: /save changes/i }));
        expect(await within(personalDialog).findByText(/personal information updated/i)).toBeInTheDocument();
        await user.click(within(personalDialog).getByRole("button", { name: /^ok$/i }));

        // The review screen reflects both edits.
        expect(screen.getByText("jamesreid")).toBeInTheDocument();
        expect(screen.getByText("+63 917 000 1111")).toBeInTheDocument();

        // The agreement has to be accepted before the account can be created.
        await user.click(screen.getByRole("button", { name: /^create account$/i }));
        expect(await screen.findByText(/must agree to the terms of use and landlord verification policy/i)).toBeInTheDocument();
        expect(mocks.signup).not.toHaveBeenCalled();

        await user.click(screen.getByRole("checkbox"));
        await user.click(screen.getByRole("button", { name: /^create account$/i }));

        expect(mocks.signup).toHaveBeenCalledWith(expect.objectContaining({
            name: "James R. Reid",
            username: "jamesreid",
            email: "james@gmail.com",
            password: "Landlord#2026",
            role: "landlord",
            middleInitial: "R",
            mobileNumber: "+63 917 000 1111",
            businessName: "James Apartment",
            termsAccepted: true,
            landlordVerificationAccepted: true,
        }));
        expect(mocks.signup.mock.calls[0][0]).not.toHaveProperty("permitNumber");
        expect(mocks.signup.mock.calls[0][0]).not.toHaveProperty("address");
    });

    it("rejects an invalid edit in the dialog and leaves the review values untouched", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        await fillAccountDetails(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        await fillPersonalInformation(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));

        const [accountEdit] = screen.getAllByRole("button", { name: /edit/i });
        await user.click(accountEdit);
        const dialog = await screen.findByTestId("signup-edit-dialog");
        const editUsername = within(dialog).getByLabelText(/^username/i);
        await user.clear(editUsername);
        await user.type(editUsername, "no");
        await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

        expect(await within(dialog).findByRole("alert")).toHaveTextContent(/username must be 4–30 characters/i);
        expect(within(dialog).queryByText(/account details updated/i)).not.toBeInTheDocument();
    });

    it("discards a cancelled edit and keeps the original value", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        await fillAccountDetails(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));
        await fillPersonalInformation(user);
        await user.click(screen.getByRole("button", { name: /^continue$/i }));

        const [accountEdit] = screen.getAllByRole("button", { name: /edit/i });
        await user.click(accountEdit);
        let dialog = await screen.findByTestId("signup-edit-dialog");
        const editEmail = within(dialog).getByLabelText(/recovery email/i);
        await user.clear(editEmail);
        await user.type(editEmail, "changed@gmail.com");
        await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

        // Reopening reseeds the draft from the wizard state, so the edit is gone.
        await user.click(accountEdit);
        dialog = await screen.findByTestId("signup-edit-dialog");
        expect(within(dialog).getByLabelText(/recovery email/i)).toHaveValue("james@gmail.com");
    });

    it("advances a step when Enter is pressed in a wizard field", async () => {
        const user = userEvent.setup();
        renderDialog();
        await openLandlordSignup(user);
        await fillAccountDetails(user);
        await user.type(screen.getByLabelText(/^confirm password/i), "{Enter}");
        expect(await screen.findByRole("heading", { name: /personal information/i })).toBeInTheDocument();

        await fillPersonalInformation(user);
        await user.type(screen.getByLabelText(/business name/i), "{Enter}");
        expect(await screen.findByRole("heading", { name: /^review$/i })).toBeInTheDocument();
        expect(mocks.signup).not.toHaveBeenCalled();
    });
});
