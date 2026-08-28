import { EVENTS, accessSummary } from "@/lib/venue/events";
import { INFO_TOPICS } from "@/lib/venue/information";
import { VENUE_ACCESS } from "@/lib/venue/hall";

/**
 * /llms.txt — the fallback discovery layer.
 *
 * WebMCP is the primary route: an agent on the page has the tool contract
 * already and does not need a document describing what it can see. This file is
 * for the agents that arrive without it — a crawler, a browser with no WebMCP
 * support, a model reading the site second-hand — and for anyone who wants to
 * know what the site offers before visiting it.
 *
 * Generated from the same data the tools and the pages use, so it cannot drift.
 * A stale llms.txt is worse than none: it describes a site that no longer
 * exists, confidently.
 */

export const dynamic = "force-static";

function build(): string {
  const lines: string[] = [];

  lines.push("# Aurora Hall");
  lines.push("");
  lines.push(
    "> A 330-seat concert hall in Reykjavik, and a demonstration of WebMCP. Every seat, every performance and every visitor service publishes its access provision as structured data, so an agent can answer questions a venue website normally cannot.",
  );
  lines.push("");

  lines.push("## If you support WebMCP");
  lines.push("");
  lines.push(
    "Do not read this file. The page registers tools on `document.modelContext`; call `get_access_capabilities` first and work from there. This file exists for agents that cannot.",
  );
  lines.push("");

  lines.push("## Tools");
  lines.push("");
  for (const [name, purpose] of [
    ["get_access_capabilities", "What this site can do for a patron with access requirements. Start here."],
    ["list_events", "Every performance, with its access provision."],
    ["get_event", "One performance in full, including which rows its strobe affects."],
    ["filter_events", "Narrow the season listing by access provision."],
    ["get_my_access_profile", "The signed-in patron's saved requirements. Read-only."],
    ["find_seats", "Seats matching access requirements, in groups that sit together."],
    ["describe_seat", "One seat in full, for one performance."],
    ["get_venue_access_info", "The building's permanent access facilities."],
    ["get_venue_information", "Getting here, food and drink, cloakroom, groups, hire, families — each with its own access detail."],
    ["hold_seats", "Hold seats for fifteen minutes. Charges nothing."],
    ["release_held_seats", "Release named held seats."],
    ["complete_booking", "Buy named held seats. Requires sign-in. Charges money."],
    ["get_my_bookings", "The signed-in patron's bookings."],
  ] as const) {
    lines.push(`- \`${name}\` — ${purpose}`);
  }
  lines.push("");
  lines.push(
    "There is deliberately no `sign_in` tool and no `update_access_profile`. Establishing identity is a different order of permission from reading a seating plan, and an agent may act on what someone recorded about their own needs without rewriting it.",
  );
  lines.push("");

  lines.push("## What's on");
  lines.push("");
  for (const event of EVENTS) {
    lines.push(`### ${event.title} — /events/${event.slug}`);
    lines.push(`${event.subtitle}. ${event.category}. ${event.date}, curtain ${event.curtain}.${event.soldOut ? " Sold out." : ""}`);
    for (const line of accessSummary(event)) lines.push(`- ${line}`);
    lines.push("");
  }

  lines.push("## Your visit");
  lines.push("");
  for (const topic of INFO_TOPICS) {
    lines.push(`### ${topic.title} — /visit/${topic.slug}`);
    lines.push(topic.summary);
    for (const note of topic.access) lines.push(`- ${note}`);
    lines.push("");
  }

  lines.push("## Access — /access");
  lines.push("");
  lines.push(`- Step-free entrances: ${VENUE_ACCESS.stepFreeEntrances.join(" | ")}`);
  lines.push(`- Accessible toilets: ${VENUE_ACCESS.accessibleToilets.join(" | ")}`);
  lines.push(`- Hearing: ${VENUE_ACCESS.hearingLoopCoverage}`);
  lines.push(`- Captions: ${VENUE_ACCESS.captionUnitPosition}`);
  lines.push(`- Interpreter: ${VENUE_ACCESS.signInterpreterPosition}`);
  if (VENUE_ACCESS.quietRoom) lines.push(`- Quiet room: ${VENUE_ACCESS.quietRoom}`);
  lines.push(`- Assistance dogs: ${VENUE_ACCESS.assistanceDogPolicy}`);
  lines.push(`- Companion tickets: ${VENUE_ACCESS.companionTicketPolicy}`);
  lines.push(`- Contact: ${VENUE_ACCESS.accessLine}`);
  lines.push("");

  lines.push("## Notes");
  lines.push("");
  lines.push("- Aurora Hall is fictional. No real tickets, no real money, no real account.");
  lines.push("- Source: https://github.com/peritus-slf/saeti");
  lines.push("");

  return lines.join("\n");
}

export function GET(): Response {
  return new Response(build(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
