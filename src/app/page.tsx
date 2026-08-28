import { EVENTS } from "@/lib/venue/events";
import { Hero } from "@/components/Hero";
import { SeasonBrowser } from "@/components/SeasonBrowser";

export default function Home() {
  return (
    <>
      <Hero featured={EVENTS[0]} />

      <section aria-labelledby="events-heading" className="mt-16 scroll-mt-8" id="whats-on">
        <h2 id="events-heading" className="sr-only">
          Upcoming performances
        </h2>
        <SeasonBrowser />
      </section>
    </>
  );
}
