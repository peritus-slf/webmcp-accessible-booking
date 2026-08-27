"use client";

import Link from "next/link";
import { eventBySlug } from "@/lib/venue/events";
import { isk } from "@/lib/format";
import { useStore } from "@/lib/useStore";

export default function BookingsPage() {
  const { user, bookings } = useStore();

  if (!user) {
    return (
      <section aria-labelledby="bookings-heading" className="max-w-xl">
        <h1 id="bookings-heading" className="text-2xl font-semibold tracking-tight">
          My bookings
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Sign in to see your bookings.
        </p>
        <Link
          href="/signin"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="bookings-heading" className="max-w-3xl">
      <h1 id="bookings-heading" className="text-3xl font-semibold tracking-tight">
        My bookings
      </h1>

      {bookings.length === 0 ? (
        <>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Nothing booked yet.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
          >
            See what&rsquo;s on
          </Link>
        </>
      ) : (
        <ul className="mt-6 space-y-4">
          {bookings.map((booking) => {
            const event = eventBySlug(booking.eventSlug);
            if (!event) return null;
            return (
              <li
                key={booking.reference}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <h2 className="text-lg font-semibold">
                  <span lang="is">{event.title}</span>
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
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

                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">Reference</dt>
                    <dd className="font-mono font-medium">{booking.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">Seats</dt>
                    <dd className="font-medium">{booking.seatIds.join(", ")}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">Paid</dt>
                    <dd className="font-medium">
                      {isk(booking.totalIsk)} kr
                      {booking.companionTicketApplied && (
                        <span className="ml-2 font-normal text-emerald-700 dark:text-emerald-300">
                          companion ticket free
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-600 dark:text-slate-400">Arrival</dt>
                    <dd className="font-medium">North entrance, step-free</dd>
                  </div>
                </dl>

                <p className="mt-4 rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-800">
                  Your access notes were sent with this booking. Door staff have
                  them already — you will not be asked to explain again on the
                  night.
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
