# Timeline Viewer - Technical Specification

## Overview

The Timeline Viewer is a responsive web application for visualizing, creating, and managing historical timelines with LLM-powered event generation. Users can view events on an interactive timeline, focus on individual events for details, and use a chat interface to generate new events via AI.

---

## 1. Data Models

All data models use JSON serialization. IDs use UUIDs (v4). Timestamps use ISO 8601 format.

### 1.1 Timeline

The top-level container for a timeline and its events.

```typescript
interface Timeline {
  id: string; // UUID v4
  title: string; // max 100 chars
  description: string; // max 500 chars
  ownerId: string; // User ID
  visibility: 'private' | 'unlisted' | 'public';
  tracks: Track[];
  events: TimelineEvent[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  // Extensibility
  metadata?: Record<string, unknown>;
}
```

### 1.2 TimelineEvent

Represents a single event on the timeline. Events can be either point events (single date) or span events (date range).

```typescript
interface TimelineEvent {
  id: string; // UUID v4
  timelineId: string; // Parent timeline ID
  trackId: string; // Which track this event belongs to

  // Content
  title: string; // max 10 words (~60 chars)
  description: string; // 1 sentence (~200 chars)
  longDescription: string; // 1-2 paragraphs (~1000 chars)

  // Temporal - supports BCE/CE dates (past and future)
  type: 'point' | 'span';
  startDate: string; // Extended ISO 8601 (see Date Format below)
  endDate?: string; // Extended ISO 8601, required if type === 'span'
  datePrecision: 'year' | 'month' | 'day' | 'datetime';

  // Location (optional)
  location?: EventLocation;

  // Sources
  sources: EventSource[];

  // Display
  status: 'confirmed' | 'staged'; // staged = pending user approval

  createdAt: string;
  updatedAt: string;

  // Extensibility
  metadata?: Record<string, unknown>;
  tags?: string[];
}

interface EventLocation {
  name: string; // Human-readable location name
  latitude?: number;
  longitude?: number;
  placeId?: string; // Google Places ID or similar
}

interface EventSource {
  title: string; // Source name/title
  url: string; // Link to source
  type: 'wikipedia' | 'article' | 'book' | 'other';
  accessedAt?: string; // When the source was accessed
}
```

#### Date Format (Extended ISO 8601)

The timeline supports dates from deep history (BCE) to the far future. We use an extended ISO 8601 format:

```typescript
// CE dates (positive years): standard ISO 8601
'2024-03-15'; // March 15, 2024 CE
'1066-10-14'; // October 14, 1066 CE
'0476-09-04'; // September 4, 476 CE (Fall of Rome)

// BCE dates (negative years): prefixed with minus sign
'-0753-04-21'; // April 21, 753 BCE (Founding of Rome)
'-0044-03-15'; // March 15, 44 BCE (Assassination of Caesar)
'-13800000000'; // ~13.8 billion years ago (Big Bang, year precision)

// Year-only precision
'2024'; // Year 2024
'-0500'; // 500 BCE

// With time (for datetime precision)
'2024-03-15T14:30:00Z'; // March 15, 2024 at 2:30 PM UTC
```

**Implementation Notes**:

- Store as strings to preserve precision and avoid JavaScript Date limitations
- Use a date library that supports astronomical year numbering (e.g., Temporal API, Luxon)
- Year 0 exists in astronomical notation (equivalent to 1 BCE in historical notation)
- For display, convert negative years to "BCE" notation: `-0044` → "44 BCE"

### 1.3 Track

Tracks allow visual grouping and layering of events. Enables future features like comparing timelines or categorizing events.

```typescript
interface Track {
  id: string; // UUID v4
  timelineId: string;
  name: string; // e.g., "Main", "Staged", "Political Events"
  type: 'main' | 'staging' | 'custom';
  color: TrackColor;
  order: number; // Display order (lower = higher on screen)
  visible: boolean;

  // Extensibility
  metadata?: Record<string, unknown>;
}

type TrackColor =
  | 'blue' // Default for main track
  | 'green' // Default for staging/LLM suggestions
  | 'red'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'teal'
  | 'gray';

// Color palette (Apple-style flat colors)
const TRACK_COLORS: Record<TrackColor, string> = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
  pink: '#FF2D55',
  teal: '#5AC8FA',
  gray: '#8E8E93',
};
```

### 1.4 Chat Messages (Ephemeral)

Messages exchanged in the chat interface for LLM interaction. **Chat history is not persisted** — it exists only in the current session and is cleared on page reload. Only timelines and events are saved to the database.

```typescript
interface ChatMessage {
  id: string; // UUID v4 (client-generated)
  role: 'user' | 'assistant' | 'system';
  content: string;

  // If assistant message contains events
  generatedEventIds?: string[]; // References to staged events

  createdAt: string;

  // For streaming responses
  status: 'pending' | 'streaming' | 'complete' | 'error';
  error?: string;
}
```

