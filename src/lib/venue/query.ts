import { HALL } from "./hall";
import { isk } from "@/lib/format";
import type { Seat, SeatGroup, SeatQuery, StrobeExposure } from "./types";

const STROBE_RANK: Record<StrobeExposure, number> = { none: 0, low: 1, high: 2 };

/** Constraints in the order we are willing to give them up, least costly first. */
const RELAXATION_ORDER = [
  "maxPriceIsk",
  "maxDistanceToStageM",
  "maxDistanceToAccessibleWcM",
  "signInterpreterVisible",
  "captionScreenVisible",
  "hearingLoop",
  "maxStrobeExposure",
  "stepFree",
] as const;

const LABELS: Record<string, string> = {
  maxPriceIsk: "your price ceiling",
  maxDistanceToStageM: "the distance to the stage you asked for",
  maxDistanceToAccessibleWcM: "the distance to an accessible toilet you asked for",
  signInterpreterVisible: "a clear view of the interpreter",
  captionScreenVisible: "a clear view of the caption unit",
  hearingLoop: "induction-loop coverage",
  maxStrobeExposure: "your strobe limit",
  stepFree: "a step-free route",
};

function matches(seat: Seat, q: SeatQuery): boolean {
  if (seat.status !== "available") return false;

  // Wheelchair bays and their companion seats are never offered to a party
  // that has not asked for them. Selling access provision to patrons who do
  // not need it is the reason it is unavailable to patrons who do.
  const wantsAccessProvision = (q.wheelchairSpaces ?? 0) > 0;
  if (!wantsAccessProvision && (seat.wheelchairSpace || seat.companionSeat)) return false;

  if (q.section && seat.section !== q.section) return false;
  if (q.maxPriceIsk !== undefined && seat.priceIsk > q.maxPriceIsk) return false;
  if (q.stepFree && seat.stepsToReach > 0) return false;
  if (q.hearingLoop && !seat.hearingLoop) return false;
  if (q.captionScreenVisible && !seat.captionScreenVisible) return false;
  if (q.signInterpreterVisible && !seat.signInterpreterVisible) return false;
  if (q.assistanceDogSpace && !seat.assistanceDogSpace) return false;
  if (q.transferSeat && !seat.transferSeat) return false;
  if (
    q.maxDistanceToAccessibleWcM !== undefined &&
    seat.distanceToAccessibleWcM > q.maxDistanceToAccessibleWcM
  ) {
    return false;
  }
  if (q.maxDistanceToStageM !== undefined && seat.distanceToStageM > q.maxDistanceToStageM) {
    return false;
  }
  if (
    q.maxStrobeExposure !== undefined &&
    STROBE_RANK[seat.strobeExposure] > STROBE_RANK[q.maxStrobeExposure]
  ) {
    return false;
  }
  return true;
}

/** Seats sitting next to each other in one row, with nothing sold in between. */
function contiguousRuns(seats: Seat[], size: number): Seat[][] {
  if (size <= 0) return [];
  const byRow = new Map<string, Seat[]>();
  for (const seat of seats) {
    const list = byRow.get(seat.row) ?? [];
    list.push(seat);
    byRow.set(seat.row, list);
  }

  const runs: Seat[][] = [];
  for (const list of byRow.values()) {
    const sorted = [...list].sort((a, b) => a.number - b.number);
    for (let i = 0; i + size <= sorted.length; i += 1) {
      const window = sorted.slice(i, i + size);
      const consecutive = window.every(
        (seat, k) => k === 0 || seat.number === window[k - 1].number + 1,
      );
      if (consecutive) runs.push(window);
    }
  }
  return runs;
}

function totalPrice(seats: Seat[]): number {
  return seats.reduce((sum, s) => sum + s.priceIsk, 0);
}

/**
 * Wheelchair bays plus their companion seats, kept adjacent.
 *
 * A bay and its companion seat are booked as a unit. Splitting them is the
 * single most common way an "accessible" booking turns out to be useless.
 */
function wheelchairGroups(q: SeatQuery): Seat[][] {
  const wanted = q.wheelchairSpaces ?? 0;
  if (wanted === 0) return [];

  const bays = HALL.filter((s) => s.wheelchairSpace && matches(s, q));

  /**
   * The companion seat beside a bay.
   *
   * Where a companion seat sits between two bays it can be claimed by either,
   * so prefer one that is not contested. Offering the same seat as the
   * companion for two different bays reads as two options and is really one.
   */
  const companionFor = (bay: Seat): Seat | undefined => {
    const candidates = HALL.filter(
      (s) =>
        s.row === bay.row &&
        Math.abs(s.number - bay.number) === 1 &&
        s.status === "available" &&
        s.companionSeat,
    );
    const uncontested = candidates.find(
      (c) =>
        !HALL.some(
          (s) =>
            s.wheelchairSpace &&
            s.id !== bay.id &&
            s.row === c.row &&
            Math.abs(s.number - c.number) === 1,
        ),
    );
    return uncontested ?? candidates[0];
  };

  // One bay wanted: every qualifying bay is its own option. Returning only the
  // first would understate what is available, which is the opposite of the job.
  if (wanted === 1) {
    const groups: Seat[][] = [];
    for (const bay of bays) {
      const companion = companionFor(bay);
      if (q.companionSeat && !companion) continue;
      groups.push(q.companionSeat && companion ? [bay, companion] : [bay]);
    }
    return groups;
  }

  // More than one bay: they have to be in the same row, or the party is split
  // across the house, which defeats the point of booking together.
  const byRow = new Map<string, Seat[]>();
  for (const bay of bays) {
    const list = byRow.get(bay.row) ?? [];
    list.push(bay);
    byRow.set(bay.row, list);
  }

  const groups: Seat[][] = [];
  for (const list of byRow.values()) {
    if (list.length < wanted) continue;
    const chosen = [...list].sort((a, b) => a.number - b.number).slice(0, wanted);
    const companions = q.companionSeat
      ? chosen.map(companionFor).filter((s): s is Seat => Boolean(s))
      : [];
    if (q.companionSeat && companions.length < wanted) continue;
    groups.push([...chosen, ...companions]);
  }
  return groups;
}

