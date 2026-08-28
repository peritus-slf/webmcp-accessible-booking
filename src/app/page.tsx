import Link from "next/link";
import { EVENTS } from "@/lib/venue/events";
import { AccessBadges } from "@/components/AccessBadges";
import { EventPoster } from "@/components/EventPoster";
import { Hero } from "@/components/Hero";

export default function Home() {
  return (
    <>
      <Hero featured={EVENTS[0]} />

      <section aria-labelledby="events-heading" className="mt-16 scroll-mt-8" id="whats-on">
        <h2 id="events-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          The autumn season
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Six performances between September and October.
        </p>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EVENTS.map((event) => (
            <li key={event.slug} className="rise">
              <article
                aria-labelledby={`event-${event.slug}-title`}
                className="lift flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Decorative. aria-hidden inside the component — the artwork
                    says nothing the heading does not already say. */}
                <EventPoster event={event} />

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {event.category}
                  </p>

                  <h3 id={`event-${event.slug}-title`} className="mt-1 text-lg font-semibold">
                    {/* 3.1.2 Language of Parts: Icelandic titles on an English
                        page, so a screen reader switches pronunciation. */}
                    <span lang="is">{event.title}</span>
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {event.subtitle}
                  </p>

                  <p className="mt-3 text-sm">
                    <time dateTime={event.date}>
                      {new Date(`${event.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        timeZone: "UTC",
                      })}
                    </time>
                    , curtain {event.curtain}
                  </p>

                  <div className="mt-4">
                    <AccessBadges event={event} />
                  </div>

                  <div className="mt-5 flex-1" />

                  {event.soldOut ? (
                    <p className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                      Sold out — returns go to the access list first
                    </p>
                  ) : (
                    <Link
                      href={`/events/${event.slug}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      Tickets and access
                      <span className="sr-only">
                        {" "}
                        for {event.title} on {event.date}
                      </span>
                    </Link>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