**Rationale**: Chat is primarily a tool for generating events. Once events are accepted into the timeline, the chat conversation that produced them is no longer essential. This simplifies the data model and reduces storage requirements.

### 1.5 User

Basic user model for ownership and authentication.

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string;

  // Preferences
  preferences?: UserPreferences;
}

interface UserPreferences {
  defaultTrackColor: TrackColor;
  dateFormat: 'mdy' | 'dmy' | 'ymd';
  theme: 'light' | 'dark' | 'system';
}
```

---

## 2. UI Architecture

### 2.1 Layout Structure

The primary view follows a responsive three-panel layout:

```
Desktop/Tablet Landscape:
┌─────────────────────────────────────────────────────────────────┐
│ HEADER (title, description, actions)                            │
├─────────────────────────────────────────┬───────────────────────┤
│ DETAIL PANEL                            │ CHAT PANEL            │
│ (focused event info)                    │ (messages + input)    │
├─────────────────────────────────────────┴───────────────────────┤
│ TIMELINE PANEL                                                   │
│ (tracks, events, time axis)                                      │
└─────────────────────────────────────────────────────────────────┘

Mobile/Tablet Portrait:
┌─────────────────────┐
│ HEADER              │
├─────────────────────┤
│ DETAIL PANEL        │
│ (collapsible)       │
├─────────────────────┤
│ TIMELINE PANEL      │
│ (full width)        │
├─────────────────────┤
│ CHAT (slide-up)     │
└─────────────────────┘
```

### 2.2 Component Hierarchy

```
<TimelineViewer>
├── <Header>
│   ├── <TimelineTitle>
│   ├── <TimelineDescription>
│   └── <ActionBar>
│       ├── <SaveButton>
│       ├── <ShareButton>
│       └── <UserMenu>
│
├── <MainContent>
│   ├── <DetailPanel>
│   │   ├── <EventTitle>
│   │   ├── <EventDescription>
│   │   ├── <EventLongDescription>
│   │   ├── <EventLocation>
│   │   │   └── <MiniMap> (if location exists)
│   │   ├── <EventSources>
│   │   │   └── <SourceLink>[]
│   │   └── <DetailActions>
│   │       ├── <LearnMoreButton>
│   │       └── <SimilarEventsButton>
│   │
│   └── <ChatPanel>
│       ├── <MessageList>
│       │   └── <ChatMessage>[]
│       │       └── <EventMention>[] (clickable event refs)
│       ├── <StagedEventsBar>
│       │   └── <AcceptAllButton>
│       └── <ChatInput>
│           ├── <TextArea>
│           └── <SendButton>
│
└── <TimelinePanel>
    ├── <TimelineCanvas>
    │   ├── <Track>[]
    │   │   └── <EventNode>[]
    │   │       ├── <PointEvent>
    │   │       └── <SpanEvent>
    │   └── <EventTooltip>
    ├── <TimeAxis>
    └── <TimelineControls>
        ├── <ZoomControls>
        └── <PanControls>
