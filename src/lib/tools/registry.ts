import { HALL, VENUE_ACCESS, seatById } from "@/lib/venue/hall";
import { describeSeat, findSeats } from "@/lib/venue/query";
import type { SeatQuery, StrobeExposure } from "@/lib/venue/types";
import { isk } from "@/lib/format";

/**
 * The tool contract for Aurora Hall.
 *
 * This file is the single definition of what can be done on this site. It is
 * consumed twice:
 *
 *   1. by an AI agent, through `document.modelContext.registerTool`
 *   2. by the in-page command interface, which is keyboard and screen-reader
 *      native and calls exactly the same handlers
 *
 * The WebMCP proposal states it "is not designed for ingestion by
 * accessibility technology", which invites a two-tier web: rich, actionable
 * capability for agents, and whatever is left for disabled users. Defining the
 * contract once — here — and letting both consumers read it is how this demo
 * refuses that split. Neither consumer is privileged.
 *
 * Every handler returns readable prose rather than a data structure. An agent
 * reasons over it perfectly well, and it is the same sentence a screen reader
 * announces. One output, no second-class rendering.
 */

export interface ToolDefinition<Input = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Input) => Promise<string>;
}

// --- Booking state ---------------------------------------------------------

/**
 * Held and booked seats live in a tiny observable store so that a tool call
 * made by the agent visibly updates the seating plan for a sighted companion
 * at the same moment it is announced to a screen-reader user.
 */

interface BookingState {
  held: string[];
  booked: string[];
  companionTicketApplied: boolean;
}

let state: BookingState = { held: [], booked: [], companionTicketApplied: false };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBookingState(): BookingState {
  return state;
}

function setState(next: Partial<BookingState>): void {
  state = { ...state, ...next };
  emit();
}

export function resetBooking(): void {
  setState({ held: [], booked: [], companionTicketApplied: false });
}

// --- Schema fragments ------------------------------------------------------

const STROBE_VALUES: StrobeExposure[] = ["none", "low", "high"];

const findSeatsSchema = {
  type: "object",
  properties: {
    party: { type: "integer", minimum: 1, maximum: 8, description: "Total people in the party, including any wheelchair users." },
    wheelchairSpaces: { type: "integer", minimum: 0, maximum: 4, description: "Number of wheelchair bays needed. A bay is a flat space, not a seat." },
    companionSeat: { type: "boolean", description: "Reserve a seat immediately beside each wheelchair bay." },
    transferSeat: { type: "boolean", description: "Require a seat whose armrest lifts, to transfer out of a wheelchair." },
    assistanceDogSpace: { type: "boolean", description: "Require floor room for an assistance dog." },
    hearingLoop: { type: "boolean", description: "Require induction-loop coverage." },
    captionScreenVisible: { type: "boolean", description: "Require a clear sightline to the caption unit." },
    signInterpreterVisible: { type: "boolean", description: "Require a clear sightline to the sign-language interpreter." },
    stepFree: { type: "boolean", description: "Require a route with no steps from the step-free entrance." },
    maxDistanceToAccessibleWcM: { type: "number", description: "Furthest acceptable walk to an accessible toilet, in metres." },
    maxDistanceToStageM: { type: "number", description: "Furthest acceptable distance from the stage, in metres. Matters for lip-reading." },
    maxStrobeExposure: { type: "string", enum: STROBE_VALUES, description: "Highest acceptable strobe exposure. Use 'none' for photosensitive epilepsy." },
    maxPriceIsk: { type: "integer", description: "Price ceiling per seat, in ISK." },
    section: { type: "string", enum: ["stalls", "circle", "balcony"], description: "Restrict to one section." },
  },
  additionalProperties: false,
} as const;

// --- Tools -----------------------------------------------------------------

const findSeatsTool: ToolDefinition<SeatQuery> = {
  name: "find_seats",
  description:
    "Find seats at Aurora Hall matching access requirements — wheelchair bays, companion seats, induction loop, caption and interpreter sightlines, step-free routes, strobe limits, distance to an accessible toilet. Returns whole groups that sit together, and states plainly any requirement it could not meet.",
  inputSchema: findSeatsSchema as unknown as Record<string, unknown>,
  annotations: { readOnlyHint: true },
  async execute(input) {
    const groups = findSeats(input ?? {});
    if (groups.length === 0) {
      return "No seats in the house meet those requirements, even after relaxing every constraint that can safely be relaxed. Step-free access and strobe limits were held firm. Contact the access line for a held-back allocation.";
    }
    const lines = groups.map((g, i) => {
      const seats = g.seats.map((s) => s.id).join(" and ");
      const compromise = g.compromises.length > 0 ? ` ${g.compromises.join(" ")}` : "";
      return `${i + 1}. ${seats} — ${isk(g.totalPriceIsk)} kr total. ${g.rationale}${compromise}`;
    });
    return `${groups.length} option${groups.length === 1 ? "" : "s"} found.\n${lines.join("\n")}`;
  },
};

