"use client";

import Link from "next/link";
import { useState } from "react";
import { setState, updateProfile, type AccessProfile } from "@/lib/store";
import { useStore } from "@/lib/useStore";

/**
 * The saved access profile.
 *
 * WCAG 2.2 3.3.7 Redundant Entry (A) says you must not ask someone for the same
 * information twice in a process. This page is that criterion taken seriously
 * and pushed one step further: the information is not re-asked across
 * *bookings* either.
 *
 * Disabled patrons report explaining the same needs at every venue, every
 * booking, often to a person on a phone line because the website could not
 * accept the information at all. Recording it once and having it applied is the
 * single largest improvement this site makes — and it is what makes the agent
 * flow short, because the agent reads this instead of interrogating you.
 */

const FIELDS: {
  key: keyof AccessProfile;
  label: string;
  hint: string;
  type: "boolean" | "number";
}[] = [
  { key: "wheelchairSpaces", label: "Wheelchair bays needed", hint: "A bay is a flat space, not a seat. Set 0 if you do not need one.", type: "number" },
  { key: "companionSeat", label: "Companion seat beside the bay", hint: "One companion ticket is free with every wheelchair booking.", type: "boolean" },
  { key: "transferSeat", label: "Transfer seat with a lifting armrest", hint: "For transferring out of a wheelchair into the seat.", type: "boolean" },
  { key: "assistanceDog", label: "Floor room for an assistance dog", hint: "Row ends and seats beside the bays have room.", type: "boolean" },
  { key: "hearingLoop", label: "Induction-loop coverage", hint: "The loop does not reach every seat in the house.", type: "boolean" },
  { key: "captionsRequired", label: "Clear view of the caption unit", hint: "Only applied at captioned performances.", type: "boolean" },
  { key: "interpreterRequired", label: "Clear view of the interpreter", hint: "Only applied at signed performances.", type: "boolean" },
  { key: "stepFree", label: "Step-free route", hint: "No steps between the entrance and the seat.", type: "boolean" },
  { key: "noStrobe", label: "No strobe exposure", hint: "For photosensitive epilepsy. This is never relaxed to find you a seat.", type: "boolean" },
];

export default function AccountPage() {
  const { user, accessProfile, showAccessDetail } = useStore();
  const [saved, setSaved] = useState("");

  if (!user) {
    return (
      <section aria-labelledby="signin-required" className="max-w-xl">
        <h1 id="signin-required" className="text-2xl font-semibold tracking-tight">
          My access profile
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Sign in to see and change your saved access requirements.
        </p>
        <Link
          href="/signin"
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
        >
          Sign in
        </Link>
      </section>
    );
  }

  function set(key: keyof AccessProfile, value: boolean | number) {
    updateProfile({ [key]: value } as Partial<AccessProfile>);
    const field = FIELDS.find((f) => f.key === key);
    setSaved(`${field?.label ?? String(key)} updated and saved.`);
  }

  return (
    <section aria-labelledby="profile-heading" className="max-w-3xl">
      <h1 id="profile-heading" className="text-3xl font-semibold tracking-tight">
        My access profile
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        Recorded once, applied to every booking. You should not have to explain
        this again — not on this site, and not on the phone.
      </p>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {saved}
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">{user.name}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">What you need</legend>
          <ul className="mt-3 space-y-4">
            {FIELDS.map((field) => {
              const id = `profile-${String(field.key)}`;
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
                        onChange={(e) => set(field.key, e.target.checked)}
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
                        onChange={(e) => set(field.key, Number(e.target.value))}
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
        </fieldset>

        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <h3 className="text-sm font-medium">Showing access detail</h3>
          <div className="mt-3 flex items-start gap-3">
            <input
              id="show-access-detail"
              type="checkbox"
              checked={showAccessDetail}
              onChange={(e) => {
                setState({ showAccessDetail: e.target.checked });
                setSaved(
                  e.target.checked
                    ? "Access detail will now be shown on every page."
                    : "Access detail is collapsed again.",
                );
              }}
              className="mt-1 size-5"
            />
            <span>
              <label htmlFor="show-access-detail" className="font-medium">
                Always show access detail
              </label>
              <span className="block text-sm text-slate-600 dark:text-slate-400">
                Performances and visitor-information pages keep their access
                detail collapsed by default. This opens it everywhere. You can
                also open any single panel by clicking it, or ask an agent to
                turn this on for you.
              </span>
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <h3 className="text-sm font-medium">Your note to staff</h3>
          <p className="mt-2 rounded-md bg-slate-100 p-3 text-sm italic dark:bg-slate-800">
            &ldquo;{accessProfile.notes}&rdquo;
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Read by the access team, and sent to the door staff with your
            booking. An agent can read this; it cannot rewrite it.
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        Changes save as you make them — there is no submit button to hunt for and
        nothing is lost if you navigate away.
      </p>
    </section>
  );
}
