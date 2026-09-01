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

> Open https://aurorahall.app and tell me what's on.

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

## Beat 3 — the boundary, and the assist (40s) ← *the moment worth pausing on*

> Create me an account.

**It cannot.** There is no tool that creates an account, for the same reason
there is no `sign_in`. It should say so and hand back.

Go to `/signup`. The form is **blank**. Then:

> You know who I am — fill this in.

**Watch for** `set_signup_details`. Name, email and password land in the fields
and a line appears saying an assistant filled them in.

**Voiceover — say this explicitly, it is the setup for everything after:**

> It already knows my name and my email. I have told it before, the way you tell
> an assistant anything. It did not have to ask, and I did not have to type.

Press Continue yourself. On step 2, *Access requirements*, stop. Then:

> You know what I need — fill this in too.

**Watch for** `set_signup_access_preferences`. Six boxes tick, the note lands in
the patron's own words, and a line appears saying an assistant filled it in and
to check it.

**Voiceover:**

> It could not create the account. It could fill in the form. Establishing
> identity stays with the person; helping them complete a blank form does not.
>
> And this is the step everyone abandons. Nine questions about your own body,
> at the end of a sign-up, when you only wanted a ticket. The agent already
> knew the answers.

Submit it yourself. Note the review step lists what will be saved before
anything is.

**Voiceover:**

> Reading a seating plan and establishing identity are not the same kind of
> permission. The agent gets one and not the other, and that is a decision the
> site made, not a limitation it ran into.

No CAPTCHA, no puzzle, paste works. WCAG 2.2 added *Accessible Authentication*
precisely because those tests lock out people with cognitive disabilities and
are not security.

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

## Beat 5b — the one we broke ourselves (20s) *optional, and the most honest 20s available*

Show `npm run a11y` running green. Then:

**Voiceover:**

> While making this footer look more like a real venue, we put grey text on
> white and failed contrast on nine pages. This check caught it — and then we
> committed it anyway, because the command was piped into `tail` and a shell
> pipeline reports the last command's exit status. The gate had never been
> firing.
>
> A contrast regression, introduced into an accessibility project, by the people
> arguing for accessibility, while making the page look better. That is the
> trade every venue makes without noticing. Care did not catch it. A tool did,
> once the tool could actually fail.

Use this if the run comes in under time. It costs twenty seconds and it is the
only moment in the video where the entry admits something, which is worth more
than another feature.

## Beat 5c — the question no venue site can answer (20s)

Ask ChatGPT, without navigating anywhere:

> Can I get a drink in the interval without queuing at a high counter?

**Watch for:** `get_venue_information` with `topic: "food-and-drink"`. It should
come back with the lowered counter at 760 mm *and* the fact that staff will
bring an order to your seat if you ask on arrival.

Then, on screen, show the page itself: the access detail is behind a collapsed
disclosure. Ask ChatGPT:

> Can you just show me the access detail everywhere on this site?

**Watch for** `set_access_detail` — the panels open across the whole site while
you watch.

**Voiceover:**

> That is on a page in the footer, four clicks from the front door, under
> "Food and drink" — where every venue puts it and nobody finds it. The access
> detail is attached to the thing it describes rather than filed on an
> accessibility page, so the agent can reach it.
>
> And note what just happened: the panels were collapsed, not missing. The
> agent opened them. You could have clicked one, or ticked the box on your
> account. Three routes to the same information, and the page still looks like
> a venue page to everybody else.
>
> Ask a real venue website this and it cannot answer. You phone, during office
> hours, and explain why you are asking.

Good follow-ups if there is time — each has a real answer here:

- *Where does my powerchair go if I transfer into a seat?*
- *Can our group of twelve book two wheelchair spaces together?*
- *Will I have to check my medical equipment at the cloakroom?*

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
