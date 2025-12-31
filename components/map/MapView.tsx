'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/stores/map-store';
import { LocationListItem } from '@/types';

// Set Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapViewProps {
  locations?: LocationListItem[];
  onLocationClick?: (location: LocationListItem) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  className?: string;
  interactive?: boolean;
}

export function MapView({
  locations = [],
  onLocationClick,
  onMapClick,
  className = '',
  interactive = true,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());

  const {
    center,
    zoom,
    selectedLocationId,
    hoveredLocationId,
    setCenter,
    setZoom,
    setBounds,
    setMapLoaded,
    selectLocation,
  } = useMapStore();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme to match retro aesthetic
      center,
      zoom,
      interactive,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    map.current.on('moveend', () => {
      if (!map.current) return;
      const mapCenter = map.current.getCenter();
      setCenter([mapCenter.lng, mapCenter.lat]);
      setZoom(map.current.getZoom());

      const bounds = map.current.getBounds();
      if (bounds) {
        setBounds([
          [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
          [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
        ]);
      }
    });

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
    }

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocation control
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
  }, []);

  // Create marker element
  const createMarkerElement = useCallback(
    (location: LocationListItem, isSelected: boolean, isHovered: boolean) => {
      const el = document.createElement('div');
      el.className = 'marker';

      // Determine marker style based on user data
      const isHotlisted = location.userSpecific?.hotlist;
      const isVisited = location.userSpecific?.visited;

      let bgColor = '#FFD700'; // Gold default
      let borderColor = '#CC8800';

      if (isVisited) {
        bgColor = '#00ff00'; // Green for visited
        borderColor = '#00aa00';
      } else if (isHotlisted) {
        bgColor = '#ff4444'; // Red for hotlisted
        borderColor = '#cc0000';
      }

      if (isSelected || isHovered) {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '10';
      }

      el.style.cssText = `
        width: ${isSelected ? '24px' : '20px'};
        height: ${isSelected ? '24px' : '20px'};
        background: ${bgColor};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 ${isSelected || isHovered ? '15px' : '8px'} ${bgColor}80;
        transition: all 0.2s ease;
        ${isSelected || isHovered ? 'transform: scale(1.3);' : ''}
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
      const isHovered = hoveredLocationId === location.id;
      const existingMarker = markers.current.get(location.id);

      if (existingMarker) {
        // Update existing marker
        const el = createMarkerElement(location, isSelected, isHovered);
        existingMarker.getElement().replaceWith(el);
        existingMarker.setLngLat([location.longitude, location.latitude]);
      } else {
        // Create new marker
        const el = createMarkerElement(location, isSelected, isHovered);

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selectLocation(location.id);
          onLocationClick?.(location);
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
  }, [locations, selectedLocationId, hoveredLocationId, createMarkerElement, onLocationClick, selectLocation]);

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

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full min-h-[400px] ${className}`}
      style={{ background: '#1a1a1a' }}
    />
  );
}

export default MapView;
