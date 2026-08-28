import type { Seat, Section, StrobeExposure, VenueAccessInfo } from "./types";

/**
 * Aurora Hall — a fictional 330-seat receiving house.
 *
 * The layout is generated deterministically so the demo is reproducible and
 * the seed data is auditable. The access attributes are deliberately arranged
 * so that the constraints real patrons combine — induction loop AND a view of
 * the caption unit AND a step-free route AND no strobe exposure — intersect in
 * only a handful of places. That scarcity is the whole point: it is trivially
 * visible to a query and effectively invisible to linear reading.
 */

const ROWS_STALLS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L"];
const ROWS_CIRCLE = ["M", "N", "P", "Q"];
const ROWS_BALCONY = ["R", "S"];

// "I" and "O" are skipped in real seating plans — they read as 1 and 0.

function sectionOf(row: string): Section {
  if (ROWS_STALLS.includes(row)) return "stalls";
  if (ROWS_CIRCLE.includes(row)) return "circle";
  return "balcony";
}

function seatsInRow(row: string): number {
  const section = sectionOf(row);
  if (section === "stalls") return 22;
  if (section === "circle") return 16;
  return 12;
}

/** Every row, front to back. Index 0 is nearest the stage. */
export const ROW_ORDER: readonly string[] = [
  ...ROWS_STALLS,
  ...ROWS_CIRCLE,
  ...ROWS_BALCONY,
];

function rowIndex(row: string): number {
  return ROW_ORDER.indexOf(row);
}

function strobeFor(row: string): StrobeExposure {
  const i = rowIndex(row);
  // The rig throws hardest over the first four rows and washes out by mid-house.
  if (i <= 3) return "high";
  if (i <= 7) return "low";
  return "none";
}

function priceFor(row: string, seatNo: number, total: number): number {
  const section = sectionOf(row);
  const centrality = 1 - Math.abs(seatNo - (total + 1) / 2) / (total / 2);
  const base = section === "stalls" ? 11500 : section === "circle" ? 9500 : 6500;
  const uplift = Math.round(centrality * 3000);
  return Math.round((base + uplift) / 500) * 500;
}

/**
 * Wheelchair bays sit where the floor is flat: the back row of the stalls and
 * one side of the circle, reachable by the lift.
 */
const WHEELCHAIR_BAYS = new Set(["L-4", "L-6", "L-18", "L-20", "N-2", "N-4"]);

/** Standard seats immediately beside a bay, held for companions. */
const COMPANION_SEATS = new Set(["L-5", "L-7", "L-17", "L-19", "N-3", "N-5"]);

/** Aisle seats whose armrests lift, allowing a transfer out of a wheelchair. */
const TRANSFER_SEATS = new Set([
  "H-1", "H-22", "J-1", "J-22", "K-1", "K-22", "L-1", "L-22",
  "M-1", "M-16", "N-1", "N-16",
]);

function stepsToReach(row: string, seatNo: number): number {
  const section = sectionOf(row);
  if (section === "stalls") {
    // Step-free entrance opens onto the rear cross-aisle; the house rakes down.
    const fromBack = ROWS_STALLS.length - 1 - ROWS_STALLS.indexOf(row);
    return fromBack <= 3 ? 0 : (fromBack - 3) * 2;
  }
  if (section === "circle") {
    // Lift serves the circle cross-aisle at row N.
    const offset = Math.abs(ROWS_CIRCLE.indexOf(row) - ROWS_CIRCLE.indexOf("N"));
    // The far side of the circle is only reachable over a short flight.
    const sideSteps = seatNo > 10 ? 4 : 0;
    return offset * 3 + sideSteps;
  }
  // No lift serves the balcony.
  return 28;
}

function distanceToWc(row: string, seatNo: number): number {
  const section = sectionOf(row);
  if (section === "stalls") {
    const fromBack = ROWS_STALLS.length - 1 - ROWS_STALLS.indexOf(row);
    return 18 + fromBack * 4 + Math.abs(seatNo - 11);
  }
  if (section === "circle") return 34 + Math.abs(seatNo - 8) * 2;
  return 61 + Math.abs(seatNo - 6) * 2;
}

function distanceToStage(row: string): number {
  return 6 + rowIndex(row) * 1.8;
}

/** The induction loop covers the stalls front-to-mid and the circle centre. */
function hasHearingLoop(row: string, seatNo: number): boolean {
  const section = sectionOf(row);
  if (section === "stalls") return ROWS_STALLS.indexOf(row) <= 8;
  if (section === "circle") return seatNo >= 2 && seatNo <= 12;
  return false;
}

