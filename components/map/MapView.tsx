'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface LocationData {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  avgRating?: number | null;
  userVisited?: boolean;
  userHotlist?: boolean;
  city?: {
    name: string;
    country: string;
  };
}

interface MapViewProps {
  locations?: LocationData[];
  onLocationClick?: (location: LocationData) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  className?: string;
  interactive?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export function MapView({
  locations = [],
  onLocationClick,
  onMapClick,
  className = '',
  interactive = true,
  initialCenter = [0, 20],
  initialZoom = 2,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: initialZoom,
      interactive,
    });

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    }

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initialCenter, initialZoom, interactive, onMapClick]);

  // Create marker element
  const createMarkerElement = useCallback(
    (location: LocationData, isSelected: boolean) => {
      const el = document.createElement('div');
      el.className = 'marker';

      const isHotlisted = location.userHotlist;
      const isVisited = location.userVisited;

      let bgColor = '#FFD700'; // Gold default
      let borderColor = '#CC8800';

      if (isVisited) {
        bgColor = '#00ff00'; // Green for visited
        borderColor = '#00aa00';
      } else if (isHotlisted) {
        bgColor = '#ff4444'; // Red for hotlisted
        borderColor = '#cc0000';
      }

      el.style.cssText = `
        width: ${isSelected ? '24px' : '20px'};
        height: ${isSelected ? '24px' : '20px'};
        background: ${bgColor};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 ${isSelected ? '15px' : '8px'} ${bgColor}80;
        transition: all 0.2s ease;
        ${isSelected ? 'transform: scale(1.3); z-index: 10;' : ''}
      `;

      return el;
    },
    []
  );

  // Update markers when locations change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers that are no longer in locations
    const currentIds = new Set(locations.map((l) => l.id));
    markers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers
    locations.forEach((location) => {
      const isSelected = selectedLocationId === location.id;
      const existingMarker = markers.current.get(location.id);

      if (existingMarker) {
        // Update existing marker
        const el = createMarkerElement(location, isSelected);
        const oldEl = existingMarker.getElement();
        oldEl.style.cssText = el.style.cssText;
        existingMarker.setLngLat([location.longitude, location.latitude]);
      } else {
        // Create new marker
        const el = createMarkerElement(location, isSelected);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedLocationId(location.id);
          onLocationClick?.(location);

          // Dispatch custom event for modal
          window.dispatchEvent(
            new CustomEvent('openLocationDetail', { detail: location.id })
          );
        });

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.3)';
          el.style.zIndex = '10';
        });

        el.addEventListener('mouseleave', () => {
          if (selectedLocationId !== location.id) {
            el.style.transform = 'scale(1)';
            el.style.zIndex = '1';
          }
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map.current!);

        markers.current.set(location.id, marker);
      }
    });
  }, [locations, selectedLocationId, createMarkerElement, onLocationClick]);

  // Fly to selected location
  useEffect(() => {
    if (!map.current || !selectedLocationId) return;

    const location = locations.find((l) => l.id === selectedLocationId);
    if (location) {
      map.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: Math.max(map.current.getZoom(), 14),
        duration: 1000,
      });
    }
  }, [selectedLocationId, locations]);

  // Fit bounds to all locations on initial load
  useEffect(() => {
    if (!map.current || locations.length === 0) return;

    const validLocations = locations.filter(
      (l) => l.latitude !== 0 || l.longitude !== 0
    );

    if (validLocations.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    validLocations.forEach((loc) => {
      bounds.extend([loc.longitude, loc.latitude]);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 12,
      duration: 1000,
    });
  }, [locations.length > 0]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full min-h-[400px] ${className}`}
      style={{ background: '#1a1a1a' }}
    />
  );
}

export default MapView;
