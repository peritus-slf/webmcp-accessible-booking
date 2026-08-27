import type { VenueEvent } from "@/lib/venue/events";

/**
 * Access provision, shown as text.
 *
 * Deliberately not icon-only. Icon-only access badges are a standard failure:
 * the wheelchair pictogram is widely understood, the induction-loop symbol far
 * less so, and "relaxed performance" has no glyph at all. Every badge here
 * carries its own words, so nothing depends on recognising a symbol or on
 * colour alone (1.4.1 Use of Colour).
 */

interface Badge {
  label: string;
  tone: "good" | "warn" | "neutral";
  detail: string;
}

export function badgesFor(event: VenueEvent): Badge[] {
  const badges: Badge[] = [];

  if (event.relaxed) {
    badges.push({
      label: "Relaxed performance",
      tone: "good",
      detail: "House lights half up, reduced sound, free movement in and out",
    });
  }
  if (event.captioned) {
    badges.push({ label: "Captioned", tone: "good", detail: "Caption unit downstage right" });
  }
  if (event.signed) {
    badges.push({ label: "Signed", tone: "good", detail: "Interpreter downstage left" });
  }
  if (event.audioDescribed) {
    badges.push({ label: "Audio described", tone: "good", detail: "With a touch tour before curtain" });
  }

  badges.push(
    event.lighting === "none"
      ? { label: "No strobe", tone: "good", detail: "No strobe lighting at this performance" }
      : event.lighting === "heavy"
        ? {
            label: "Heavy strobe",
            tone: "warn",
            detail: "Continuous strobe throughout the house — not suitable if you are photosensitive",
          }
        : {
            label: "Some strobe",
            tone: "warn",
            detail: "High in rows A–D, low in E–H, negligible from row J back",
          },
  );

  return badges;
}

const TONE: Record<Badge["tone"], string> = {
  // Contrast checked against the surrounding surface; never colour alone.
  good: "border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-100",
  warn: "border-amber-700 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100",
  neutral: "border-slate-400 bg-slate-50 text-slate-800 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-200",
};

export function AccessBadges({ event, showDetail = false }: { event: VenueEvent; showDetail?: boolean }) {
  const badges = badgesFor(event);
  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <li
          key={b.label}
          className={`rounded-md border px-2 py-1 text-xs font-medium ${TONE[b.tone]}`}
        >
          {b.label}
          {showDetail && <span className="block font-normal opacity-90">{b.detail}</span>}
        </li>
      ))}
    </ul>
  );
}
