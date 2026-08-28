/**
 * Venue information — the pages behind the footer links.
 *
 * One dataset, rendered two ways: `/visit/[topic]` for a person,
 * `get_venue_information` for an agent. Neither gets content the other cannot
 * reach, which is the same rule the seating tools follow.
 *
 * THE POINT OF THIS FILE
 *
 * Every topic carries `access` notes inline. Not in an accessibility appendix,
 * not on a separate page — attached to the thing itself. That is the gap on
 * real venue sites: "Food and drink" is a menu and a photograph, and whether
 * the bar is step-free, has a lowered section, or will bring an order to your
 * seat lives nowhere at all. Somebody who needs to know has to phone and ask.
 *
 * Because the notes sit on the topic rather than in a separate document, an
 * agent asked "can I get a drink in the interval without queuing at a high
 * counter?" can answer it. That question has a real answer here and no answer
 * on almost any venue site in the world.
 */

export interface InfoTopic {
  slug: string;
  title: string;
  /** Footer label, which is often shorter than the page title. */
  navLabel: string;
  summary: string;
  body: string[];
  /**
   * Access facts about *this* topic. Written as things a patron would need to
   * decide whether they can do the thing, not as a compliance statement.
   */
  access: string[];
}

export const INFO_TOPICS: InfoTopic[] = [
  {
    slug: "getting-here",
    title: "Getting here",
    navLabel: "Getting here",
    summary: "Sæbraut 14, ten minutes from Hlemmur on the 12 and the 14.",
    body: [
      "Aurora Hall sits on the seafront at Sæbraut 14, a fifteen-minute walk from the city centre along the shore path.",
      "Buses 12 and 14 stop at Sæbraut, two hundred metres north. The stop is served every ten minutes until 23:30 and every twenty minutes after that.",
      "There is no visitor car park. Street parking on Sæbraut is metered until 18:00 and free thereafter.",
    ],
    access: [
      "Six blue-badge bays sit directly outside the north entrance, twenty metres from the door. They are not bookable and are first come, first served — the access line will tell you how full they usually are for a given performance.",
      "The shore path from the city centre is level and lit, with a tactile surface at each crossing.",
      "The route from the Sæbraut bus stop to the north entrance is step-free, but crosses one road without a dropped kerb on the eastern side. Cross on the western side.",
      "A drop-off point outside the north entrance can be used at any time; the kerb there is dropped and the doors are automatic.",
    ],
  },
  {
    slug: "food-and-drink",
    title: "Food and drink",
    navLabel: "Food and drink",
    summary: "Bar in the north foyer from two hours before curtain. Interval orders can be placed in advance.",
    body: [
      "The foyer bar opens two hours before curtain and stays open through the interval. Coffee, wine, beer and a short menu of small plates.",
      "Order for the interval when you arrive and it will be waiting at the far end of the bar, which saves the queue entirely.",
    ],
    access: [
      "The bar has a lowered counter section at 760 mm on its western end, with clear floor space to approach it front-on.",
      "Staff will bring an order to your seat if you ask when you arrive — say so at the box office or the bar and give your seat number. This is not advertised anywhere else and you do not need to explain why.",
      "Menus are available in large print at the bar and can be read aloud on request.",
      "Every item is labelled for the fourteen major allergens. Staff can check preparation details with the kitchen.",
      "There is table seating at standing-bar height and at standard height in the north foyer; the standard-height tables are nearest the accessible toilet.",
      "Drinks may be taken into the auditorium in lidded cups, which staff provide on request.",
    ],
  },
  {
    slug: "cloakroom",
    title: "Cloakroom and bags",
    navLabel: "Cloakroom and bags",
    summary: "Free cloakroom in the north foyer. Bags over 40 litres must be checked.",
    body: [
      "The cloakroom is free and sits beside the north entrance. It opens when doors open and stays staffed until thirty minutes after the performance ends.",
      "Bags larger than forty litres cannot be taken into the auditorium and must be checked.",
    ],
    access: [
      "The cloakroom counter has a lowered section and staff will come around to you if the queue is difficult to stand in.",
      "Mobility equipment you are not using during the performance — a walking frame, crutches, a folded chair — is stored free and brought to your seat at the interval or the end, whichever you ask for.",
      "A powerchair or scooter you transfer out of is stored beside the wheelchair bays rather than in the cloakroom, so it is next to you rather than four floors away.",
      "Assistance-dog water bowls are kept at the cloakroom desk. Ask and one will be brought to your seat.",
      "Medical equipment and medication are never required to be checked, whatever their size.",
    ],
  },
  {
    slug: "groups",
    title: "Groups of ten or more",
    navLabel: "Groups of 10+",
    summary: "Ten per cent off for groups of ten, fifteen per cent for twenty-five.",
    body: [
      "Groups of ten or more receive ten per cent off, rising to fifteen per cent at twenty-five. Book through the box office rather than online so seats are held together.",
      "Schools and community groups can hold seats without payment for fourteen days.",
    ],
    access: [
      "A group booking can include more than one wheelchair bay in the same row. The circle takes two side by side at N-2 and N-4; the rear stalls take four across row L.",
      "Free companion tickets apply per wheelchair space within a group booking, not once per booking.",
      "Groups from care settings and day centres can request the quiet room be held for their exclusive use during the interval, at no cost.",
      "The box office will walk a group through the access arrangements once rather than asking each member individually.",
    ],
  },
  {
    slug: "hire-the-venue",
    title: "Hire the venue",
    navLabel: "Hire the venue",
    summary: "The hall, the north foyer and the rehearsal room are available for hire.",
    body: [
      "Aurora Hall is available for concerts, conferences, filming and private events. The main hall seats 330, the north foyer holds 120 standing, and the rehearsal room seats 40.",
      "Rates depend on the day and whether technical staff are required. The venue is dark on Mondays outside the season.",
    ],
    access: [
      "Everything a hirer's audience needs is included and cannot be switched off: the induction loop, the step-free routes, the accessible toilets and the quiet room are part of the building.",
      "The caption unit and the interpreter position are available to hirers at no extra cost, though the interpreter themselves is booked by the hirer.",
      "Hirers are asked to declare their lighting design in advance so the strobe profile can be published on the ticket page. A hirer who will not declare it is listed as heavy strobe.",
      "The stage is reachable step-free from the north entrance via the get-in, so a performer who uses a wheelchair does not need a different route from the rest of the company.",
    ],
  },
  {
    slug: "families",
    title: "Families and schools",
    navLabel: "Family and schools",
    summary: "Under-16s half price. Relaxed performances every season.",
    body: [
      "Under-16s pay half price at every performance. Family concerts run on Sunday mornings and last forty-five minutes with no interval.",
      "Schools book through the box office and pay after the visit.",
    ],
    access: [
      "Relaxed performances run at least once a season: house lights half up, reduced sound levels, free movement in and out, and no strobe or blackout. Nobody minds noise.",
      "The quiet room is staffed throughout every family and relaxed performance and can be used at any point without asking first.",
      "Buggies are stored free at the cloakroom; the north foyer is step-free throughout.",
      "A visual story showing the building, the staff and what happens during the performance is sent with every family booking, and can be requested for any performance.",
      "Ear defenders in two sizes are kept at the box office and lent free.",
    ],
  },
];

export function infoTopicBySlug(slug: string): InfoTopic | undefined {
  return INFO_TOPICS.find((t) => t.slug === slug);
}
