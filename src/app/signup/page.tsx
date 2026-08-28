"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  cancelSignup,
  completeSignup,
  startSignup,
  updateSignup,
  updateSignupAccess,
  type AccessProfile,
} from "@/lib/store";
import { useStore } from "@/lib/useStore";

/**
 * Create an account.
 *
 * An ordinary three-step sign-up: your details, then an optional access step,
 * then review. Step 2 is where this differs from every other venue — it exists
 * at all, and an agent can fill it.
 *
 * WHAT THE AGENT CAN AND CANNOT DO HERE
 *
 * `set_signup_access_preferences` populates step 2 of the form the user is
 * looking at. They then read it, change anything they like, and submit it
 * themselves. That is assistance with a blank form.
 *
 * There is no tool that creates the account. Establishing identity stays with
 * the person, for the same reason there is no `sign_in` — and creating a
 * persistent record on someone's behalf is a larger version of that decision,
 * not a smaller one.
 *
 * WCAG 2.2 3.3.8 Accessible Authentication: no puzzle, no CAPTCHA, no
 * cognitive-function test, and paste works everywhere.
 */

const ACCESS_FIELDS: { key: keyof AccessProfile; label: string; hint: string }[] = [
  { key: "wheelchairSpaces", label: "I need a wheelchair space", hint: "A flat bay rather than a seat. A companion ticket is free with every one." },
  { key: "companionSeat", label: "Reserve the seat beside it for someone with me", hint: "" },
  { key: "transferSeat", label: "I transfer out of my chair into a seat", hint: "We will look for seats whose armrest lifts." },
  { key: "assistanceDog", label: "I come with an assistance dog", hint: "We will look for seats with floor room." },
  { key: "hearingLoop", label: "I use an induction loop", hint: "The loop does not reach every seat." },
  { key: "captionsRequired", label: "I need to see the captions", hint: "Applied at captioned performances." },
  { key: "interpreterRequired", label: "I need to see the interpreter", hint: "Applied at signed performances." },
  { key: "stepFree", label: "I need a step-free route", hint: "" },
  { key: "noStrobe", label: "I cannot be exposed to strobe", hint: "We will never relax this to find you a seat." },
];