```

### 2.3 Header Component

**Purpose**: Display timeline metadata and provide quick actions.

**Elements**:

- Timeline title (editable inline)
- Timeline description (editable inline, truncated on mobile)
- Action buttons:
  - **Save** (primary) - Saves current state
  - **Share** - Opens share dialog
  - **User** - Profile/settings menu

**Responsive Behavior**:

- Desktop: All elements visible inline
- Tablet: Description may truncate with "more" link
- Mobile: Actions collapse into hamburger/more menu, keep Save prominent

### 2.4 Detail Panel

**Purpose**: Show full details of the currently focused event.

**States**:

1. **Empty state**: No event focused - show prompt text "Select an event to view details"
2. **Focused state**: Display event information

**Elements** (when focused):

- Event title (h2)
- Event description (subtitle/lead text)
- Event long description (body text, may include markdown)
- Event date(s) - formatted based on precision
- Location section (if `location` exists):
  - Location name
  - Mini embedded map (static image or interactive)
- Sources section (if `sources.length > 0`):
  - List of clickable source links
- Action buttons:
  - **Learn More** - Triggers LLM query for additional info
  - **Similar Events** - Finds related events

**Responsive Behavior**:

- Desktop: Fixed panel on left
- Mobile: Collapsible panel above timeline, swipe down to dismiss

### 2.5 Chat Panel

**Purpose**: LLM interaction for generating new events.

**Elements**:

- Message list (scrollable)
  - User messages (right-aligned)
  - Assistant messages (left-aligned)
  - Event mentions rendered as chips/pills (clickable to focus)
- Staged events indicator bar (when pending events exist)
  - Count of staged events
  - "Accept All" button
- Input area:
  - Multi-line text input
  - Send button

**Message Rendering**:

- User messages: Plain text
- Assistant messages: Parse for event references, render as:

  ```
  I've added 3 events to your timeline:

  [Battle of Hastings] [Norman Conquest Begins] [William's Coronation]

  Would you like me to add more detail about any of these?
  ```

- Event chips are clickable and highlight corresponding timeline event

**Responsive Behavior**:

- Desktop: Fixed panel on right (collapsible)
- Mobile: Slide-up sheet from bottom, floating action button to open

### 2.6 Timeline Panel

**Purpose**: Visual representation of events across time.

**Elements**:

- Canvas area with tracks
- Time axis (x-axis)
- Event nodes (points and spans)
- Hover tooltips

**Track Rendering**:

- Tracks stack vertically
- Order: Main track on top, then custom tracks, staging track at bottom
- Each track has its assigned color
- Visual separator between tracks

**Event Rendering**:

- **Point events**: Circular nodes at specific date
- **Span events**: Horizontal lines/bars from start to end date

#### Event Stacking (GarageBand-style)

When events overlap temporally, they stack vertically within their track. The layout follows GarageBand's approach: show as many events as fit without excessive scrolling.

**Stacking Rules**:

1. Point events render above span events at the same time
2. Overlapping events stack vertically (no horizontal overlap)
3. **Maximum stack depth: 8 events** per track
4. If more than 8 events overlap, show "+N more" indicator

**Layout Algorithm**:

```typescript
interface EventLayout {
  eventId: string;
  x: number; // Horizontal position (from date)
  width: number; // Width (1px for points, calculated for spans)
  lane: number; // Vertical lane within track (0-7)
  collapsed: boolean; // True if in overflow "+N more" group
}

// Assign events to lanes using greedy algorithm:
// 1. Sort events by start date
// 2. For each event, find first available lane (0-7)
// 3. Lane is "available" if no event in that lane overlaps temporally
// 4. If no lane available (all 8 occupied), mark as collapsed
```

**Track Height Calculation**:

- Each track has a minimum height (e.g., 60px for 1-2 lanes)
- Track expands based on max lane occupancy at any point in time
- Maximum track height caps at 8 lanes (~200px)
- Collapsed events accessible via hover/click on "+N more"

**Scroll Behavior**:

- Timeline panel should fit on screen without vertical scrolling on large displays (desktop, iPad landscape)
- If total track heights exceed viewport, enable vertical scroll (similar to GarageBand's track list)
- On mobile, more permissive scrolling is expected
- Goal: Scrolling should be rare, reserved for timelines with many parallel tracks or extremely dense events

**Interactions**:

- Click event: Focus in detail panel
- Hover event: Show tooltip with title and description
- Drag canvas: Pan timeline
- Scroll/pinch: Zoom in/out
- Double-click canvas: Quick zoom to that date

**Time Axis**:

- Adaptive labels based on zoom level:
  - Zoomed out: Years, decades, centuries
  - Zoomed in: Months, days
- Current date indicator (if in range)

#### Timeline Boundary Calculation

The visible timeline range is calculated from event dates with smart padding:

1. **Find event bounds**: Get earliest `startDate` and latest `endDate` (or `startDate` for point events)
2. **Apply 5% padding**: Add 5% of the total range to each end
3. **Snap to clean boundaries**: Round outward to the nearest clean unit based on scale

**Snapping Rules** (based on range duration):

| Range Duration | Snap To    | Example                                                      |
| -------------- | ---------- | ------------------------------------------------------------ |
| < 1 month      | Day        | Mar 5 → Mar 1, Aug 9 → Aug 31                                |
| < 1 year       | Month      | Mar 5 → Jan 1, Aug 9 → Dec 31                                |
| 1-10 years     | Year       | Mar 1939 → Jan 1939, Aug 1947 → Dec 1947 (shows "1948" line) |
| 10-100 years   | Decade     | 1939 → 1930, 1947 → 1950                                     |
| 100-1000 years | Century    | 1066 → 1000, 1485 → 1500                                     |
| > 1000 years   | Millennium | 753 BCE → 1000 BCE, 476 CE → 1000 CE                         |

**Example**: Events from March 5, 1939 to August 9, 1947

- Raw range: ~8.4 years
- With 5% padding: ~8.8 years (still in 1-10 year bucket)
- Snap to years: **January 1, 1939 to December 31, 1947**
- Axis shows: `1939 | 1940 | 1941 | ... | 1947 | 1948` (1948 line marks end of 1947)

```typescript
interface TimelineBounds {
  dataStart: string; // Earliest event date
  dataEnd: string; // Latest event date
  viewStart: string; // Padded + snapped start
  viewEnd: string; // Padded + snapped end
  snapUnit: 'day' | 'month' | 'year' | 'decade' | 'century' | 'millennium';
}

function calculateTimelineBounds(events: TimelineEvent[]): TimelineBounds;
```

**Staged Events** (LLM suggestions):

- Displayed in staging track
- Visual distinction (green color, dashed border, or slight transparency)
- Individual accept/reject buttons on hover
- "Accept All" batch operation

**Responsive Behavior**:

- Desktop: Full width below detail/chat panels
- Mobile: Full width, swipe to pan, pinch to zoom
- Touch-friendly hit targets (min 44px)

### 2.7 Event Tooltip

**Content**:

```
┌────────────────────────┐
│ Event Title            │
│ Event description...   │
│ Oct 14, 1066          │
└────────────────────────┘
```

**Behavior**:

- Appears on hover (desktop) or long-press (mobile)
- Positioned to avoid viewport edges
- Dismisses on mouse leave or tap elsewhere

---

## 3. View States

### 3.1 Application State

```typescript
interface TimelineViewerState {
  // Data
  timeline: Timeline | null;
  isLoading: boolean;
  error: string | null;

  // UI State
  focusedEventId: string | null;
  hoveredEventId: string | null;

  // Timeline View
  viewport: TimelineViewport;

  // Chat
  chatMessages: ChatMessage[];
  chatInput: string;
  isChatOpen: boolean;
  isGenerating: boolean;

  // Staged Events
  stagedEventIds: string[];

  // Panels
  isDetailPanelOpen: boolean;
  isChatPanelOpen: boolean;
}

interface TimelineViewport {
  startDate: string; // Left edge of visible timeline
  endDate: string; // Right edge of visible timeline
  zoomLevel: number; // 1 = default, <1 = zoomed out, >1 = zoomed in
}
```

### 3.2 Loading States

1. **Initial Load**: Skeleton UI for all panels
2. **Saving**: Save button shows spinner, disabled
3. **Chat Generation**:
   - Input disabled
   - Streaming indicator in message list
   - "Stop generating" option
4. **Learn More**: Detail panel shows loading state

### 3.3 Error States

- Network error: Toast notification + retry option
- Save failed: Inline error in header
- Generation failed: Error message in chat
- Invalid timeline: Full-page error with "Go Home" option

---

## 4. API Endpoints

### 4.1 Timeline CRUD

```typescript
// GET /api/timelines
// List user's timelines
Response: { timelines: Timeline[] }

// GET /api/timelines/:id
// Get single timeline with events
Response: Timeline

// POST /api/timelines
// Create new timeline
Request: { title: string; description?: string }
Response: Timeline

// PATCH /api/timelines/:id
// Update timeline metadata
Request: Partial<Pick<Timeline, 'title' | 'description' | 'visibility'>>
Response: Timeline

// DELETE /api/timelines/:id
// Delete timeline and all events
Response: { success: boolean }
```

### 4.2 Events CRUD

```typescript
// POST /api/timelines/:id/events
// Add event(s) to timeline
Request: { events: Omit<TimelineEvent, 'id' | 'timelineId' | 'createdAt' | 'updatedAt'>[] }
Response: { events: TimelineEvent[] }

// PATCH /api/timelines/:id/events/:eventId
// Update single event
Request: Partial<TimelineEvent>
Response: TimelineEvent

// DELETE /api/timelines/:id/events/:eventId
// Remove event
Response: { success: boolean }

// POST /api/timelines/:id/events/accept
// Accept staged events (move to main track)
Request: { eventIds: string[] }
Response: { events: TimelineEvent[] }

// POST /api/timelines/:id/events/reject
// Reject/remove staged events
Request: { eventIds: string[] }
Response: { success: boolean }
```

### 4.3 Chat / LLM Generation

Chat history is **ephemeral** (session-only, not persisted). Each request is stateless.

```typescript
// POST /api/timelines/:id/chat
// Send message and generate events
Request: {
  message: string;
  context?: {
    focusedEventId?: string;    // For "learn more" or "similar events"
    action?: 'generate' | 'learn_more' | 'similar_events';
  }
}
Response: (streaming)
  - Chat message chunks
  - Generated events (as JSON in final message)

// Note: No GET endpoint for chat history - chat is not persisted
```

### 4.4 Sharing

```typescript
// POST /api/timelines/:id/share
// Generate share link
Request: {
  visibility: 'unlisted' | 'public';
}
Response: {
  shareUrl: string;
}

// GET /api/shared/:shareId
// Access shared timeline (no auth required for public)
Response: Timeline;
```

---

## 5. LLM Integration

### 5.1 Event Generation Prompt

When user requests new events:

```typescript
const generateEventsPrompt = (request: {
  timelineTitle: string;
  timelineDescription: string;
  existingEvents: TimelineEvent[];
  userMessage: string;
}) => `
You are helping create events for a timeline about: "${request.timelineTitle}"
Timeline description: ${request.timelineDescription}

Existing events on this timeline:
${request.existingEvents.map((e) => `- ${e.title} (${e.startDate})`).join('\n')}

User request: ${request.userMessage}

Generate timeline events as JSON. For each event:
1. Title: max 10 words, clear and specific
2. Description: 1 sentence summary
3. Long description: 1-2 paragraphs with context and significance
4. Dates: Use ISO 8601 format. Include end date if event spans time.
5. Location: If relevant, include place name and coordinates
6. Sources: Include Wikipedia as primary source when available. Verify URLs exist.

Respond with a JSON array of events:
\`\`\`json
[
  {
    "title": "...",
    "description": "...",
    "longDescription": "...",
    "type": "point" | "span",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",  // if span
    "datePrecision": "day",
    "location": {
      "name": "...",
      "latitude": ...,
      "longitude": ...
    },
    "sources": [
      {
        "title": "Wikipedia: ...",
        "url": "https://en.wikipedia.org/wiki/...",
        "type": "wikipedia"
      }
    ]
  }
]
\`\`\`

After the JSON, provide a brief conversational summary of what you added.
`;
```

### 5.2 Learn More Prompt

```typescript
const learnMorePrompt = (event: TimelineEvent) => `
Provide additional information about this historical event:

Title: ${event.title}
Date: ${event.startDate}${event.endDate ? ` to ${event.endDate}` : ''}
Current description: ${event.description}

Please provide:
1. An expanded long description (2-3 paragraphs) with more historical context
2. Key figures involved
3. Consequences and historical significance
4. Additional verified sources (especially Wikipedia)

Format the response conversationally but include structured data that can update the event.
`;
```

### 5.3 Web Search Integration

For accurate sources:

1. Use web search tool to find Wikipedia article URL
2. Verify URL exists before including in sources
3. Prefer primary sources when available
4. Include access date for sources

---

## 6. Mobile Responsiveness

### 6.1 Breakpoints

```css
/* Tailwind defaults */
sm: 640px   /* Large phones landscape */
md: 768px   /* Tablets portrait */
lg: 1024px  /* Tablets landscape, small laptops */
xl: 1280px  /* Desktops */
```

### 6.2 Mobile-Specific Behaviors

**Header**:

- Actions collapse to icon-only or overflow menu
- Save remains prominent (primary action)
- Title truncates with ellipsis

**Detail Panel**:

- Becomes collapsible card above timeline
- Swipe down to minimize
- "Pull up" indicator when minimized
- Max height: 40vh

**Chat Panel**:

- Hidden by default
- Floating action button (bottom-right) to open
- Opens as slide-up sheet (max height: 70vh)
- Input sticks to bottom with safe area padding

**Timeline Panel**:

- Full-width rendering
- Touch gestures:
  - Swipe left/right: Pan
  - Pinch: Zoom
  - Tap: Select event
  - Long-press: Show tooltip
- Larger touch targets (min 44x44px)
- Simplified track labels

### 6.3 Touch Interactions

```typescript
interface TouchGestures {
  tap: 'select_event' | 'dismiss_tooltip';
  longPress: 'show_tooltip';
  swipeHorizontal: 'pan_timeline';
  pinch: 'zoom_timeline';
  swipeDown: 'collapse_detail_panel';
  swipeUp: 'expand_detail_panel';
}
```

### 6.4 Safe Areas

- Account for iOS notch/Dynamic Island
- Account for Android navigation bar
- Bottom input should respect keyboard height

---

## 7. Color Palette

### 7.1 Track Colors (Apple-style flat)

```css
--color-track-blue: #007aff; /* Primary, main timeline */
--color-track-green: #34c759; /* Staging/LLM suggestions */
--color-track-red: #ff3b30;
--color-track-orange: #ff9500;
--color-track-purple: #af52de;
--color-track-pink: #ff2d55;
--color-track-teal: #5ac8fa;
--color-track-gray: #8e8e93;
```

### 7.2 UI Colors

```css
/* Light mode */
--color-bg-primary: #ffffff;
--color-bg-secondary: #f2f2f7;
--color-text-primary: #000000;
--color-text-secondary: #3c3c43;
--color-border: #c6c6c8;

/* Dark mode */
--color-bg-primary-dark: #000000;
--color-bg-secondary-dark: #1c1c1e;
--color-text-primary-dark: #ffffff;
--color-text-secondary-dark: #ebebf5;
--color-border-dark: #38383a;
```

### 7.3 Semantic Colors

```css
--color-primary: #007aff; /* Primary actions */
--color-success: #34c759; /* Success states */
--color-warning: #ff9500; /* Warnings */
--color-error: #ff3b30; /* Errors */
--color-info: #5ac8fa; /* Information */
```

---

## 8. Maps (MapLibre GL JS)

Event locations are displayed on a minimal, clean map. We use **MapLibre GL JS** — a free, open-source fork of Mapbox GL JS that supports custom vector tile styling.

### 8.1 Design Goals

- **Minimal aesthetic**: Clean, simple visuals that don't distract from timeline content
- **Progressive detail**: Show appropriate detail based on zoom level
- **Free and open**: No API key costs, uses OpenStreetMap data via free tile providers
- **Programmable style**: Full control over visual appearance

### 8.2 Detail Levels

| Zoom Level    | What's Shown                           | Example Use               |
| ------------- | -------------------------------------- | ------------------------- |
| 0-3 (World)   | Continents, oceans, major water bodies | "Europe", "Pacific Ocean" |
| 4-6 (Region)  | Country borders, country labels        | "France", "Japan"         |
| 7-9 (Country) | State/province borders, major cities   | "California", "Bavaria"   |
| 10-12 (State) | Cities, major roads                    | "San Francisco Bay Area"  |
| 13-15 (City)  | Streets, neighborhoods, landmarks      | "Downtown Manhattan"      |
| 16+ (Local)   | Buildings, detailed streets            | Specific addresses        |

### 8.3 Minimal Style Specification

Custom MapLibre style with muted colors and minimal labels:

```typescript
const minimalMapStyle: maplibregl.StyleSpecification = {
  version: 8,
  name: 'Timeline Minimal',
  sources: {
    // Free vector tiles from OpenMapTiles via public CDN
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.stadiamaps.com/data/openmaptiles.json',
      // Alternative: MapTiler free tier, or self-hosted
    },
  },
  layers: [
    // Background (land)
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#F5F5F5', // Light gray land
      },
    },
    // Water (oceans, lakes, rivers)
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': '#D4E5F7', // Soft blue water
      },
    },
    // Country borders
    {
      id: 'country-borders',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', 'admin_level', 2],
      paint: {
        'line-color': '#CCCCCC',
        'line-width': 1,
      },
    },
    // State/province borders (visible at zoom 5+)
    {
      id: 'state-borders',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['==', 'admin_level', 4],
      minzoom: 5,
      paint: {
        'line-color': '#DDDDDD',
        'line-width': 0.5,
        'line-dasharray': [2, 2],
      },
    },
    // Major roads (visible at zoom 10+)
    {
      id: 'roads-major',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk', 'primary'],
      minzoom: 10,
      paint: {
        'line-color': '#E0E0E0',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3],
      },
    },
    // Country labels (visible at zoom 3+)
    {
      id: 'country-labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', 'class', 'country'],
      minzoom: 3,
      layout: {
        'text-field': '{name}',
        'text-size': 12,
        'text-font': ['Open Sans Regular'],
      },
      paint: {
        'text-color': '#666666',
      },
    },
    // City labels (visible at zoom 7+)
    {
      id: 'city-labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['in', 'class', 'city', 'town'],
      minzoom: 7,
      layout: {
        'text-field': '{name}',
        'text-size': 10,
        'text-font': ['Open Sans Regular'],
      },
      paint: {
        'text-color': '#888888',
      },
    },
  ],
};
```

### 8.4 Event Location Marker

Simple, clean marker for event locations:

```typescript
interface LocationMarkerProps {
  coordinates: [number, number]; // [longitude, latitude]
  color?: string; // Track color, defaults to blue
  label?: string; // Optional location name tooltip
}

