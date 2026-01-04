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
  id: string;                    // UUID v4
  title: string;                 // max 100 chars
  description: string;           // max 500 chars
  ownerId: string;               // User ID
  visibility: 'private' | 'unlisted' | 'public';
  tracks: Track[];
  events: TimelineEvent[];
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601

  // Extensibility
  metadata?: Record<string, unknown>;
}
```

### 1.2 TimelineEvent

Represents a single event on the timeline. Events can be either point events (single date) or span events (date range).

```typescript
interface TimelineEvent {
  id: string;                    // UUID v4
  timelineId: string;            // Parent timeline ID
  trackId: string;               // Which track this event belongs to

  // Content
  title: string;                 // max 10 words (~60 chars)
  description: string;           // 1 sentence (~200 chars)
  longDescription: string;       // 1-2 paragraphs (~1000 chars)

  // Temporal
  type: 'point' | 'span';
  startDate: string;             // ISO 8601 date (YYYY-MM-DD or full datetime)
  endDate?: string;              // ISO 8601 date, required if type === 'span'
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
  name: string;                  // Human-readable location name
  latitude?: number;
  longitude?: number;
  placeId?: string;              // Google Places ID or similar
}

interface EventSource {
  title: string;                 // Source name/title
  url: string;                   // Link to source
  type: 'wikipedia' | 'article' | 'book' | 'other';
  accessedAt?: string;           // When the source was accessed
}
```

### 1.3 Track

Tracks allow visual grouping and layering of events. Enables future features like comparing timelines or categorizing events.

```typescript
interface Track {
  id: string;                    // UUID v4
  timelineId: string;
  name: string;                  // e.g., "Main", "Staged", "Political Events"
  type: 'main' | 'staging' | 'custom';
  color: TrackColor;
  order: number;                 // Display order (lower = higher on screen)
  visible: boolean;

  // Extensibility
  metadata?: Record<string, unknown>;
}

type TrackColor =
  | 'blue'      // Default for main track
  | 'green'     // Default for staging/LLM suggestions
  | 'red'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'teal'
  | 'gray';

// Color palette (Apple-style flat colors)
const TRACK_COLORS: Record<TrackColor, string> = {
  blue:   '#007AFF',
  green:  '#34C759',
  red:    '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
  pink:   '#FF2D55',
  teal:   '#5AC8FA',
  gray:   '#8E8E93',
};
```

### 1.4 Chat Messages

Messages exchanged in the chat interface for LLM interaction.

```typescript
interface ChatMessage {
  id: string;                    // UUID v4
  timelineId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;

  // If assistant message contains events
  generatedEventIds?: string[];  // References to staged events

  createdAt: string;

  // For streaming responses
  status: 'pending' | 'streaming' | 'complete' | 'error';
  error?: string;
}
```

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
- **Stacking**: When events overlap:
  - Point events render above span events
  - Multiple overlapping events stack vertically within their track
  - No horizontal overlap - offset vertically

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
- Padding at start and end (configurable, e.g., 10% of visible range)
- Current date indicator (if in range)

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
  startDate: string;           // Left edge of visible timeline
  endDate: string;             // Right edge of visible timeline
  zoomLevel: number;           // 1 = default, <1 = zoomed out, >1 = zoomed in
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

// GET /api/timelines/:id/chat/history
// Get chat history for timeline
Response: { messages: ChatMessage[] }
```

### 4.4 Sharing

```typescript
// POST /api/timelines/:id/share
// Generate share link
Request: { visibility: 'unlisted' | 'public' }
Response: { shareUrl: string }

// GET /api/shared/:shareId
// Access shared timeline (no auth required for public)
Response: Timeline
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
${request.existingEvents.map(e => `- ${e.title} (${e.startDate})`).join('\n')}

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
--color-track-blue: #007AFF;    /* Primary, main timeline */
--color-track-green: #34C759;   /* Staging/LLM suggestions */
--color-track-red: #FF3B30;
--color-track-orange: #FF9500;
--color-track-purple: #AF52DE;
--color-track-pink: #FF2D55;
--color-track-teal: #5AC8FA;
--color-track-gray: #8E8E93;
```

### 7.2 UI Colors

```css
/* Light mode */
--color-bg-primary: #FFFFFF;
--color-bg-secondary: #F2F2F7;
--color-text-primary: #000000;
--color-text-secondary: #3C3C43;
--color-border: #C6C6C8;

/* Dark mode */
--color-bg-primary-dark: #000000;
--color-bg-secondary-dark: #1C1C1E;
--color-text-primary-dark: #FFFFFF;
--color-text-secondary-dark: #EBEBF5;
--color-border-dark: #38383A;
```

### 7.3 Semantic Colors

```css
--color-primary: #007AFF;       /* Primary actions */
--color-success: #34C759;       /* Success states */
--color-warning: #FF9500;       /* Warnings */
--color-error: #FF3B30;         /* Errors */
--color-info: #5AC8FA;          /* Information */
```

---

## 8. Database Schema (Prisma)

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

  tracks       Track[]
  events       TimelineEvent[]
  chatMessages ChatMessage[]

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

model ChatMessage {
  id                String   @id @default(uuid())
  timelineId        String
  timeline          Timeline @relation(fields: [timelineId], references: [id], onDelete: Cascade)
  role              String
  content           String   @db.Text
  generatedEventIds String[] @default([])
  status            String   @default("complete")
  error             String?
  createdAt         DateTime @default(now())

  @@index([timelineId])
}
```

---

## 9. Zod Validation Schemas

```typescript
import { z } from 'zod';

// Track colors
export const trackColorSchema = z.enum([
  'blue', 'green', 'red', 'orange', 'purple', 'pink', 'teal', 'gray'
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
export const createEventSchema = z.object({
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
}).refine(
  (data) => data.type === 'point' || data.endDate !== undefined,
  { message: 'Span events require an end date' }
);

// Timeline (for creation)
export const createTimelineSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// Chat message (for sending)
export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.object({
    focusedEventId: z.string().uuid().optional(),
    action: z.enum(['generate', 'learn_more', 'similar_events']).optional(),
  }).optional(),
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
│   │   │   └── EventSources.tsx
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

*Last Updated: 2026-01-04*
