import { VENUE_ACCESS, seatById } from "@/lib/venue/hall";
import { EVENTS, accessSummary, eventBySlug, type VenueEvent } from "@/lib/venue/events";
import { describeSeat, findSeats, seatsForEvent } from "@/lib/venue/query";
import type { SeatQuery, StrobeExposure } from "@/lib/venue/types";
import { isk } from "@/lib/format";
import { bookingReference, getState, setState } from "@/lib/store";

/**
 * The tool contract for Aurora Hall.
 *
 * This file is the single definition of what can be done on this site. It is
 * consumed twice: by an AI agent through `document.modelContext.registerTool`,
 * and by the in-page command interface, which is keyboard and screen-reader
 * native and calls exactly the same handlers.
 *
 * The WebMCP proposal states it "is not designed for ingestion by accessibility
 * technology", which invites a two-tier web: rich, actionable capability for
 * agents, and whatever is left for disabled users. Defining the contract once —
 * here — and letting both consumers read it is how this demo refuses that split.
 *
 * WHAT IS DELIBERATELY NOT A TOOL
 *
 * There is no `sign_in`. An agent cannot authenticate on someone's behalf here.
 * Handing an agent the ability to establish identity is a different and much
 * larger trust decision than handing it the ability to search a seating plan,
 * and nothing about this use case requires it. Authentication stays with the
 * human; everything after it is shared.
 *
 * There is also no `update_access_profile`. An agent can read what the patron
 * has recorded about their own needs and act on it. It cannot rewrite it.
 */

export interface ToolDefinition<Input = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: Input) => Promise<string>;
}

const STROBE_VALUES: StrobeExposure[] = ["none", "low", "high"];
const NOT_SIGNED_IN =
  "Nobody is signed in. Sign in on the site first — an agent cannot sign in on your behalf here, by design.";

type EventLookup =
  | { ok: true; event: VenueEvent }
  | { ok: false; error: string };

function eventOrError(slug: string): EventLookup {
  const event = eventBySlug(slug);
  if (!event) {
    return {
      ok: false,
      error: `There is no event "${slug}". Current events: ${EVENTS.map((e) => e.slug).join(", ")}.`,
    };
  }
  return { ok: true, event };
}

// --- Discovery -------------------------------------------------------------

/**
 * What this site can do about access — the tool that makes the footer link
 * survivable.
 *
 * Aurora Hall is built like a normal commercial venue site: a loud hero, a
 * pre-registration banner, and the access page one link down in the footer.
 * That is not an oversight, it is the realistic case. Almost nobody finds that
 * link, and the patrons who most need it are the least likely to go hunting
 * through a dark marketing page for it.
 *
 * An agent reading this contract finds it immediately. That is the argument:
 * the site does not have to be redesigned around disabled users, it has to
 * expose a real tool contract — and then a buried capability becomes a
 * capability the agent can offer unprompted.
 */
const accessCapabilitiesTool: ToolDefinition = {
  name: "get_access_capabilities",
  description:
    "What this site can do for a patron with access requirements. Call this early — on arrival or once someone signs in — to find out what is available before searching for anything. Covers saved access profiles, per-performance access data, seat filtering by access need, and the companion-ticket policy.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  async execute() {
    const { user } = getState();
    return [
      "Aurora Hall supports the following, all bookable online with no phone call:",
      "",
      "1. SAVED ACCESS PROFILE — a signed-in patron records their requirements once (wheelchair bays, companion seat, transfer seat, assistance dog, induction loop, caption and interpreter sightlines, step-free routes, strobe limits). Read it with get_my_access_profile and apply it by passing useMyAccessProfile:true to find_seats. Do not interrogate someone for needs they have already recorded.",
      "2. PER-PERFORMANCE ACCESS DATA — captions, interpretation, audio description, relaxed staging and the lighting rig differ by night, not by venue. list_events and get_event carry it.",
      "3. SEAT-LEVEL FILTERING — find_seats searches on access requirements directly and returns groups that sit together. It states any requirement it could not meet rather than quietly returning an unsuitable seat.",
      "4. FREE COMPANION TICKET — one companion ticket is free with every wheelchair booking. It is applied at complete_booking automatically; nobody has to ask for it.",
      "5. VENUE FACILITIES — step-free entrances, accessible toilets, loop coverage, quiet room and assistance-dog policy, via get_venue_access_info.",
      "",
      user
        ? `${user.name} is signed in and has a saved access profile. Read it before searching, and offer to apply it rather than asking them to restate their needs.`
        : "Nobody is signed in yet. The saved-profile features need a signed-in patron; an agent cannot sign in on someone's behalf here, so ask them to sign in on the site.",
    ].join("\n");
  },
};