// Marker style: Simple filled circle with subtle shadow
const markerStyle = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: 'var(--color-track-blue)',
  border: '2px solid white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};
```

### 8.5 Map Component Usage

```typescript
// In EventLocation component
<MiniMap
  center={[event.location.longitude, event.location.latitude]}
  zoom={calculateZoomForLocation(event.location)}
  style={minimalMapStyle}
  interactive={false}  // Static map in detail panel
  markerColor={trackColor}
/>

// Zoom calculation based on location specificity
function calculateZoomForLocation(location: EventLocation): number {
  if (location.placeId) return 12;        // Specific place
  if (location.latitude && location.longitude) {
    // Estimate based on location name
    if (location.name.includes(',')) return 10;  // City, Country
    return 6;  // Country or region
  }
  return 4;  // Fallback
}
```

### 8.6 Tile Providers (Free Options)

| Provider        | Free Tier        | Notes                                         |
| --------------- | ---------------- | --------------------------------------------- |
| **Stadia Maps** | 200k tiles/month | Good free tier, reliable                      |
| **MapTiler**    | 100k tiles/month | Requires API key                              |
| **OpenFreeMap** | Unlimited        | Community-hosted, may have slower performance |
| **Self-hosted** | Unlimited        | Can host own tiles with OpenMapTiles          |

**Recommended**: Start with Stadia Maps for development, evaluate self-hosting for production if usage grows.

---

## 9. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  timelines Timeline[]
  preferences Json?
}

model Timeline {
  id          String   @id @default(uuid())
  title       String   @db.VarChar(100)
  description String?  @db.VarChar(500)
  visibility  String   @default("private")
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  metadata    Json?

  tracks Track[]
  events TimelineEvent[]
  // Note: ChatMessages are ephemeral (session-only), not persisted

  @@index([ownerId])
}

model Track {
  id         String   @id @default(uuid())
  timelineId String
  timeline   Timeline @relation(fields: [timelineId], references: [id], onDelete: Cascade)
  name       String   @db.VarChar(50)
  type       String   @default("main")
  color      String   @default("blue")
  order      Int      @default(0)
  visible    Boolean  @default(true)
  metadata   Json?

  events TimelineEvent[]

  @@index([timelineId])
}

model TimelineEvent {
  id              String   @id @default(uuid())
  timelineId      String
  timeline        Timeline @relation(fields: [timelineId], references: [id], onDelete: Cascade)
  trackId         String
  track           Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)

  title           String   @db.VarChar(100)
  description     String   @db.VarChar(500)
  longDescription String   @db.Text

  type            String   @default("point")
  startDate       DateTime
  endDate         DateTime?
  datePrecision   String   @default("day")

  location        Json?    // EventLocation
  sources         Json     @default("[]") // EventSource[]
  status          String   @default("confirmed")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  metadata        Json?
  tags            String[] @default([])

  @@index([timelineId])
  @@index([trackId])
  @@index([startDate])
}

// Note: ChatMessage is NOT persisted to database (ephemeral, session-only)
```

