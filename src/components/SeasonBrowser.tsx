"use client";

import Link from "next/link";
import { useId } from "react";
import { EVENTS, type VenueEvent } from "@/lib/venue/events";
import { EventPoster } from "@/components/EventPoster";
import { AccessBadges } from "@/components/AccessBadges";
import { isk } from "@/lib/format";
import { useStore } from "@/lib/useStore";
import { setState, type EventFilters } from "@/lib/store";

/**
 * The season listing, with filters.
 *
 * The cards are ordinary: poster, category, title, date, price from. No access
 * badges by default, because no commercial venue site puts them there and this
 * page is meant to look like one.
 *
 * Access sits in the filter row instead — one control among several, next to
 * genre and date, which is exactly where real sites put it and exactly why
 * almost nobody finds it. Turning it on reveals the access detail on every
 * card.
 *
 * This is a FILTER, not an accessible version of the page. The distinction is
 * load-bearing:
 *   - It is available to everyone, by clicking, with no agent involved.
 *   - It changes what is shown, never what can be done. Every performance is
 *     bookable either way, and the full access detail is on each event page
 *     regardless.
 *   - There is one page. Nobody is routed to a parallel site that will rot.
 *
 * An agent sets the same filter through `filter_events`, because it read the
 * patron's saved profile. That is personalisation — the same thing as filtering
 * by price — and not a mode that has to be enabled before the site is usable.
 */

const ACCESS_FILTERS: { key: keyof EventFilters; label: string; hint: string }[] = [
  { key: "relaxed", label: "Relaxed performances", hint: "House lights up, free movement, no strobe" },
  { key: "captioned", label: "Captioned", hint: "Live caption unit" },
  { key: "signed", label: "Sign-language interpreted", hint: "Interpreter downstage left" },
  { key: "audioDescribed", label: "Audio described", hint: "With a touch tour before curtain" },
  { key: "noStrobe", label: "No strobe", hint: "For photosensitive epilepsy" },
];

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

export function SeasonBrowser() {
  const { eventFilters, accessProfile, user } = useStore();
  const filtersId = useId();

  const anyActive = Object.values(eventFilters).some(Boolean);
  const shown = EVENTS.filter((e) => matchesFilters(e, eventFilters));

  function toggle(key: keyof EventFilters, value: boolean) {
    setState({ eventFilters: { ...eventFilters, [key]: value } });
  }

  // Offered only to someone whose saved profile actually implies a filter.
  const profileImplies =
    user && (accessProfile.noStrobe || accessProfile.captionsRequired || accessProfile.interpreterRequired);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">The autumn season</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Six performances between September and October.
          </p>
        </div>

        {profileImplies && !anyActive && (
          <button
            type="button"
            onClick={() =>
              setState({
                eventFilters: {
                  relaxed: false,
                  captioned: accessProfile.captionsRequired,
                  signed: accessProfile.interpreterRequired,
                  audioDescribed: false,
                  noStrobe: accessProfile.noStrobe,
                },
              })
            }
            className="min-h-11 rounded-md border border-slate-400 px-4 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Show only what matches my access profile
          </button>
        )}
      </div>

      <details className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
          Filter the season
          {anyActive && (
            <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-slate-900">
              {Object.values(eventFilters).filter(Boolean).length} active
            </span>
          )}
        </summary>

        <fieldset id={filtersId} className="border-t border-slate-200 p-4 dark:border-slate-800">
          <legend className="sr-only">Filter performances by access provision</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACCESS_FILTERS.map((f) => (
              <div key={String(f.key)} className="flex items-start gap-2">
                <input
                  id={`${filtersId}-${String(f.key)}`}
                  type="checkbox"
                  checked={Boolean(eventFilters[f.key])}
                  onChange={(e) => toggle(f.key, e.target.checked)}
                  aria-describedby={`${filtersId}-${String(f.key)}-hint`}
                  className="mt-1 size-5"
                />
                <span>
                  <label htmlFor={`${filtersId}-${String(f.key)}`} className="text-sm font-medium">
                    {f.label}
                  </label>
                  <span
                    id={`${filtersId}-${String(f.key)}-hint`}
                    className="block text-xs text-slate-600 dark:text-slate-400"
                  >
                    {f.hint}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {anyActive && (
            <button
              type="button"
              onClick={() =>
                setState({
                  eventFilters: {
                    relaxed: false,
                    captioned: false,
                    signed: false,
                    audioDescribed: false,
                    noStrobe: false,
                  },
                })
              }
              className="mt-4 min-h-11 rounded-md border border-slate-300 px-4 text-sm dark:border-slate-600"
            >
              Clear filters
            </button>
          )}
        </fieldset>
      </details>

      <p role="status" aria-live="polite" aria-atomic="true" className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        {anyActive
          ? `Showing ${shown.length} of ${EVENTS.length} performances that match your filters.`
          : `Showing all ${EVENTS.length} performances.`}
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 rounded-lg border border-amber-700 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          No performance this season matches every filter. The access line can
          tell you what is planned for the spring.
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
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{event.subtitle}</p>

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

                  {/*
                    Access detail appears only once someone has asked for it —
                    by clicking a filter, or via an agent that read their
                    profile. It is on the event page either way.
                  */}
                  {anyActive && (
                    <div className="mt-4">
                      <AccessBadges event={event} />
                    </div>
                  )}

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
