"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CommandInterface } from "@/components/CommandInterface";
import { useStore } from "@/lib/useStore";
import { restoreSession, signOut } from "@/lib/store";
import { registerAllTools } from "@/lib/tools/webmcp";
import { SiteFooter } from "./SiteFooter";

/**
 * Site chrome: skip links, banner, primary navigation, footer.
 *
 * Several WCAG 2.2 criteria are satisfied structurally here rather than
 * page by page:
 *
 *  - 2.4.1 Bypass Blocks — skip links, first in the tab order.
 *  - 3.2.3 Consistent Navigation — the same nav, same order, every page.
 *  - 3.2.6 Consistent Help (2.2, A) — the Accessibility link sits in the same
 *    place in the footer of every page. The criterion asks for consistency,
 *    not prominence.
 *  - 2.4.11 Focus Not Obscured (2.2, AA) — the header does not stick, so a
 *    focused element can never be hidden behind it. A sticky header is the
 *    single most common way sites fail this.
 */

/**
 * Primary navigation, as a commercial venue would actually run it.
 *
 * "Access" is NOT here. It sits in the footer, which is where almost every
 * real ticketing site puts it — and that is deliberate. A site that foregrounds
 * its access page demonstrates good intentions; a site that buries it exactly
 * like everyone else, and still serves a disabled patron properly because the
 * tool contract underneath is real, demonstrates what WebMCP is for.
 *
 * The information is not hidden from anyone: it is one footer link away for a
 * person, and `get_access_capabilities` for an agent, which is how the agent
 * comes to offer it unprompted.
 */
const NAV = [
  { href: "/", label: "What's on" },
  { href: "/bookings", label: "My bookings" },
  { href: "/account", label: "My account" },
];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const pathname = usePathname();

  // Tools are registered once for the whole site, so an agent can act on any
  // page rather than only on the seat map.
  useEffect(() => {
    // Restore first: an agent that navigates here must not read a signed-out
    // access profile for a patron who is signed in.
    restoreSession();
    let dispose: (() => void) | undefined;
    registerAllTools().then((fn) => {
      dispose = fn;
    });
    return () => dispose?.();
  }, []);

  return (
    <>
      <nav aria-label="Skip links" className="sr-only focus-within:not-sr-only">
        <ul className="flex gap-2 bg-slate-900 p-2 text-white">
          <li>
            <a href="#main" className="inline-block rounded px-3 py-2 underline">
              Skip to main content
            </a>
          </li>
          <li>
            <a href="#site-nav" className="inline-block rounded px-3 py-2 underline">
              Skip to navigation
            </a>
          </li>
        </ul>
      </nav>

      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="rounded text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
          >
            Aurora Hall
            <span className="block text-xs font-normal text-slate-500">Reykjavík</span>
          </Link>

          <nav id="site-nav" aria-label="Primary" className="order-3 w-full sm:order-2 sm:w-auto">
            <ul className="flex flex-wrap gap-1">
              {NAV.map((item) => {
                const current = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={[
                        // 2.5.8 Target Size: comfortably above the 24px minimum.
                        "inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
                        current
                          ? "bg-slate-900 font-medium text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="order-2 flex items-center gap-3 sm:order-3">
            <CommandInterface />
            {user ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="hidden text-slate-600 sm:inline dark:text-slate-400">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/signin"
                  className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="hidden min-h-11 items-center rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:inline-flex dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <SiteFooter />
    </>
  );
}
