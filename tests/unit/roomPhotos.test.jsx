import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MultiImageUploader } from "../../src/components/MultiImageUploader";
import { toast } from "sonner";
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
function Harness({ disabled = false, maxImages = 10, compact = true }) {
    const [images, setImages] = useState([]);
    return <MultiImageUploader images={images} onImagesChange={setImages} compact={compact} disabled={disabled} maxImages={maxImages} />;
}
beforeEach(() => vi.clearAllMocks());
const png = (name) => new File(["png"], name, { type: "image/png" });

describe("shared photo uploader compact mode", () => {
    it("supports cover selection, keyboard-accessible reordering, and removal", async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.upload(screen.getByLabelText("Select room photos"), [png("one.png"), png("two.png")]);
        expect(screen.getByRole("button", { name: "Set photo 1 as cover" })).toHaveAttribute("aria-pressed", "true");
        const original = screen.getByAltText("Room photo 1 (cover)").getAttribute("src");
        await user.click(screen.getByRole("button", { name: "Set photo 2 as cover" }));
        expect(screen.getByAltText("Room photo 1 (cover)").getAttribute("src")).not.toBe(original);
        await user.click(screen.getByRole("button", { name: "Move photo 1 later" }));
        expect(screen.getByAltText("Room photo 1 (cover)").getAttribute("src")).toBe(original);
        await user.click(screen.getByRole("button", { name: "Remove photo 1" }));
        expect(screen.getAllByRole("img")).toHaveLength(1);
        expect(screen.getByAltText("Room photo 1 (cover)")).toBeVisible();
    });
    it("rejects unsupported, oversized, empty, and duplicate files", async () => {
        const user = userEvent.setup({ applyAccept: false });
        render(<Harness />);
        const picker = screen.getByLabelText("Select room photos");
        await user.upload(picker, new File(["pdf"], "bad.pdf", { type: "application/pdf" }));
        await user.upload(picker, new File([new Uint8Array(5 * 1024 * 1024 + 1)], "huge.png", { type: "image/png" }));
        await user.upload(picker, new File([], "empty.png", { type: "image/png" }));
        expect(screen.queryAllByRole("img")).toHaveLength(0);
        const file = png("one.png");
        await user.upload(picker, file);
        await user.upload(picker, file);
        expect(screen.getAllByRole("img")).toHaveLength(1);
        expect(toast.error).toHaveBeenCalledTimes(4);
    });
    it("enforces the total photo limit for dropped files", () => {
        render(<Harness maxImages={2} />);
        const dropzone = screen.getByRole("button", { name: "Upload room photos" }).parentElement;
        fireEvent.drop(dropzone, { dataTransfer: { files: [png("one.png"), png("two.png"), png("three.png")] } });
        expect(screen.getAllByRole("img")).toHaveLength(2);
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Maximum 2 images"));
    });
    it("does not accept dropped files while saving", () => {
        render(<Harness disabled />);
        const browse = screen.getByRole("button", { name: "Upload room photos" });
        expect(browse).toBeDisabled();
        fireEvent.drop(browse.parentElement, { dataTransfer: { files: [png("one.png")] } });
        expect(screen.queryAllByRole("img")).toHaveLength(0);
    });
});


describe("existing full-size uploader compatibility", () => {
    it("retains property-photo browsing, gallery navigation, and removal", async () => {
        const user = userEvent.setup();
        render(<Harness compact={false} />);
        await user.upload(screen.getByLabelText("Select images"), [png("one.png"), png("two.png")]);
        expect(screen.getByAltText("Photo 1")).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Next photo", exact: true }));
        expect(screen.getByAltText("Photo 2")).toBeVisible();
        await user.click(screen.getByRole("button", { name: "Remove photo 2" }));
        expect(screen.getByAltText("Photo 1")).toBeVisible();
        expect(screen.getByRole("button", { name: "Set photo 1 as cover" })).toHaveAttribute("aria-pressed", "true");
    });
    it("stops a late camera stream if the user leaves before granting permission", async () => {
        let finishPermission;
        const stop = vi.fn();
        Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
            getUserMedia: vi.fn(() => new Promise((resolve) => { finishPermission = resolve; })),
        } });
        const user = userEvent.setup();
        const { unmount } = render(<Harness compact={false} />);
        await user.click(screen.getByRole("button", { name: "Take Photo" }));
        unmount();
        await act(async () => finishPermission({ getTracks: () => [{ stop }] }));
        expect(stop).toHaveBeenCalledTimes(1);
    });
});
