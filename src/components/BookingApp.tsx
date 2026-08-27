"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CommandInterface } from "./CommandInterface";
import { SeatMap } from "./SeatMap";
import { getBookingState, resetBooking, subscribe } from "@/lib/tools/registry";
import { isWebMcpAvailable, registerAllTools } from "@/lib/tools/webmcp";

const EMPTY = { held: [], booked: [], companionTicketApplied: false };

export function BookingApp() {
  const booking = useSyncExternalStore(subscribe, getBookingState, () => EMPTY);
  const [webmcp, setWebmcp] = useState<boolean | null>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    registerAllTools().then((fn) => {
      dispose = fn;
      setWebmcp(isWebMcpAvailable());
    });
    return () => dispose?.();
  }, []);

  const active = [...booking.held, ...booking.booked];

  return (
    <>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">Aurora Hall</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Kaldaljós — Thursday 18 September, 19:30. Captioned and signed
              performance.
            </p>
          </div>
          <CommandInterface />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-6 py-8">
        <section aria-labelledby="plan-heading">
          <h2 id="plan-heading" className="text-lg font-semibold">
            Seating plan
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Every seat here is reachable by keyboard and announces its own access
            details. That is the floor, not the ceiling — hearing 330 seats in
            sequence is not how anyone finds the one that meets four access needs
            at once. Use{" "}
            <strong className="font-medium">Ask for seats</strong> for that.
          </p>

          <div className="mt-4">
            <SeatMap
              held={booking.held}
              booked={booking.booked}
              highlighted={active}
            />
          </div>
        </section>

        <section aria-labelledby="booking-heading" className="mt-8">
          <h2 id="booking-heading" className="text-lg font-semibold">
            Your booking
          </h2>
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900"
          >
            {booking.booked.length > 0 ? (
              <p>
                Booked: {booking.booked.join(", ")}.
                {booking.companionTicketApplied
                  ? " The free companion ticket has been applied."
                  : ""}
              </p>
            ) : booking.held.length > 0 ? (
              <p>On hold for 15 minutes: {booking.held.join(", ")}. Nothing paid yet.</p>
            ) : (
              <p>Nothing held or booked yet.</p>
            )}
          </div>
          {(booking.held.length > 0 || booking.booked.length > 0) && (
            <button
              type="button"
              onClick={resetBooking}
              className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              Start over
            </button>
          )}
        </section>

        <section aria-labelledby="why-heading" className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800">
          <h2 id="why-heading" className="text-lg font-semibold">
            Why this demo exists
          </h2>
          <div className="mt-2 max-w-2xl space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <p>
              The WebMCP proposal says it is{" "}
              <em>&ldquo;not designed for ingestion by accessibility
              technology&rdquo;</em>. Taken at face value, that builds a two-tier
              web: agents get structured, actionable capability, and disabled
              users get whatever the interface happened to expose.
            </p>
            <p>
              This site defines its tools once. An agent reaches them through{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                document.modelContext
              </code>
              . The command interface reaches the same tools through the same
              calls. Neither is a reduced version of the other.
            </p>
            <p>
              The site is built accessibly first — semantic structure, full
              keyboard operation, labelled controls. WebMCP is not a substitute
              for that work and this demo is not an argument that it should be.
              It is the layer that makes a task possible which was accessible in
              principle and unusable in practice.
            </p>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {webmcp === null
              ? "Checking for WebMCP support…"
              : webmcp
                ? "WebMCP detected. Tools are registered with this browser and an agent can call them."
                : "WebMCP is not available in this browser. Everything still works — the command interface runs the same tools directly."}
          </p>
        </section>
      </main>
    </>
  );
}