---

## 9. Zod Validation Schemas

```typescript
import { z } from 'zod';

// Track colors
export const trackColorSchema = z.enum([
  'blue',
  'green',
  'red',
  'orange',
  'purple',
  'pink',
  'teal',
  'gray',
]);

// Event source
export const eventSourceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  type: z.enum(['wikipedia', 'article', 'book', 'other']),
  accessedAt: z.string().datetime().optional(),
});

// Event location
export const eventLocationSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  placeId: z.string().optional(),
});

// Timeline event (for creation)
export const createEventSchema = z
  .object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    longDescription: z.string().max(5000).default(''),
    type: z.enum(['point', 'span']),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    datePrecision: z.enum(['year', 'month', 'day', 'datetime']).default('day'),
    location: eventLocationSchema.optional(),
    sources: z.array(eventSourceSchema).default([]),
    tags: z.array(z.string()).default([]),
  })
  .refine((data) => data.type === 'point' || data.endDate !== undefined, {
    message: 'Span events require an end date',
  });

// Timeline (for creation)
export const createTimelineSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// Chat message (for sending)
export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z
    .object({
      focusedEventId: z.string().uuid().optional(),
      action: z.enum(['generate', 'learn_more', 'similar_events']).optional(),
    })
    .optional(),
});

// LLM-generated event (parsed from response)
export const llmEventSchema = z.object({
  title: z.string(),
  description: z.string(),
  longDescription: z.string().optional().default(''),
  type: z.enum(['point', 'span']),
  startDate: z.string(),
  endDate: z.string().optional(),
  datePrecision: z.enum(['year', 'month', 'day', 'datetime']).optional().default('day'),
  location: eventLocationSchema.optional(),
  sources: z.array(eventSourceSchema).optional().default([]),
});

export const llmEventsResponseSchema = z.array(llmEventSchema);
```

