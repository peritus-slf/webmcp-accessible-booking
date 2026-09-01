# VoiceOver test plan

The manual pass. `npm run a11y` covers the mechanical third of accessibility;
this covers the part that decides whether the site is actually usable.

Run `npm run a11y` first and check its **exit code**, not just its output —
piping it into `tail` masks the failure, which has already let one contrast
regression through.

Budget **30–40 minutes** for a full run. Record results in the Result column —
including the ones that pass, because "we tested and it was fine" is a claim we
need to be able to make honestly.

**Tester:** ______________  **Date:** ____________  **Build:** `git rev-parse --short HEAD` = __________

---

## 0. Setup

| | |
|---|---|
| Turn VoiceOver on/off | `Cmd + F5` |
| The **VO** key | `Control + Option` (hold both) |
| Silence it mid-sentence | `Control` |
| Slow it down | VO + `Command` + `←` |

Use **Safari** for the first pass — it has the best-supported VoiceOver
integration, so a failure there is a real failure rather than a browser gap.
Then repeat the critical rows in Chrome, because that is what a judge will use.

### The commands you actually need

| Command | What it does |
|---|---|
| `VO + →` / `VO + ←` | Next / previous item |
| `VO + Space` | Activate the item |
| `VO + A` | Read everything from here down |
| `VO + U` | **Rotor** — then `←`/`→` to switch category, `↑`/`↓` to browse, Return to jump |
| `VO + Cmd + H` | Jump to next heading |
| `VO + Shift + ↓` | **Interact with** a group or grid (needed for the seating plan) |
| `VO + Shift + ↑` | Stop interacting |
| `Tab` | Next focusable control (no VO key) |

**Quick Nav:** press `←` and `→` together to toggle. With it on, single letters
navigate — `H` headings, `L` links, `B` buttons, `C` form controls. Turn it off
before typing into a field.

### Before you start

- Close other tabs. VoiceOver announces window changes and it gets confusing.
- Have the dev server running: `npm run dev`.
- Start **signed out**, at `http://localhost:3000`.

---

## 1. Landing and orientation

| # | Do this | Expect | Result |
|---|---|---|---|
| 1.1 | Load `/`. Press `Tab` **once**. | The **first** thing announced is "Skip to main content, link". Not the logo, not a nav item. | |
| 1.2 | Press `Tab` twice more. | "Skip to navigation" then "Skip to access help". | |
| 1.3 | Activate "Skip to main content". | Focus lands on the main region; next `VO + →` reads the `h1`, not a nav link. | |
| 1.4 | `VO + U` → arrow to **Landmarks**. | banner, navigation, main, contentinfo all present. Navigation is named "Primary". | |
| 1.5 | `VO + U` → **Headings**. | `h1` "What's on at Aurora Hall", then `h3` per event. No level skipped in a way that misleads. | |
| 1.6 | `VO + U` → **Links**. | Every link makes sense read alone. No bare "Tickets and access" ×6 — each should carry the event name. | |

> **1.6 is the one most likely to fail.** The visible button says "Tickets and
> access" six times; there is a visually-hidden suffix naming the event and
> date. If the rotor shows six identical links, that suffix is not working.

---

## 2. Icelandic pronunciation (WCAG 3.1.2)

| # | Do this | Expect | Result |
|---|---|---|---|
| 2.1 | Navigate to the first event card. | "Kaldaljós" is pronounced with Icelandic phonemes — the `ó` and `j` sound Icelandic, not read as English "Kaldaljos". | |
| 2.2 | Same for "Hljóðheimar" and "Vetrarnótt". | The `ð` is voiced, not skipped or spelled out. | |
| 2.3 | Read the surrounding English. | Voice switches **back** to English for "Aurora Sinfónía with…" and does not stay in Icelandic. | |

> Requires an Icelandic voice to be installed. If VoiceOver has none, it falls
> back — note that as *untested* rather than *failed*, and check the `lang="is"`
> attribute is present in the DOM instead. Honest either way.

---

## 3. The seating plan — expect this to be tedious

This is the section the whole entry is about. **Time it.**

| # | Do this | Expect | Result |
|---|---|---|---|
| 3.1 | Go to `/events/vetrarnott`. `VO + U` → Headings, jump to "Choose seats". | Lands correctly. | |
| 3.2 | Navigate to the seating plan. `VO + Shift + ↓` to interact. | VoiceOver announces a grid with 17 rows. | |
| 3.3 | `VO + →` across row A. | Each seat announces id, section, price, access details, availability — e.g. "Seat A-1, stalls, 8.000 kr, step-free, induction loop, captions in view, 47 m to accessible toilet, available". | |
| 3.4 | Arrow **down** a few rows. | Row changes are followed; the row header letter is announced. | |
| 3.5 | Find a wheelchair bay (row L or N). | "wheelchair bay" is announced as part of the label, not conveyed only by the violet colour. | |
| 3.6 | Select a seat with `VO + Space`. | Announced as selected **without focus moving**, and "1 seat selected". | |
| 3.7 | **Now do the real task:** find a seat with induction loop + captions in view + step-free + no strobe, using only the plan. **Start a timer.** | It is findable. Record how long. | **____ min ____ s** |

> **3.7 is the measurement.** The expected finding is that this is correct,
> complete, and miserable. That is the point being made — do not "fix" it, and
> do not skip it because it is boring. Note the time.

---

## 4. The seat list — the same question, asked better

