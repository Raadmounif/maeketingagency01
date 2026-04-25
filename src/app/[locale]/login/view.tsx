"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { getPathname, Link } from "@/i18n/routing";
import { safeInternalPathAfterAuth } from "@/lib/safe-internal-path";

export default function LoginView() {
  const params = useSearchParams();
  const locale = useLocale();
  const next = useMemo(() => {
    const href = safeInternalPathAfterAuth(params.get("next"));
    return getPathname({ locale, href });
  }, [locale, params]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: next,
      redirect: true,
    });

    if (res?.error) setError("Invalid email or password.");
    setLoading(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-14">
      <div className="w-full max-w-md rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">
          Login
        </h1>
        <p className="mt-2 text-sm text-[#2C4E7A]/90">
          Use your PalmyraShift account to access services.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <div className="text-sm font-semibold text-[#1F3A5F]">
              Email
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-6 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-[#2C4E7A]/90">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#1F3A5F] underline-offset-4 hover:underline"
          >
            Create one
          </Link>
          .
        </div>
      </div>
    </main>
  );
}

