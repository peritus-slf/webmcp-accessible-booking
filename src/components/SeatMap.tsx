"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { HALL } from "@/lib/venue/hall";
import type { Seat } from "@/lib/venue/types";

/**
 * The seating plan.
 *
 * This is built to the ARIA grid pattern on purpose: semantic rows and cells,
 * roving tabindex, arrow-key navigation, and a complete label on every seat. A
 * screen-reader user can reach all 330 seats and hear everything about each
 * one.
 *
 * That is exactly the point being made. Correct accessibility is necessary and
 * it is not sufficient. Hearing 330 labels in sequence is not a way to find the
 * one seat with induction-loop coverage, a caption sightline, a step-free route
 * and no strobe exposure. The command interface exists for that, and it does
 * not replace this — it sits beside it.
 */

interface Props {
  held: string[];
  booked: string[];
  highlighted: string[];
}

function seatLabel(seat: Seat, state: "available" | "held" | "booked" | "sold"): string {
  const bits: string[] = [`Seat ${seat.id}`, seat.section];

  if (seat.wheelchairSpace) bits.push("wheelchair bay");
  else if (seat.companionSeat) bits.push("companion seat");
  if (seat.transferSeat) bits.push("transfer seat, armrest lifts");

  bits.push(seat.stepsToReach === 0 ? "step-free" : `${seat.stepsToReach} steps`);
  if (seat.hearingLoop) bits.push("induction loop");
  if (seat.captionScreenVisible) bits.push("captions visible");
  else bits.push("captions not visible");
  if (seat.strobeExposure !== "none") bits.push(`${seat.strobeExposure} strobe`);
  bits.push(`${seat.priceIsk.toLocaleString("is-IS")} kr`);

  bits.push(
    state === "sold"
      ? "sold"
      : state === "booked"
        ? "booked by you"
        : state === "held"
          ? "on hold"
          : "available",
  );

  return bits.join(", ");
}

export function SeatMap({ held, booked, highlighted }: Props) {
  const [focused, setFocused] = useState<string>("A-1");
  const gridRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const grouped = new Map<string, Seat[]>();
    for (const seat of HALL) {
      const list = grouped.get(seat.row) ?? [];
      list.push(seat);
      grouped.set(seat.row, list);
    }
    return Array.from(grouped.entries()).map(([row, seats]) => ({
      row,
      seats: seats.sort((a, b) => a.number - b.number),
    }));
  }, []);

  const stateOf = useCallback(
    (seat: Seat): "available" | "held" | "booked" | "sold" => {
      if (booked.includes(seat.id)) return "booked";
      if (held.includes(seat.id)) return "held";
      if (seat.status === "sold") return "sold";
      return "available";
    },
    [held, booked],
  );

  const move = useCallback(
    (event: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();

      let r = rowIdx;
      let c = colIdx;
      if (event.key === "ArrowRight") c += 1;
      if (event.key === "ArrowLeft") c -= 1;
      if (event.key === "ArrowDown") r += 1;
      if (event.key === "ArrowUp") r -= 1;
      if (event.key === "Home") c = 0;
      if (event.key === "End") c = rows[r].seats.length - 1;

      r = Math.max(0, Math.min(rows.length - 1, r));
      c = Math.max(0, Math.min(rows[r].seats.length - 1, c));

      const target = rows[r].seats[c];
      setFocused(target.id);
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-seat="${target.id}"]`)
        ?.focus();
    },
    [rows],
  );

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Aurora Hall seating plan, 330 seats"
      aria-rowcount={rows.length}
      className="overflow-x-auto rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="mb-3 text-center text-xs uppercase tracking-widest text-slate-500">
        Stage
      </p>
      <div className="mb-4 h-1 rounded bg-slate-300 dark:bg-slate-600" aria-hidden="true" />

      {rows.map((entry, rowIdx) => (
        <div
          key={entry.row}
          role="row"
          aria-rowindex={rowIdx + 1}
          className="mb-1 flex items-center gap-1"
        >
          <span
            role="rowheader"
            className="w-6 shrink-0 text-right text-xs font-medium text-slate-500"
          >
            {entry.row}
          </span>
          {entry.seats.map((seat, colIdx) => {
            const state = stateOf(seat);
            const isHighlighted = highlighted.includes(seat.id);
            const disabled = state === "sold";

            return (
              <button
                key={seat.id}
                role="gridcell"
                data-seat={seat.id}
                type="button"
                disabled={disabled}
                tabIndex={focused === seat.id ? 0 : -1}
                aria-label={seatLabel(seat, state)}
                aria-current={isHighlighted ? "true" : undefined}
                onFocus={() => setFocused(seat.id)}
                onKeyDown={(e) => move(e, rowIdx, colIdx)}
                className={[
                  "h-5 w-5 shrink-0 rounded-sm border text-[8px] leading-none transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-sky-600",
                  isHighlighted
                    ? "border-amber-500 bg-amber-300 ring-2 ring-amber-500 dark:bg-amber-400"
                    : state === "booked"
                      ? "border-emerald-700 bg-emerald-500"
                      : state === "held"
                        ? "border-sky-700 bg-sky-400"
                        : state === "sold"
                          ? "cursor-not-allowed border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
                          : seat.wheelchairSpace
                            ? "border-violet-600 bg-violet-200 dark:bg-violet-900"
                            : "border-slate-300 bg-slate-50 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700",
                ].join(" ")}
              >
                <span aria-hidden="true">{seat.wheelchairSpace ? "♿" : ""}</span>
              </button>
            );
          })}
        </div>
      ))}

      <p className="mt-4 text-xs text-slate-500">
        330 seats. Use the arrow keys to move through the plan; every seat
        announces its access details. Finding a seat that satisfies several
        access needs at once is what the command interface is for.
      </p>
    </div>
  );
}
