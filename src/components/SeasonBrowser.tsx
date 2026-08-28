"use client";

import Link from "next/link";
import { EVENTS, type VenueEvent } from "@/lib/venue/events";
import { EventPoster } from "@/components/EventPoster";
import { isk } from "@/lib/format";
import { useStore } from "@/lib/useStore";
import { setState, NO_FILTERS, type EventFilters } from "@/lib/store";

/**
 * The season listing.
 *
 * An ordinary grid of ordinary cards: poster, category, title, date, price
 * from, Book. No access badges, no filter row, nothing announcing that this
 * venue has thought about disabled patrons — because no commercial venue site
 * has any of that on its landing page, and this page is meant to look like one.
 *
 * The access data is not missing, it is just not *here*. Every performance
 * publishes its full provision — captions, interpretation, audio description,
 * relaxed staging, lighting rig — through `list_events` and `get_event`, and
 * `filter_events` narrows this grid. So an agent that knows what someone needs
 * can cut six performances down to the one that works, while the page a sighted
 * visitor lands on is just a page.
 *
 * That is the argument the whole project is making, in one component: the site
 * does not have to be redesigned around disabled users. It has to expose a real
 * tool contract.
 *
 * The one control that does appear is the escape hatch. If a filter is active,
 * a line says so and offers to clear it. An agent that can narrow the page and
 * leave a human with no way back has taken something away rather than added
 * anything — and the access detail itself is on every event page regardless, so
 * nothing here is the only route to it.
 */

export function matchesFilters(event: VenueEvent, f: EventFilters): boolean {
  if (f.relaxed && !event.relaxed) return false;
  if (f.captioned && !event.captioned) return false;
  if (f.signed && !event.signed) return false;
  if (f.audioDescribed && !event.audioDescribed) return false;
  if (f.noStrobe && event.lighting !== "none") return false;
  return true;
}

function priceFrom(event: VenueEvent): number {
  return Math.round((6500 * event.priceMultiplier) / 500) * 500;
}

const FILTER_NAMES: Record<keyof EventFilters, string> = {
  relaxed: "relaxed performances",
  captioned: "captioned",
  signed: "sign-language interpreted",
  audioDescribed: "audio described",
  noStrobe: "no strobe",
};

export function SeasonBrowser() {
  const { eventFilters } = useStore();

  const active = (Object.keys(eventFilters) as (keyof EventFilters)[]).filter(
    (k) => eventFilters[k],
  );
  const shown = EVENTS.filter((e) => matchesFilters(e, eventFilters));

  return (
    <>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        The autumn season
      </h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Six performances between September and October.
      </p>

      {/*
        Announced whether the change came from a click or a tool call, so a
        screen-reader user hears the listing narrow at the moment it happens.
      */}
      <p role="status" aria-live="polite" aria-atomic="true" className={active.length > 0 ? "sr-only" : "sr-only"}>
        {active.length > 0
          ? `Showing ${shown.length} of ${EVENTS.length} performances, filtered by ${active.map((k) => FILTER_NAMES[k]).join(" and ")}.`
          : ""}
      </p>

      {active.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
          <span>
            Showing <strong>{shown.length}</strong> of {EVENTS.length} performances —{" "}
            {active.map((k) => FILTER_NAMES[k]).join(", ")}.
          </span>
          <button
            type="button"
            onClick={() => setState({ eventFilters: NO_FILTERS })}
            className="ml-auto min-h-11 rounded-md border border-slate-400 px-4 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Show all performances
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-8 rounded-lg border border-amber-700 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          No performance this season matches every filter.
        </p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((event) => (
            <li key={event.slug} className="rise">
              <article
                aria-labelledby={`event-${event.slug}-title`}
                className="lift flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <EventPoster event={event} />

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {event.category}
                  </p>

                  <h3 id={`event-${event.slug}-title`} className="mt-1 text-lg font-semibold">
                    {/* 3.1.2 Language of Parts — Icelandic titles on an English page. */}
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
                    , {event.curtain}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    From {isk(priceFrom(event))} kr
                  </p>

                  <div className="mt-5 flex-1" />

                  {event.soldOut ? (
                    <p className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                      Sold out
                    </p>
                  ) : (
                    <Link
                      href={`/events/${event.slug}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      Book
                      <span className="sr-only">
                        {" "}
                        tickets for {event.title} on {event.date}
                      </span>
                    </Link>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
