import Link from 'next/link';
import { prisma } from '@/lib/db';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch recent public timelines
  const timelines = await prisma.timeline.findMany({
    where: { visibility: 'public' },
    orderBy: { updatedAt: 'desc' },
    take: 6,
    include: {
      _count: {
        select: { events: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <svg
              className="h-8 w-8 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-xl font-bold text-gray-900">Timeline</span>
          </div>
          <Link
            href="/new"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Create Timeline
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Visualize History with AI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Create interactive timelines powered by AI. Generate events with natural language,
            explore historical connections, and share your discoveries.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/new"
              className="rounded-lg bg-blue-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-600"
            >
              Get Started
            </Link>
            <a
              href="#examples"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              View Examples
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">Features</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              }
              title="AI-Powered Generation"
              description="Generate timeline events with natural language. Just describe what you want and let AI create accurate historical events."
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              }
              title="Interactive Visualization"
              description="Pan, zoom, and explore your timeline with smooth interactions. View events in detail with rich descriptions and sources."
            />
            <FeatureCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              }
              title="Share & Collaborate"
              description="Share your timelines with anyone. Generate shareable links and make your timelines public or private."
            />
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">Public Timelines</h2>
          <p className="mt-2 text-center text-gray-600">
            Explore timelines created by the community
          </p>

          {timelines.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {timelines.map((timeline) => (
                <TimelineCard
                  key={timeline.id}
                  id={timeline.id}
                  title={timeline.title}
                  description={timeline.description}
                  eventCount={timeline._count.events}
                />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <p className="text-gray-500">No public timelines yet.</p>
              <Link href="/new" className="mt-4 inline-block text-blue-500 hover:text-blue-600">
                Create the first one
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          <p>Timeline Viewer - Built with Next.js and Claude AI</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-500">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

function TimelineCard({
  id,
  title,
  description,
  eventCount,
}: {
  id: string;
  title: string;
  description: string | null;
  eventCount: number;
}) {
  return (
    <Link
      href={`/timeline/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{description}</p>}
      <p className="mt-3 text-xs text-gray-400">
        {eventCount} {eventCount === 1 ? 'event' : 'events'}
      </p>
    </Link>
  );
}