---

## 10. Key User Flows

### 10.1 View Timeline

1. User navigates to `/timeline/:id`
2. App loads timeline data (title, description, events, tracks)
3. Timeline renders with all events positioned
4. User can pan/zoom to explore
5. Clicking event focuses it in detail panel

### 10.2 Generate Events via Chat

1. User opens chat panel
2. Types prompt: "Add major battles of WWII"
3. App sends request to LLM endpoint
4. LLM streams response with generated events
5. Events appear in staging track (green)
6. Chat shows event mentions as clickable chips
7. User clicks "Accept All" or individual events
8. Accepted events move to main track

### 10.3 Learn More About Event

1. User focuses on an event
2. Clicks "Learn More" button
3. App sends event context to LLM
4. LLM returns expanded information
5. Detail panel updates with new content
6. New sources added to event

### 10.4 Save Timeline

1. User clicks Save button
2. App sends current state to API
3. Save button shows loading state
4. On success: toast notification
5. On error: error message with retry option

### 10.5 Share Timeline

1. User clicks Share button
2. Modal opens with visibility options
3. User selects "Public" or "Unlisted"
4. App generates share URL
5. Copy button copies URL to clipboard

---

## 11. MVP Scope

For initial release, prioritize:

**Must Have**:

- [x] Data models defined
- [ ] Timeline viewing (pan, zoom, focus)
- [ ] Event rendering (points and spans)
- [ ] Detail panel with event info
- [ ] Chat interface for LLM generation
- [ ] Staging track for new events
- [ ] Accept/reject staged events
- [ ] Save timeline
- [ ] Mobile-responsive layout

