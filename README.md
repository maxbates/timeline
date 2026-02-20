# Timeline Viewer

![Timeline Viewer](./media/Screenshot%202026-01-05%20at%2014.34.42.png)

Interactive timeline visualization with AI-powered event generation using Claude.

## Features

- **Interactive Timeline**: Pan, zoom, and explore events with smooth interactions
- **AI Event Generation**: Generate historical events using natural language via Claude API
- **Event Staging**: Review and accept/reject AI-generated events before adding to timeline
- **Detail Panel**: View event details with location maps and source citations
- **Share & Collaborate**: Share timelines with customizable visibility settings

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Anthropic Claude API
- **Maps**: MapLibre GL JS with Stadia Maps

## Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database (local or hosted, e.g., Supabase)
- Anthropic API key

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your database configuration:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/timeline?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/timeline?schema=public"

# App URL (for sharing)
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

**Note**: The Anthropic API key is now configured in the app's Settings UI (stored locally in your browser), not as an environment variable.

### 3. Set up the database

Push the Prisma schema to your database:

```bash
pnpm exec prisma db push
```

(Optional) Generate Prisma client if needed:

```bash
pnpm exec prisma generate
```

### 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Options

### Local PostgreSQL

Install PostgreSQL locally and create a database:

```bash
createdb timeline
```

Use connection string: `postgresql://localhost:5432/timeline`

### Supabase (Recommended for deployment)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings > Database > Connection string
3. Copy the connection strings for `DATABASE_URL` and `DIRECT_URL`

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── timeline/[id]/     # Timeline viewer page
│   └── new/               # Create timeline page
├── features/              # Feature modules
│   ├── timeline/          # Timeline visualization
│   ├── detail-panel/      # Event details
│   ├── chat/              # Chat & AI integration
│   └── header/            # App header
├── lib/                   # Shared utilities
│   ├── db.ts             # Prisma client
│   ├── llm.ts            # Claude API integration
│   └── dates.ts          # Date utilities (BCE support)
└── types/                 # TypeScript types
```

## Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm test:run     # Run tests
pnpm format       # Format code with Prettier
```

## Usage

1. **Set API Key**: Click the key icon in the header to set your Anthropic API key (stored locally in your browser)
2. **Create a Timeline**: Click "Create Timeline" and give it a name
3. **Generate Events**: Use the chat panel to ask Claude to generate events
   - Example: "Add key events from the Roman Republic"
4. **Review Events**: AI-generated events appear as "staged" - accept or reject them
5. **Explore**: Click events to view details, pan/zoom the timeline
6. **Share**: Use the Share button to get a shareable link

## Keyboard Shortcuts

- `+` / `-`: Zoom in/out
- `0`: Reset zoom
- `←` / `→`: Pan left/right
- `Esc`: Deselect event

## License

MIT
