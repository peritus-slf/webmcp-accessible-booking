import { VENUE_ACCESS, seatById } from "@/lib/venue/hall";
import { EVENTS, accessSummary, eventBySlug, type VenueEvent } from "@/lib/venue/events";
import { INFO_TOPICS, infoTopicBySlug } from "@/lib/venue/information";
import { describeSeat, findSeats, seatsForEvent } from "@/lib/venue/query";
import type { SeatQuery, StrobeExposure } from "@/lib/venue/types";
import { isk } from "@/lib/format";
import { NO_FILTERS, bookingReference, getState, setState, updateSignup, updateSignupAccess, type EventFilters } from "@/lib/store";

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
      "6. ACCESS DETAIL PANELS — every performance and visitor-information page carries its access detail behind a collapsed disclosure, because a venue site does not lead with them. set_access_detail opens them all at once; offer that rather than reading everything out. It changes display only.",
      "7. PRACTICAL VISIT INFORMATION — getting here, food and drink, cloakroom, groups, venue hire, families — each carrying its own access detail, via get_venue_information. Blue-badge bays, lowered bar counters, table service to a seat, powerchair storage and ear defenders all live there rather than on an accessibility page.",
      "8. A HUMAN, if wanted — access line +354 555 0100, 10:00-18:00, or access@example.is, who reply in writing on request. Offer this alongside the site, never instead of it: everything above is bookable online without a call.",
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

/**
 * Set the season listing's filters.
 *
 * This is the same control a person clicks in the filter row on the landing
 * page, driven by a tool instead of a pointer. It is a filter, not a mode: it
 * changes which performances are listed and reveals their access detail on the
 * cards, and it changes nothing about what can be booked. Every performance
 * remains bookable and the full access detail is on each event page either way.
 *
 * The intended use is to read someone's saved profile and offer to apply it —
 * "your profile says no strobe and captions; shall I filter the season to
 * match?" — rather than making them read six cards to find the two that work.
 */
