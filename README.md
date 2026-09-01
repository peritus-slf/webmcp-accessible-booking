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

In Aurora Hall **two** pairs satisfy all of that: `N-2 + N-3` and `N-4 + N-5`.
Two viable answers out of 330 seats — and the only reason you know that is that
something searched.

Drop the induction-loop requirement and it becomes four. Keep it and the two
bays at the back of the stalls fall away, because the loop does not reach row L.
That is the sort of interaction nobody reasons about one `aria-label` at a time.

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

## There is no accessible mode

Three things this site could plausibly have done, and deliberately did not.

**No "accessible version" of the seating plan.** There are two views — the
visual plan and a filterable list — and neither is the accessible one. Same 330
seats, same selection, same booking, same components, same store. The toggle is
named "Seat list", not "Accessible view", because the name is what decides which
pattern you have built. Separate accessible versions were abandoned for good
reasons: they segregate, they rot as the main site moves on, and they are
routinely *less* accessible than the thing they replace.

**No "photosensitive-safe mode".** There would be nothing to turn off. Nothing
flashes, blinks, repeats or parallaxes; the poster art is static by design. A
safe state that sits behind a toggle is unsafe for everyone who never finds the
toggle — and a photosensitive user discovers your risk by having a seizure, not
by reading your settings page. The strobe here is content being *described*,
never something the page does.

**No "shall I enable accessibility for you?" from the agent.** It is tempting
and it is wrong three times over. The harm lands before the offer — an animation
you can disable once it has played is not a mitigation. It makes accessibility
conditional on having an agent, which is the two-tier web this project exists to
argue against, rebuilt one layer up. And "enable accessibility features for this
user" puts a GDPR special category into a tool call; as built, the agent applies
constraints and the venue never learns why.

What the site does instead is honour preferences the platform already carries.
Motion lives inside `prefers-reduced-motion: no-preference`, so it is not a mode
you enable but motion you get *unless you have already said no* — declared once,
at OS level, respected on every site, no toggle and no conversation.
`forced-colors` and `prefers-contrast` are handled the same way: under Windows
High Contrast Mode the seating plan loses every colour we set, so each seat also
carries a glyph, a text label, and a border drawn in a system colour.

There is a useful role for the agent here, and it is not granting access. It is
surfacing what already exists — *"this performance is captioned and relaxed, and
I can filter seats by no-strobe"* — and, better still, pointing at the platform
rather than the page: *"you mentioned motion makes you unwell; your OS has a
setting every site respects."* That fixes the whole web for someone, not one
venue.

> We did not build an accessible mode. We built an accessible site, and then
> asked permission to animate it.

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
given up — a price ceiling, a distance, an interpreter sightline.

**A strobe limit and a step-free route are never relaxed.** They are not
preferences to trade against a better view. Giving them up does not produce a
worse seat, it produces a seat the caller cannot use, or must not be sold. When
those cannot be met the answer is no seat at all, and the reason why. A caller
is never handed a seat that fails a stated access need, quietly or otherwise.

## Consequential actions, and a bug the agent found

An early version of `complete_booking` took no seat argument. It booked
everything on hold.

Testing in ChatGPT's browser, the agent held two candidate pairs — sensible,
they were both viable — and was then asked to book one of them. It called the
only tool available, correctly, and bought all four seats. 32.000 kr instead of
20.500 kr.

**The agent did nothing wrong.** The contract was underspecified on an action
that charges money and cannot be undone, so the agent faithfully executed the
underspecification. That is the whole argument of this demo pointed back at
itself: if the site defines the surface badly, the agent inherits the badness.
Exposing capability to agents raises the cost of a vague tool, it does not lower
it.

So the consequential tools now:

- **Name their targets.** `complete_booking` requires the exact seats to buy.
  Seats left on hold are not booked and not charged.
- **Refuse rather than infer.** Naming a seat that is not on hold is an error,
  not a best guess. Money is not a place for inference.
- **Report what they did not do.** The result states which seats remain held and
  uncharged. Silence about the remainder is how someone ends up paying for seats
  nobody asked for.
- **Are marked `readOnlyHint: false`**, so a client can apply its own
  confirmation policy before invoking them.

`release_held_seats` takes seat identifiers for the same reason.

## Questions this site can answer that venue websites cannot

The access detail is attached to each thing rather than filed on an
accessibility page. "Food and drink" on a real venue site is a menu and a
photograph; whether the bar has a lowered counter, or whether staff will carry
an order to your seat, lives nowhere at all. Somebody who needs to know has to
phone and ask, during office hours, and explain why.

Because `get_venue_information` returns the access notes with the topic, an
agent can answer:

- *Can I get a drink in the interval without queuing at a high counter?* —
  lowered section at 760 mm on the western end, or ask at the box office and
  staff bring the order to your seat.
- *Where does my powerchair go if I transfer into a seat?* — beside the
  wheelchair bays, not four floors away in the cloakroom.
- *Can our group of twelve book two wheelchair spaces together?* — N-2 and N-4
  in the circle, or four across row L in the stalls. Free companion tickets
  apply per space, not once per booking.
- *Is the walk from the bus stop step-free?* — yes, but cross on the western
  side; there is no dropped kerb on the eastern one.
- *Will I have to check my medical equipment at the cloakroom?* — no, whatever
  its size.
- *Is there anything at this venue I actually cannot attend?* —
  Hljóðheimar. Continuous strobe throughout the house, so no seat is offered
  at all rather than a bad one being sold.

Every one of those has a real answer here and no answer on almost any venue
site anywhere. None of it required redesigning the site around disabled
patrons — it required attaching the facts to the thing they describe, and
exposing them as a tool.

`/llms.txt` carries the same material for agents that arrive without WebMCP. It
opens by telling any agent that does support it to ignore the file and read the
contract instead, and it is generated from the same data as the pages and the
tools, because a stale llms.txt describes a site that no longer exists,
confidently.

## What testing actually caught

Four defects, none of them found by reading the code.

**A hydration mismatch.** `toLocaleString("is-IS")` resolves against whichever
ICU data the runtime ships, so Node and the browser disagreed on the thousands
separator. On most sites that is a console warning. Here those numbers land in
`aria-label`s and an `aria-live` region, so a screen reader could have announced
a price the server never rendered.

**A wheelchair search that under-reported.** `findSeats` truncated results with
`slice(0, wanted)`, conflating how many bays a party needs with how many options
to offer. Someone wanting one bay was shown one option when two qualified. Found
by ChatGPT, whose answer was more correct than our own test's.

**A booking tool that bought the wrong seats.** `complete_booking` took no seat
argument and bought everything on hold. Testing in ChatGPT's browser, the agent
held two viable pairs, was asked to book one, called the only tool available —
correctly — and spent 32.000 kr instead of 20.500. The agent did nothing wrong;
the contract was vague about an action that charges money. Exposing capability
to agents raises the cost of a vague tool, it does not lower it.

**A contrast failure, on an accessibility submission.** While making the footer
look more commercial, a caption went to `text-slate-400` on white. Nine pages
failed AA. `npm run a11y` caught it — and then it was committed anyway, because
the check was being piped into `tail`, and a shell pipeline reports the exit
status of the *last* command. The gate had never actually been firing.

That last one is the most useful thing in this repository. A contrast regression
was introduced into an accessibility project, by the people arguing for
accessibility, while making the page look better — which is exactly the trade
real venues make without noticing. Care did not catch it. A tool did, and only
once the tool was wired up so it could fail properly.

If you take one thing from this repo, take that: run the check, and check that
the check can fail.

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
