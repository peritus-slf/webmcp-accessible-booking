import Link from "next/link";
import { EVENTS } from "@/lib/venue/events";
import { AccessBadges } from "@/components/AccessBadges";
import { EventPoster } from "@/components/EventPoster";

export default function Home() {
  return (
    <>
      <section aria-labelledby="intro-heading">
        <h1 id="intro-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          What&rsquo;s on at Aurora Hall
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Every performance lists its access provision up front — captions,
          interpretation, strobe, relaxed staging — because you should be able to
          rule a night out before you get as far as the seating plan.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Accessible seating is booked here, like every other seat. There is no
          separate phone line you are obliged to use.
        </p>
      </section>

      <section aria-labelledby="events-heading" className="mt-10">
        <h2 id="events-heading" className="sr-only">
          Upcoming performances
        </h2>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EVENTS.map((event) => (
            <li key={event.slug}>
              <article
                aria-labelledby={`event-${event.slug}-title`}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
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
