"use client";

import { useMemo, useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { useTranslations } from "next-intl";
import {
  resetUserPasswordAction,
  setUserPricingDiscountAction,
  setUserRoleAction,
} from "./actions";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  pricingDiscountPct: number;
  createdAt: Date;
};

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "CLIENT", label: "Client" },
  { value: "STAFF", label: "Staff" },
  { value: "SERVICE_OWNER", label: "Service Admin" },
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
];

export function UsersTable({ users }: { users: UserRow[] }) {
  const t = useTranslations("adminUsers");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimisticRoles, setOptimisticRoles] = useState<Record<string, Role>>({});
  const [discountDraft, setDiscountDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(users.map((u) => [u.id, String(u.pricingDiscountPct ?? 0)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [savedDiscountFor, setSavedDiscountFor] = useState<string | null>(null);
  const [resetOpenFor, setResetOpenFor] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<
    Record<string, { password: string; confirm: string }>
  >({});
  const [passwordResetFor, setPasswordResetFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [query, users]);

  async function setRole(userId: string, role: Role) {
    setError(null);
    setOptimisticRoles((prev) => ({ ...prev, [userId]: role }));

    startTransition(async () => {
      const res = await setUserRoleAction({ userId, role });
      if (!res.ok) {
        setError(res.message ?? t("roleUpdateFailed"));
        setOptimisticRoles((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });
  }

  function resetPassword(userId: string, email: string) {
    setError(null);
    const draft = passwordDraft[userId] ?? { password: "", confirm: "" };
    if (!draft.password || !draft.confirm) {
      setError(t("passwordRequired"));
      return;
    }
    if (draft.password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (draft.password !== draft.confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!window.confirm(t("passwordResetConfirm", { email }))) return;

    startTransition(async () => {
      const res = await resetUserPasswordAction({
        userId,
        newPassword: draft.password,
        confirmPassword: draft.confirm,
      });
      if (!res.ok) {
        setError(res.message ?? t("passwordResetFailed"));
        return;
      }
      setPasswordDraft((prev) => ({ ...prev, [userId]: { password: "", confirm: "" } }));
      setResetOpenFor(null);
      setPasswordResetFor(userId);
      window.setTimeout(
        () => setPasswordResetFor((cur) => (cur === userId ? null : cur)),
        2500,
      );
    });
  }

  function saveDiscount(userId: string) {
    setError(null);
    const raw = discountDraft[userId] ?? "0";
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setError(t("discountInvalid"));
      return;
    }

    startTransition(async () => {
      const res = await setUserPricingDiscountAction({ userId, discountPct: parsed });
      if (!res.ok) {
        setError(res.message ?? t("discountUpdateFailed"));
        return;
      }
      setSavedDiscountFor(userId);
      window.setTimeout(() => setSavedDiscountFor((cur) => (cur === userId ? null : cur)), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-[#1F3A5F]">
          {t("registeredUsers")}
          <span className="ml-2 text-xs font-medium text-[#2C4E7A]/70">
            {t("showingCount", { count: filtered.length })}
          </span>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4 md:w-[360px]"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <p className="text-xs text-[#2C4E7A]/80">{t("discountHelp")}</p>

      <div className="overflow-x-auto rounded-xl border border-[#2C4E7A]/12 bg-white">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
            <tr>
              <th className="px-4 py-3">{t("email")}</th>
              <th className="px-4 py-3">{t("name")}</th>
              <th className="px-4 py-3">{t("role")}</th>
              <th className="px-4 py-3">{t("discount")}</th>
              <th className="px-4 py-3">{t("password")}</th>
              <th className="px-4 py-3">{t("created")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C4E7A]/10">
            {filtered.map((u) => {
              const currentRole = optimisticRoles[u.id] ?? u.role;
              const pwdDraft = passwordDraft[u.id] ?? { password: "", confirm: "" };
              const resetOpen = resetOpenFor === u.id;
              return (
                <tr key={u.id} className="hover:bg-[#F5F7FA]/60">
                  <td className="px-4 py-3 font-medium text-[#1F3A5F]">{u.email}</td>
                  <td className="px-4 py-3 text-[#2C4E7A]/90">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={currentRole}
                        disabled={pending}
                        onChange={(e) => setRole(u.id, e.target.value as Role)}
                        className="h-10 rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm font-semibold text-[#1F3A5F] shadow-sm outline-none focus:ring-4 focus:ring-orange-500/10"
                      >
                        {roleOptions.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={pending}
                        value={discountDraft[u.id] ?? "0"}
                        onChange={(e) =>
                          setDiscountDraft((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        className="h-10 w-24 rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm font-semibold text-[#1F3A5F] shadow-sm outline-none focus:ring-4 focus:ring-orange-500/10"
                        aria-label={t("discountFor", { email: u.email })}
                      />
                      <span className="text-xs font-medium text-[#2C4E7A]/75">%</span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => saveDiscount(u.id)}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                      >
                        {savedDiscountFor === u.id ? t("saved") : t("saveDiscount")}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {resetOpen ? (
                      <div className="flex min-w-[220px] flex-col gap-2">
                        <input
                          type="password"
                          autoComplete="new-password"
                          disabled={pending}
                          value={pwdDraft.password}
                          onChange={(e) =>
                            setPasswordDraft((prev) => ({
                              ...prev,
                              [u.id]: { ...pwdDraft, password: e.target.value },
                            }))
                          }
                          placeholder={t("newPasswordPlaceholder")}
                          className="h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none focus:ring-4 focus:ring-orange-500/10"
                          aria-label={t("newPasswordFor", { email: u.email })}
                        />
                        <input
                          type="password"
                          autoComplete="new-password"
                          disabled={pending}
                          value={pwdDraft.confirm}
                          onChange={(e) =>
                            setPasswordDraft((prev) => ({
                              ...prev,
                              [u.id]: { ...pwdDraft, confirm: e.target.value },
                            }))
                          }
                          placeholder={t("confirmPasswordPlaceholder")}
                          className="h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none focus:ring-4 focus:ring-orange-500/10"
                          aria-label={t("confirmPasswordFor", { email: u.email })}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => resetPassword(u.id, u.email)}
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-[#1F3A5F] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2C4E7A] disabled:opacity-60"
                          >
                            {passwordResetFor === u.id ? t("passwordResetDone") : t("setPassword")}
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              setResetOpenFor(null);
                              setPasswordDraft((prev) => ({
                                ...prev,
                                [u.id]: { password: "", confirm: "" },
                              }));
                            }}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setResetOpenFor(u.id);
                          setError(null);
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                      >
                        {passwordResetFor === u.id ? t("passwordResetDone") : t("resetPassword")}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#2C4E7A]/80">
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-[#2C4E7A]/70">{t("tip")}</div>
    </div>
  );
}
