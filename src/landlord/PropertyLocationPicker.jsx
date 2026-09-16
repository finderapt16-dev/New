import "./PropertyLocationPicker.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Label } from "../components/ui/label";
import { geocodeLocationWithinLaPaz, reverseGeocodeWithinLaPaz, GeocodingError } from "../services/geocodingService";
// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
export function PropertyLocationPicker({ lat, lng, onLocationChange, addressQuery = "", geocodeRequestKey = 0, onGeocodeStatusChange, onMapAddressChange, }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const onLocationChangeRef = useRef(onLocationChange);
    const onGeocodeStatusChangeRef = useRef(onGeocodeStatusChange);
    const onMapAddressChangeRef = useRef(onMapAddressChange);
    const reverseControllerRef = useRef(null);
    const coordinatesRef = useRef({ lat, lng });
    const [isClient, setIsClient] = useState(false);
    const [geocodeStatus, setGeocodeStatus] = useState("idle");
    const [matchedAddress, setMatchedAddress] = useState("");
    useEffect(() => {
        onLocationChangeRef.current = onLocationChange;
    }, [onLocationChange]);
    useEffect(() => {
        onGeocodeStatusChangeRef.current = onGeocodeStatusChange;
    }, [onGeocodeStatusChange]);
    useEffect(() => {
        onMapAddressChangeRef.current = onMapAddressChange;
    }, [onMapAddressChange]);
    const updateGeocodeStatus = (status) => {
        setGeocodeStatus(status);
        onGeocodeStatusChangeRef.current?.(status);
    };
    useEffect(() => {
        setIsClient(true);
    }, []);
    useEffect(() => {
        if (!mapRef.current || !isClient || mapInstanceRef.current)
            return;
        // Initialize map
        const map = L.map(mapRef.current).setView([lat, lng], 15);
        mapInstanceRef.current = map;
        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        // Add initial marker
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        const selectMapPoint = async (newLat, newLng) => {
            const previousPoint = coordinatesRef.current;
            marker.setLatLng([newLat, newLng]);
            reverseControllerRef.current?.abort();
            const controller = new AbortController();
            reverseControllerRef.current = controller;
            updateGeocodeStatus("loading");
            try {
                const location = await reverseGeocodeWithinLaPaz(newLat, newLng, controller.signal);
                setMatchedAddress(location.label);
                updateGeocodeStatus("found");
                coordinatesRef.current = { lat: newLat, lng: newLng };
                onLocationChangeRef.current(newLat, newLng);
                onMapAddressChangeRef.current?.(location.label);
            }
            catch (error) {
                if (error instanceof DOMException && error.name === "AbortError")
                    return;
                console.error("Unable to identify the selected map location:", error);
                marker.setLatLng([previousPoint.lat, previousPoint.lng]);
                updateGeocodeStatus(error instanceof GeocodingError && error.reason !== "network" ? "not-found" : "error");
            }
        };
        // Handle map click to move marker
        map.on("click", (e) => {
            const { lat: newLat, lng: newLng } = e.latlng;
            void selectMapPoint(newLat, newLng);
        });
        // Handle marker drag
        marker.on("dragend", () => {
            const position = marker.getLatLng();
            void selectMapPoint(position.lat, position.lng);
        });
        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            reverseControllerRef.current?.abort();
        };
    }, [isClient]);
    // Update marker position when lat/lng props change
    useEffect(() => {
        coordinatesRef.current = { lat, lng };
        if (markerRef.current && mapInstanceRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
        }
    }, [lat, lng]);
    useEffect(() => {
        if (!isClient || geocodeRequestKey === 0)
            return;
        const query = addressQuery.trim().replace(/\s+/g, " ");
        if (query.length < 3) {
            updateGeocodeStatus("not-found");
            setMatchedAddress("");
            return;
        }
        const controller = new AbortController();
        updateGeocodeStatus("loading");
        setMatchedAddress("");
        // Delay each user-triggered lookup so rapid focus changes never flood the public service.
        const timer = window.setTimeout(async () => {
            try {
                const location = await geocodeLocationWithinLaPaz(query, controller.signal);
                updateGeocodeStatus("found");
                setMatchedAddress(location.label);
                onLocationChangeRef.current(location.lat, location.lng);
            }
            catch (error) {
                if (error instanceof DOMException && error.name === "AbortError")
                    return;
                console.error("Unable to locate the entered address:", error);
                updateGeocodeStatus(error instanceof GeocodingError && error.reason !== "network" ? "not-found" : "error");
            }
        }, 500);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [addressQuery, geocodeRequestKey, isClient]);
    if (!isClient) {
        return (<div className="location-picker-row">
        <p className="location-picker-loading-map">Loading map...</p>
      </div>);
    }
    return (<div className="location-picker-panel">
      <Label>Location on Map *</Label>
      <div ref={mapRef} className="location-picker-card"/>
      <p className="location-picker-text">
        Click the map or drag the pin to select the property's exact location.
      </p>
      {geocodeStatus === "loading" && <p className="location-picker-text-2">Finding the entered address on the map...</p>}
      {geocodeStatus === "found" && matchedAddress && <p className="location-picker-map-pinned-to">Map pinned to: {matchedAddress}</p>}
      {geocodeStatus === "not-found" && <p className="location-picker-text-3">We could not find this address on the map. Please check the address or move the marker manually.</p>}
      {geocodeStatus === "error" && <p className="location-picker-text-3">The address lookup is temporarily unavailable. You can still click or drag the map pin.</p>}
      <div className="location-picker-grid">
        <div>
          <span className="location-picker-latitude">Latitude:</span> {lat.toFixed(6)}
        </div>
        <div>
          <span className="location-picker-longitude">Longitude:</span> {lng.toFixed(6)}
        </div>
      </div>
    </div>);
}