export default function SignUpPage() {
  const router = useRouter();
  const { user, signup } = useStore();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) startSignup();
  }, [user]);

  if (user) {
    return (
      <section aria-labelledby="already" className="max-w-md">
        <h1 id="already" className="text-2xl font-semibold tracking-tight">
          You already have an account
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Signed in as {user.name}.</p>
      </section>
    );
  }

  if (!signup) return null;

  const step = signup.step;

  function next() {
    if (step === 1) {
      if (!signup!.name.trim()) return setError("Enter the name the booking should be in.");
      if (!signup!.email.trim()) return setError("Enter an email address so we can send confirmations.");
      if (signup!.password.length < 8) return setError("Use at least eight characters for the password.");
    }
    setError("");
    updateSignup({ step: (step + 1) as 1 | 2 | 3 });
  }

  function create() {
    completeSignup();
    router.push("/account");
  }

  return (
    <section aria-labelledby="signup-heading" className="max-w-xl">
      <h1 id="signup-heading" className="text-3xl font-semibold tracking-tight">
        Create an account
      </h1>

      <div className="mt-3 rounded-lg border border-sky-700 bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
        <p className="font-medium">This is a demonstration.</p>
        <p className="mt-1">
          Nothing is sent anywhere and no credential is stored. Fill this in
          yourself, or ask an assistant to — it can complete both steps, but it
          cannot create the account. That is still your click.
        </p>
      </div>

      {/* 1.3.1 / 4.1.2 — progress announced, not conveyed by styling alone. */}
      <ol className="mt-6 flex gap-2 text-sm" aria-label="Sign-up progress">
        {["Your details", "Access requirements", "Review"].map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const state = n === step ? "current" : n < step ? "done" : "upcoming";
          return (
            <li
              key={label}
              aria-current={state === "current" ? "step" : undefined}
              className={[
                "flex-1 rounded-md border px-3 py-2",
                state === "current"
                  ? "border-slate-900 bg-slate-900 font-medium text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : state === "done"
                    ? "border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-300"
                    : "border-slate-300 text-slate-500 dark:border-slate-700",
              ].join(" ")}
            >
              <span className="sr-only">
                Step {n} of 3, {state === "done" ? "completed" : state === "current" ? "current" : "not started"}:{" "}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="mt-5 rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="mt-6 space-y-4">
          {signup.detailsPrefilled && (
            <p role="status" className="rounded-md border border-sky-700 bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
              An assistant filled these in. Check them before continuing —
              nothing is saved until you create the account yourself.
            </p>
          )}
          <div>
            <label htmlFor="su-name" className="block text-sm font-medium">
              Full name
            </label>
            <input
              id="su-name"
              autoComplete="name"
              aria-describedby="su-name-hint"
              value={signup.name}
              onChange={(e) => updateSignup({ name: e.target.value })}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
            />
            <p id="su-name-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              As it should appear on the booking.
            </p>
          </div>
          <div>
            <label htmlFor="su-email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="su-email"
              type="email"
              autoComplete="email"
              value={signup.email}
              onChange={(e) => updateSignup({ email: e.target.value })}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="su-password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="su-password"
              type="password"
              autoComplete="new-password"
              value={signup.password}
              onChange={(e) => updateSignup({ password: e.target.value })}
              aria-describedby="su-password-hint"
              className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
            />
            <p id="su-password-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              At least eight characters. Paste works; password managers work.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Access requirements</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Optional, and you can change it at any time. Telling us once means
            you will not be asked again at every booking, and staff will have it
            before you arrive.
          </p>

          {signup.accessPrefilled && (
            <p role="status" className="mt-4 rounded-md border border-sky-700 bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
              An assistant filled this in for you. Check it and change anything
              that is wrong — nothing is saved until you create the account.
            </p>
          )}

          <fieldset className="mt-5">
            <legend className="sr-only">What you need</legend>
            <ul className="space-y-3">
              {ACCESS_FIELDS.map((field) => {
                const id = `su-${String(field.key)}`;
                const value = signup.access[field.key];
                const checked = field.key === "wheelchairSpaces" ? Number(value) > 0 : value === true;
                return (
                  <li key={String(field.key)} className="flex items-start gap-3">
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      aria-describedby={field.hint ? `${id}-hint` : undefined}
                      onChange={(e) =>
                        updateSignupAccess(
                          field.key === "wheelchairSpaces"
                            ? { wheelchairSpaces: e.target.checked ? 1 : 0 }
                            : ({ [field.key]: e.target.checked } as Partial<AccessProfile>),
                        )
                      }
                      className="mt-1 size-5"
                    />
                    <span>
                      <label htmlFor={id} className="font-medium">
                        {field.label}
                      </label>
                      {field.hint && (
                        <span id={`${id}-hint`} className="block text-sm text-slate-600 dark:text-slate-400">
                          {field.hint}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <div className="mt-5">
            <label htmlFor="su-notes" className="block text-sm font-medium">
              Anything else staff should know
            </label>
            <textarea
              id="su-notes"
              rows={3}
              value={signup.access.notes}
              onChange={(e) => updateSignupAccess({ notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-400 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Review</h2>
          <dl className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <dt className="text-slate-600 dark:text-slate-400">Name</dt>
              <dd className="font-medium">{signup.name}</dd>
            </div>
            <div>
              <dt className="text-slate-600 dark:text-slate-400">Email</dt>
              <dd className="font-medium">{signup.email}</dd>
            </div>
            <div>
              <dt className="text-slate-600 dark:text-slate-400">Access requirements</dt>
              <dd className="font-medium">
                {ACCESS_FIELDS.filter((f) =>
                  f.key === "wheelchairSpaces"
                    ? Number(signup.access.wheelchairSpaces) > 0
                    : signup.access[f.key] === true,
                )
                  .map((f) => f.label)
                  .join("; ") || "None recorded"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => updateSignup({ step: (step - 1) as 1 | 2 | 3 })}
            className="min-h-11 rounded-md border border-slate-400 px-5 text-sm dark:border-slate-600"
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            className="min-h-11 rounded-md bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
          >
            {step === 2 ? "Review" : "Continue"}
          </button>
        ) : (
          <button
            type="button"
            onClick={create}
            className="min-h-11 rounded-md bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900"
          >
            Create account
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            cancelSignup();
            router.push("/");
          }}
          className="min-h-11 rounded-md px-4 text-sm text-slate-600 underline dark:text-slate-400"
        >
          Cancel
        </button>
      </div>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        Already have one? <Link href="/signin" className="underline">Sign in</Link>.
      </p>
    </section>
  );
}
