import { useState, useEffect, useRef } from "react";
import { api, type PizzaPin } from "../api";
import L from "leaflet";

export function PizzaMap() {
  const [pins, setPins] = useState<PizzaPin[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    api
      .getPins()
      .then((r) => setPins(r.pins))
      .catch(() => setPins([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapRef.current || loading) return;

    // Initialize map if not already
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([39.8, -98.5], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add pin markers
    for (const pin of pins) {
      L.marker([pin.lat, pin.lng])
        .addTo(map)
        .bindPopup(`<b>${pin.name}</b><br/>${pin.address}`);
    }

    // Fit bounds if we have pins
    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }

    return () => {};
  }, [pins, loading]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "1rem 1.25rem" }}>
        <p style={{ fontSize: "0.875rem", color: "#666" }}>
          {loading
            ? "loading pins..."
            : `${pins.length} pizza ${pins.length === 1 ? "place" : "places"} discovered`}
        </p>
      </div>
      <div
        ref={mapRef}
        style={{
          flex: 1,
          minHeight: "400px",
        }}
      />
    </div>
  );
}
