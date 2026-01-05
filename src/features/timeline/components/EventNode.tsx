'use client';

/**
 * EventNode Component
 *
 * Renders a single event on the timeline.
 * Supports both point events (circles) and span events (bars).
 * Uses HTML for text labels for better wrapping and layout.
 * Based on Spec.md Section 2.6: Event Rendering
 */

import { memo, useRef, useLayoutEffect, useState } from 'react';
import type { TimelineEvent, EventLayout, TrackColor } from '@/types';
import { TRACK_COLORS } from '@/types';

interface EventNodeProps {
  event: TimelineEvent;
  layout: EventLayout;
  color: TrackColor;
  isHovered: boolean;
  isFocused: boolean;
  isStaged: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  containerWidth: number;
  laneHeight: number;
  dateToX: (date: string) => number;
}

const POINT_SIZE = 10;
const POINT_FOCUS_SIZE = 14;
const LINE_STROKE_WIDTH = 2;
const TEXT_OFFSET_X = 16; // Space between dot and text
const MAX_TITLE_WIDTH = 180; // Max width for event title
const BG_PADDING = 8; // Padding around background

function EventNodeComponent({
  event,
  layout,
  color,
  isHovered,
  isFocused,
  isStaged,
  onClick,
  onMouseEnter,
  onMouseLeave,
  containerWidth,
  laneHeight,
  dateToX,
}: EventNodeProps) {
  const baseColor = TRACK_COLORS[color];
  const opacity = isStaged ? 0.7 : 1;

  // Ref to measure actual text width
  const textRef = useRef<HTMLDivElement>(null);
  const [measuredTextWidth, setMeasuredTextWidth] = useState<number>(MAX_TITLE_WIDTH);

  // Measure text width after render
  useLayoutEffect(() => {
    if (textRef.current) {
      const width = textRef.current.getBoundingClientRect().width;
      setMeasuredTextWidth(width);
    }
  }, [event.title, event.startDate, event.endDate]);

  // Background colors for hover and focus states
  const getBackgroundColor = () => {
    if (isFocused) {
      // Light version of track color when selected
      const lightColors: Record<TrackColor, string> = {
        blue: '#dbeafe',
        red: '#fee2e2',
        green: '#dcfce7',
        purple: '#f3e8ff',
        orange: '#ffedd5',
        pink: '#fce7f3',
        teal: '#ccfbf1',
        gray: '#f3f4f6',
      };
      return lightColors[color];
    }
    if (isHovered) {
      return '#f3f4f6'; // Light grey on hover
    }
    return 'transparent';
  };

  const backgroundColor = getBackgroundColor();
  const showBackground = isHovered || isFocused;

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate position using dateToX (viewport-aware)
  const x = dateToX(event.startDate) * containerWidth;
  const y = layout.lane * laneHeight + laneHeight / 2;
  const size = isFocused ? POINT_FOCUS_SIZE : POINT_SIZE;

  if (event.type === 'point') {
    // Point event - dot on left, text on right
    // Calculate background dimensions with equal padding on both sides
    const bgX = x - size / 2 - BG_PADDING;
    const bgWidth = BG_PADDING + size + TEXT_OFFSET_X + measuredTextWidth + BG_PADDING;
    const bgHeight = laneHeight;
    const bgY = y - laneHeight / 2;

    return (
      <g data-event-id={event.id}>
        {/* Background rectangle for hover/focus */}
        {showBackground && (
          <rect
            x={bgX}
            y={bgY}
            width={bgWidth}
            height={bgHeight}
            rx={6}
            ry={6}
            fill={backgroundColor}
            className="cursor-pointer"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          />
        )}

        {/* Clickable area */}
        <circle
          cx={x}
          cy={y}
          r={size / 2}
          fill={baseColor}
          opacity={opacity}
          className="cursor-pointer drop-shadow-sm"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
        {isStaged && (
          <circle
            cx={x}
            cy={y}
            r={size / 2 + 2}
            fill="none"
            stroke={baseColor}
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.5}
            className="pointer-events-none"
          />
        )}

        {/* HTML text labels - clickable */}
        <foreignObject
          x={x + TEXT_OFFSET_X}
          y={y - laneHeight / 2}
          width={MAX_TITLE_WIDTH}
          height={laneHeight}
          className="overflow-visible"
        >
          <div
            ref={textRef}
            className="flex cursor-pointer flex-col justify-center select-none"
            style={{ height: laneHeight }}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <div
              className="text-xs leading-tight font-medium text-gray-900"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                maxWidth: MAX_TITLE_WIDTH,
              }}
            >
              {event.title}
            </div>
            <div className="text-[10px] leading-tight text-gray-500">
              {formatDate(event.startDate)}
            </div>
          </div>
        </foreignObject>
      </g>
    );
  }

  // Span event - start dot on left, line to end dot, text on right of end
  const endX = event.endDate ? dateToX(event.endDate) * containerWidth : x;
  const dateRange = event.endDate
    ? `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`
    : formatDate(event.startDate);

  // Calculate background dimensions - from start to end of text with equal padding
  const bgX = x - size / 2 - BG_PADDING;
  const bgWidth =
    BG_PADDING + size / 2 + (endX - x) + size / 2 + TEXT_OFFSET_X + measuredTextWidth + BG_PADDING;
  const bgHeight = laneHeight;
  const bgY = y - laneHeight / 2;

  return (
    <g data-event-id={event.id}>
      {/* Background rectangle for hover/focus */}
      {showBackground && (
        <rect
          x={bgX}
          y={bgY}
          width={bgWidth}
          height={bgHeight}
          rx={6}
          ry={6}
          fill={backgroundColor}
          className="cursor-pointer"
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      )}

      {/* Connecting line */}
      <line
        x1={x}
        y1={y}
        x2={endX}
        y2={y}
        stroke={baseColor}
        strokeWidth={LINE_STROKE_WIDTH}
        opacity={opacity}
      />

      {/* Start point circle */}
      <circle
        cx={x}
        cy={y}
        r={size / 2}
        fill={baseColor}
        opacity={opacity}
        className="cursor-pointer drop-shadow-sm"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* End point circle */}
      <circle
        cx={endX}
        cy={y}
        r={size / 2}
        fill={baseColor}
        opacity={opacity}
        className="cursor-pointer drop-shadow-sm"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Staged indicator */}
      {isStaged && (
        <>
          <circle
            cx={x}
            cy={y}
            r={size / 2 + 2}
            fill="none"
            stroke={baseColor}
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.5}
            className="pointer-events-none"
          />
          <circle
            cx={endX}
            cy={y}
            r={size / 2 + 2}
            fill="none"
            stroke={baseColor}
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.5}
            className="pointer-events-none"
          />
        </>
      )}

      {/* HTML text labels - positioned to the right of end point, clickable */}
      <foreignObject
        x={endX + TEXT_OFFSET_X}
        y={y - laneHeight / 2}
        width={MAX_TITLE_WIDTH}
        height={laneHeight}
        className="overflow-visible"
      >
        <div
          ref={textRef}
          className="flex cursor-pointer flex-col justify-center select-none"
          style={{ height: laneHeight }}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="text-xs leading-tight font-medium text-gray-900"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: MAX_TITLE_WIDTH,
            }}
          >
            {event.title}
          </div>
          <div className="truncate text-[10px] leading-tight text-gray-500">{dateRange}</div>
        </div>
      </foreignObject>
    </g>
  );
}

export const EventNode = memo(EventNodeComponent);