function search(q: SeatQuery): SeatGroup[] {
  const wheelchairWanted = q.wheelchairSpaces ?? 0;
  const party = q.party ?? Math.max(1, wheelchairWanted);

  if (wheelchairWanted > 0) {
    const groups = wheelchairGroups(q);
    return groups
      .map((seats) => ({
        seats,
        totalPriceIsk: totalPrice(seats),
        rationale:
          `Wheelchair bay ${seats[0].id} in the ${seats[0].section}` +
          (seats.length > 1 ? ` with the companion seat ${seats[1].id} beside it` : "") +
          `. ${seats[0].stepsToReach === 0 ? "Step-free" : `${seats[0].stepsToReach} steps`} from the entrance, ` +
          `${seats[0].distanceToAccessibleWcM} m to an accessible toilet.`,
        compromises: [],
      }))
      .sort((a, b) => a.totalPriceIsk - b.totalPriceIsk);
  }

  const pool = HALL.filter((s) => matches(s, q));
  const runs = contiguousRuns(pool, party);
  return runs
    .map((seats) => ({
      seats,
      totalPriceIsk: totalPrice(seats),
      rationale:
        `${seats.length === 1 ? "Seat" : "Seats"} ${seats.map((s) => s.id).join(", ")} ` +
        `in the ${seats[0].section}, together in row ${seats[0].row}. ` +
        `${seats[0].stepsToReach === 0 ? "Step-free" : `${seats[0].stepsToReach} steps`} from the entrance, ` +
        `${seats[0].distanceToStageM} m from the stage, strobe exposure ${seats[0].strobeExposure}.`,
      compromises: [],
    }))
    .sort((a, b) => a.totalPriceIsk - b.totalPriceIsk);
}

/**
 * Find seats matching a query.
 *
 * If nothing satisfies every constraint, requirements are relaxed one at a
 * time in a fixed order and each dropped requirement is reported back. The
 * caller is never handed a result that quietly fails a stated access need.
 */
export function findSeats(q: SeatQuery, limit = 5): SeatGroup[] {
  const exact = search(q);
  if (exact.length > 0) return exact.slice(0, limit);

  const relaxed: SeatQuery = { ...q };
  const dropped: string[] = [];

  for (const key of RELAXATION_ORDER) {
    if (relaxed[key as keyof SeatQuery] === undefined) continue;
    delete relaxed[key as keyof SeatQuery];
    dropped.push(LABELS[key] ?? key);

    const results = search(relaxed);
    if (results.length > 0) {
      return results.slice(0, limit).map((g) => ({
        ...g,
        compromises: [
          `No seat met every requirement. To find this, we had to give up: ${dropped.join(", ")}.`,
        ],
      }));
    }
  }

  return [];
}

/** A plain-language account of one seat, for someone who cannot see the plan. */
export function describeSeat(seat: Seat): string {
  const parts: string[] = [];
  parts.push(
    `Seat ${seat.id}: row ${seat.row}, seat ${seat.number}, in the ${seat.section}. ` +
      `${isk(seat.priceIsk)} kr.`,
  );
  parts.push(
    seat.stepsToReach === 0
      ? "Step-free from the north entrance."
      : `${seat.stepsToReach} steps from the step-free entrance.`,
  );
  parts.push(
    `${seat.distanceToStageM} m from the stage, ${seat.distanceToAccessibleWcM} m to the nearest accessible toilet.`,
  );

  if (seat.wheelchairSpace) parts.push("This is a wheelchair bay, not a seat.");
  if (seat.companionSeat) parts.push("Held as a companion seat beside a wheelchair bay.");
  if (seat.transferSeat) parts.push("The armrest lifts, so you can transfer from a wheelchair.");
  parts.push(
    seat.assistanceDogSpace
      ? "There is floor room for an assistance dog."
      : "There is no floor room for an assistance dog.",
  );
  parts.push(
    seat.hearingLoop ? "Inside the induction-loop coverage." : "Outside the induction-loop coverage.",
  );
  parts.push(
    seat.captionScreenVisible
      ? "The caption unit is in view."
      : "The caption unit is NOT in view from here.",
  );
  parts.push(
    seat.signInterpreterVisible
      ? "The interpreter's position is in view."
      : "The interpreter's position is NOT in view from here.",
  );
  parts.push(
    seat.strobeExposure === "none"
      ? "No meaningful strobe exposure."
      : `Strobe exposure is ${seat.strobeExposure} here.`,
  );

  return parts.join(" ");
}