**Should Have**:

- [ ] Event tooltips
- [ ] Location display with map
- [ ] Source links
- [ ] "Learn More" functionality
- [ ] Share timeline

**Nice to Have**:

- [ ] "Similar Events" functionality
- [ ] Multiple custom tracks
- [ ] Event editing
- [ ] Undo/redo

---

## 12. File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home/landing
│   ├── timeline/
│   │   └── [id]/
│   │       └── page.tsx            # Timeline viewer
│   └── api/
│       └── timelines/
│           ├── route.ts            # List/create
│           └── [id]/
│               ├── route.ts        # Get/update/delete
│               ├── events/
│               │   └── route.ts    # Event operations
│               └── chat/
│                   └── route.ts    # LLM chat
│
├── features/
│   ├── timeline/
│   │   ├── components/
│   │   │   ├── TimelineViewer.tsx
│   │   │   ├── TimelineCanvas.tsx
│   │   │   ├── TimelineTrack.tsx
│   │   │   ├── EventNode.tsx
│   │   │   ├── EventTooltip.tsx
│   │   │   └── TimeAxis.tsx
│   │   ├── hooks/
│   │   │   ├── useTimeline.ts
│   │   │   ├── useTimelineViewport.ts
│   │   │   └── useEventFocus.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   │
│   ├── detail-panel/
│   │   ├── components/
│   │   │   ├── DetailPanel.tsx
│   │   │   ├── EventDetail.tsx
│   │   │   ├── EventLocation.tsx
│   │   │   ├── EventSources.tsx
│   │   │   └── MiniMap.tsx           # MapLibre GL JS wrapper
│   │   └── hooks/
│   │       └── useLearnMore.ts
│   │
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── EventMention.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   └── useStagedEvents.ts
│   │   └── types.ts
│   │
│   └── header/
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── ActionBar.tsx
│       │   └── ShareDialog.tsx
│       └── hooks/
│           └── useSave.ts
│
├── lib/
│   ├── api-client.ts
│   ├── llm.ts                      # Claude API integration
│   ├── map-style.ts                # MapLibre minimal style config
│   ├── dates.ts                    # BCE/CE date utilities
│   └── utils.ts
│
├── types/
│   ├── timeline.ts                 # Core type definitions
│   ├── api.ts                      # API request/response types
│   └── common.ts
│
└── styles/
    └── globals.css
