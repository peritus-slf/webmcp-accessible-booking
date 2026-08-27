"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { ROW_ORDER } from "@/lib/venue/hall";
import { seatsForEvent } from "@/lib/venue/query";
import type { VenueEvent } from "@/lib/venue/events";
import type { Seat } from "@/lib/venue/types";
import { isk } from "@/lib/format";
import { useStore } from "@/lib/useStore";
import { getState, setState } from "@/lib/store";

/**
 * Choosing seats, two ways.
 *
 * A visual seating plan is the wrong shape for linear navigation, and a
 * correctly-labelled grid does not fix that — it just makes 330 unusable cells
 * technically reachable. So the plan is offered alongside a **list view**:
 * seats grouped by section and row, filterable by access requirement, in plain
 * semantic HTML. That follows the long-standing guidance that an ARIA grid is
 * usually the harder path to a worse result.
 *
 * Neither view is the "accessible version". Both are the site. The filters in
 * the list view are the same constraints the tool contract exposes, so a
 * screen-reader user filtering by hand and an agent calling `find_seats` are
 * asking the venue the same question.
 *
 * WCAG 2.2 notes:
 *  - 2.5.8 Target Size — seat controls are 28px, above the 24px minimum.
 *  - 2.5.7 Dragging Movements — nothing here is drag-operated.
 *  - 1.4.1 Use of Colour — every state carries text, not only a colour.
 */

type View = "plan" | "list";
type SeatState = "available" | "held" | "booked" | "sold";

interface Filters {
  wheelchairSpace: boolean;
  transferSeat: boolean;
  hearingLoop: boolean;
  captionScreenVisible: boolean;
  stepFree: boolean;
  noStrobe: boolean;
  assistanceDogSpace: boolean;
}

const EMPTY_FILTERS: Filters = {
  wheelchairSpace: false,
  transferSeat: false,
  hearingLoop: false,
  captionScreenVisible: false,
  stepFree: false,
  noStrobe: false,
  assistanceDogSpace: false,
};

const FILTER_LABELS: Record<keyof Filters, string> = {
  wheelchairSpace: "Wheelchair bay",
  transferSeat: "Transfer seat (armrest lifts)",
  hearingLoop: "Induction loop",
  captionScreenVisible: "Caption unit in view",
  stepFree: "Step-free route",
  noStrobe: "No strobe exposure",
  assistanceDogSpace: "Room for an assistance dog",
};

function describeShort(seat: Seat): string {
  const bits: string[] = [];
  if (seat.wheelchairSpace) bits.push("wheelchair bay");
  else if (seat.companionSeat) bits.push("companion seat");
  if (seat.transferSeat) bits.push("armrest lifts");
  bits.push(seat.stepsToReach === 0 ? "step-free" : `${seat.stepsToReach} steps`);
  if (seat.hearingLoop) bits.push("induction loop");
  bits.push(seat.captionScreenVisible ? "captions in view" : "captions not in view");
  if (seat.strobeExposure !== "none") bits.push(`${seat.strobeExposure} strobe`);
  bits.push(`${seat.distanceToAccessibleWcM} m to accessible toilet`);
  return bits.join(", ");
}

function fullLabel(seat: Seat, state: SeatState): string {
  const status =
    state === "sold" ? "sold" : state === "booked" ? "booked by you" : state === "held" ? "on hold" : "available";
  return `Seat ${seat.id}, ${seat.section}, ${isk(seat.priceIsk)} kr, ${describeShort(seat)}, ${status}`;
}

