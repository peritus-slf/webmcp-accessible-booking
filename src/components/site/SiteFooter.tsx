import Link from "next/link";

/**
 * An ordinary venue footer.
 *
 * Four columns of links, a newsletter box, a legal strip. Accessibility is one
 * link under "Your visit", between getting here and the cloakroom — which is
 * where every real venue puts it, and which is exactly why so few people find
 * it.
 *
 * That placement is the demo, not a lapse. The access page itself is thorough,
 * and `get_access_capabilities` hands the same information to an agent in one
 * call. A patron who never scrolls to a footer link still gets told what this
 * venue can do for them, because the agent read the contract.
 *
 * WCAG 3.2.6 Consistent Help (A) is still satisfied: the help route sits in the
 * same place on every page. The criterion asks for consistency, not prominence.
 */

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "What's on",
    links: [
      { href: "/", label: "Autumn season" },
      { href: "/", label: "Orchestral" },
      { href: "/", label: "Jazz and late night" },
      { href: "/visit/families", label: "Family and schools" },
    ],
  },
  {
    heading: "Your visit",
    links: [
      { href: "/visit/getting-here", label: "Getting here" },
      { href: "/visit/food-and-drink", label: "Food and drink" },
      { href: "/access", label: "Accessibility" },
      { href: "/visit/cloakroom", label: "Cloakroom and bags" },
    ],
  },
  {
    heading: "Aurora Hall",
    links: [
      { href: "/", label: "About the hall" },
      { href: "/", label: "Support us" },
      { href: "/visit/hire-the-venue", label: "Hire the venue" },
      { href: "/", label: "Work with us" },
    ],
  },
  {
    heading: "Bookings",
    links: [
      { href: "/bookings", label: "My bookings" },
      { href: "/account", label: "My account" },
      { href: "/visit/groups", label: "Groups of 10+" },
      { href: "/", label: "Gift vouchers" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="text-lg font-semibold tracking-tight">Aurora Hall</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Sæbraut 14, 101 Reykjavík
            </p>
            <p className="mt-4 max-w-xs text-sm text-slate-600 dark:text-slate-400">
              Box office open 12:00–18:00, and until curtain on performance days.
            </p>

            <form className="mt-6 max-w-xs" aria-labelledby="newsletter-heading">
              <h2 id="newsletter-heading" className="text-sm font-semibold">
                Season announcements
              </h2>
              <label htmlFor="newsletter-email" className="mt-2 block text-sm text-slate-600 dark:text-slate-400">
                Email address
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.is"
                  className="min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
                <button
                  type="submit"
                  className="min-h-11 shrink-0 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
                >
                  Sign up
                </button>
              </div>
            </form>
          </div>

          <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="text-sm font-semibold">{column.heading}</h2>
                <ul className="mt-3 space-y-1">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center rounded text-sm text-slate-600 hover:text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-400 dark:hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">
          <p>© 2026 Aurora Hall</p>
          <Link href="/" className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
            Terms
          </Link>
          <Link href="/" className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
            Privacy
          </Link>
          <Link href="/access" className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
            Accessibility
          </Link>
          <p className="w-full text-slate-600 sm:w-auto dark:text-slate-400">
            A fictional venue built as a WebMCP demonstration.{" "}
            <a
              href="https://github.com/peritus-slf/saeti"
              className="rounded underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              Source
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
