import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { hasValidApartmentCoordinates } from "@/utils/mapCoordinates";
import L from "leaflet";
const singleMarkerIcon = createMarkerIcon("available");
function createMarkerIcon(tone, count = 1) {
    return L.divIcon({
        className: "renti-map-marker",
        html: `
      <div class="map-marker map-marker-${tone}">
        <div class="map-marker-center"></div>
      </div>
      ${count > 1 ? `<div class="map-marker-count">${count}</div>` : ""}
    `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -30],
    });
}
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function getMarkerTone(apartment) {
    if (apartment.markerStatus)
        return apartment.markerStatus;
    const status = apartment.status?.toLowerCase();
    const verificationStatus = apartment.verificationStatus?.toLowerCase();
    if (verificationStatus && ["pending", "under_review", "awaiting_approval"].includes(verificationStatus)) {
        return "pending";
    }
    if (apartment.availabilityStatus === "unavailable" ||
        ["archived", "hidden", "inactive", "rejected", "unpublished", "occupied", "maintenance"].includes(status ?? "") ||
        Number(apartment.availableRooms ?? 0) <= 0) {
        return "hidden";
    }
    return apartment.isVerified ? "available" : "hidden";
}
function getGroupTone(apartments) {
    if (apartments.every((apartment) => getMarkerTone(apartment) === "hidden"))
        return "hidden";
    if (apartments.some((apartment) => getMarkerTone(apartment) === "pending"))
        return "pending";
    if (apartments.some((apartment) => getMarkerTone(apartment) === "available"))
        return "available";
    return "hidden";
}
function groupByCoordinates(apartments) {
    const groups = new globalThis.Map();
    apartments.forEach((apartment) => {
        const key = `${apartment.lat.toFixed(6)},${apartment.lng.toFixed(6)}`;
        groups.set(key, [...(groups.get(key) ?? []), apartment]);
    });
    return Array.from(groups.entries()).map(([key, listings]) => {
        const [lat, lng] = key.split(",").map(Number);
        return { key, lat, lng, listings };
    });
}
function buildPopup(apartment) {
    const image = apartment.image
        ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}" class="map-popup-image" />`
        : `<div class="map-popup-image-placeholder">No image</div>`;
    const availableRooms = Number(apartment.availableRooms ?? 0);
    const verifiedBadge = apartment.isVerified
        ? `<span class="map-popup-badge map-popup-badge-verified">Verified</span>`
        : `<span class="map-popup-badge map-popup-badge-unverified">Unverified</span>`;
    const availabilityClass = availableRooms > 0 ? "map-popup-badge-available" : "map-popup-badge-unavailable";
    const rentLabel = Number(apartment.price || 0) > 0
        ? `₱${Number(apartment.price || 0).toLocaleString("en-PH")}/mo`
        : "Room prices";
    const location = apartment.location || "Location not provided";
    return `
    <div class="map-popup-card">
      ${image}
      <div class="map-popup-header">
        <div class="map-popup-main">
          <div class="map-popup-title">${escapeHtml(apartment.title)}</div>
          <div class="map-popup-location">${escapeHtml(location)}</div>
        </div>
        <div class="map-popup-price">${escapeHtml(rentLabel)}</div>
      </div>
      <div class="map-popup-badges">
        ${verifiedBadge}
        <span class="map-popup-badge ${availabilityClass}">
          ${availableRooms} ${availableRooms === 1 ? "room" : "rooms"} available
        </span>
      </div>
      <div class="map-popup-meta">
        <span>${Number(apartment.bedrooms || 0)} bed</span>
        <span>${Number(apartment.bathrooms || 0)} bath</span>
      </div>
      <button type="button" class="map-view-details map-popup-details" data-id="${escapeHtml(apartment.id)}">
        View Details
      </button>
    </div>
  `;
}
function buildGroupPopup(apartments) {
    if (apartments.length === 1)
        return buildPopup(apartments[0]);
    const items = apartments.map((apartment) => {
        const availableRooms = Number(apartment.availableRooms ?? 0);
        const verifiedBadge = apartment.isVerified
            ? `<span class="map-popup-badge map-popup-badge-small map-popup-badge-verified">Verified</span>`
            : `<span class="map-popup-badge map-popup-badge-small map-popup-badge-unverified">Unverified</span>`;
        const availabilityClass = availableRooms > 0 ? "map-popup-badge-available" : "map-popup-badge-unavailable";
        return `
      <div class="map-popup-list-item">
        ${apartment.image
            ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}" class="map-popup-list-image" />`
            : `<div class="map-popup-list-placeholder"></div>`}
        <div class="map-popup-list-content">
          <div class="map-popup-list-title">${escapeHtml(apartment.title)}</div>
          <div class="map-popup-list-location">${escapeHtml(apartment.location || "Location not provided")}</div>
          <div class="map-popup-list-price">${Number(apartment.price || 0) > 0 ? `₱${Number(apartment.price || 0).toLocaleString("en-PH")}/mo` : "Room prices"}</div>
          <div class="map-popup-list-badges">
            ${verifiedBadge}
            <span class="map-popup-badge map-popup-badge-small ${availabilityClass}">${availableRooms} rooms</span>
          </div>
          <button type="button" class="map-view-details map-popup-list-details" data-id="${escapeHtml(apartment.id)}">
            View Details
          </button>
        </div>
      </div>
    `;
    }).join("");
    return `
    <div class="map-popup-group">
      <div class="map-popup-group-title">${apartments.length} apartments at this location</div>
      <div class="map-popup-group-description">These listings share the same landlord-submitted coordinates.</div>
      ${items}
    </div>
  `;
}
export function MapView({ lat, lng, zoom = 13, apartments = [], showSingleMarker = false, emptyMessage = "No apartments found on the map. Try adjusting your filters.", }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const navigate = useNavigate();
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current)
            return;
        const map = L.map(mapRef.current).setView([lat, lng], zoom);
        mapInstanceRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        if (showSingleMarker) {
            L.marker([lat, lng], { icon: singleMarkerIcon }).addTo(map).bindPopup("Location");
        }
        else {
            const validApartments = apartments.filter((apartment) => hasValidApartmentCoordinates(apartment.lat, apartment.lng));
            if (validApartments.length === 0) {
                L.popup({ closeButton: false, closeOnClick: false, autoClose: false })
                    .setLatLng([lat, lng])
                    .setContent(`<div class="map-popup-empty">${escapeHtml(emptyMessage)}</div>`)
                    .openOn(map);
            }
            else {
                const groups = groupByCoordinates(validApartments);
                const bounds = L.latLngBounds(groups.map((group) => [group.lat, group.lng]));
                groups.forEach((group) => {
                    const marker = L.marker([group.lat, group.lng], { icon: createMarkerIcon(getGroupTone(group.listings), group.listings.length) }).addTo(map);
                    marker.bindPopup(buildGroupPopup(group.listings));
                    marker.on("popupopen", () => {
                        const popupElement = marker.getPopup()?.getElement();
                        popupElement?.querySelectorAll(".map-view-details").forEach((detailsButton) => {
                            detailsButton.addEventListener("click", () => {
                                const apartmentId = detailsButton.getAttribute("data-id");
                                if (apartmentId)
                                    navigate(`/apartment/${apartmentId}`);
                            });
                        });
                    });
                });
                if (groups.length === 1) {
                    map.setView([groups[0].lat, groups[0].lng], Math.max(zoom, 15));
                }
                else {
                    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
                }
            }
        }
        setTimeout(() => map.invalidateSize(), 0);
        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [lat, lng, zoom, apartments, showSingleMarker, navigate, emptyMessage]);
    return <div ref={mapRef} className="map-view-container"/>;
}
