import { VENUE_ACCESS } from "@/lib/venue/hall";

export const metadata = { title: "Access at Aurora Hall" };

export default function AccessPage() {
  const v = VENUE_ACCESS;

  const sections: { heading: string; body: React.ReactNode }[] = [
    {
      heading: "Getting in",
      body: (
        <ul className="list-disc space-y-1 pl-5">
          {v.stepFreeEntrances.map((entrance) => (
            <li key={entrance}>{entrance}</li>
          ))}
        </ul>
      ),
    },
    {
      heading: "Toilets",
      body: (
        <ul className="list-disc space-y-1 pl-5">
          {v.accessibleToilets.map((wc) => (
            <li key={wc}>{wc}</li>
          ))}
        </ul>
      ),
    },
    { heading: "Hearing", body: <p>{v.hearingLoopCoverage}</p> },
    { heading: "Captions", body: <p>{v.captionUnitPosition}</p> },
    { heading: "Sign-language interpretation", body: <p>{v.signInterpreterPosition}</p> },
    { heading: "Strobe and lighting", body: <p>{v.strobeWarning}</p> },
    { heading: "Quiet room", body: <p>{v.quietRoom}</p> },
    { heading: "Assistance dogs", body: <p>{v.assistanceDogPolicy}</p> },
    { heading: "Companion tickets", body: <p>{v.companionTicketPolicy}</p> },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Access at Aurora Hall
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        Everything here is also available to the booking tools on this site, so
        you can ask rather than read, whichever suits you better.
      </p>

      <nav aria-labelledby="access-contents" className="mt-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="access-contents" className="text-sm font-semibold">
          On this page
        </h2>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.heading}>
              <a
                href={`#${s.heading.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="inline-flex min-h-11 items-center rounded text-sm underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              >
                {s.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-8">
        {sections.map((s) => {
          const id = s.heading.toLowerCase().replace(/[^a-z]+/g, "-");
          return (
            <section key={s.heading} aria-labelledby={id}>
              <h2 id={id} className="text-xl font-semibold">
                {s.heading}
              </h2>
              <div className="mt-2 text-slate-700 dark:text-slate-300">{s.body}</div>
            </section>
          );
        })}
      </div>

      <section aria-labelledby="no-phone" className="mt-10 rounded-lg border border-emerald-700 bg-emerald-50 p-5 dark:bg-emerald-950">
        <h2 id="no-phone" className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          You never have to phone
        </h2>
        <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-100">
          Wheelchair bays, companion tickets, transfer seats and everything else
          are bookable on this site, at the same time and on the same terms as
          any other seat. The access line exists if you would rather talk to
          someone — not because the website cannot do it.
        </p>
      </section>
    </div>
  );
}
