import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeocodingError, reverseGeocodeWithinLaPaz } from "@/services/geocodingService";

// Points inside the supported La Paz bounds.
const LUNA_STREET_POINT = { lat: 10.70882, lng: 122.56659 };
const NABITASAN_POINT = { lat: 10.7050, lng: 122.5631 };

const mockReverseResponse = (payload) => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => payload,
  })));
};

describe("reverseGeocodeWithinLaPaz address parts", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the barangay and street resolved for the pinned point", async () => {
    mockReverseResponse({
      display_name: "Luna Street, Nabitasan, La Paz, Iloilo City, Western Visayas, Philippines",
      address: {
        road: "Luna Street",
        suburb: "Nabitasan",
        city: "Iloilo City",
        state: "Western Visayas",
        postcode: "5000",
        country: "Philippines",
      },
    });

    const result = await reverseGeocodeWithinLaPaz(LUNA_STREET_POINT.lat, LUNA_STREET_POINT.lng);

    expect(result.address.barangay).toBe("Nabitasan");
    expect(result.address.street).toBe("Luna Street");
    expect(result.address.city).toBe("Iloilo City");
    expect(result.address.zip).toBe("5000");
  });

  it("canonicalizes barangay aliases to their La Paz reference names", async () => {
    mockReverseResponse({
      display_name: "Magsaysay, La Paz, Iloilo City",
      address: { suburb: "Brgy. Magsaysay", city: "Iloilo City" },
    });

    const result = await reverseGeocodeWithinLaPaz(10.70986, 122.56213);

    expect(result.address.barangay).toBe("Magsaysay Village");
  });

  it("prefixes the house number when OpenStreetMap provides one", async () => {
    mockReverseResponse({
      display_name: "Luna Street, Nabitasan, La Paz, Iloilo City",
      address: { house_number: "12", road: "Luna Street", neighbourhood: "Nabitasan" },
    });

    // A distinct point keeps this case out of the module-level reverse cache.
    const result = await reverseGeocodeWithinLaPaz(LUNA_STREET_POINT.lat + 0.0001, LUNA_STREET_POINT.lng + 0.0001);

    expect(result.address.street).toBe("12 Luna Street");
  });

  it("falls back to the display name when no street key is tagged", async () => {
    mockReverseResponse({
      display_name: "Nabitasan, La Paz, Iloilo City, Western Visayas, Philippines",
      address: { suburb: "Nabitasan" },
    });

    const result = await reverseGeocodeWithinLaPaz(NABITASAN_POINT.lat, NABITASAN_POINT.lng);

    expect(result.address.street).toBe("");
    expect(result.address.barangay).toBe("Nabitasan");
  });

  it("uses the closest La Paz reference point when the barangay is not tagged", async () => {
    mockReverseResponse({
      display_name: "Railway, La Paz, Iloilo City, Western Visayas, Philippines",
      address: { city: "Iloilo City", state: "Western Visayas" },
    });

    const result = await reverseGeocodeWithinLaPaz(10.70990, 122.56797);

    expect(result.address.barangay).toBe("Railway");
  });

  it("skips the generic district value when another key holds the barangay", async () => {
    mockReverseResponse({
      display_name: "Nabitasan, La Paz, Iloilo City, Western Visayas, Philippines",
      address: {
        suburb: "La Paz",
        neighbourhood: "Nabitasan",
        city: "Iloilo City",
      },
    });

    const result = await reverseGeocodeWithinLaPaz(10.7051, 122.5632);

    expect(result.address.barangay).toBe("Nabitasan");
  });

  it("reads a street name out of the display name when only a landmark is tagged", async () => {
    mockReverseResponse({
      display_name: "Gaisano La Paz, Luna Street, La Paz, Iloilo City",
      address: { city: "Iloilo City" },
    });

    const result = await reverseGeocodeWithinLaPaz(10.70703, 122.56659);

    expect(result.address.street).toBe("Luna Street");
  });

  it("does not mistake a place name ending in St. for a street", async () => {
    mockReverseResponse({
      display_name: "St. Clement's Church, Luna Street, La Paz, Iloilo City",
      address: { city: "Iloilo City" },
    });

    const result = await reverseGeocodeWithinLaPaz(10.709997, 122.565041);

    expect(result.address.street).toBe("Luna Street");
  });

  it("rejects points outside the supported La Paz area", async () => {
    await expect(reverseGeocodeWithinLaPaz(10.75, 122.60)).rejects.toBeInstanceOf(GeocodingError);
  });
});
