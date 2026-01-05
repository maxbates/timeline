'use client';

/**
 * TimeAxis Component
 *
 * Renders the time axis with adaptive labels based on zoom level.
 * Based on Spec.md Section 2.6: Time Axis
 */

import { memo, useMemo } from 'react';
import type { TimelineBounds } from '@/types';
import { generateAxisTicks } from '../utils/bounds';

interface TimeAxisProps {
  bounds: TimelineBounds;
  width: number;
  height?: number;
  dateToX: (date: string) => number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

const AXIS_HEIGHT = 40;
const TICK_HEIGHT = 8;
const TRACK_LABEL_WIDTH = 200;

function TimeAxisComponent({
  bounds,
  width,
  height = AXIS_HEIGHT,
  dateToX,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: TimeAxisProps) {
  // Generate tick marks based on bounds
  const ticks = useMemo(() => generateAxisTicks(bounds), [bounds]);

  // Calculate timeline canvas width (excluding track label area)
  const timelineWidth = width - TRACK_LABEL_WIDTH;

  return (
    <div className="flex border-b border-gray-200 bg-gray-50" style={{ height }}>
      {/* Track label spacer - matches track label width */}
      <div
        className="flex flex-shrink-0 items-center justify-center border-r border-gray-200 bg-gray-50"
        style={{ width: TRACK_LABEL_WIDTH }}
      >
        {/* Zoom controls */}
        {(onZoomIn || onZoomOut || onResetZoom) && (
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm">
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
                title="Zoom in (+)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            )}
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
                title="Zoom out (-)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                </svg>
              </button>
            )}
            {onResetZoom && (
              <button
                onClick={onResetZoom}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
                title="Reset zoom (0)"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timeline axis - aligned with events */}
      <div className="relative flex-1">
        <svg width={timelineWidth} height={height}>
          {/* Tick marks and labels */}
          {ticks.map((tick, index) => {
            const x = dateToX(tick.dateStr) * timelineWidth;

            // Skip if outside visible area
            if (x < 0 || x > timelineWidth) return null;

            return (
              <g key={index}>
                {/* Tick line */}
                <line x1={x} y1={0} x2={x} y2={TICK_HEIGHT} stroke="#9ca3af" strokeWidth={1} />
                {/* Label */}
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize={11}
                  fontFamily="system-ui, sans-serif"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export const TimeAxis = memo(TimeAxisComponent);
