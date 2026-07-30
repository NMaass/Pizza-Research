import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { api, type PizzaPin } from "../api";
import { Button, StatusMessage } from "../research-ui";

export function PizzaMap() {
  const [pins, setPins] = useState<PizzaPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);

  const loadPins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getPins();
      setPins(result.pins.filter(isValidPin));
    } catch (cause) {
      setPins([]);
      setError(cause instanceof Error ? cause.message : "could not load pizza places");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPins();
  }, [loadPins]);

  useEffect(() => {
    if (!mapRef.current || loading || error) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current).setView([39.8, -98.5], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      leafletMap.current = map;
      markerLayer.current = L.layerGroup().addTo(map);
    }

    const map = leafletMap.current;
    const layer = markerLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();
    for (const pin of pins) {
      const popup = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = pin.name;
      const address = document.createElement("div");
      address.textContent = pin.address;
      popup.append(name, address);

      L.circleMarker([pin.lat, pin.lng], {
        radius: 7,
        weight: 2,
        fillOpacity: 0.7,
      })
        .addTo(layer)
        .bindPopup(popup);
    }

    if (pins.length > 0) {
      const bounds = L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, [error, loading, pins]);

  useEffect(() => {
    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
      markerLayer.current = null;
    };
  }, []);

  return (
    <section className="pizza-map-view" aria-labelledby="map-title">
      <h1 id="map-title" className="pizza-view-title">
        map
      </h1>
      {loading ? (
        <StatusMessage variant="info" title="loading pizza places" />
      ) : error ? (
        <StatusMessage
          variant="error"
          title="could not load pizza places"
          action={<Button onClick={() => void loadPins()}>try again</Button>}
        >
          {error}
        </StatusMessage>
      ) : (
        <>
          <p className="nr-muted">
            {pins.length} pizza {pins.length === 1 ? "place" : "places"} discovered
          </p>
          <div ref={mapRef} className="pizza-map-canvas" aria-label="map of discovered pizza places" />
        </>
      )}
    </section>
  );
}

function isValidPin(pin: PizzaPin): boolean {
  return (
    typeof pin.name === "string" &&
    typeof pin.address === "string" &&
    Number.isFinite(pin.lat) &&
    Number.isFinite(pin.lng) &&
    pin.lat >= -90 &&
    pin.lat <= 90 &&
    pin.lng >= -180 &&
    pin.lng <= 180
  );
}
