"use client";

import { Link } from "@/i18n/routing";
import { useState, useTransition } from "react";
import { registerAction } from "./actions";

export default function RegisterPage() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setOk(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await registerAction(formData);
      setMessage(res.message);
      setOk(res.ok);
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-14">
      <div className="w-full max-w-md rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">
          Create account
        </h1>
        <p className="mt-2 text-sm text-[#2C4E7A]/90">
          One account works across all PalmyraShift services.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <div className="text-sm font-semibold text-[#1F3A5F]">
              Name (optional)
            </div>
            <input
              name="name"
              type="text"
              autoComplete="name"
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
              placeholder="Your name"
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-[#1F3A5F]">
              Email
            </div>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
              placeholder="you@company.com"
            />
          </label>

          <label className="block">
            <div className="text-sm font-semibold text-[#1F3A5F]">
              Password
            </div>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
              placeholder="At least 8 characters"
            />
          </label>

          {message ? (
            <div
              className={[
                "rounded-xl border px-4 py-3 text-sm",
                ok
                  ? "border-emerald-500/20 bg-emerald-50 text-emerald-800"
                  : "border-red-500/20 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {message}
            </div>
          ) : null}

          <button
            disabled={pending}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-6 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {pending ? "Creating..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#2C4E7A]/90">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#1F3A5F] underline-offset-4 hover:underline"
          >
            Login
          </Link>
          .
        </div>
      </div>
    </main>
  );
}

