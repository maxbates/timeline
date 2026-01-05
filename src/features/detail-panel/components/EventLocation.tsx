'use client';

/**
 * EventLocation Component
 *
 * Displays event location with name and optional mini map.
 * Based on Spec.md Section 2.7: Detail Panel
 */

import { memo } from 'react';
import type { EventLocation as EventLocationType } from '@/types';
import { MiniMap } from './MiniMap';

interface EventLocationProps {
  location: EventLocationType;
  mapOnly?: boolean;
  fullHeight?: boolean;
}

function EventLocationComponent({
  location,
  mapOnly = false,
  fullHeight = false,
}: EventLocationProps) {
  const hasCoordinates = location.latitude !== undefined && location.longitude !== undefined;

  // If mapOnly mode, just show the map filling the space
  if (mapOnly && hasCoordinates) {
    return (
      <div className="h-full w-full">
        <MiniMap
          latitude={location.latitude!}
          longitude={location.longitude!}
          precision="approximate"
          fullHeight={fullHeight}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-500">Location</h4>

      {/* Location name */}
      <div className="flex items-center gap-2 text-gray-700">
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="text-sm">{location.name}</span>
      </div>

      {/* Mini map (only if coordinates are available) */}
      {hasCoordinates && (
        <MiniMap
          latitude={location.latitude!}
          longitude={location.longitude!}
          precision="approximate"
        />
      )}
    </div>
  );
}

export const EventLocation = memo(EventLocationComponent);