const filterEventsTool: ToolDefinition<Partial<EventFilters> & { useMyAccessProfile?: boolean }> = {
  name: "filter_events",
  description:
    "Filter the season listing on the landing page by access provision, and reveal each performance's access detail on its card. This is the same filter a person can set by hand; it changes what is shown, never what can be booked. Pass useMyAccessProfile:true to derive the filters from the signed-in patron's saved requirements. Pass all filters false to clear.",
  inputSchema: {
    type: "object",
    properties: {
      useMyAccessProfile: {
        type: "boolean",
        description: "Derive the filters from the signed-in patron's saved access profile. Prefer this over guessing.",
      },
      relaxed: { type: "boolean", description: "Only relaxed performances." },
      captioned: { type: "boolean", description: "Only captioned performances." },
      signed: { type: "boolean", description: "Only sign-language interpreted performances." },
      audioDescribed: { type: "boolean", description: "Only audio-described performances." },
      noStrobe: { type: "boolean", description: "Only performances with no strobe. Use for photosensitive epilepsy." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute(input = {}) {
    const state = getState();
    let filters: EventFilters = { ...NO_FILTERS };

    if (input.useMyAccessProfile) {
      if (!state.user) return NOT_SIGNED_IN;
      const p = state.accessProfile;
      filters = {
        relaxed: false,
        captioned: p.captionsRequired,
        signed: p.interpreterRequired,
        audioDescribed: false,
        noStrobe: p.noStrobe,
      };
    }

    for (const key of ["relaxed", "captioned", "signed", "audioDescribed", "noStrobe"] as const) {
      if (typeof input[key] === "boolean") filters[key] = input[key];
    }

    setState({ eventFilters: filters });

    const active = Object.entries(filters)
      .filter(([, on]) => on)
      .map(([k]) => k);
    const shown = EVENTS.filter(
      (e) =>
        (!filters.relaxed || e.relaxed) &&
        (!filters.captioned || e.captioned) &&
        (!filters.signed || e.signed) &&
        (!filters.audioDescribed || e.audioDescribed) &&
        (!filters.noStrobe || e.lighting === "none"),
    );

    if (active.length === 0) {
      return `Filters cleared. All ${EVENTS.length} performances are listed.`;
    }
    if (shown.length === 0) {
      return `No performance this season matches ${active.join(" + ")}. The filter is set and the listing is empty; clear it by calling filter_events with everything false.`;
    }
    return `Filtered the season to ${active.join(" + ")}. ${shown.length} of ${EVENTS.length} performances shown: ${shown.map((e) => `${e.title} (${e.slug})`).join(", ")}. Their access detail is now visible on the cards.`;
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

/**
 * Turn the access disclosures on or off across the site.
 *
 * Every page keeps its access detail behind a collapsed disclosure, because a
 * commercial venue page does not carry a large access panel and this site is
 * meant to look like one. This opens them all at once.
 *
 * It changes what is SHOWN, never what can be done. Booking is identical either
 * way, every page is fully operable with the panels closed, and nothing that
 * could hurt somebody sits behind one — a performance's strobe warning is in
 * the page body regardless. A collapsed panel is a reasonable home for detail
 * and an indefensible home for a hazard.
 *
 * It is also not the only route: a person can click any disclosure open, or set
 * the same preference on their account. If this tool were the only way in, the
 * information would be agent-exclusive, which is the split this project exists
 * to argue against.
 */
const accessDetailTool: ToolDefinition<{ show: boolean }> = {
  name: "set_access_detail",
  description:
    "Show or hide the access detail panels across the site — on performances and on visitor-information pages. They are collapsed by default because a venue site does not lead with them. Offer this when the patron has access requirements, rather than reading the detail out yourself. Changes what is displayed, never what can be booked.",
  inputSchema: {
    type: "object",
    properties: {
      show: { type: "boolean", description: "True to open the access panels everywhere, false to collapse them again." },
    },
    required: ["show"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute({ show }) {
    setState({ showAccessDetail: show });
    return show
      ? "Access detail is now shown on every performance and visitor-information page. The panels were collapsed, not missing — this opens them. It can also be switched on from the account page, or a single panel opened by clicking it."
      : "Access detail is collapsed again. Nothing has been removed; every panel can still be opened individually.";
  },
};

const venueInformationTool: ToolDefinition<{ topic?: string }> = {
  name: "get_venue_information",
  description:
    "Practical information about visiting Aurora Hall — getting here, food and drink, cloakroom and bags, groups of ten or more, hiring the venue, families and schools. Every topic includes its own access detail, so this answers questions like whether the bar has a lowered counter, whether staff will bring a drink to a seat, or where a powerchair is stored during a performance. Call with no topic to list what is covered.",
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        enum: INFO_TOPICS.map((t) => t.slug),
        description: "Which topic to read. Omit to list the available topics.",
      },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  async execute({ topic } = {}) {
    if (!topic) {
      return [
        "Venue information topics. Each carries its own access detail:",
        ...INFO_TOPICS.map((t) => `- ${t.slug} — ${t.title}. ${t.summary}`),
        "",
        "Call get_venue_information with a topic slug to read one. For the building's permanent access facilities use get_venue_access_info; for what this site can do for a patron with access requirements use get_access_capabilities.",
      ].join("\n");
    }

    const found = infoTopicBySlug(topic);
    if (!found) {
      return `There is no topic "${topic}". Available: ${INFO_TOPICS.map((t) => t.slug).join(", ")}.`;
    }

    return [
      `${found.title} — ${found.summary}`,
      "",
      ...found.body,
      "",
      `ACCESS, specific to ${found.title.toLowerCase()}:`,
      ...found.access.map((a) => `- ${a}`),
      "",
      `This is also readable at /visit/${found.slug} — nothing here is agent-only.`,
    ].join("\n");
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

/**
 * Fill the identity step of a sign-up in progress.
 *
 * The agent types into a form the person is looking at, exactly as a password
 * manager or a browser autofill does. They read it, correct it, and press
 * Create account themselves — which is still not a tool, and still the line.
 *
 * On `password`: accepted, because a demonstration that made someone type one
 * by hand would be pretending autofill does not exist. But a password manager
 * is the right source for a real one — it has a vault, and a model's context is
 * not a vault. The tool description says so, so an agent reading the contract
 * is told rather than left to guess.
 */
const signupDetailsTool: ToolDefinition<{ name?: string; email?: string; password?: string }> = {
  name: "set_signup_details",
  description:
    "Fill in the name, email and password on a sign-up that is in progress, so the person does not retype details you already know. Only works while they are on the sign-up form. It fills the form for them to check and submit; it cannot create the account. Prefer a password manager as the source of a real password — pass one here only when the person has asked you to.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Full name, as it should appear on the booking." },
      email: { type: "string", description: "Email address for confirmations." },
      password: { type: "string", description: "Password, at least eight characters. Optional." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute(input = {}) {
    const state = getState();
    if (!state.signup) {
      return "Nobody is part-way through creating an account. Ask them to start one at /signup — an agent cannot create an account here, by design — and call this again once they are on the form.";
    }

    const patch: Record<string, string> = {};
    if (typeof input.name === "string" && input.name.trim()) patch.name = input.name.trim();
    if (typeof input.email === "string" && input.email.trim()) patch.email = input.email.trim();
    if (typeof input.password === "string" && input.password) patch.password = input.password;

    if (Object.keys(patch).length === 0) return "Nothing to fill in — no details were given.";

    updateSignup({ ...patch, detailsPrefilled: true, step: 1 });

    const filled = Object.keys(patch).map((k) => (k === "password" ? "password" : k));
    const short =
      patch.password !== undefined && patch.password.length < 8
        ? " The password is under eight characters and the form will reject it."
        : "";
    return `Filled in ${filled.join(", ")} on the sign-up form. Ask them to check it before continuing.${short} Nothing is saved until they press Create account, which only they can do.`;
  },
};

/**
 * Fill the access step of a sign-up in progress.
 *
 * Populates step 2 of the form the person is looking at. They then read it,
 * change whatever is wrong, and submit it themselves. That is assistance with a
 * blank form, and it is the moment where recording access needs stops being a
 * chore someone gives up on halfway through.
 *
 * There is deliberately no tool that creates the account, and none that
 * rewrites a saved profile. Establishing identity stays with the person — the
 * same boundary as `sign_in`, and creating a persistent record on someone's
 * behalf is a larger version of that decision rather than a smaller one.
 */
const signupAccessTool: ToolDefinition<{
  wheelchairSpace?: boolean;
  companionSeat?: boolean;
  transferSeat?: boolean;
  assistanceDog?: boolean;
  hearingLoop?: boolean;
  captionsRequired?: boolean;
  interpreterRequired?: boolean;
  stepFree?: boolean;
  noStrobe?: boolean;
  notes?: string;
}> = {
  name: "set_signup_access_preferences",
  description:
    "Fill in the access-requirements step of a sign-up that is in progress, so the person does not have to type out needs they have already told you about. Only works while someone is on the sign-up form; it fills the form for them to review and submit. It cannot create the account and cannot change an existing saved profile.",
  inputSchema: {
    type: "object",
    properties: {
      wheelchairSpace: { type: "boolean", description: "Needs a wheelchair bay — a flat space rather than a seat." },
      companionSeat: { type: "boolean", description: "Reserve the seat beside the bay. The companion ticket is free." },
      transferSeat: { type: "boolean", description: "Transfers out of a wheelchair, so needs a lifting armrest." },
      assistanceDog: { type: "boolean", description: "Comes with an assistance dog and needs floor room." },
      hearingLoop: { type: "boolean", description: "Uses an induction loop." },
      captionsRequired: { type: "boolean", description: "Needs a sightline to the caption unit." },
      interpreterRequired: { type: "boolean", description: "Needs a sightline to the interpreter." },
      stepFree: { type: "boolean", description: "Needs a step-free route." },
      noStrobe: { type: "boolean", description: "Cannot be exposed to strobe. Never relaxed to find a seat." },
      notes: { type: "string", description: "Anything the checkboxes cannot express, in the patron's own words." },
    },
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  async execute(input = {}) {
    const state = getState();
    if (!state.signup) {
      return "Nobody is part-way through creating an account. Ask them to start one at /signup — an agent cannot create an account here, by design — and call this again once they are on the form.";
    }

    const patch: Record<string, unknown> = {};
    if (typeof input.wheelchairSpace === "boolean") patch.wheelchairSpaces = input.wheelchairSpace ? 1 : 0;
    for (const key of [
      "companionSeat",
      "transferSeat",
      "assistanceDog",
      "hearingLoop",
      "captionsRequired",
      "interpreterRequired",
      "stepFree",
      "noStrobe",
    ] as const) {
      if (typeof input[key] === "boolean") patch[key] = input[key];
    }
    if (typeof input.notes === "string") patch.notes = input.notes;

    if (Object.keys(patch).length === 0) {
      return "Nothing to fill in — no preferences were given.";
    }

    updateSignupAccess(patch as never, true);
    setState({ signup: { ...getState().signup!, step: 2 } });

    const filled = Object.keys(patch).filter((k) => k !== "notes");
    return `Filled in the access step: ${filled.join(", ")}${patch.notes ? ", plus a note for staff" : ""}. The form now shows it for them to check. Nothing is saved until they create the account themselves — tell them to review it, since getting this wrong is worse than leaving it blank.`;
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
    }

    if (query.maxStrobeExposure === "none" && event.lighting === "heavy") {
      return `${event.title} runs continuous strobe throughout the house, so there is no seat at this performance that is safe for photosensitive epilepsy and none is offered. This is a property of the performance, not of where you sit — a different seat would not help.${applied} Other performances this season have no strobe at all; call list_events to see them.`;
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
      `Contact: ${v.accessLine}`,
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
  filterEventsTool,
  getEventTool,
  accessProfileTool,
  signupDetailsTool,
  signupAccessTool,
  findSeatsTool,
  describeSeatTool,
  venueAccessTool,
  venueInformationTool,
  accessDetailTool,
  holdSeatsTool,
  releaseSeatsTool,
  completeBookingTool,
  myBookingsTool,
] as unknown as ToolDefinition<never>[];

export function toolByName(name: string): ToolDefinition<never> | undefined {
  return TOOLS.find((t) => t.name === name);
}
