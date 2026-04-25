"use client";

import { useMemo, useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { setUserRoleAction } from "./actions";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
};

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "CLIENT", label: "Client" },
  { value: "STAFF", label: "Staff" },
  { value: "SERVICE_OWNER", label: "Service Owner" },
  { value: "PLATFORM_ADMIN", label: "Platform Admin" },
];

export function UsersTable({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, Role>>({});
  const [error, setError] = useState<string | null>(null);

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
    setOptimistic((prev) => ({ ...prev, [userId]: role }));

    startTransition(async () => {
      const res = await setUserRoleAction({ userId, role });
      if (!res.ok) {
        setError(res.message ?? "Failed to update role.");
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-[#1F3A5F]">
          Registered users
          <span className="ml-2 text-xs font-medium text-[#2C4E7A]/70">
            (showing {filtered.length})
          </span>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, role…"
          className="h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4 md:w-[360px]"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#2C4E7A]/12 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C4E7A]/10">
            {filtered.map((u) => {
              const current = optimistic[u.id] ?? u.role;
              return (
                <tr key={u.id} className="hover:bg-[#F5F7FA]/60">
                  <td className="px-4 py-3 font-medium text-[#1F3A5F]">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-[#2C4E7A]/90">
                    {u.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={current}
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
                      {pending ? (
                        <span className="text-xs text-[#2C4E7A]/70">
                          Saving…
                        </span>
                      ) : null}
                    </div>
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

      <div className="text-xs text-[#2C4E7A]/70">
        Tip: keep only 1–2 platform admins. Use Service Owner for service-level
        leadership.
      </div>
    </div>
  );
}

