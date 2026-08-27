# Sæti — Aurora Hall

**One tool contract. Two consumers. Neither gets the reduced version.**

A WebMCP demo about booking accessible seating — the booking flow that is, with
grim regularity, the least accessible thing a venue operates.

---

## The problem this is actually about

The WebMCP explainer says the API is **"not designed for ingestion by
accessibility technology."**

Read that alongside what WebMCP does, and the shape of the risk is obvious. A
site exposes rich, structured, *actionable* capability — `find_seats`,
`hold_seats`, `complete_booking` — and an agent gets all of it. A screen-reader
user gets whatever the interface happened to render. Two tiers: capability for
agents, leftovers for disabled users.

That would be a bleak outcome for a technology whose own explainer lists
improving accessibility as a goal.

This demo argues the split is not inherent. It is an implementation choice, and
here is the other choice.

## What we built

Aurora Hall is a 330-seat venue with a booking flow. Six tools are defined
**once**, in [`src/lib/tools/registry.ts`](src/lib/tools/registry.ts):

| Tool | |
|---|---|
| `find_seats` | Search on real access constraints, returning whole groups that sit together |
| `describe_seat` | Everything about one seat, in prose |
| `get_venue_access_info` | Entrances, toilets, loop coverage, quiet room, dog policy, strobe warning |
| `hold_seats` | Hold for 15 minutes |
| `release_held_seats` | Give them back |
| `complete_booking` | The consequential one; applies the free companion ticket |

Those definitions are consumed twice:

1. **An AI agent**, through `document.modelContext.registerTool()`.
2. **The in-page command interface** — keyboard and screen-reader native, opened
   from a button in the tab order or with `⌘K`.

When WebMCP is available the command interface deliberately routes through
`getTools()` and `executeTool()` — *the same calls the agent makes* — rather
than shortcutting to the handlers. Parity is a property of the architecture, not
a claim in a README. When WebMCP is absent it falls back to the shared registry
directly: the capability never disappears, only the route changes.

Form fields are generated from each tool's `inputSchema` — the same JSON Schema
the agent reads to decide how to call the tool. Inputs described once, rendered
twice.

Handlers return **prose, not data structures**. An agent reasons over it
perfectly well, and it is the same sentence a screen reader announces.

## Why this task, and not a to-do list

A screen reader handles a well-built form fine. It cannot rescue a *seat map*.

330 seats, each with a complete, correct `aria-label`. Traversing them linearly
is technically possible and practically useless. Now add the constraints a real
patron combines:

> Two of us. One wheelchair space with a companion seat beside it. Induction
> loop. A clear view of the caption unit. Step-free. No strobe — I have
> photosensitive epilepsy.

In Aurora Hall **exactly one** pair satisfies all of that: `N-2` and `N-3`. One
correct answer in 330.

That is not a discoverability problem you can label your way out of. It is a
*query*. The seating plan here is built properly — ARIA grid pattern, semantic
rows and cells, roving tabindex, arrow-key navigation, full labels — precisely
so the point survives scrutiny: **correct accessibility is necessary and it is
not sufficient.**

## What this demo is not

It is **not** an argument that WebMCP replaces accessibility work. The site is
built accessibly first: semantic structure, full keyboard operation, labelled
controls, a skip link ahead of the 330-cell grid, `prefers-reduced-motion`
honoured. WebMCP sits on top of that and makes possible a task that was
accessible in principle and unusable in practice.

If your baseline is inaccessible, adding a tool contract does not fix it. It
just means the agent can use your site while your users still cannot.

## Access details modelled

Not decorative. Each is a reason a seat that looks fine on a plan turns out to
be unusable on the night:

- Wheelchair bays, and the **companion seat beside them** — booked as a unit,
  because splitting them is how an "accessible" booking becomes useless
- **Transfer seats** with lifting armrests (routinely confused with a bay)
- Induction-loop coverage
- **Caption unit sightlines** — booking a captioned performance and then being
  unable to see the captions is a normal failure
- Sign-interpreter sightlines
- Step-free routes, counted in actual steps from the step-free entrance
- Distance to an accessible toilet
- Strobe exposure, for photosensitive epilepsy
- Floor room for an assistance dog

Two behaviours worth calling out:

**Access provision is never sold to people who don't need it.** A party that
hasn't asked for a wheelchair bay is never offered one. Selling bays to patrons
who don't need them is the reason they're unavailable to patrons who do.

**Compromises are stated, never silent.** If no seat meets every requirement,
constraints are relaxed in a fixed order and the result says exactly what was
given up. Step-free access and strobe limits are relaxed last. A caller is never
handed a seat that quietly fails a stated access need.

## Running it

```bash
npm install
npm run dev
```

WebMCP needs Chrome with the origin trial enabled, or the ChatGPT desktop
browser (GPT-5.6 Sol or Terra — Luna has site tools disabled). Without it
everything still works, and the page tells you which route answered.

## Stack

Next.js 16, TypeScript, Tailwind. No backend — the hall is generated
deterministically, so results are reproducible and the seed data is auditable.

## Licence

MIT. See [LICENSE](LICENSE).

Aurora Hall is fictional. Any resemblance to a real venue's access provision,
good or bad, is coincidental.
