import { useEffect, useState } from "react";
import { DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const amenities = [["petFriendly", "Pet Friendly"], ["parking", "Parking"], ["ownBathroom", "Own Bathroom"], ["wifi", "Wi-Fi"], ["ac", "Air Conditioning"], ["laundryArea", "Laundry Area"]];
const empty = { preferredArea: "", minBudget: "", maxBudget: "", minBedrooms: "any", roomCapacity: "any", petFriendly: false, parking: false, ownBathroom: false, wifi: false, ac: false, laundryArea: false };

export function Preferences({ open, preferences, onSave }) {
    const [draft, setDraft] = useState(empty);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        if (!open) return;
        setDraft({ ...empty, ...preferences, minBudget: preferences.saveBudgetPreferences && preferences.minBudget ? String(preferences.minBudget) : "", maxBudget: preferences.saveBudgetPreferences && preferences.maxBudget ? String(preferences.maxBudget) : "" });
        setError("");
    }, [open, preferences]);
    const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
    const save = async event => {
        event.preventDefault();
        if (saving) return;
        const minBudget = Number(draft.minBudget || 0);
        const maxBudget = Number(draft.maxBudget || 0);
        if (![minBudget, maxBudget].every(value => Number.isFinite(value) && value >= 0)) {
            setError("Enter valid, non-negative prices."); return;
        }
        if (draft.maxBudget !== "" && minBudget > maxBudget) {
            setError("Minimum price cannot be higher than maximum price."); return;
        }
        setSaving(true); setError("");
        try {
            await onSave({ ...draft, preferredArea: draft.preferredArea.trim(), minBudget, maxBudget, furnished: false, recommendationLocation: true, saveBudgetPreferences: minBudget > 0 || maxBudget > 0 });
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Unable to save preferences. Please try again.");
        } finally { setSaving(false); }
    };
    const choices = (key, title, labels) => <fieldset className="tenant-filter-group">
        <legend>{title}</legend>
        <div className="tenant-filter-choices">{["any", "1", "2", "3", "4+"].map((value, index) => <button key={value} type="button" aria-pressed={draft[key] === value} onClick={() => change(key, value)}>{labels[index]}</button>)}</div>
    </fieldset>;
    return <DialogContent className="tenant-search-filters" onEscapeKeyDown={event => { if (saving) event.preventDefault(); }} onPointerDownOutside={event => { if (saving) event.preventDefault(); }}>
        <DialogTitle>Search Filters</DialogTitle>
        <DialogDescription>Adjust your preferences to personalize apartment recommendations.</DialogDescription>
        <form onSubmit={save}>
            <fieldset disabled={saving} className="tenant-filter-fields">
                <label className="tenant-filter-location">Preferred location<input value={draft.preferredArea} onChange={event => change("preferredArea", event.target.value)} placeholder="e.g., La Paz, Iloilo City" /></label>
                <fieldset className="tenant-filter-group"><legend>Price Range</legend><div className="tenant-filter-prices">
                    <label>Min Price (₱)<input type="number" min="0" step="any" inputMode="decimal" placeholder="Min Price" value={draft.minBudget} onChange={event => change("minBudget", event.target.value)} /></label>
                    <label>Max Price (₱)<input type="number" min="0" step="any" inputMode="decimal" placeholder="Max Price" value={draft.maxBudget} onChange={event => change("maxBudget", event.target.value)} /></label>
                </div></fieldset>
                {choices("minBedrooms", "Bedrooms", ["Any", "1", "2", "3", "4+"])}
                {choices("roomCapacity", "Room Capacity", ["Any", "1 person", "2 people", "3 people", "4+ people"])}
                <fieldset className="tenant-filter-group"><legend>Amenities</legend><div className="tenant-filter-amenities">{amenities.map(([key, label]) => <button key={key} type="button" aria-pressed={Boolean(draft[key])} onClick={() => change(key, !draft[key])}>{label}</button>)}</div></fieldset>
                {error && <p role="alert" className="tenant-filter-error">{error}</p>}
                <div className="tenant-filter-actions"><button type="button" onClick={() => { setDraft({ ...empty }); setError(""); }}>Clear all</button><button type="submit">{saving ? "Saving…" : "Save"}</button></div>
            </fieldset>
        </form>
    </DialogContent>;
}