export function SeatSelection({ event }: { event: VenueEvent }) {
  const { holds, bookings } = useStore();
  const [view, setView] = useState<View>("plan");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [focused, setFocused] = useState("A-1");
  const [announcement, setAnnouncement] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const filtersId = useId();

  const seats = useMemo(() => seatsForEvent(event), [event]);

  const heldIds = useMemo(
    () => (holds?.eventSlug === event.slug ? holds.seatIds : []),
    [holds, event.slug],
  );
  const bookedIds = useMemo(
    () => bookings.filter((b) => b.eventSlug === event.slug).flatMap((b) => b.seatIds),
    [bookings, event.slug],
  );

  const stateOf = useCallback(
    (seat: Seat): SeatState => {
      if (bookedIds.includes(seat.id)) return "booked";
      if (heldIds.includes(seat.id)) return "held";
      if (seat.status === "sold") return "sold";
      return "available";
    },
    [heldIds, bookedIds],
  );

  const rows = useMemo(() => {
    const grouped = new Map<string, Seat[]>();
    for (const seat of seats) {
      const list = grouped.get(seat.row) ?? [];
      list.push(seat);
      grouped.set(seat.row, list);
    }
    return ROW_ORDER.filter((r) => grouped.has(r)).map((row) => ({
      row,
      seats: grouped.get(row)!.sort((a, b) => a.number - b.number),
    }));
  }, [seats]);

  const matching = useMemo(() => {
    const active = (Object.keys(filters) as (keyof Filters)[]).filter((k) => filters[k]);
    return seats.filter((seat) => {
      if (seat.status !== "available") return false;
      return active.every((key) => {
        if (key === "noStrobe") return seat.strobeExposure === "none";
        return seat[key as keyof Seat] === true;
      });
    });
  }, [seats, filters]);

  const toggleSeat = useCallback(
    (seat: Seat) => {
      const state = getState();
      const current = state.holds?.eventSlug === event.slug ? state.holds.seatIds : [];
      const next = current.includes(seat.id)
        ? current.filter((id) => id !== seat.id)
        : [...current, seat.id];
      setState({ holds: next.length > 0 ? { eventSlug: event.slug, seatIds: next } : null });
      setAnnouncement(
        current.includes(seat.id)
          ? `Removed seat ${seat.id}. ${next.length} seat${next.length === 1 ? "" : "s"} selected.`
          : `Selected seat ${seat.id}, ${isk(seat.priceIsk)} kr. ${describeShort(seat)}. ${next.length} seat${next.length === 1 ? "" : "s"} selected.`,
      );
    },
    [event.slug],
  );

  const move = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      let r = rowIdx;
      let c = colIdx;
      if (e.key === "ArrowRight") c += 1;
      if (e.key === "ArrowLeft") c -= 1;
      if (e.key === "ArrowDown") r += 1;
      if (e.key === "ArrowUp") r -= 1;
      if (e.key === "Home") c = 0;
      r = Math.max(0, Math.min(rows.length - 1, r));
      if (e.key === "End") c = rows[r].seats.length - 1;
      c = Math.max(0, Math.min(rows[r].seats.length - 1, c));
      const target = rows[r].seats[c];
      setFocused(target.id);
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-seat="${target.id}"]`)?.focus();
    },
    [rows],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="seats-heading" className="text-xl font-semibold">
          Choose seats
        </h2>

        <div role="group" aria-label="Seating plan view" className="flex rounded-md border border-slate-300 dark:border-slate-600">
          {(["plan", "list"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={[
                "min-h-11 px-4 text-sm first:rounded-l-md last:rounded-r-md",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
                view === v
                  ? "bg-slate-900 font-medium text-white dark:bg-white dark:text-slate-900"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              {v === "plan" ? "Seating plan" : "Seat list"}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
        {view === "plan"
          ? "Arrow keys move through the plan; Enter or Space selects. Every seat announces its access details."
          : "Seats grouped by section and row, filtered by what you need. This is not a cut-down version of the plan — it is the same 330 seats, asked a better question."}
      </p>

      {/* One live region serves both views. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {view === "list" && (
        <fieldset
          id={filtersId}
          className="mt-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <legend className="px-1 text-sm font-medium">Filter by access requirement</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(FILTER_LABELS) as (keyof Filters)[]).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  id={`${filtersId}-${key}`}
                  type="checkbox"
                  checked={filters[key]}
                  onChange={(e) => {
                    const next = { ...filters, [key]: e.target.checked };
                    setFilters(next);
                    setAnnouncement(
                      `${FILTER_LABELS[key]} ${e.target.checked ? "added to" : "removed from"} filters.`,
                    );
                  }}
                  className="size-5"
                />
                <label htmlFor={`${filtersId}-${key}`} className="text-sm">
                  {FILTER_LABELS[key]}
                </label>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium" role="status" aria-live="polite">
            {matching.length} of {seats.length} seats match.
          </p>
        </fieldset>
      )}

      {view === "plan" ? (
        <div
          ref={gridRef}
          className="mt-5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="mb-2 text-center text-xs uppercase tracking-widest text-slate-500">Stage</p>
          <div aria-hidden="true" className="mb-4 h-1 rounded bg-slate-300 dark:bg-slate-600" />

          {/* role="grid" wraps the rows and nothing else. A grid may only
              contain rows or rowgroups, so the stage marker and the legend
              have to sit outside it. */}
          <div role="grid" aria-labelledby="seats-heading" aria-rowcount={rows.length}>
          {rows.map((entry, rowIdx) => (
            <div key={entry.row} role="row" aria-rowindex={rowIdx + 1} className="mb-1 flex items-center gap-1">
              <span role="rowheader" className="w-6 shrink-0 text-right text-xs font-medium text-slate-500">
                {entry.row}
              </span>
              {entry.seats.map((seat, colIdx) => {
                const state = stateOf(seat);
                return (
                  <span role="gridcell" key={seat.id} className="contents">
                  <button
                    data-seat={seat.id}
                    type="button"
                    disabled={state === "sold"}
                    tabIndex={focused === seat.id ? 0 : -1}
                    aria-label={fullLabel(seat, state)}
                    aria-pressed={state === "held"}
                    onFocus={() => setFocused(seat.id)}
                    onKeyDown={(e) => move(e, rowIdx, colIdx)}
                    onClick={() => toggleSeat(seat)}
                    className={[
                      // 2.5.8 Target Size (Minimum): 28px, above the 24px floor.
                      "size-7 shrink-0 rounded border text-[9px] leading-none",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
                      state === "booked"
                        ? "border-emerald-800 bg-emerald-500 text-emerald-950"
                        : state === "held"
                          ? "border-sky-800 bg-sky-400 text-sky-950"
                          : state === "sold"
                            ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                            : seat.wheelchairSpace
                              ? "border-violet-700 bg-violet-200 text-violet-950 dark:bg-violet-800 dark:text-violet-50"
                              : "border-slate-400 bg-slate-50 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700",
                    ].join(" ")}
                  >
                    <span aria-hidden="true">
                      {state === "held" ? "✓" : seat.wheelchairSpace ? "WC" : state === "sold" ? "×" : ""}
                    </span>
                  </button>
                  </span>
                );
              })}
            </div>
          ))}
          </div>

          <Legend />
        </div>
      ) : (
        <SeatList
          rows={rows}
          filters={filters}
          matching={matching}
          stateOf={stateOf}
          onToggle={toggleSeat}
        />
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Available", className: "border-slate-400 bg-slate-50 dark:bg-slate-800" },
    { label: "Wheelchair bay", className: "border-violet-700 bg-violet-200 dark:bg-violet-800" },
    { label: "Selected", className: "border-sky-800 bg-sky-400" },
    { label: "Booked", className: "border-emerald-800 bg-emerald-500" },
    { label: "Sold", className: "border-slate-300 bg-slate-200 dark:bg-slate-800" },
  ];
  return (
    <ul className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span aria-hidden="true" className={`inline-block size-4 rounded border ${i.className}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function SeatList({
  rows,
  filters,
  matching,
  stateOf,
  onToggle,
}: {
  rows: { row: string; seats: Seat[] }[];
  filters: Filters;
  matching: Seat[];
  stateOf: (s: Seat) => SeatState;
  onToggle: (s: Seat) => void;
}) {
  const anyFilter = Object.values(filters).some(Boolean);

  const sections = useMemo(() => {
    const ids = new Set(matching.map((s) => s.id));
    const bySection = new Map<string, { row: string; seats: Seat[] }[]>();
    for (const entry of rows) {
      const visible = entry.seats.filter((s) => (anyFilter ? ids.has(s.id) : s.status === "available"));
      if (visible.length === 0) continue;
      const section = entry.seats[0].section;
      const list = bySection.get(section) ?? [];
      list.push({ row: entry.row, seats: visible });
      bySection.set(section, list);
    }
    return Array.from(bySection.entries());
  }, [rows, anyFilter, matching]);

  if (sections.length === 0) {
    return (
      <p className="mt-5 rounded-lg border border-amber-700 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        No seats match every filter. Remove one requirement, or ask the command
        interface — it will tell you exactly which requirement it had to give up.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {sections.map(([section, entries]) => (
        <section
          key={section}
          aria-labelledby={`section-${section}`}
          className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 id={`section-${section}`} className="border-b border-slate-200 px-4 py-3 font-semibold capitalize dark:border-slate-800">
            {section}{" "}
            <span className="font-normal text-slate-500">
              — {entries.reduce((n, e) => n + e.seats.length, 0)} seats
            </span>
          </h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {entries.map((entry) => (
              <details key={entry.row} className="group">
                <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
                  Row {entry.row}
                  <span className="ml-2 font-normal text-slate-500">
                    — {entry.seats.length} seat{entry.seats.length === 1 ? "" : "s"}
                  </span>
                </summary>
                <ul className="px-4 pb-3">
                  {entry.seats.map((seat) => {
                    const state = stateOf(seat);
                    return (
                      <li key={seat.id} className="border-t border-slate-100 py-2 first:border-0 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => onToggle(seat)}
                          aria-pressed={state === "held"}
                          className="flex w-full min-h-11 items-start gap-3 rounded px-2 py-1 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:hover:bg-slate-800"
                        >
                          <span className="mt-0.5 font-mono text-sm font-semibold">{seat.id}</span>
                          <span className="flex-1 text-sm text-slate-600 dark:text-slate-400">
                            {describeShort(seat)}
                          </span>
                          <span className="text-sm font-medium">{isk(seat.priceIsk)} kr</span>
                          <span className="text-sm">{state === "held" ? "Selected" : "Select"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
