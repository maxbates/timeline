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

      {/* Public Timelines */}
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
