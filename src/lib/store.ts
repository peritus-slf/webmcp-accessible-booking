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

export interface AppState {
  user: DemoUser | null;
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
  accessProfile: EMPTY_PROFILE,
  holds: null,
  bookings: [],
};

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): AppState {
  return state;
}

export function setState(next: Partial<AppState>): void {
  state = { ...state, ...next };
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
  setState({ user: null, accessProfile: EMPTY_PROFILE, holds: null });
}

export function updateProfile(patch: Partial<AccessProfile>): void {
  setState({ accessProfile: { ...state.accessProfile, ...patch } });
}

export function resetDemo(): void {
  state = { user: null, accessProfile: EMPTY_PROFILE, holds: null, bookings: [] };
  for (const listener of listeners) listener();
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
