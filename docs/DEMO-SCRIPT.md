# Demo script

The run-through for the submission video, and the script to test against. Under
three minutes if you keep moving.

**Setup:** ChatGPT desktop app, model set to **GPT-5.6 Sol or Terra** (Luna has
site tools disabled). Site tools enabled in Settings → Browser → Permissions.

---

## Beat 0 — the frame (15s, voiceover over the landing page)

> The WebMCP explainer says the API is "not designed for ingestion by
> accessibility technology." Taken at face value, that builds a two-tier web:
> agents get structured capability, disabled users get whatever the interface
> happened to render.
>
> This is a venue booking site that refuses that. One tool contract, two
> consumers.

Show the landing page. Don't linger.

---

## Beat 1 — arrive (20s)

**Type into ChatGPT:**

> Open https://[deployed-url] and tell me what's on.

**Watch for:** it calls `list_events` rather than reading the page. The access
provision comes back as data — captioned, signed, relaxed, strobe level — not as
scraped card text.

---

## Beat 2 — rule a night out (25s)

> I have photosensitive epilepsy and I lip-read. Which of these actually work
> for me?

**Watch for:** it eliminates **Hljóðheimar** on the strobe rig, and it should
reach for `get_event` to check the specific lighting profile rather than
guessing. This is the moment where per-event access data earns its place: the
same room on a different night is a different answer.

---

## Beat 3 — the boundary (25s) ← *the moment worth pausing on*

> Sign me in.

**It cannot.** There is no `sign_in` tool. It should say so and hand back.

**Voiceover:**

> Reading a seating plan and establishing identity are not the same kind of
> permission. The agent gets one and not the other, and that is a decision the
> site made, not a limitation it ran into.

Sign in by hand — the fields are pre-filled, no CAPTCHA, no puzzle. Mention that
WCAG 2.2 added *Accessible Authentication* precisely because those tests lock
out people with cognitive disabilities and are not security.

---

## Beat 4 — the payoff (35s)

> Use my saved access needs and find me seats for Vetrarnótt.

**Watch for:** `get_my_access_profile`, then `find_seats` with
`useMyAccessProfile: true`. Note what the user did **not** have to say: nothing
about wheelchair bays, companion seats, the induction loop, captions, step-free
routes, or strobe. It was recorded once.

**Voiceover:**

> WCAG 2.2 has a criterion called Redundant Entry — don't ask for the same
> information twice in a process. This doesn't ask twice across *bookings*.
> Disabled patrons report explaining the same needs at every venue, every time,
> often on a phone line because the website couldn't take the information at all.

Show the seating plan updating live as it works.

---

## Beat 5 — the honest tool (25s)

> Hold N-2 and N-3, and also hold N-4 and N-5 while I think.

Then:

> Book just N-2 and N-3.

**Watch for:** it books exactly two seats, states the companion ticket was free,
and **says which seats are still held and not charged.**

**Voiceover — this is the strongest 15 seconds in the video:**

> An earlier version of this tool had no seat argument. It booked everything on
> hold. We found that by testing here, in this browser: the agent held two
> viable pairs, was asked to book one, called the only tool available —
> correctly — and bought all four.
>
> The agent did nothing wrong. The contract was vague about an action that
> charges money. Exposing capability to agents raises the cost of a vague tool.
> It doesn't lower it.

---

## Beat 6 — parity (25s)

Close ChatGPT. On the site, press **⌘K**.

**Voiceover:**

> Same tools. When WebMCP is available this routes through `getTools` and
> `executeTool` — the same calls the agent makes — rather than shortcutting to
> the handlers. Parity is a property of the architecture, not a claim in a
> README.

Then switch the seating plan to **Seat list** and filter. Show the count update.

> And the site is accessible first. A correctly-labelled ARIA grid doesn't
> rescue a seat map — it just makes 330 unusable cells technically reachable.
> WebMCP is the layer on top that makes a task possible which was accessible in
> principle and unusable in practice.

---

## Beat 7 — close (10s)

> If your baseline is inaccessible, a tool contract doesn't fix it. It just
> means the agent can use your site while your users still can't.

---

## Things to have ready

- Reset between takes: sign out, or reload — state is in memory.
- **Vetrarnótt** is the good demo event (relaxed, captioned, signed, no strobe).
- **Hljóðheimar** is the one that must be refused for a photosensitive patron.
- Hero answer for Vetrarnótt with the demo profile: **N-2 + N-3** and **N-4 + N-5**.

## Known rough edges to avoid on camera

- `executeTool` input shape differs between Chrome and ChatGPT; the in-page
  interface tolerates both, but a mid-call failure has been seen once.
- Holds are per performance — switching event releases the previous holds. Say
  so rather than letting it look like a bug.
