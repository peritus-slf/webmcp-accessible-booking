"use client";

import Link from "next/link";
import { useState } from "react";
import { setState, updateProfile, type AccessProfile } from "@/lib/store";
import { useStore } from "@/lib/useStore";

/**
 * Account settings.
 *
 * An ordinary settings page: your details, password, contact preferences,
 * access requirements, delete account. Access is one section among several,
 * which is where it belongs on a venue site — not the whole page.
 *
 * It is still the section that does the work. WCAG 2.2 3.3.7 Redundant Entry
 * says do not ask for the same information twice in a process; recording needs
 * here means they are not re-asked across *bookings* either, which is the thing
 * disabled patrons actually complain about — explaining the same needs at every
 * venue, every time, often on a phone line because the website could not take
 * the information at all.
 */

const ACCESS_FIELDS: { key: keyof AccessProfile; label: string; hint: string; type: "boolean" | "number" }[] = [
  { key: "wheelchairSpaces", label: "Wheelchair bays needed", hint: "A bay is a flat space, not a seat.", type: "number" },
  { key: "companionSeat", label: "Companion seat beside the bay", hint: "One companion ticket is free with every wheelchair booking.", type: "boolean" },
  { key: "transferSeat", label: "Transfer seat with a lifting armrest", hint: "For transferring out of a wheelchair.", type: "boolean" },
  { key: "assistanceDog", label: "Floor room for an assistance dog", hint: "Row ends and seats beside the bays have room.", type: "boolean" },
  { key: "hearingLoop", label: "Induction-loop coverage", hint: "The loop does not reach every seat.", type: "boolean" },
  { key: "captionsRequired", label: "Clear view of the caption unit", hint: "Applied at captioned performances.", type: "boolean" },
  { key: "interpreterRequired", label: "Clear view of the interpreter", hint: "Applied at signed performances.", type: "boolean" },
  { key: "stepFree", label: "Step-free route", hint: "No steps between the entrance and the seat.", type: "boolean" },
  { key: "noStrobe", label: "No strobe exposure", hint: "Never relaxed to find you a seat.", type: "boolean" },
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AccountPage() {
  const { user, accessProfile, showAccessDetail } = useStore();
  const [saved, setSaved] = useState("");

  if (!user) {
    return (
      <section aria-labelledby="signin-required" className="max-w-xl">
        <h1 id="signin-required" className="text-3xl font-semibold tracking-tight">
          My account
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Sign in to manage your details and preferences.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/signin"
            className="inline-flex min-h-11 items-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-md border border-slate-400 px-5 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Create an account
          </Link>
        </div>
      </section>
    );
  }

  function setAccess(key: keyof AccessProfile, value: boolean | number) {
    updateProfile({ [key]: value } as Partial<AccessProfile>);
    const field = ACCESS_FIELDS.find((f) => f.key === key);
    setSaved(`${field?.label ?? String(key)} updated and saved.`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">My account</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Signed in as {user.email}.
      </p>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {saved}
      </p>

      <div className="mt-8 space-y-6">
        <Section id="details" title="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="acct-name" className="block text-sm font-medium">
                Full name
              </label>
              <input
                id="acct-name"
                autoComplete="name"
                defaultValue={user.name}
                className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label htmlFor="acct-email" className="block text-sm font-medium">
                Email address
              </label>
              <input
                id="acct-email"
                type="email"
                autoComplete="email"
                defaultValue={user.email}
                className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="acct-phone" className="block text-sm font-medium">
                Phone (optional)
              </label>
              <input
                id="acct-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+354"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaved("Details saved.")}
            className="mt-4 min-h-11 rounded-md bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
          >
            Save details
          </button>
        </Section>

        <Section id="password" title="Password">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="acct-current" className="block text-sm font-medium">
                Current password
              </label>
              <input
                id="acct-current"
                type="password"
                autoComplete="current-password"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
            <div>
              <label htmlFor="acct-new" className="block text-sm font-medium">
                New password
              </label>
              <input
                id="acct-new"
                type="password"
                autoComplete="new-password"
                aria-describedby="acct-new-hint"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
              />
              <p id="acct-new-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                At least eight characters.
              </p>
            </div>
            <div>
              <label htmlFor="acct-confirm" className="block text-sm font-medium">
                Confirm new password
              </label>
              <input
                id="acct-confirm"
                type="password"
                autoComplete="new-password"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSaved("Password unchanged — this is a demonstration.")}
            className="mt-4 min-h-11 rounded-md border border-slate-400 px-5 text-sm font-medium dark:border-slate-600"
          >
            Change password
          </button>
        </Section>

        <Section
          id="contact-prefs"
          title="Contact preferences"
          description="How Aurora Hall gets in touch."
        >
          <ul className="space-y-3">
            {[
              ["Season announcements", "Two or three emails a year when a season goes on sale."],
              ["Booking confirmations and reminders", "Always sent for a booking you have made."],
              ["Occasional surveys", "About once a year."],
            ].map(([label, hint], i) => (
              <li key={label} className="flex items-start gap-3">
                <input
                  id={`pref-${i}`}
                  type="checkbox"
                  defaultChecked={i === 1}
                  aria-describedby={`pref-${i}-hint`}
                  className="mt-1 size-5"
                />
                <span>
                  <label htmlFor={`pref-${i}`} className="font-medium">
                    {label}
                  </label>
                  <span id={`pref-${i}-hint`} className="block text-sm text-slate-600 dark:text-slate-400">
                    {hint}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          id="access-reqs"
          title="Access requirements"
          description="Recorded once and applied to every booking, so you are not asked again — and so staff have it before you arrive."
        >
          <ul className="space-y-4">
            {ACCESS_FIELDS.map((field) => {
              const id = `acct-${String(field.key)}`;
              const value = accessProfile[field.key];
              return (
                <li key={String(field.key)}>
                  {field.type === "boolean" ? (
                    <div className="flex items-start gap-3">
                      <input
                        id={id}
                        type="checkbox"
                        checked={value === true}
                        aria-describedby={`${id}-hint`}
                        onChange={(e) => setAccess(field.key, e.target.checked)}
                        className="mt-1 size-5"
                      />
                      <span>
                        <label htmlFor={id} className="font-medium">
                          {field.label}
                        </label>
                        <span id={`${id}-hint`} className="block text-sm text-slate-600 dark:text-slate-400">
                          {field.hint}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor={id} className="font-medium">
                        {field.label}
                      </label>
                      <input
                        id={id}
                        type="number"
                        min={0}
                        max={4}
                        value={Number(value)}
                        aria-describedby={`${id}-hint`}
                        onChange={(e) => setAccess(field.key, Number(e.target.value))}
                        className="mt-1 block min-h-11 w-24 rounded-md border border-slate-400 px-3 dark:border-slate-600 dark:bg-slate-800"
                      />
                      <span id={`${id}-hint`} className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
                        {field.hint}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
            <label htmlFor="acct-notes" className="block text-sm font-medium">
              Anything else staff should know
            </label>
            <textarea
              id="acct-notes"
              rows={3}
              value={accessProfile.notes}
              onChange={(e) => updateProfile({ notes: e.target.value })}
              aria-describedby="acct-notes-hint"
              className="mt-1 w-full rounded-md border border-slate-400 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <p id="acct-notes-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Sent to door staff with each booking. An assistant can read this; it
              cannot rewrite it.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <input
              id="show-access-detail"
              type="checkbox"
              checked={showAccessDetail}
              onChange={(e) => {
                setState({ showAccessDetail: e.target.checked });
                setSaved(e.target.checked ? "Access detail shown on every page." : "Access detail collapsed again.");
              }}
              aria-describedby="show-access-detail-hint"
              className="mt-1 size-5"
            />
            <span>
              <label htmlFor="show-access-detail" className="font-medium">
                Always show access detail
              </label>
              <span id="show-access-detail-hint" className="block text-sm text-slate-600 dark:text-slate-400">
                Performances and visitor pages keep their access detail
                collapsed. This opens it everywhere.
              </span>
            </span>
          </div>
        </Section>

        <Section id="close-account" title="Close account" description="This cannot be undone.">
          <button
            type="button"
            onClick={() => setSaved("Nothing deleted — this is a demonstration.")}
            className="min-h-11 rounded-md border border-red-700 px-5 text-sm font-medium text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-red-300 dark:hover:bg-red-950"
          >
            Close my account
          </button>
        </Section>
      </div>
    </div>
  );
}
