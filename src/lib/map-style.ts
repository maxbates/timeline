/**
 * Map Style Configuration
 *
 * Minimal map style for the detail panel mini-map.
 * Uses Stadia Maps free tier (200k tiles/month).
 * Based on Spec.md Section 2.7: Detail Panel
 */

import type { StyleSpecification } from 'maplibre-gl';

/**
 * Stadia Maps base URL for tiles
 * Free tier: 200,000 map tiles/month
 * Sign up at: https://stadiamaps.com/
 */
const STADIA_BASE_URL = 'https://tiles.stadiamaps.com';

/**
 * Minimal light map style for event location display
 */
export const miniMapStyle: StyleSpecification = {
  version: 8,
  name: 'Mini Map Style',
  sources: {
    'stadia-tiles': {
      type: 'raster',
      tiles: [`${STADIA_BASE_URL}/tiles/alidade_smooth/{z}/{x}/{y}@2x.png`],
      tileSize: 512,
      attribution:
        '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f8f9fa',
      },
    },
    {
      id: 'stadia-tiles-layer',
      type: 'raster',
      source: 'stadia-tiles',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

/**
 * Default map view settings
 */
export const defaultMapSettings = {
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

/**
 * Get appropriate zoom level based on location precision
 */
export function getZoomForPrecision(precision: 'exact' | 'approximate' | 'region'): number {
  switch (precision) {
    case 'exact':
      return 12;
    case 'approximate':
      return 8;
    case 'region':
      return 4;
    default:
      return 6;
  }
}
