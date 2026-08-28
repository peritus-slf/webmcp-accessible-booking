/**
 * Application state: session, saved access profile, holds, bookings.
 *
 * A tiny observable store rather than a context, so that a tool call made by an
 * agent updates the visible page in the same moment it is announced to a
 * screen reader. Both consumers of the tool contract write here.
 */

export interface AccessProfile {
  /** Wheelchair bays needed. A bay is a flat space, not a seat. */
  wheelchairSpaces: number;
  /** Reserve the seat beside the bay for whoever comes with you. */
  companionSeat: boolean;
  /** Armrest must lift so the patron can transfer out of their chair. */
  transferSeat: boolean;
  assistanceDog: boolean;
  hearingLoop: boolean;
  /** Needs a sightline to the caption unit at captioned performances. */
  captionsRequired: boolean;
  /** Needs a sightline to the interpreter at signed performances. */
  interpreterRequired: boolean;
  stepFree: boolean;
  /** Photosensitive epilepsy. Non-negotiable. */
  noStrobe: boolean;
  maxWalkToWcM: number | null;
  /** Anything the fields above cannot express. Read by staff, not by logic. */
  notes: string;
}

export interface DemoUser {
  name: string;
  email: string;
}

export interface Booking {
  reference: string;
  eventSlug: string;
  seatIds: string[];
  totalIsk: number;
  companionTicketApplied: boolean;
}

export interface Holds {
  eventSlug: string;
  seatIds: string[];
}

/** Which performances the season listing is showing. A filter, not a mode. */
export interface EventFilters {
  relaxed: boolean;
  captioned: boolean;
  signed: boolean;
  audioDescribed: boolean;
  noStrobe: boolean;
}

export const NO_FILTERS: EventFilters = {
  relaxed: false,
  captioned: false,
  signed: false,
  audioDescribed: false,
  noStrobe: false,
};

/**
 * An in-progress sign-up.
 *
 * Identity fields are filled by the person. The access step can be populated by
 * an agent through `set_signup_access_preferences` — it fills a blank form the
 * user is looking at and is about to submit, which is assistance. It never
 * writes a saved profile, and there is still no tool that creates the account.
 */
export interface SignupDraft {
  step: 1 | 2 | 3;
  name: string;
  email: string;
  password: string;
  access: AccessProfile;
  /** True once an agent has populated the access step, so the UI can say so. */
  accessPrefilled: boolean;
  /** True once an agent has populated the identity step. */
  detailsPrefilled: boolean;
}

export interface AppState {
  user: DemoUser | null;
  signup: SignupDraft | null;
  eventFilters: EventFilters;
  /**
   * Whether access detail panels start open. A display preference for MORE
   * INFORMATION — never for capability or safety. Everything is bookable and
   * every hazard warning is in the page body regardless of this flag.
   */
  showAccessDetail: boolean;
  accessProfile: AccessProfile;
  holds: Holds | null;
  bookings: Booking[];
}

/**
 * The demo account.
 *
 * A saved access profile is the point. Disabled patrons report re-explaining
 * the same needs at every venue, every booking, every time — often to a person
 * on a phone line, because the website could not take the information. Stating
 * it once and having it applied is the improvement.
 */
export const DEMO_USER: DemoUser = {
  name: "Anna Kristjánsdóttir",
  email: "anna@example.is",
};

export const DEMO_PROFILE: AccessProfile = {
  wheelchairSpaces: 1,
  companionSeat: true,
  transferSeat: false,
  assistanceDog: false,
  hearingLoop: true,
  captionsRequired: true,
  interpreterRequired: false,
  stepFree: true,
  noStrobe: true,
  maxWalkToWcM: null,
  notes:
    "I use a powerchair and my partner comes with me. I lip-read as well as using the loop, so a clear view of the stage matters. Photosensitive epilepsy — no strobe, no exceptions.",
};


const EMPTY_PROFILE: AccessProfile = {
  wheelchairSpaces: 0,
  companionSeat: false,
  transferSeat: false,
  assistanceDog: false,
  hearingLoop: false,
  captionsRequired: false,
  interpreterRequired: false,
  stepFree: false,
  noStrobe: false,
  maxWalkToWcM: null,
  notes: "",
};

let state: AppState = {
  user: null,
  signup: null,
  eventFilters: NO_FILTERS,
  showAccessDetail: false,
  accessProfile: EMPTY_PROFILE,
  holds: null,
  bookings: [],
};

const listeners = new Set<() => void>();

