import Link from "next/link";
import type { VenueEvent } from "@/lib/venue/events";

/**
 * The landing hero.
 *
 * This is deliberately a normal venue website: dark, loud, a headline act, a
 * pre-registration call to action. It does not announce that it is accessible,
 * and the access page is a link in the footer like it is on almost every real
 * venue site.
 *
 * That is the point of the demo rather than a compromise in it. A site built as
 * an accessibility showcase demonstrates accessibility. A site that looks like
 * every other ticketing page and *still* serves a disabled patron properly —
 * because the tool contract underneath is real — demonstrates WebMCP. The
 * second is the one anyone could actually ship.
 *
 * The aurora behind the text drifts over about half a minute, and only for
 * visitors who have not asked their system to reduce motion. It never flashes.
 */
export function Hero({ featured }: { featured: VenueEvent }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate -mt-8 mx-[calc(50%-50vw)] w-screen overflow-hidden bg-slate-950 px-6 py-24 text-white sm:py-32"
    >
      {/* Decorative. Nothing here carries meaning the text does not. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-slate-950" />
        <div className="aurora-a absolute -left-1/4 top-[-30%] h-[140%] w-[90%] rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.55),transparent)] blur-3xl" />
        <div className="aurora-b absolute -right-1/4 bottom-[-40%] h-[140%] w-[90%] rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.5),transparent)] blur-3xl" />
        <div className="aurora-a absolute left-1/3 top-[-20%] h-[120%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.32),transparent)] blur-3xl [animation-delay:-12s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(2,6,23,0.92),rgba(2,6,23,0.15))]" />
      </div>

      <div className="mx-auto max-w-6xl px-0 sm:px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
          Autumn season · On sale now
        </p>

        <h1
          id="hero-heading"
          className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl"
        >
          Six nights that will not
          <span className="block text-sky-300">sound like anywhere else.</span>
        </h1>

        <p className="mt-5 max-w-xl text-lg text-slate-300">
          Aurora Hall opens its autumn season in Reykjavík. Orchestral, late
          electronic, jazz, dance — and one relaxed matinee.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href={`/events/${featured.slug}`}
            className="inline-flex min-h-12 items-center rounded-full bg-white px-7 font-semibold text-slate-950 hover:bg-sky-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
          >
            Pre-register for tickets
            <span className="sr-only">
              {" "}
              for {featured.title} on {featured.date}
            </span>
          </Link>
          <a
            href="#whats-on"
            className="inline-flex min-h-12 items-center rounded-full border border-white/30 px-7 font-medium text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
          >
            See the season
          </a>
        </div>

        {/* The headline act. A banner, as any venue site would run. */}
        <div className="mt-14 max-w-2xl rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
            Opening night · Priority booking
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            <span lang="is">{featured.title}</span>
          </h2>
          <p className="mt-1 text-slate-300">{featured.subtitle}</p>
          <p className="mt-3 text-sm text-slate-400">
            <time dateTime={featured.date}>
              {new Date(`${featured.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              })}
            </time>
            {" · "}Doors {featured.doors}, curtain {featured.curtain}
          </p>
        </div>
      </div>
    </section>
  );
}
