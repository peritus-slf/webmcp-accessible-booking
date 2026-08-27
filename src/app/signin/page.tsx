"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_USER, signIn } from "@/lib/store";
import { useStore } from "@/lib/useStore";

/**
 * Sign in.
 *
 * WCAG 2.2 3.3.8 Accessible Authentication (AA): no cognitive function test.
 * There is no CAPTCHA, no puzzle, no "select all the crosswalks", no memory
 * challenge, and nothing blocks paste into the fields — blocking paste is the
 * most common way sites break password-manager users, and it is a failure of
 * this criterion.
 *
 * There is also no `sign_in` tool. An agent cannot authenticate on someone's
 * behalf here. That boundary is deliberate: reading a seating plan and
 * establishing identity are not the same kind of permission.
 */
export default function SignInPage() {
  const router = useRouter();
  const { user } = useStore();
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState("demo-password");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter the email address for the demo account.");
      return;
    }
    setError("");
    signIn();
    router.push("/account");
  }

  if (user) {
    return (
      <section aria-labelledby="signed-in-heading" className="max-w-md">
        <h1 id="signed-in-heading" className="text-2xl font-semibold">
          Already signed in
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          You are signed in as {user.name}.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="signin-heading" className="max-w-md">
      <h1 id="signin-heading" className="text-2xl font-semibold tracking-tight">
        Sign in
      </h1>

      <div className="mt-4 rounded-lg border border-sky-700 bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
        <p className="font-medium">This is a demonstration.</p>
        <p className="mt-1">
          There is no real account and no credential is checked or stored. The
          fields are filled in for you — press Sign in.
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {error && (
          <p role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="email-hint"
            className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
          />
          <p id="email-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Pre-filled with the demo account.
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          {/* autoComplete is set so password managers work, and paste is not
              blocked anywhere — both are 3.3.8 requirements in practice. */}
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-hint"
            className="mt-1 min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 dark:border-slate-600 dark:bg-slate-800"
          />
          <p id="password-hint" className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Any value works. Nothing is sent anywhere or stored.
          </p>
        </div>

        <button
          type="submit"
          className="min-h-11 w-full rounded-md bg-slate-900 px-4 font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        No CAPTCHA, no puzzle, no image recognition. WCAG 2.2 added{" "}
        <em>Accessible Authentication</em> because those tests lock out people
        with cognitive disabilities, and they are not security.
      </p>
    </section>
  );
}