/** Caption unit hangs downstage right; the far-right stalls look straight past it. */
function captionVisible(row: string, seatNo: number): boolean {
  const section = sectionOf(row);
  if (section === "balcony") return false;
  if (section === "circle") return seatNo <= 12;
  return seatNo <= 17;
}

/** Interpreter stands downstage left; the far-left seats lose the sightline. */
function interpreterVisible(row: string, seatNo: number): boolean {
  if (sectionOf(row) === "balcony") return false;
  return seatNo >= 4;
}

/**
 * Assistance dogs need floor room. End-of-row seats and the wheelchair bays
 * have it; the middle of a tight row does not.
 */
function assistanceDogSpace(row: string, seatNo: number, total: number): boolean {
  return seatNo <= 2 || seatNo >= total - 1 || WHEELCHAIR_BAYS.has(`${row}-${seatNo}`);
}

/** A small, fixed set of seats is already gone, so availability feels real. */
const SOLD = new Set([
  "C-9", "C-10", "C-11", "D-12", "D-13", "E-8", "F-15", "F-16",
  "H-3", "J-11", "K-9", "L-18", "M-7", "M-8", "N-9", "P-4", "R-6",
]);

function buildSeat(row: string, number: number): Seat {
  const total = seatsInRow(row);
  const id = `${row}-${number}`;
  const section = sectionOf(row);
  const steps = stepsToReach(row, number);

  return {
    id,
    section,
    row,
    number,
    priceIsk: priceFor(row, number, total),
    status: SOLD.has(id) ? "sold" : "available",
    x: number,
    y: rowIndex(row),
    wheelchairSpace: WHEELCHAIR_BAYS.has(id),
    companionSeat: COMPANION_SEATS.has(id),
    transferSeat: TRANSFER_SEATS.has(id),
    assistanceDogSpace: assistanceDogSpace(row, number, total),
    hearingLoop: hasHearingLoop(row, number),
    captionScreenVisible: captionVisible(row, number),
    signInterpreterVisible: interpreterVisible(row, number),
    stepsToReach: steps,
    distanceToAccessibleWcM: Math.round(distanceToWc(row, number)),
    distanceToStageM: Math.round(distanceToStage(row) * 10) / 10,
    strobeExposure: strobeFor(row),
  };
}

function buildHall(): Seat[] {
  const rows = [...ROWS_STALLS, ...ROWS_CIRCLE, ...ROWS_BALCONY];
  const seats: Seat[] = [];
  for (const row of rows) {
    for (let n = 1; n <= seatsInRow(row); n += 1) {
      seats.push(buildSeat(row, n));
    }
  }
  return seats;
}

/** The full seating plan. 330 seats. */
export const HALL: readonly Seat[] = Object.freeze(buildHall());

export const VENUE_ACCESS: VenueAccessInfo = {
  venue: "Aurora Hall",
  stepFreeEntrances: [
    "North entrance on Sæbraut — level throughout, automatic doors, opens onto the rear stalls cross-aisle",
    "Lift from the north foyer serves the circle at row N only",
  ],
  accessibleToilets: [
    "Rear stalls foyer, beside the north entrance (Changing Places facility)",
    "Circle foyer, north side, adjacent to the lift",
  ],
  hearingLoopCoverage:
    "Induction loop covers stalls rows A to J and the centre block of the circle (seats 2 to 12). The balcony is not covered.",
  quietRoom:
    "Low-stimulus room off the north foyer, open from one hour before curtain through to the end of the performance",
  assistanceDogPolicy:
    "Assistance dogs are welcome throughout. Seats with floor room are at row ends and beside the wheelchair bays; staff will water the dog on request.",
  companionTicketPolicy:
    "One companion ticket is free with every wheelchair space or access booking. It is not applied automatically — it is added when the booking is completed.",
  captionUnitPosition:
    "Caption unit is rigged downstage right. It is not visible from stalls seats 18 and above, from the circle beyond seat 12, or from the balcony.",
  signInterpreterPosition:
    "Interpreter stands downstage left for signed performances. The sightline is lost from stalls and circle seats 1 to 3, and from the balcony.",
  accessLine:
    "Access line +354 555 0100, open 10:00-18:00, or access@example.is. They will reply in writing if you would rather not use the phone. Nothing at this venue requires a call — wheelchair bays, companion tickets and transfer seats are all bookable online on the same terms as any other seat.",
  strobeWarning:
    "Strobe use varies by performance — see the individual event for its lighting profile and the rows it affects.",
};

export function seatById(id: string): Seat | undefined {
  return HALL.find((s) => s.id === id);
}