/**
 * Session persistence.
 *
 * Module state alone survives client-side navigation but not a full page load,
 * and an agent moving someone through the site navigates by URL. Without this,
 * being signed in and holding seats would silently evaporate between the
 * landing page and the seat map — the exact journey the agent flow depends on.
 *
 * `sessionStorage`, not `localStorage`: a booking in progress belongs to this
 * tab and this visit. It should not still be sitting there tomorrow, and it
 * should not leak between tabs.
 */
const STORAGE_KEY = "aurora-hall:session";

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing, a full quota, or storage disabled entirely. The site
    // keeps working with in-memory state; it just forgets across navigations.
  }
}

/**
 * Restore a persisted session.
 *
 * Called from an effect after mount, never during render. Hydrating at module
 * load would make the first client render disagree with the server-rendered
 * HTML, and this codebase has already been bitten once by a mismatch that also
 * changed what a screen reader announced.
 */
export function restoreSession(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<AppState>;
    state = {
      user: saved.user ?? null,
      signup: saved.signup ?? null,
      eventFilters: { ...NO_FILTERS, ...(saved.eventFilters ?? {}) },
      showAccessDetail: saved.showAccessDetail ?? false,
      accessProfile: { ...EMPTY_PROFILE, ...(saved.accessProfile ?? {}) },
      holds: saved.holds ?? null,
      bookings: Array.isArray(saved.bookings) ? saved.bookings : [],
    };
    for (const listener of listeners) listener();
  } catch {
    // A malformed or stale payload is discarded rather than crashing the page.
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing further to do */
    }
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AppState {
  return state;
}

export function setState(next: Partial<AppState>): void {
  state = { ...state, ...next };
  persist();
  for (const listener of listeners) listener();
}

/**
 * Sign in as the demo account.
 *
 * Deliberately takes no password. This is a fictional venue with one fictional
 * customer; there is no credential to check and none is stored. Authentication
 * is also, deliberately, not exposed as a tool — see `registry.ts`.
 */
export function signIn(): void {
  setState({ user: DEMO_USER, accessProfile: DEMO_PROFILE });
}

export function signOut(): void {
  setState({
    user: null,
    accessProfile: EMPTY_PROFILE,
    holds: null,
    eventFilters: NO_FILTERS,
    showAccessDetail: false,
  });
}

export function updateProfile(patch: Partial<AccessProfile>): void {
  setState({ accessProfile: { ...state.accessProfile, ...patch } });
}

export function resetDemo(): void {
  state = { user: null, signup: null, eventFilters: NO_FILTERS, showAccessDetail: false, accessProfile: EMPTY_PROFILE, holds: null, bookings: [] };
  persist();
  for (const listener of listeners) listener();
}


export const EMPTY_ACCESS: AccessProfile = EMPTY_PROFILE;

/**
 * Begin a sign-up, or return the one in progress.
 *
 * Starts blank. Both steps are fillable by an agent — `set_signup_details` for
 * the identity fields, `set_signup_access_preferences` for the access ones —
 * and neither can submit it. The person reviews and creates the account.
 */
export function startSignup(): SignupDraft {
  if (state.signup) return state.signup;
  const draft: SignupDraft = {
    step: 1,
    name: "",
    email: "",
    password: "",
    access: EMPTY_PROFILE,
    accessPrefilled: false,
    detailsPrefilled: false,
  };
  setState({ signup: draft });
  return draft;
}

export function updateSignup(patch: Partial<SignupDraft>): void {
  if (!state.signup) return;
  setState({ signup: { ...state.signup, ...patch } });
}

export function updateSignupAccess(patch: Partial<AccessProfile>, byAgent = false): void {
  if (!state.signup) return;
  setState({
    signup: {
      ...state.signup,
      access: { ...state.signup.access, ...patch },
      accessPrefilled: byAgent || state.signup.accessPrefilled,
    },
  });
}

/**
 * Finish a sign-up. Called from the form's submit handler only — creating an
 * account is not exposed as a tool, for the same reason signing in is not.
 */
export function completeSignup(): void {
  const draft = state.signup;
  if (!draft) return;
  setState({
    user: { name: draft.name.trim() || "New patron", email: draft.email.trim() },
    accessProfile: draft.access,
    signup: null,
  });
}

export function cancelSignup(): void {
  setState({ signup: null });
}

/** Booking references are derived from the booking, not random, so SSR matches. */
export function bookingReference(eventSlug: string, seatIds: string[]): string {
  const seed = `${eventSlug}:${[...seatIds].sort().join(",")}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `AH-${hash.toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}
