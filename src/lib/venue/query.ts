import { HALL, ROW_ORDER } from "./hall";
import { strobeForRow, type VenueEvent } from "./events";
import { isk } from "@/lib/format";
import type { Seat, SeatGroup, SeatQuery, StrobeExposure } from "./types";

const STROBE_RANK: Record<StrobeExposure, number> = { none: 0, low: 1, high: 2 };

/**
 * Project the seating plan onto one performance.
 *
 * Strobe exposure and price both depend on which night you are coming: the
 * lighting rig changes, and so does the price band. Seat advice that ignores
 * the performance is advice that will eventually be wrong.
 */
export function seatsForEvent(event: VenueEvent): Seat[] {
  return HALL.map((seat) => ({
    ...seat,
    priceIsk: Math.round((seat.priceIsk * event.priceMultiplier) / 500) * 500,
    strobeExposure: strobeForRow(event, ROW_ORDER.indexOf(seat.row)),
    // A caption sightline is only meaningful when the performance is captioned.
    captionScreenVisible: event.captioned ? seat.captionScreenVisible : false,
    signInterpreterVisible: event.signed ? seat.signInterpreterVisible : false,
  }));
}

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
function wheelchairGroups(pool: Seat[], all: Seat[], q: SeatQuery): Seat[][] {
  const wanted = q.wheelchairSpaces ?? 0;
  if (wanted === 0) return [];

  const bays = pool.filter((s) => s.wheelchairSpace);

  /**
   * The companion seat beside a bay. Where one sits between two bays it can be
   * claimed by either, so prefer an uncontested seat: offering the same seat as
   * the companion for two different bays presents one option as two.
   */
  const companionFor = (bay: Seat): Seat | undefined => {
    const candidates = all.filter(
      (s) =>
        s.row === bay.row &&
        Math.abs(s.number - bay.number) === 1 &&
        s.status === "available" &&
        s.companionSeat,
    );
    const uncontested = candidates.find(
      (c) =>
        !all.some(
          (s) =>
            s.wheelchairSpace &&
            s.id !== bay.id &&
            s.row === c.row &&
            Math.abs(s.number - c.number) === 1,
        ),
    );
    return uncontested ?? candidates[0];
  };

  if (wanted === 1) {
    const groups: Seat[][] = [];
    for (const bay of bays) {
      const companion = companionFor(bay);
      if (q.companionSeat && !companion) continue;
      groups.push(q.companionSeat && companion ? [bay, companion] : [bay]);
    }
    return groups;
  }

  // More than one bay: they have to share a row, or the party is split across
  // the house, which defeats the point of booking together.
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

function search(all: Seat[], q: SeatQuery): SeatGroup[] {
  const wheelchairWanted = q.wheelchairSpaces ?? 0;
  const party = q.party ?? Math.max(1, wheelchairWanted);
  const pool = all.filter((s) => matches(s, q));

  if (wheelchairWanted > 0) {
    return wheelchairGroups(pool, all, q)
      .map((seats) => ({
        seats,
        totalPriceIsk: totalPrice(seats),
        rationale:
          `Wheelchair bay ${seats[0].id} in the ${seats[0].section}` +
          (seats.length > 1 ? ` with the companion seat ${seats[1].id} beside it` : "") +
          `. ${seats[0].stepsToReach === 0 ? "Step-free" : `${seats[0].stepsToReach} steps`} from the entrance, ` +
          `${seats[0].distanceToAccessibleWcM} m to an accessible toilet, strobe exposure ${seats[0].strobeExposure}.`,
        compromises: [],
      }))
      .sort((a, b) => a.totalPriceIsk - b.totalPriceIsk);
  }

  return contiguousRuns(pool, party)
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
 * Find seats for one performance.
 *
 * If nothing satisfies every constraint, requirements are relaxed one at a time
 * in a fixed order and each dropped requirement is reported back. The caller is
 * never handed a result that quietly fails a stated access need.
 */
export function findSeats(event: VenueEvent, q: SeatQuery, limit = 6): SeatGroup[] {
  const all = seatsForEvent(event);
  const exact = search(all, q);
  if (exact.length > 0) return exact.slice(0, limit);

  const relaxed: SeatQuery = { ...q };
  const dropped: string[] = [];

  for (const key of RELAXATION_ORDER) {
    if (relaxed[key as keyof SeatQuery] === undefined) continue;
    delete relaxed[key as keyof SeatQuery];
    dropped.push(LABELS[key] ?? key);

    const results = search(all, relaxed);
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
export function describeSeat(seat: Seat, event: VenueEvent): string {
  const parts: string[] = [
    `Seat ${seat.id}: row ${seat.row}, seat ${seat.number}, in the ${seat.section}. ${isk(seat.priceIsk)} kr for ${event.title}.`,
    seat.stepsToReach === 0
      ? "Step-free from the north entrance."
      : `${seat.stepsToReach} steps from the step-free entrance.`,
    `${seat.distanceToStageM} m from the stage, ${seat.distanceToAccessibleWcM} m to the nearest accessible toilet.`,
  ];

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
    event.captioned
      ? seat.captionScreenVisible
        ? "The caption unit is in view."
        : "The caption unit is NOT in view from here."
      : "This performance is not captioned.",
  );
  parts.push(
    event.signed
      ? seat.signInterpreterVisible
        ? "The interpreter's position is in view."
        : "The interpreter's position is NOT in view from here."
      : "There is no interpreter at this performance.",
  );
  parts.push(
    seat.strobeExposure === "none"
      ? "No strobe exposure at this performance."
      : `Strobe exposure is ${seat.strobeExposure} here.`,
  );

  return parts.join(" ");
}
