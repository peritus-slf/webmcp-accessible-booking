import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENTS, accessSummary, eventBySlug } from "@/lib/venue/events";
import { AccessBadges } from "@/components/AccessBadges";
import { EventBooking } from "@/components/EventBooking";
import { EventPoster } from "@/components/EventPoster";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = eventBySlug(slug);
  // Absolute, so the layout template does not append the venue name twice.
  return {
    title: event
      ? { absolute: `${event.title} — tickets and access · Aurora Hall` }
      : { absolute: "Performance not found · Aurora Hall" },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = eventBySlug(slug);
  if (!event) notFound();

  return (
    <>
      {/* 2.4.8 Location — a breadcrumb trail, not just a back button. */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <Link
              href="/"
              className="rounded underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              What&rsquo;s on
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" lang="is">
            {event.title}
          </li>
        </ol>
      </nav>

      <article className="mt-6">
        <div className="overflow-hidden rounded-xl">
          <EventPoster event={event} variant="hero" />
        </div>

        <header className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {event.category}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl" lang="is">
            {event.title}
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">{event.subtitle}</p>
          <p className="mt-3">
            <time dateTime={event.date}>
              {new Date(`${event.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
            {" · "}Doors {event.doors}, curtain {event.curtain} · {event.runtime}
          </p>
        </header>

        <p className="mt-5 max-w-3xl">{event.description}</p>

        <section aria-labelledby="event-access-heading" className="mt-8">
          <h2 id="event-access-heading" className="text-xl font-semibold">
            Access at this performance
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Access provision belongs to the performance, not the building. The
            same room on a different night has a different lighting rig and a
            different set of services.
          </p>
          <div className="mt-4">
            <AccessBadges event={event} showDetail />
          </div>
          <ul className="mt-4 max-w-3xl list-disc space-y-1 pl-5 text-sm">
            {accessSummary(event).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        {event.soldOut ? (
          <p className="mt-8 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
            This performance is sold out. Returns are released to the access list
            first — call the access line in the footer to join it.
          </p>
        ) : (
          <section aria-labelledby="seats-section-heading" className="mt-10">
            <h2 id="seats-section-heading" className="sr-only">
              Seat selection and checkout
            </h2>
            <EventBooking event={event} />
          </section>
        )}
      </article>
    </>
  );
}