| # | Do this | Expect | Result |
|---|---|---|---|
| 4.1 | Activate "Seat list". | The change is announced; focus is not thrown to the top of the page. | |
| 4.2 | `VO + U` → Form controls. | Seven filter checkboxes, each with a name that stands alone. | |
| 4.3 | Tick "Induction loop". | The count updates and is **announced** — "N of 330 seats match" — without focus moving. | |
| 4.4 | Tick "Caption unit in view", "Step-free route", "No strobe exposure". | Count updates each time. | |
| 4.5 | Navigate the results. | Sections (stalls / circle / balcony), then rows as disclosure triangles, then seats. Each seat reads id, details, price, and "Select". | |
| 4.6 | **Same task as 3.7, using the list. Time it.** | | **____ min ____ s** |
| 4.7 | Tick every filter until nothing matches. | The "no seats match" message is announced, and it says what to do next. | |

---

## 5. Sign in (WCAG 2.2 — 3.3.8)

| # | Do this | Expect | Result |
|---|---|---|---|
| 5.1 | Go to `/signin`. | The demo banner is read before the form. | |
| 5.2 | `Tab` through the form. | Both fields have labels and their hint text is announced (`aria-describedby`). | |
| 5.3 | Try pasting into the password field. | Paste works. **Blocking paste is a 3.3.8 failure.** | |
| 5.4 | Check for any puzzle, CAPTCHA, or memory test. | There is none. | |
| 5.5 | Clear the email field and submit. | The error is announced immediately via `role="alert"`, and says what to do. | |
| 5.6 | Sign in successfully. | Navigation to `/account` is announced; focus is sensible on the new page. | |
| 5.7 | Complete 5.1–5.6 **without touching the mouse**. | Possible throughout. | |

---

## 6. The access profile (WCAG 2.2 — 3.3.7 Redundant Entry)

| # | Do this | Expect | Result |
|---|---|---|---|
| 6.1 | On `/account`, `VO + U` → Form controls. | Nine controls, each with a name and a hint. | |
| 6.2 | Toggle "Induction-loop coverage". | "…updated and saved" is announced. No hunting for a submit button. | |
| 6.3 | Navigate to "Your note to staff". | The free-text note is read out in full. | |
| 6.4 | Navigate away and back. | Changes persisted. Nothing was silently lost. | |

---

## 7. The command interface — the parity claim

| # | Do this | Expect | Result |
|---|---|---|---|
| 7.1 | Press `⌘K` on any page. | The dialog opens and VoiceOver moves into it. | |
| 7.2 | `Tab` repeatedly. | Focus stays **trapped** inside the dialog and cycles. It never escapes to the page behind. | |
| 7.3 | `Escape`. | Dialog closes and focus returns to the trigger button. | |
| 7.4 | Reopen. Choose "find seats". Fill the fields. | Fields are generated from the tool schema; each has a label and a hint. | |
| 7.5 | Activate "Run". | The result is **read out automatically** via the live region, without focus moving. | |
| 7.6 | **Same task as 3.7, using the command interface. Time it.** | | **____ min ____ s** |

---

## 8. Full journey, VoiceOver only

The end-to-end test. Mouse untouched from start to finish.

| # | Step | Result |
|---|---|---|
| 8.1 | From `/`, find a performance suitable for someone photosensitive who lip-reads | |
| 8.2 | Open it and read its access provision | |
| 8.3 | Sign in | |
| 8.4 | Find seats meeting all your access needs | |
| 8.5 | Select a wheelchair bay and its companion seat | |
| 8.6 | Confirm the total, and that the companion ticket shows as free | |
| 8.7 | Complete the booking | |
| 8.8 | Hear the confirmation and the booking reference | |

**Completed without a mouse: ☐ yes ☐ no** — if no, note exactly where it broke.

---

## 9. Beyond VoiceOver

| Check | How | Result |
|---|---|---|
| 200% zoom | `Cmd + +` five times. Nothing clipped, no horizontal scroll on the page body. | |
| 400% / narrow reflow | Window to 320px wide. Content reflows, nothing lost (1.4.10). | |
| Keyboard only, no VO | `Tab` the whole journey. Focus is always **visible** and never trapped. | |
| Focus not obscured (2.4.11) | Tab down a long page. Focused element never hides behind a header. | |
| Reduced motion | System Settings → Accessibility → Display → Reduce motion. Transitions stop. | |
| Increased contrast | System Settings → Accessibility → Display → Increase contrast. Borders thicken; nothing becomes unreadable. | |
| Forced colours | Windows High Contrast Mode, or Chrome DevTools → Rendering → "Emulate CSS forced-colors: active". **Seat states must stay distinguishable** — the glyph and the border carry it once our palette is discarded. | |
| Dark mode | Toggle appearance. Contrast holds in both. | |
| Windows / NVDA | If available. NVDA has the largest share globally and behaves differently around grids — `Insert + Space` toggles focus mode. | |

---

## 10. Recording the result

**The three timings from 3.7, 4.6 and 7.6 are the most valuable output of this
document.** If they land roughly where expected — minutes, then under a minute,
then seconds — that is a measured claim rather than an argument, and it belongs
in the video and the README.

| Route | Time |
|---|---|
| Seating plan, VoiceOver | |
| Seat list with filters | |
| Command interface | |

For each failure found, record: what you did, what was announced, what should
have been announced. A failure here is worth more than a pass — it is the thing
a judge would have found instead.

Record the result in the header block above and commit it. A test plan with an
empty signature line is not evidence of anything; a filled-in one, including the
failures, is the only honest basis for claiming this site works with a screen
reader.