const describeSeatTool: ToolDefinition<{ seatId: string }> = {
  name: "describe_seat",
  description:
    "Describe one seat in full: price, the route to it, distance to the stage and to an accessible toilet, induction-loop coverage, caption and interpreter sightlines, strobe exposure, and whether there is floor room for an assistance dog.",
  inputSchema: {
    type: "object",
    properties: { seatId: { type: "string", description: "Seat identifier, for example 'N-2'." } },
    required: ["seatId"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async execute({ seatId }) {
    const seat = seatById(seatId);
    if (!seat) return `There is no seat ${seatId} in Aurora Hall.`;
    const status =
      seat.status === "available"
        ? "Available."
        : seat.status === "sold"
          ? "Already sold."
          : "Currently held.";
    return `${describeSeat(seat)} ${status}`;
  },
};

const venueAccessTool: ToolDefinition = {
  name: "get_venue_access_info",
  description:
    "Get Aurora Hall's access facilities: step-free entrances, accessible toilets, induction-loop coverage, the quiet room, assistance-dog policy, the free companion-ticket policy, where the caption unit and interpreter stand, and the strobe warning for this production.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  async execute() {
    const v = VENUE_ACCESS;
    return [
      `${v.venue} access information.`,
      `Step-free entrances: ${v.stepFreeEntrances.join(" | ")}.`,
      `Accessible toilets: ${v.accessibleToilets.join(" | ")}.`,
      `Hearing: ${v.hearingLoopCoverage}`,
      `Captions: ${v.captionUnitPosition}`,
      `Interpreter: ${v.signInterpreterPosition}`,
      `Strobe: ${v.strobeWarning}`,
      v.quietRoom ? `Quiet room: ${v.quietRoom}.` : "No quiet room.",
      `Assistance dogs: ${v.assistanceDogPolicy}`,
      `Companion tickets: ${v.companionTicketPolicy}`,
    ].join("\n");
  },
};

const holdSeatsTool: ToolDefinition<{ seatIds: string[] }> = {
  name: "hold_seats",
  description:
    "Hold specific seats for 15 minutes so they cannot be sold to anyone else while the booking is finished. Does not purchase them.",
  inputSchema: {
    type: "object",
    properties: {
      seatIds: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 8,
        description: "Seat identifiers to hold, for example ['N-2','N-3'].",
      },
    },
    required: ["seatIds"],
    additionalProperties: false,
  },
  async execute({ seatIds }) {
    const unknown = seatIds.filter((id) => !seatById(id));
    if (unknown.length > 0) return `No such seat: ${unknown.join(", ")}. Nothing was held.`;

    const unavailable = seatIds.filter((id) => {
      const seat = seatById(id)!;
      return seat.status !== "available" || state.booked.includes(id);
    });
    if (unavailable.length > 0) {
      return `These seats are not available: ${unavailable.join(", ")}. Nothing was held.`;
    }

    const held = Array.from(new Set([...state.held, ...seatIds]));
    setState({ held });
    return `Held ${seatIds.join(" and ")} for 15 minutes. Nothing has been paid for yet.`;
  },
};

const releaseSeatsTool: ToolDefinition = {
  name: "release_held_seats",
  description: "Release every seat currently on hold, returning them to general availability.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  async execute() {
    if (state.held.length === 0) return "There are no seats on hold.";
    const released = [...state.held];
    setState({ held: [] });
    return `Released ${released.join(" and ")}.`;
  },
};

const completeBookingTool: ToolDefinition<{ confirm: boolean }> = {
  name: "complete_booking",
  description:
    "Complete the booking for the seats currently on hold. This is the final, consequential step. The free companion ticket is applied here if a wheelchair bay is part of the booking.",
  inputSchema: {
    type: "object",
    properties: {
      confirm: { type: "boolean", description: "Must be true. The caller confirms the booking should be completed." },
    },
    required: ["confirm"],
    additionalProperties: false,
  },
  async execute({ confirm }) {
    if (!confirm) return "Booking not completed. Set confirm to true to go ahead.";
    if (state.held.length === 0) return "There are no seats on hold, so there is nothing to book.";

    const seats = state.held.map((id) => seatById(id)!);
    const hasBay = seats.some((s) => s.wheelchairSpace);
    const companion = seats.find((s) => s.companionSeat);
    const chargeable = hasBay && companion ? seats.filter((s) => s.id !== companion.id) : seats;
    const total = chargeable.reduce((sum, s) => sum + s.priceIsk, 0);

    setState({
      booked: [...state.booked, ...state.held],
      held: [],
      companionTicketApplied: hasBay && Boolean(companion),
    });

    const companionNote =
      hasBay && companion
        ? ` The companion ticket for ${companion.id} is free, so it is not charged.`
        : "";
    return `Booked ${seats.map((s) => s.id).join(" and ")}. Total ${isk(total)} kr.${companionNote} A confirmation with the step-free route and your access notes has been sent.`;
  },
};

/** Every tool this site exposes. Both consumers read from this array. */
export const TOOLS: ToolDefinition<never>[] = [
  findSeatsTool,
  describeSeatTool,
  venueAccessTool,
  holdSeatsTool,
  releaseSeatsTool,
  completeBookingTool,
] as unknown as ToolDefinition<never>[];

export function toolByName(name: string): ToolDefinition<never> | undefined {
  return TOOLS.find((t) => t.name === name);
}

export { HALL };
