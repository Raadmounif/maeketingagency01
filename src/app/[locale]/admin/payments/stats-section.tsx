"use client";

import { CollapsibleSection } from "@/components/CollapsibleSection";

export type PaymentsStatsSnapshot = {
  pendingPayments: number;
  approvedPayments: number;
  successfulOrders: number;
  chargedUsers: number;
  unchargedUsers: number;
  topServices: Array<{ serviceId: string; name: string; count: number }>;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2C4E7A]/12 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-[#1F3A5F]">{value}</div>
    </div>
  );
}

export function PaymentsStatsSection({ stats }: { stats: PaymentsStatsSnapshot }) {
  return (
    <CollapsibleSection id="admin-payments-stats" title="Overview & statistics">
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending payments" value={String(stats.pendingPayments)} />
        <StatCard label="Approved payments" value={String(stats.approvedPayments)} />
        <StatCard label="Successful orders (API + manual)" value={String(stats.successfulOrders)} />
        <StatCard
          label="Charged / uncharged accounts"
          value={`${stats.chargedUsers} / ${stats.unchargedUsers}`}
        />
      </div>
      <div className="mt-6 rounded-xl border border-[#2C4E7A]/10 bg-white p-4">
        <div className="text-sm font-semibold text-[#1F3A5F]">Most ordered services</div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-2 py-2">Service</th>
                <th className="px-2 py-2">Completed orders</th>
              </tr>
            </thead>
            <tbody>
              {stats.topServices.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-2 py-3 text-[#2C4E7A]/75">
                    No completed orders yet.
                  </td>
                </tr>
              ) : (
                stats.topServices.map((s) => (
                  <tr key={s.serviceId} className="border-t border-[#2C4E7A]/8">
                    <td className="px-2 py-2 text-[#1F3A5F]">{s.name}</td>
                    <td className="px-2 py-2 font-semibold">{s.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsibleSection>
  );
}