const listEventsTool: ToolDefinition<{ relaxedOnly?: boolean; captionedOnly?: boolean }> = {
  name: "list_events",
  description:
    "List what is on at Aurora Hall, with the access provision for each performance: whether it is captioned, signed, audio described, relaxed, and how much strobe its lighting rig uses.",
  inputSchema: {
    type: "object",
    properties: {
      relaxedOnly: { type: "boolean", description: "Only relaxed performances." },
      captionedOnly: { type: "boolean", description: "Only captioned performances." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async execute({ relaxedOnly, captionedOnly } = {}) {
    let events = EVENTS;
    if (relaxedOnly) events = events.filter((e) => e.relaxed);
    if (captionedOnly) events = events.filter((e) => e.captioned);
    if (events.length === 0) return "No performances match that filter.";

    return events
      .map((e) => {
        const tags = [
          e.captioned ? "captioned" : null,
          e.signed ? "signed" : null,
          e.audioDescribed ? "audio described" : null,
          e.relaxed ? "relaxed performance" : null,
        ].filter(Boolean);
        const strobe =
          e.lighting === "none"
            ? "no strobe"
            : e.lighting === "heavy"
              ? "heavy strobe throughout"
              : "some strobe in the front rows";
        return `${e.title} (${e.slug}) — ${e.subtitle}. ${e.date}, curtain ${e.curtain}. ${e.category}. ${strobe}${tags.length ? `, ${tags.join(", ")}` : ""}.${e.soldOut ? " SOLD OUT." : ""}`;
      })
      .join("\n");
  },
};

const getEventTool: ToolDefinition<{ eventSlug: string }> = {
  name: "get_event",
  description:
    "Full detail for one performance, including its access provision and exactly which rows its strobe affects.",
  inputSchema: {
    type: "object",
    properties: { eventSlug: { type: "string", description: "Event identifier, e.g. 'vetrarnott'." } },
    required: ["eventSlug"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async execute({ eventSlug }) {
    const found = eventOrError(eventSlug);
    if (!found.ok) return found.error;
    const e = found.event;
    return [
      `${e.title} — ${e.subtitle}`,
      `${e.category}. ${e.date}, doors ${e.doors}, curtain ${e.curtain}. ${e.runtime}.`,
      e.description,
      ...accessSummary(e),
      e.soldOut ? "This performance is sold out. Returns go to the access list first." : "",
    ]
      .filter(Boolean)
      .join("\n");
  },
};

// --- The patron's own recorded needs ---------------------------------------

const accessProfileTool: ToolDefinition = {
  name: "get_my_access_profile",
  description:
    "Read the signed-in patron's saved access requirements, so they do not have to state them again. Use this before searching for seats. Read-only: an agent cannot change what someone has recorded about their own needs.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  async execute() {
    const { user, accessProfile: p } = getState();
    if (!user) return NOT_SIGNED_IN;

    const needs: string[] = [];
    if (p.wheelchairSpaces > 0) needs.push(`${p.wheelchairSpaces} wheelchair bay(s)`);
    if (p.companionSeat) needs.push("a companion seat beside the bay");
    if (p.transferSeat) needs.push("a transfer seat with a lifting armrest");
    if (p.assistanceDog) needs.push("floor room for an assistance dog");
    if (p.hearingLoop) needs.push("induction-loop coverage");
    if (p.captionsRequired) needs.push("a clear view of the caption unit");
    if (p.interpreterRequired) needs.push("a clear view of the interpreter");
    if (p.stepFree) needs.push("a step-free route");
    if (p.noStrobe) needs.push("NO strobe exposure (photosensitive epilepsy — not negotiable)");
    if (p.maxWalkToWcM) needs.push(`no more than ${p.maxWalkToWcM} m to an accessible toilet`);

    return [
      `${user.name} (${user.email}).`,
      needs.length > 0 ? `Recorded needs: ${needs.join("; ")}.` : "No access needs recorded.",
      p.notes ? `Their own note: "${p.notes}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
  },
};

// --- Seats -----------------------------------------------------------------

const findSeatsSchema = {
  type: "object",
  properties: {
    eventSlug: { type: "string", description: "Which performance to search. Required." },
    useMyAccessProfile: {
      type: "boolean",
      description:
        "Apply the signed-in patron's saved access requirements on top of anything set here. Prefer this over restating their needs.",
    },
    party: { type: "integer", minimum: 1, maximum: 8, description: "Total people, including any wheelchair users." },
    wheelchairSpaces: { type: "integer", minimum: 0, maximum: 4, description: "Wheelchair bays needed. A bay is a flat space, not a seat." },
    companionSeat: { type: "boolean", description: "Reserve the seat immediately beside each bay." },
    transferSeat: { type: "boolean", description: "Require a seat whose armrest lifts." },
    assistanceDogSpace: { type: "boolean", description: "Require floor room for an assistance dog." },
    hearingLoop: { type: "boolean", description: "Require induction-loop coverage." },
    captionScreenVisible: { type: "boolean", description: "Require a clear sightline to the caption unit." },
    signInterpreterVisible: { type: "boolean", description: "Require a clear sightline to the interpreter." },
    stepFree: { type: "boolean", description: "Require a route with no steps." },
    maxDistanceToAccessibleWcM: { type: "number", description: "Furthest acceptable walk to an accessible toilet, in metres." },
    maxDistanceToStageM: { type: "number", description: "Furthest acceptable distance from the stage. Matters for lip-reading." },
    maxStrobeExposure: { type: "string", enum: STROBE_VALUES, description: "Highest acceptable strobe exposure. Use 'none' for photosensitive epilepsy." },
    maxPriceIsk: { type: "integer", description: "Price ceiling per seat, in ISK." },
    section: { type: "string", enum: ["stalls", "circle", "balcony"], description: "Restrict to one section." },
  },
  required: ["eventSlug"],
  additionalProperties: false,
};

const findSeatsTool: ToolDefinition<SeatQuery & { eventSlug: string; useMyAccessProfile?: boolean }> = {
  name: "find_seats",
  description:
    "Find seats for one performance matching access requirements — wheelchair bays, companion seats, induction loop, caption and interpreter sightlines, step-free routes, strobe limits, distance to an accessible toilet. Returns whole groups that sit together, and states plainly any requirement it could not meet.",
  inputSchema: findSeatsSchema,
  annotations: { readOnlyHint: true },
  async execute(input) {
    const found = eventOrError(input?.eventSlug ?? "");
    if (!found.ok) return found.error;
    const event = found.event;
    if (event.soldOut) return `${event.title} is sold out. Returns are released to the access list first.`;

    const query: SeatQuery = { ...input };
    let applied = "";

    if (input.useMyAccessProfile) {
      const { user, accessProfile: p } = getState();
      if (!user) return NOT_SIGNED_IN;
      if (p.wheelchairSpaces > 0) query.wheelchairSpaces = p.wheelchairSpaces;
      if (p.companionSeat) query.companionSeat = true;
      if (p.transferSeat) query.transferSeat = true;
      if (p.assistanceDog) query.assistanceDogSpace = true;
      if (p.hearingLoop) query.hearingLoop = true;
      if (p.captionsRequired && event.captioned) query.captionScreenVisible = true;
      if (p.interpreterRequired && event.signed) query.signInterpreterVisible = true;
      if (p.stepFree) query.stepFree = true;
      if (p.noStrobe) query.maxStrobeExposure = "none";
      if (p.maxWalkToWcM) query.maxDistanceToAccessibleWcM = p.maxWalkToWcM;
      applied = " Your saved access requirements were applied.";

      if (p.captionsRequired && !event.captioned) {
        applied += ` Note: ${event.title} is NOT a captioned performance, so no seat can satisfy that requirement here.`;
      }
      if (p.noStrobe && event.lighting === "heavy") {
        return `${event.title} uses continuous strobe throughout the house. There is no seat at this performance that is safe for photosensitive epilepsy, so none is offered. ${accessSummary(event)[0]}`;
      }
    }

    const groups = findSeats(event, query);
    if (groups.length === 0) {
      return `No seats for ${event.title} meet those requirements, even after relaxing every constraint that can safely be relaxed. Step-free access and strobe limits were held firm.${applied} Contact the access line for a held-back allocation.`;
    }

    const lines = groups.map((g, i) => {
      const seats = g.seats.map((s) => s.id).join(" and ");
      const compromise = g.compromises.length > 0 ? ` ${g.compromises.join(" ")}` : "";
      return `${i + 1}. ${seats} — ${isk(g.totalPriceIsk)} kr total. ${g.rationale}${compromise}`;
    });
    return `${groups.length} option${groups.length === 1 ? "" : "s"} for ${event.title}.${applied}\n${lines.join("\n")}`;
  },
};

const describeSeatTool: ToolDefinition<{ eventSlug: string; seatId: string }> = {
  name: "describe_seat",
  description:
    "Describe one seat at one performance in full: price, the route to it, distance to the stage and to an accessible toilet, loop coverage, caption and interpreter sightlines, strobe exposure, assistance-dog floor room.",
  inputSchema: {
    type: "object",
    properties: {
      eventSlug: { type: "string", description: "Which performance." },
      seatId: { type: "string", description: "Seat identifier, e.g. 'N-2'." },
    },
    required: ["eventSlug", "seatId"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async execute({ eventSlug, seatId }) {
    const found = eventOrError(eventSlug);
    if (!found.ok) return found.error;
    const base = seatById(seatId);
    if (!base) return `There is no seat ${seatId} in Aurora Hall.`;
    const seat = seatsForEvent(found.event).find((s) => s.id === seatId)!;
    const status =
      seat.status === "available" ? "Available." : seat.status === "sold" ? "Already sold." : "Currently held.";
    return `${describeSeat(seat, found.event)} ${status}`;
  },
};

const venueAccessTool: ToolDefinition = {
  name: "get_venue_access_info",
  description:
    "Aurora Hall's permanent access facilities: step-free entrances, accessible toilets, induction-loop coverage, the quiet room, assistance-dog policy, the free companion-ticket policy, and where the caption unit and interpreter stand.",
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

// --- Holding and buying ----------------------------------------------------

const holdSeatsTool: ToolDefinition<{ eventSlug: string; seatIds: string[] }> = {
  name: "hold_seats",
  description:
    "Hold specific seats for one performance for 15 minutes so nobody else can take them. Does not purchase them and does not charge anything.",
  inputSchema: {
    type: "object",
    properties: {
      eventSlug: { type: "string", description: "Which performance." },
      seatIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8, description: "Seats to hold, e.g. ['N-2','N-3']." },
    },
    required: ["eventSlug", "seatIds"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute({ eventSlug, seatIds }) {
    const found = eventOrError(eventSlug);
    if (!found.ok) return found.error;

    const unknown = seatIds.filter((id) => !seatById(id));
    if (unknown.length > 0) return `No such seat: ${unknown.join(", ")}. Nothing was held.`;

    const state = getState();
    const booked = state.bookings.filter((b) => b.eventSlug === eventSlug).flatMap((b) => b.seatIds);
    const unavailable = seatIds.filter((id) => seatById(id)!.status !== "available" || booked.includes(id));
    if (unavailable.length > 0) return `These seats are not available: ${unavailable.join(", ")}. Nothing was held.`;

    // Holds belong to one performance. Switching event replaces them rather
    // than silently accumulating seats across different nights.
    const existing = state.holds?.eventSlug === eventSlug ? state.holds.seatIds : [];
    const merged = Array.from(new Set([...existing, ...seatIds]));
    setState({ holds: { eventSlug, seatIds: merged } });

    const switched =
      state.holds && state.holds.eventSlug !== eventSlug
        ? ` Previous holds for ${state.holds.eventSlug} were released.`
        : "";
    return `Held ${seatIds.join(" and ")} for ${found.event.title} for 15 minutes. Nothing has been paid for yet.${switched} On hold now: ${merged.join(", ")}.`;
  },
};

const releaseSeatsTool: ToolDefinition<{ seatIds?: string[] }> = {
  name: "release_held_seats",
  description:
    "Release held seats back to general availability. Name the seats to release; omit seatIds only when you intend to release every held seat.",
  inputSchema: {
    type: "object",
    properties: {
      seatIds: { type: "array", items: { type: "string" }, description: "Held seats to release. Omit to release all." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute({ seatIds } = {}) {
    const { holds } = getState();
    if (!holds || holds.seatIds.length === 0) return "There are no seats on hold.";

    if (!seatIds || seatIds.length === 0) {
      const released = [...holds.seatIds];
      setState({ holds: null });
      return `Released all held seats: ${released.join(" and ")}.`;
    }

    const notHeld = seatIds.filter((id) => !holds.seatIds.includes(id));
    if (notHeld.length > 0) {
      return `Nothing released. These seats are not on hold: ${notHeld.join(", ")}. Currently on hold: ${holds.seatIds.join(", ")}.`;
    }

    const remaining = holds.seatIds.filter((id) => !seatIds.includes(id));
    setState({ holds: remaining.length > 0 ? { ...holds, seatIds: remaining } : null });
    return `Released ${seatIds.join(" and ")}.${remaining.length > 0 ? ` Still on hold: ${remaining.join(", ")}.` : ""}`;
  },
};

const completeBookingTool: ToolDefinition<{ seatIds: string[]; confirm: boolean }> = {
  name: "complete_booking",
  description:
    "Complete the booking for specific held seats. This is the final, consequential step and it charges money. Name exactly the seats to buy — seats left on hold are not booked and not charged. Requires the patron to be signed in. The free companion ticket is applied here.",
  inputSchema: {
    type: "object",
    properties: {
      seatIds: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 8,
        description: "Exactly the seats to buy. Every one must currently be on hold. Any other held seat is left alone.",
      },
      confirm: { type: "boolean", description: "Must be true. The caller confirms the booking should be completed." },
    },
    required: ["seatIds", "confirm"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute({ seatIds, confirm }) {
    const state = getState();
    if (!state.user) return NOT_SIGNED_IN;
    if (!confirm) return "Booking not completed. Set confirm to true to go ahead.";
    if (!state.holds || state.holds.seatIds.length === 0) {
      return "There are no seats on hold, so there is nothing to book.";
    }

    // Never infer which seats were meant. Booking charges money and cannot be
    // undone here, so an ambiguous request is refused rather than guessed at.
    const notHeld = seatIds.filter((id) => !state.holds!.seatIds.includes(id));
    if (notHeld.length > 0) {
      return `Not booked. These seats are not on hold: ${notHeld.join(", ")}. Currently on hold: ${state.holds.seatIds.join(", ")}. Hold them first, or name only the seats that are held.`;
    }

    const event = eventBySlug(state.holds.eventSlug)!;
    const priced = seatsForEvent(event);
    const seats = seatIds.map((id) => priced.find((s) => s.id === id)!);
    const hasBay = seats.some((s) => s.wheelchairSpace);
    const companion = seats.find((s) => s.companionSeat);
    const chargeable = hasBay && companion ? seats.filter((s) => s.id !== companion.id) : seats;
    const total = chargeable.reduce((sum, s) => sum + s.priceIsk, 0);

    const stillHeld = state.holds.seatIds.filter((id) => !seatIds.includes(id));
    const reference = bookingReference(event.slug, seatIds);

    setState({
      bookings: [
        ...state.bookings,
        { reference, eventSlug: event.slug, seatIds, totalIsk: total, companionTicketApplied: hasBay && Boolean(companion) },
      ],
      holds: stillHeld.length > 0 ? { ...state.holds, seatIds: stillHeld } : null,
    });

    const companionNote =
      hasBay && companion ? ` The companion ticket for ${companion.id} is free, so it is not charged.` : "";
    // Say what was deliberately left alone. Silence about the rest is how a
    // caller ends up paying for seats nobody asked for.
    const remainingNote =
      stillHeld.length > 0
        ? ` Still on hold and NOT booked or charged: ${stillHeld.join(", ")}. Release them if you do not want them.`
        : "";
    return `Booked ${seats.map((s) => s.id).join(" and ")} for ${event.title}, ${event.date}. Reference ${reference}. Total ${isk(total)} kr.${companionNote}${remainingNote} A confirmation with the step-free route and your access notes has been sent.`;
  },
};

const myBookingsTool: ToolDefinition = {
  name: "get_my_bookings",
  description: "List the signed-in patron's bookings at Aurora Hall.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  async execute() {
    const { user, bookings } = getState();
    if (!user) return NOT_SIGNED_IN;
    if (bookings.length === 0) return `${user.name} has no bookings yet.`;
    return bookings
      .map((b) => {
        const event = eventBySlug(b.eventSlug)!;
        return `${b.reference} — ${event.title}, ${event.date}. Seats ${b.seatIds.join(", ")}. ${isk(b.totalIsk)} kr${b.companionTicketApplied ? " (companion ticket free)" : ""}.`;
      })
      .join("\n");
  },
};

/** Every tool this site exposes. Both consumers read from this array. */
export const TOOLS: ToolDefinition<never>[] = [
  accessCapabilitiesTool,
  listEventsTool,
  getEventTool,
  accessProfileTool,
  findSeatsTool,
  describeSeatTool,
  venueAccessTool,
  holdSeatsTool,
  releaseSeatsTool,
  completeBookingTool,
  myBookingsTool,
] as unknown as ToolDefinition<never>[];

export function toolByName(name: string): ToolDefinition<never> | undefined {
  return TOOLS.find((t) => t.name === name);
}
