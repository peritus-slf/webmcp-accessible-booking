#!/usr/bin/env node
/**
 * Automated accessibility audit.
 *
 *   npm run a11y                 # against http://localhost:3000
 *   BASE_URL=https://… npm run a11y
 *
 * Runs axe-core over every route, including the interactive states that a
 * single page load never reaches — the seat list view, the filtered list, and
 * the command dialog — because those are where the interesting failures live.
 *
 * A clean run here is the floor, not the ceiling. Automated tooling catches
 * roughly a third of real barriers; it cannot tell you whether the seating
 * plan is *usable* with a screen reader, only that it is labelled. The manual
 * VoiceOver pass in docs/VOICEOVER-TEST.md is the part that matters, and this
 * script exists so that regressions in the mechanical third get caught before
 * they waste anyone's manual testing time.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/**
 * Each case is a route plus an optional interaction that puts the page into
 * the state we actually want audited.
 */
const CASES = [
  { name: "home", path: "/" },
  { name: "access information", path: "/access" },
  { name: "sign in", path: "/signin" },
  { name: "account (signed out)", path: "/account" },
  { name: "bookings (signed out)", path: "/bookings" },
  { name: "event — seating plan", path: "/events/vetrarnott" },
  {
    name: "event — seat list",
    path: "/events/vetrarnott",
    async setup(page) {
      await clickByText(page, "button", "Seat list");
    },
  },
  {
    name: "event — seat list, filtered",
    path: "/events/vetrarnott",
    async setup(page) {
      await clickByText(page, "button", "Seat list");
      await page.$$eval("input[type=checkbox]", (boxes) => {
        boxes.slice(0, 2).forEach((b) => b.click());
      });
    },
  },
  {
    name: "event — seats selected",
    path: "/events/vetrarnott",
    async setup(page) {
      await page.click('[data-seat="N-2"]');
      await page.click('[data-seat="N-3"]');
    },
  },
  {
    name: "command interface (open)",
    path: "/",
    async setup(page) {
      await clickByText(page, "button", "Ask for seats");
      await page.waitForSelector("dialog[open]");
    },
  },
];

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, txt) => [...document.querySelectorAll(sel)].find((el) => el.textContent?.trim().startsWith(txt)),
    selector,
    text,
  );
  const element = handle.asElement();
  if (!element) throw new Error(`No ${selector} matching "${text}"`);
  await element.click();
}

async function audit(page, testCase) {
  await page.goto(`${BASE_URL}${testCase.path}`, { waitUntil: "networkidle0" });
  if (testCase.setup) {
    await testCase.setup(page);
    // Let React commit and any live region settle before auditing.
    await new Promise((r) => setTimeout(r, 400));
  }

  await page.evaluate(AXE_SOURCE);
  return page.evaluate(
    async (tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }),
    TAGS,
  );
}


/**
 * Launch a browser, preferring one already on the machine.
 *
 * Puppeteer will happily download its own Chromium, but a 150 MB fetch is a
 * poor thing to inflict on someone who cloned this repo to check whether the
 * accessibility claims hold. Try the known install locations, then the
 * `chrome` channel, and only then fall back to a bundled build — reporting
 * clearly if none of them work, rather than failing with a stack trace about
 * a version number nobody asked for.
 */
async function launchBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);

  for (const executablePath of candidates) {
    if (!existsSync(executablePath)) continue;
    try {
      return await puppeteer.launch({ headless: true, executablePath });
    } catch {
      // Try the next candidate.
    }
  }

  for (const options of [{ channel: "chrome" }, {}]) {
    try {
      return await puppeteer.launch({ headless: true, ...options });
    } catch {
      // Try the next strategy.
    }
  }

  throw new Error(
    "No Chrome found. Install Chrome, set CHROME_PATH to its binary, or run:\n" +
      "  npx puppeteer browsers install chrome",
  );
}

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

async function main() {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  // A viewport wide enough that the responsive nav is not collapsed, so the
  // audit covers the same DOM a desktop judge will see.
  await page.setViewport({ width: 1280, height: 900 });

  let total = 0;
  const failures = [];

  for (const testCase of CASES) {
    let results;
    try {
      results = await audit(page, testCase);
    } catch (error) {
      console.log(`✖ ${testCase.name} — could not audit: ${error.message}`);
      failures.push({ testCase, error });
      continue;
    }

    const violations = results.violations.sort(
      (a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9),
    );
    total += violations.length;

    if (violations.length === 0) {
      console.log(`✔ ${testCase.name} — 0 violations, ${results.passes.length} passes`);
      continue;
    }

    console.log(`\n✖ ${testCase.name} — ${violations.length} violation(s)`);
    for (const v of violations) {
      console.log(`   [${v.impact}] ${v.id}: ${v.help}`);
      console.log(`     ${v.helpUrl}`);
      for (const node of v.nodes.slice(0, 3)) {
        console.log(`     → ${node.target.join(" ")}`);
      }
      if (v.nodes.length > 3) console.log(`     → …and ${v.nodes.length - 3} more`);
    }
    failures.push({ testCase, violations });
  }

  await browser.close();

  console.log("");
  if (total === 0 && failures.length === 0) {
    console.log(`All ${CASES.length} states clean against ${TAGS.join(", ")}.`);
    console.log("Automated testing catches roughly a third of real barriers.");
    console.log("Run the manual pass in docs/VOICEOVER-TEST.md before believing this.");
    process.exit(0);
  }

  console.log(`${total} violation(s) across ${failures.length} state(s).`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
