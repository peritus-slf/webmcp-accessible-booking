import Link from "next/link";
import { notFound } from "next/navigation";
import { INFO_TOPICS, infoTopicBySlug } from "@/lib/venue/information";

/**
 * A venue information page.
 *
 * Renders exactly what `get_venue_information` returns to an agent, from the
 * same dataset. If the tool could answer a question this page cannot, the
 * information would be agent-exclusive — which is the thing this whole project
 * argues against.
 *
 * The access notes are part of the page, not a section at the bottom labelled
 * "Accessibility". Whether the bar has a lowered counter belongs next to the
 * bar, where somebody deciding whether they can get a drink will actually
 * find it.
 */

export function generateStaticParams() {
  return INFO_TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = infoTopicBySlug(slug);
  return {
    title: topic ? { absolute: `${topic.title} · Aurora Hall` } : { absolute: "Not found · Aurora Hall" },
  };
}

export default async function VisitTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = infoTopicBySlug(slug);
  if (!topic) notFound();

  return (
    <div className="max-w-3xl">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <Link
              href="/"
              className="rounded underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              Aurora Hall
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>Your visit</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{topic.title}</li>
        </ol>
      </nav>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{topic.title}</h1>
      <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">{topic.summary}</p>

      <div className="mt-6 space-y-4">
        {topic.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <section
        aria-labelledby="topic-access"
        className="mt-10 rounded-xl border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="topic-access" className="text-xl font-semibold">
          Access — {topic.title.toLowerCase()}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Specific to this, rather than filed on a separate page.
        </p>
        <ul className="mt-4 space-y-3">
          {topic.access.map((note) => (
            <li key={note} className="flex gap-3 text-sm">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-500" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-labelledby="other-topics" className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 id="other-topics" className="text-sm font-semibold">
          More about your visit
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {INFO_TOPICS.filter((t) => t.slug !== topic.slug).map((t) => (
            <li key={t.slug}>
              <Link
                href={`/visit/${t.slug}`}
                className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                {t.navLabel}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/access"
              className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              Accessibility
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