```

---

## Appendix A: Example Timeline JSON

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "World War II in Europe",
  "description": "Major events of the Second World War in the European theater, from 1939 to 1945.",
  "ownerId": "user-123",
  "visibility": "public",
  "tracks": [
    {
      "id": "track-main",
      "name": "Main",
      "type": "main",
      "color": "blue",
      "order": 0,
      "visible": true
    },
    {
      "id": "track-staging",
      "name": "Suggestions",
      "type": "staging",
      "color": "green",
      "order": 1,
      "visible": true
    }
  ],
  "events": [
    {
      "id": "evt-001",
      "timelineId": "550e8400-e29b-41d4-a716-446655440000",
      "trackId": "track-main",
      "title": "Germany Invades Poland",
      "description": "Nazi Germany launches invasion of Poland, triggering World War II in Europe.",
      "longDescription": "On September 1, 1939, German forces invaded Poland from the north, south, and west. The invasion began without a formal declaration of war, using a new military tactic called Blitzkrieg (lightning war) that combined air power and fast-moving armored divisions.\n\nThis invasion prompted Britain and France to declare war on Germany two days later, marking the beginning of World War II in Europe. Poland fell within a month, divided between Germany and the Soviet Union according to the secret protocols of the Molotov-Ribbentrop Pact.",
      "type": "point",
      "startDate": "1939-09-01",
      "datePrecision": "day",
      "location": {
        "name": "Poland",
        "latitude": 51.9194,
        "longitude": 19.1451
      },
      "sources": [
        {
          "title": "Wikipedia: Invasion of Poland",
          "url": "https://en.wikipedia.org/wiki/Invasion_of_Poland",
          "type": "wikipedia"
        }
      ],
      "status": "confirmed",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "evt-002",
      "timelineId": "550e8400-e29b-41d4-a716-446655440000",
      "trackId": "track-main",
      "title": "Battle of Britain",
      "description": "German air campaign against the United Kingdom fails to achieve air superiority.",
      "longDescription": "The Battle of Britain was a military campaign of the Second World War, in which the Royal Air Force defended the United Kingdom against large-scale attacks by Nazi Germany's air force, the Luftwaffe. It was the first major military campaign fought entirely by air forces.\n\nThe German objective was to gain air superiority over the RAF as a prelude to a planned invasion of Britain (Operation Sea Lion). The failure of Germany to achieve its objectives is considered both its first major defeat and a crucial turning point in the war.",
      "type": "span",
      "startDate": "1940-07-10",
      "endDate": "1940-10-31",
      "datePrecision": "day",
      "location": {
        "name": "United Kingdom",
        "latitude": 51.5074,
        "longitude": -0.1278
      },
      "sources": [
        {
          "title": "Wikipedia: Battle of Britain",
          "url": "https://en.wikipedia.org/wiki/Battle_of_Britain",
          "type": "wikipedia"
        }
      ],
      "status": "confirmed",
      "createdAt": "2024-01-15T10:31:00Z",
      "updatedAt": "2024-01-15T10:31:00Z"
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

---

_Last Updated: 2026-01-04_
