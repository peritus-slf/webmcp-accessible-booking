/**
 * Domain model for Aurora Hall.
 *
 * Every field below maps to a barrier disabled patrons actually report when
 * booking live performances. They are not decorative: each one is a reason a
 * seat that looks fine on a seating plan turns out to be unusable on the night.
 */

export type Section = "stalls" | "circle" | "balcony";

export type SeatStatus = "available" | "held" | "sold";

/** Photosensitive-epilepsy risk from the production's lighting rig. */
export type StrobeExposure = "none" | "low" | "high";

export interface Seat {
  /** Human-facing identifier, e.g. "D-14". */
  id: string;
  section: Section;
  row: string;
  number: number;
  priceIsk: number;
  status: SeatStatus;

  /** Grid coordinates for the visual plan. Meaningless to a screen reader. */
  x: number;
  y: number;

  // --- Access attributes -------------------------------------------------

  /** A flat bay sized for a wheelchair. The chair stays; there is no seat. */
  wheelchairSpace: boolean;

  /** A standard seat immediately beside a wheelchair bay. */
  companionSeat: boolean;

  /**
   * Armrest lifts, so a patron can transfer out of their chair into the seat.
   * Distinct from a wheelchair space and frequently confused with it.
   */
  transferSeat: boolean;

  /** Floor room for an assistance dog to lie down without blocking the row. */
  assistanceDogSpace: boolean;

  /** Inside the induction-loop coverage pattern. */
  hearingLoop: boolean;

  /**
   * Line of sight to the caption unit. Booking a captioned performance and
   * then not being able to see the captions is a routine failure.
   */
  captionScreenVisible: boolean;

  /** Line of sight to the sign-language interpreter's downstage-left position. */
  signInterpreterVisible: boolean;

  /** Steps between the step-free entrance and this seat. Zero means step-free. */
  stepsToReach: number;

  /** Walking distance to the nearest accessible toilet, in metres. */
  distanceToAccessibleWcM: number;

  /** Distance to the stage edge, in metres. Matters for lip-reading. */
  distanceToStageM: number;

  strobeExposure: StrobeExposure;
}

/** Venue-level facilities, independent of any particular seat. */
export interface VenueAccessInfo {
  venue: string;
  stepFreeEntrances: string[];
  accessibleToilets: string[];
  hearingLoopCoverage: string;
  quietRoom: string | null;
  assistanceDogPolicy: string;
  companionTicketPolicy: string;
  captionUnitPosition: string;
  signInterpreterPosition: string;
  strobeWarning: string;
}

export interface SeatQuery {
  /** Total people in the party, including any wheelchair users. */
  party?: number;
  wheelchairSpaces?: number;
  companionSeat?: boolean;
  transferSeat?: boolean;
  assistanceDogSpace?: boolean;
  hearingLoop?: boolean;
  captionScreenVisible?: boolean;
  signInterpreterVisible?: boolean;
  stepFree?: boolean;
  maxDistanceToAccessibleWcM?: number;
  maxDistanceToStageM?: number;
  maxStrobeExposure?: StrobeExposure;
  maxPriceIsk?: number;
  section?: Section;
}

/** A set of seats that satisfies a query and is contiguous where it must be. */
export interface SeatGroup {
  seats: Seat[];
  totalPriceIsk: number;
  /** Why this group was returned, in language a person can act on. */
  rationale: string;
  /** Requirements that could not be met, stated plainly rather than hidden. */
  compromises: string[];
}
