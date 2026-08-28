import type { VenueEvent } from "@/lib/venue/events";

/**
 * Poster art, drawn rather than photographed.
 *
 * Three reasons this is SVG and not a photograph: a fictional venue has no
 * business using pictures of real performers, inline vector costs no network
 * request and cannot fail to load, and it is deterministic — the same markup on
 * the server and the client, which this codebase has already been bitten by
 * once.
 *
 * ACCESSIBILITY
 *
 * Every poster is `aria-hidden`. The artwork carries nothing the adjacent
 * heading does not already say, so announcing it would be pure noise — a
 * screen-reader user does not need "abstract blue shapes" read to them before
 * the event title. Decorative means decorative (WCAG 1.1.1: decorative images
 * are marked so they are ignored, not given invented alt text).
 *
 * NOTHING HERE ANIMATES. Not a pulse, not a shimmer, not a slow gradient
 * drift. This site's central demo is a patron with photosensitive epilepsy;
 * decorative motion on the page she is booking from would be indefensible, and
 * `prefers-reduced-motion` is a fallback, not a licence to animate by default.
 */

interface Props {
  event: VenueEvent;
  variant?: "card" | "hero";
}

/** Deterministic pseudo-random in [0,1) from a string seed and index. */
function seeded(seed: string, i: number): number {
  let h = 2166136261;
  const s = `${seed}:${i}`;
  for (let k = 0; k < s.length; k += 1) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Per-event palette: [background start, background end, ink, accent]. */
const PALETTES: Record<string, [string, string, string, string]> = {
  kaldaljos: ["#0c4a6e", "#1e1b4b", "#7dd3fc", "#a5b4fc"],
  hljodheimar: ["#701a75", "#2e1065", "#f0abfc", "#c4b5fd"],
  vetrarnott: ["#064e3b", "#042f2e", "#6ee7b7", "#99f6e4"],
  "jazz-i-nordri": ["#78350f", "#431407", "#fcd34d", "#fdba74"],
  barnastund: ["#881337", "#4c0519", "#fda4af", "#fbcfe8"],
  "myrkur-og-ljos": ["#1e293b", "#020617", "#94a3b8", "#e2e8f0"],
};

const FALLBACK: [string, string, string, string] = ["#334155", "#0f172a", "#94a3b8", "#cbd5e1"];

function Motif({ slug, w, h }: { slug: string; w: number; h: number }) {
  const [, , ink, accent] = PALETTES[slug] ?? FALLBACK;

  switch (slug) {
    // Cold light: aurora curtains, vertical, unhurried.
    case "kaldaljos":
      return (
        <g opacity="0.85">
          {Array.from({ length: 7 }, (_, i) => {
            const x = (w / 8) * (i + 1) + (seeded(slug, i) - 0.5) * 24;
            const top = h * (0.08 + seeded(slug, i + 20) * 0.12);
            const bottom = h * (0.78 + seeded(slug, i + 40) * 0.18);
            const bow = (seeded(slug, i + 60) - 0.5) * 40;
            return (
              <path
                key={i}
                d={`M ${x} ${top} C ${x + bow} ${h * 0.4}, ${x - bow} ${h * 0.6}, ${x} ${bottom}`}
                stroke={i % 2 === 0 ? ink : accent}
                strokeWidth={2 + seeded(slug, i + 80) * 5}
                strokeLinecap="round"
                fill="none"
                opacity={0.35 + seeded(slug, i + 100) * 0.45}
              />
            );
          })}
        </g>
      );

    // Electronic: concentric pressure fronts radiating from a low centre.
    case "hljodheimar":
      return (
        <g opacity="0.8">
          {Array.from({ length: 9 }, (_, i) => (
            <circle
              key={i}
              cx={w * 0.5}
              cy={h * 0.95}
              r={h * 0.18 * (i + 1)}
              stroke={i % 3 === 0 ? accent : ink}
              strokeWidth={i % 3 === 0 ? 2.5 : 1.2}
              fill="none"
              opacity={0.7 - i * 0.06}
            />
          ))}
        </g>
      );

    // Relaxed winter night: a calm horizon and slow snow. Deliberately still.
    case "vetrarnott":
      return (
        <g>
          <path
            d={`M 0 ${h * 0.72} Q ${w * 0.3} ${h * 0.62} ${w * 0.55} ${h * 0.7} T ${w} ${h * 0.66} L ${w} ${h} L 0 ${h} Z`}
            fill={ink}
            opacity="0.28"
          />
          {Array.from({ length: 26 }, (_, i) => (
            <circle
              key={i}
              cx={seeded(slug, i) * w}
              cy={seeded(slug, i + 200) * h * 0.72}
              r={1 + seeded(slug, i + 400) * 2.2}
              fill={accent}
              opacity={0.35 + seeded(slug, i + 600) * 0.5}
            />
          ))}
        </g>
      );

    // Jazz: overlapping bells, warm and loose.
    case "jazz-i-nordri":
      return (
        <g opacity="0.75">
          {Array.from({ length: 5 }, (_, i) => (
            <circle
              key={i}
              cx={w * (0.18 + i * 0.17)}
              cy={h * (0.4 + seeded(slug, i) * 0.3)}
              r={h * (0.16 + seeded(slug, i + 30) * 0.16)}
              stroke={i % 2 === 0 ? accent : ink}
              strokeWidth="2"
              fill={i === 2 ? ink : "none"}
              fillOpacity="0.18"
            />
          ))}
        </g>
      );

    // Family: simple, friendly, legible at any size.
    case "barnastund":
      return (
        <g opacity="0.85">
          {Array.from({ length: 6 }, (_, i) => {
            const cx = w * (0.14 + i * 0.145);
            const cy = h * (0.38 + Math.sin(i * 1.1) * 0.16);
            const r = h * 0.11;
            return i % 2 === 0 ? (
              <circle key={i} cx={cx} cy={cy} r={r} fill={i % 4 === 0 ? accent : ink} opacity="0.65" />
            ) : (
              <rect
                key={i}
                x={cx - r}
                y={cy - r}
                width={r * 2}
                height={r * 2}
                rx={r * 0.35}
                fill={ink}
                opacity="0.5"
              />
            );
          })}
        </g>
      );

    // Dance: one shaft of light across a dark stage.
    case "myrkur-og-ljos":
      return (
        <g>
          <path d={`M ${w * 0.42} 0 L ${w * 0.66} 0 L ${w * 0.92} ${h} L ${w * 0.2} ${h} Z`} fill={accent} opacity="0.14" />
          <path d={`M ${w * 0.5} 0 L ${w * 0.58} 0 L ${w * 0.74} ${h} L ${w * 0.4} ${h} Z`} fill={accent} opacity="0.2" />
          {Array.from({ length: 3 }, (_, i) => (
            <ellipse
              key={i}
              cx={w * (0.3 + i * 0.2)}
              cy={h * 0.82}
              rx={h * 0.12}
              ry={h * 0.035}
              fill={ink}
              opacity="0.35"
            />
          ))}
        </g>
      );

    default:
      return null;
  }
}

export function EventPoster({ event, variant = "card" }: Props) {
  const w = 600;
  const h = variant === "hero" ? 260 : 200;
  const [from, to] = PALETTES[event.slug] ?? FALLBACK;
  const gradientId = `poster-bg-${event.slug}-${variant}`;
  const vignetteId = `poster-vignette-${event.slug}-${variant}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={variant === "hero" ? "h-56 w-full sm:h-72" : "h-32 w-full"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <radialGradient id={vignetteId} cx="0.5" cy="0.35" r="0.85">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
      </defs>

      <rect width={w} height={h} fill={`url(#${gradientId})`} />
      <Motif slug={event.slug} w={w} h={h} />
      <rect width={w} height={h} fill={`url(#${vignetteId})`} />

      {event.soldOut && (
        <>
          <rect y={h - 46} width={w} height={46} fill="#020617" opacity="0.72" />
          {/* The band is decoration; "Sold out" is stated in real text on the
              card, so this never becomes the only carrier of that fact. */}
          <text
            x={w / 2}
            y={h - 17}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="17"
            fontWeight="600"
            letterSpacing="3"
          >
            SOLD OUT
          </text>
        </>
      )}
    </svg>
  );
}
