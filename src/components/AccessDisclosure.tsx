"use client";

import { useStore } from "@/lib/useStore";

/**
 * Access detail, collapsed by default.
 *
 * A real venue page does not carry a large access panel, so neither does this
 * one. The detail sits behind an ordinary disclosure — the same control every
 * site uses for supplementary information — and opens when someone asks for it.
 *
 * Three routes to open it, which is what keeps this a disclosure rather than an
 * accessible version of the page:
 *
 *   1. Click the summary. No preference, no account, no agent.
 *   2. Turn on "always show access detail" in the account, once.
 *   3. Ask an agent, which calls `set_access_detail` after reading the profile.
 *
 * What this shows and hides is INFORMATION. Never capability, never safety.
 * Every seat is bookable and every page is operable with this closed, and
 * nothing that could hurt somebody is gated behind it — the strobe warning on a
 * performance is in the page body, not in here. A collapsed panel is a
 * reasonable place for detail. It would be an indefensible place for a hazard.
 */
export function AccessDisclosure({
  heading,
  intro,
  notes,
}: {
  heading: string;
  intro?: string;
  notes: string[];
}) {
  const { showAccessDetail } = useStore();

  return (
    <details
      open={showAccessDetail}
      className="mt-8 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
        {heading}
        <span className="text-slate-500">({notes.length})</span>
      </summary>

      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
        {intro && <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{intro}</p>}
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note} className="flex gap-3 text-sm">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-500" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
