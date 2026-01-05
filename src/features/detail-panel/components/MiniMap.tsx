'use client';

/**
 * MiniMap Component
 *
 * A lightweight MapLibre GL JS wrapper for displaying event locations.
 * Based on Spec.md Section 2.7: Detail Panel
 */

import { useEffect, useRef, memo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { miniMapStyle, getZoomForPrecision, defaultMapSettings } from '@/lib/map-style';

interface MiniMapProps {
  latitude: number;
  longitude: number;
  precision?: 'exact' | 'approximate' | 'region';
  fullHeight?: boolean;
  className?: string;
}

function MiniMapComponent({
  latitude,
  longitude,
  precision = 'approximate',
  fullHeight = false,
  className = '',
}: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: miniMapStyle,
      center: [longitude, latitude],
      zoom: getZoomForPrecision(precision),
      pitch: defaultMapSettings.pitch,
      bearing: defaultMapSettings.bearing,
      interactive: false, // Disable all interactions for mini map
      attributionControl: false,
    });

    // Add marker
    marker.current = new maplibregl.Marker({
      color: '#007AFF',
    })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    // Add minimal attribution
    map.current.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    return () => {
      marker.current?.remove();
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update position when coordinates change
  useEffect(() => {
    if (!map.current || !marker.current) return;

    map.current.flyTo({
      center: [longitude, latitude],
      zoom: getZoomForPrecision(precision),
      duration: 500,
    });

    marker.current.setLngLat([longitude, latitude]);
  }, [latitude, longitude, precision]);

  return (
    <div
      ref={mapContainer}
      className={`w-full overflow-hidden ${fullHeight ? 'h-full' : 'h-32 rounded-lg'} ${className}`}
    />
  );
}

export const MiniMap = memo(MiniMapComponent);
