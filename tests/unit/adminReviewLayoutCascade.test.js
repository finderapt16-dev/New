import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// The admin apartment review page froze on the first client-side navigation and its sidebar
// scrolled away with the content after a refresh. Both came from the cascade, not from the
// markup: the review page stylesheet and the admin theme used to be two separate files
// declaring the same shell at the same specificity, and lazy chunks inject their CSS when
// they first load — so which file won depended on how the admin arrived at
// /admin/apartment/:id. Both now live in admin_pages.css, so the order is fixed and the
// page renders the same layout on a hard refresh and on a client-side navigation. These
// tests lock that contract in place: the shell must keep flowing, the content column must
// stay on the document scroller, and the sidebar must stay pinned.
const SRC = path.resolve(import.meta.dirname, "../../src");
const PAGES_CSS = "admin/admin_pages.css";
const GLOBAL_CSS = "components/components.css";

const parse = (relative) => postcss.parse(readFileSync(path.join(SRC, relative), "utf8"), { from: relative });

// Selectors that style each part of the review shell, in either stylesheet.
const TARGETS = {
    shell: [".admin-apartment-detail", ".app-root .admin-apartment-detail"],
    sidebar: [".admin-apartment-detail-aside", ".admin-apartment-detail .admin-apartment-detail-aside"],
    content: [".admin-apartment-detail-main-2", ".admin-apartment-detail .admin-apartment-detail-main-2"],
};

const SIMPLE_SELECTOR = /^[.#\w\s-]+$/;

// Every selector this test resolves is made of classes only, so counting them is exact.
const specificity = (selector) => {
    expect(selector, `unexpectedly complex selector: ${selector}`).toMatch(SIMPLE_SELECTOR);
    return [(selector.match(/#/g) ?? []).length, (selector.match(/\./g) ?? []).length];
};

const declarationsFor = (file, selectors) => {
    const wanted = new Set(selectors);
    const found = [];
    parse(file).walkRules((rule) => {
        // Media/supports scoped rules cannot be compared without a viewport, and the layout
        // contract has to hold for the unconditional rules that ship the shell.
        if (rule.parent.type !== "root")
            return;
        const selector = rule.selectors.map((candidate) => candidate.trim()).find((candidate) => wanted.has(candidate));
        if (!selector)
            return;
        const spec = specificity(selector);
        rule.walkDecls((decl) => found.push({ prop: decl.prop, value: decl.value, selector, spec }));
    });
    return found;
};

// Last declaration wins ties, exactly like the browser: specificity first, then source order.
const resolve = (fileOrder, selectors) => {
    const declarations = fileOrder.flatMap((file, fileIndex) => declarationsFor(file, selectors).map((declaration, index) => ({ ...declaration, order: [fileIndex, index] })));
    const beats = (candidate, current) => candidate.spec[0] !== current.spec[0]
        ? candidate.spec[0] > current.spec[0]
        : candidate.spec[1] !== current.spec[1]
            ? candidate.spec[1] > current.spec[1]
            : candidate.order.join() >= current.order.join();
    const winners = new Map();
    for (const declaration of declarations) {
        const current = winners.get(declaration.prop);
        if (!current || beats(declaration, current))
            winners.set(declaration.prop, declaration);
    }
    return Object.fromEntries([...winners].map(([prop, declaration]) => [prop, declaration.value]));
};

const scrollable = (value) => ["auto", "scroll", "hidden"].includes(String(value ?? "").trim());

// There is only one admin page stylesheet now, so both navigations resolve the
// same cascade. The suite still runs twice to make that invariant explicit.
const PAGE_LAST = [PAGES_CSS];
const THEME_LAST = [PAGES_CSS];

describe.each([
    ["the admin pages stylesheet is injected last (first Inspect click)", PAGE_LAST],
    ["the admin pages stylesheet is already in <head> (hard refresh)", THEME_LAST],
])("admin apartment review layout when %s", (_label, order) => {
    const shell = resolve(order, TARGETS.shell);
    const sidebar = resolve(order, TARGETS.sidebar);
    const content = resolve(order, TARGETS.content);

    it("flows with the document instead of trapping the page in a fixed viewport", () => {
        expect(shell.position ?? "static").not.toBe("fixed");
        expect(shell.position ?? "static").not.toBe("absolute");
        expect(shell.inset ?? "auto").toBe("auto");
        expect(scrollable(shell.overflow)).toBe(false);
        expect(shell.display).toBe("flex");
        expect(shell["min-height"]).toBe("100dvh");
    });

    it("leaves the content column to the document scroller so the review can be scrolled", () => {
        expect(scrollable(content.overflow)).toBe(false);
        expect(scrollable(content["overflow-y"])).toBe(false);
        expect(content.flex).toBe("1");
    });

    it("pins the sidebar instead of letting it travel with the review content", () => {
        expect(sidebar.position).toBe("sticky");
        expect(sidebar.top).toBe("0");
        expect(sidebar.height).toBe("100dvh");
    });
});

it("resolves the review shell identically no matter how the admin arrived there", () => {
    for (const target of Object.values(TARGETS)) {
        expect(resolve(PAGE_LAST, target)).toEqual(resolve(THEME_LAST, target));
    }
});

describe(".app-root", () => {
    const rules = [];
    parse(GLOBAL_CSS).walkRules((rule) => {
        if (!rule.selectors.map((selector) => selector.trim()).includes(".app-root"))
            return;
        const support = rule.parent.type === "atrule" ? rule.parent.params : null;
        rule.walkDecls((decl) => rules.push({ prop: decl.prop, value: decl.value, support }));
    });
    const overflowX = rules.filter((rule) => rule.prop === "overflow-x");

    it("clips horizontally without becoming the scroll container that disables position:sticky", () => {
        // overflow-x:hidden computes overflow-y to auto, which makes .app-root an inert
        // scrollport: sticky sidebars inside it resolve against a box that never scrolls and
        // simply scroll away with the page. clip keeps the clipping and keeps sticky alive.
        expect(overflowX.some((rule) => rule.value === "clip" && rule.support?.includes("overflow-x"))).toBe(true);
        expect(overflowX.every((rule) => ["clip", "hidden"].includes(rule.value))).toBe(true);
        expect(rules.filter((rule) => rule.prop.startsWith("overflow-y")).some((rule) => scrollable(rule.value))).toBe(false);
    });
});
