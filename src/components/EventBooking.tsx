"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SeatSelection } from "./SeatSelection";
import { seatsForEvent } from "@/lib/venue/query";
import type { VenueEvent } from "@/lib/venue/events";
import { isk } from "@/lib/format";
import { useStore } from "@/lib/useStore";
import { bookingReference, getState, setState } from "@/lib/store";

/**
 * Seat selection plus checkout.
 *
 * The checkout summary is a live region: whether the seats were chosen by hand
 * on the plan, by filter in the list, or by an agent calling `hold_seats`, the
 * same words are announced and the same panel updates. There is no separate
 * "agent did something" surface.
 */
export function EventBooking({ event }: { event: VenueEvent }) {
  const { holds, bookings, user } = useStore();
  const [confirming, setConfirming] = useState(false);
  const seats = useMemo(() => seatsForEvent(event), [event]);

  const heldIds = holds?.eventSlug === event.slug ? holds.seatIds : [];
  const held = heldIds.map((id) => seats.find((s) => s.id === id)!).filter(Boolean);
  const booking = bookings.find((b) => b.eventSlug === event.slug);

  const hasBay = held.some((s) => s.wheelchairSpace);
  const companion = held.find((s) => s.companionSeat);
  const chargeable = hasBay && companion ? held.filter((s) => s.id !== companion.id) : held;
  const total = chargeable.reduce((sum, s) => sum + s.priceIsk, 0);

  function completeBooking() {
    const state = getState();
    if (!state.holds) return;
    const reference = bookingReference(event.slug, state.holds.seatIds);
    setState({
      bookings: [
        ...state.bookings,
        {
          reference,
          eventSlug: event.slug,
          seatIds: state.holds.seatIds,
          totalIsk: total,
          companionTicketApplied: hasBay && Boolean(companion),
        },
      ],
      holds: null,
    });
    setConfirming(false);
  }

  if (booking) {
    return (
      <section
        aria-labelledby="confirmed-heading"
        className="rounded-xl border border-emerald-700 bg-emerald-50 p-6 dark:bg-emerald-950"
      >
        <h2 id="confirmed-heading" className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
          Booking confirmed
        </h2>
        <div role="status" aria-live="polite" className="mt-3 space-y-2 text-sm text-emerald-900 dark:text-emerald-100">
          <p>
            Reference <strong className="font-mono">{booking.reference}</strong> — seats{" "}
            {booking.seatIds.join(", ")} for <span lang="is">{event.title}</span> on {event.date}.
          </p>
          <p>
            {isk(booking.totalIsk)} kr paid.
            {booking.companionTicketApplied && " The companion ticket was free and was not charged."}
          </p>
          <p>
            Your confirmation includes the step-free route from the north entrance
            and the access notes from your profile. Staff at the door will already
            have them.
          </p>
        </div>
        <Link
          href="/bookings"
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-emerald-800 px-4 text-sm font-medium text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          See my bookings
        </Link>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <SeatSelection event={event} />

      <aside aria-labelledby="checkout-heading" className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 id="checkout-heading" className="text-lg font-semibold">
            Your selection
          </h2>

          <div role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm">
            {held.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400">No seats selected yet.</p>
            ) : (
              <ul className="space-y-2">
                {held.map((seat) => (
                  <li key={seat.id} className="flex justify-between gap-2">
                    <span>
                      <span className="font-mono font-semibold">{seat.id}</span>{" "}
                      <span className="text-slate-600 dark:text-slate-400">
                        {seat.wheelchairSpace
                          ? "wheelchair bay"
                          : seat.companionSeat
                            ? "companion seat"
                            : seat.section}
                      </span>
                    </span>
                    <span className={companion?.id === seat.id ? "text-emerald-700 dark:text-emerald-300" : ""}>
                      {companion?.id === seat.id ? "Free" : `${isk(seat.priceIsk)} kr`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {held.length > 0 && (
            <>
              <p className="mt-4 flex justify-between border-t border-slate-200 pt-3 font-semibold dark:border-slate-800">
                <span>Total</span>
                <span>{isk(total)} kr</span>
              </p>
              {hasBay && companion && (
                <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300">
                  One companion ticket is free with a wheelchair booking. It has
                  been applied — you do not have to ask.
                </p>
              )}

              {!user ? (
                <div className="mt-4 rounded-md border border-amber-700 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  <p>You need to sign in to complete a booking.</p>
                  <Link
                    href="/signin"
                    className="mt-2 inline-flex min-h-11 items-center rounded-md bg-amber-800 px-4 text-sm font-medium text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                  >
                    Sign in
                  </Link>
                </div>
              ) : confirming ? (
                <div className="mt-4 rounded-md border border-slate-300 p-3 dark:border-slate-600">
                  <p className="text-sm">
                    Confirm booking of {held.map((s) => s.id).join(", ")} for{" "}
                    {isk(total)} kr?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={completeBooking}
                      className="min-h-11 flex-1 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
                    >
                      Yes, book
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="min-h-11 rounded-md border border-slate-300 px-4 text-sm dark:border-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="mt-4 min-h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Continue to booking
                </button>
              )}

              <button
                type="button"
                onClick={() => setState({ holds: null })}
                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-4 text-sm dark:border-slate-600"
              >
                Clear selection
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
