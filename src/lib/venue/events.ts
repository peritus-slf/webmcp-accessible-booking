import type { StrobeExposure } from "./types";

/**
 * What's on at Aurora Hall.
 *
 * Access provision is a property of the *performance*, not the building. A
 * relaxed matinee and a late electronic set happen in the same room with wildly
 * different lighting rigs, and only some dates are captioned or signed. Seat
 * advice that ignores which night you are coming is advice that will eventually
 * be wrong, so every seat query is scoped to an event.
 */

export type LightingRig = "none" | "moderate" | "heavy";

export interface VenueEvent {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  /** ISO date. Fictional season. */
  date: string;
  doors: string;
  curtain: string;
  runtime: string;
  description: string;

  /** Drives strobe exposure per row. */
  lighting: LightingRig;
  /** Captions are only offered on some dates. */
  captioned: boolean;
  /** A sign-language interpreter is present on some dates. */
  signed: boolean;
  audioDescribed: boolean;
  /**
   * Relaxed performance: house lights up, reduced volume, free movement in and
   * out, no strobe. Designed with and for neurodivergent audiences.
   */
  relaxed: boolean;

  /** Multiplier applied to the base seat price. */
  priceMultiplier: number;
  /** Tailwind gradient classes for the poster block. */
  gradient: string;
  soldOut: boolean;
}

export const EVENTS: VenueEvent[] = [
  {
    slug: "kaldaljos",
    title: "Kaldaljós",
    subtitle: "Aurora Sinfónía with Elín Þorvaldsdóttir",
    category: "Orchestral",
    date: "2026-09-18",
    doors: "18:45",
    curtain: "19:30",
    runtime: "1 hr 50 min, including interval",
    description:
      "A programme built around cold light: three new works for strings and electronics, played without amplification. The second half is performed with the house in near darkness.",
    lighting: "moderate",
    captioned: true,
    signed: true,
    audioDescribed: false,
    relaxed: false,
    priceMultiplier: 1,
    gradient: "from-sky-900 via-slate-900 to-indigo-950",
    soldOut: false,
  },
  {
    slug: "hljodheimar",
    title: "Hljóðheimar",
    subtitle: "Late electronic set — standing and seated",
    category: "Electronic",
    date: "2026-09-20",
    doors: "22:00",
    curtain: "22:30",
    runtime: "2 hr, no interval",
    description:
      "A full rig, run hard. Continuous strobe and haze throughout. Not suitable for anyone with photosensitive epilepsy — the venue will not sell you a seat that pretends otherwise.",
    lighting: "heavy",
    captioned: false,
    signed: false,
    audioDescribed: false,
    relaxed: false,
    priceMultiplier: 0.85,
    gradient: "from-fuchsia-900 via-purple-950 to-slate-950",
    soldOut: false,
  },
  {
    slug: "vetrarnott",
    title: "Vetrarnótt",
    subtitle: "Relaxed performance",
    category: "Theatre",
    date: "2026-09-21",
    doors: "13:30",
    curtain: "14:00",
    runtime: "1 hr 15 min, no interval",
    description:
      "The same production, adapted. House lights stay half up, sound levels are reduced, there is no strobe or blackout, and you are welcome to leave and come back as often as you need. The quiet room is staffed throughout.",
    lighting: "none",
    captioned: true,
    signed: true,
    audioDescribed: true,
    relaxed: true,
    priceMultiplier: 0.7,
    gradient: "from-emerald-900 via-teal-950 to-slate-950",
    soldOut: false,
  },
  {
    slug: "jazz-i-nordri",
    title: "Jazz í Norðri",
    subtitle: "Kvartett Ásgeirs Jónssonar",
    category: "Jazz",
    date: "2026-09-25",
    doors: "19:30",
    curtain: "20:00",
    runtime: "2 hr, including interval",
    description:
      "Standards and originals from a quartet that has played this room every September for eleven years. Warm front-of-house lighting only.",
    lighting: "none",
    captioned: false,
    signed: false,
    audioDescribed: false,
    relaxed: false,
    priceMultiplier: 0.9,
    gradient: "from-amber-900 via-orange-950 to-slate-950",
    soldOut: false,
  },
  {
    slug: "barnastund",
    title: "Barnastund",
    subtitle: "Family concert, ages 3 and up",
    category: "Family",
    date: "2026-09-27",
    doors: "10:30",
    curtain: "11:00",
    runtime: "45 min, no interval",
    description:
      "Forty-five minutes, no interval, and nobody minds if your child talks through it. Signed throughout.",
    lighting: "none",
    captioned: false,
    signed: true,
    audioDescribed: false,
    relaxed: true,
    priceMultiplier: 0.5,
    gradient: "from-rose-900 via-pink-950 to-slate-950",
    soldOut: false,
  },
  {
    slug: "myrkur-og-ljos",
    title: "Myrkur og Ljós",
    subtitle: "Aurora Dance Company",
    category: "Dance",
    date: "2026-10-02",
    doors: "19:00",
    curtain: "19:30",
    runtime: "1 hr 30 min",
    description: "Sold out. Returns are released to the access list first.",
    lighting: "moderate",
    captioned: false,
    signed: false,
    audioDescribed: true,
    relaxed: false,
    priceMultiplier: 1.1,
    gradient: "from-slate-800 via-slate-900 to-black",
    soldOut: true,
  },
];

export function eventBySlug(slug: string): VenueEvent | undefined {
  return EVENTS.find((e) => e.slug === slug);
}

/**
 * Strobe exposure for a row at a given performance.
 *
 * `rowIndex` counts from the stage. A moderate rig throws hardest over the
 * front rows and washes out by mid-house; a heavy rig reaches everywhere; a
 * relaxed or acoustic performance has none at all.
 */
export function strobeForRow(event: VenueEvent, rowIndex: number): StrobeExposure {
  if (event.lighting === "none") return "none";
  if (event.lighting === "heavy") return rowIndex <= 11 ? "high" : "low";
  if (rowIndex <= 3) return "high";
  if (rowIndex <= 7) return "low";
  return "none";
}

/** Human-readable access summary for one performance. */
export function accessSummary(event: VenueEvent): string[] {
  const lines: string[] = [];
  lines.push(
    event.lighting === "none"
      ? "No strobe at this performance."
      : event.lighting === "heavy"
        ? "Continuous strobe throughout the house. Not suitable if you are photosensitive."
        : "Strobe is used. Exposure is high in rows A to D, low in rows E to H, and negligible from row J back.",
  );
  lines.push(event.captioned ? "Captioned performance." : "Not captioned.");
  lines.push(event.signed ? "Sign-language interpreted." : "No interpreter at this performance.");
  if (event.audioDescribed) lines.push("Audio described, with a touch tour one hour before curtain.");
  if (event.relaxed) {
    lines.push(
      "Relaxed performance: house lights half up, reduced sound levels, free movement in and out, quiet room staffed throughout.",
    );
  }
  return lines;
}
