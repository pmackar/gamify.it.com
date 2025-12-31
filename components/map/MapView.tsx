"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Location {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  avgRating?: number | null;
  city?: {
    name: string;
    country: string;
  };
}

interface MapViewProps {
  locations: Location[];
  center?: [number, number];
  zoom?: number;
  onLocationClick?: (locationId: string) => void;
  className?: string;
}

const TYPE_COLORS: Record<string, string> = {
  RESTAURANT: "#ff6b6b",
  BAR: "#9775fa",
  CAFE: "#f0932b",
  ATTRACTION: "#00d2d3",
  HOTEL: "#54a0ff",
  SHOP: "#5f27cd",
  NATURE: "#10ac84",
  TRANSPORT: "#95afc0",
  MUSEUM: "#ee5a24",
  BEACH: "#22a6b3",
  NIGHTLIFE: "#eb2f06",
  OTHER: "#636e72",
};

export default function MapView({
  locations,
  center = [-74.5, 40],
  zoom = 3,
  onLocationClick,
  className = "",
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not configured");
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      markers.current.forEach((m) => m.remove());
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    // Add new markers
    locations.forEach((location) => {
      const el = document.createElement("div");
      el.className = "map-marker";
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background-color: ${TYPE_COLORS[location.type] || TYPE_COLORS.OTHER};
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      `;

      const popupContent = `
        <div style="
          font-family: system-ui, -apple-system, sans-serif;
          padding: 8px;
          min-width: 150px;
        ">
          <h3 style="
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 600;
            color: #fff;
          ">${location.name}</h3>
          <p style="
            margin: 0 0 4px 0;
            font-size: 12px;
            color: #9ca3af;
            text-transform: capitalize;
          ">${location.type.toLowerCase()}</p>
          ${location.city ? `
            <p style="
              margin: 0;
              font-size: 11px;
              color: #6b7280;
            ">${location.city.name}, ${location.city.country}</p>
          ` : ""}
          ${location.avgRating ? `
            <p style="
              margin: 4px 0 0 0;
              font-size: 12px;
              color: #fbbf24;
            ">★ ${location.avgRating.toFixed(1)}</p>
          ` : ""}
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: "custom-popup",
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onLocationClick?.(location.id);
      });

      markers.current.push(marker);
    });

    // Fit bounds if multiple locations
    if (locations.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((loc) => {
        bounds.extend([loc.longitude, loc.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    } else if (locations.length === 1) {
      map.current.flyTo({
        center: [locations[0].longitude, locations[0].latitude],
        zoom: 14,
      });
    }
  }, [locations, mapLoaded, onLocationClick]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px] rounded-xl overflow-hidden" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
        </div>
      )}
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TYPE_COLORS).slice(0, 6).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-400 capitalize">
                {type.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style jsx global>{`
        .mapboxgl-popup-content {
          background: #1f2937 !important;
          border-radius: 8px !important;
          padding: 0 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: #1f2937 !important;
        }
      `}</style>
    </div>
  );
}
