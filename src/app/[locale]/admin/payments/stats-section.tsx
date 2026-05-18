"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Link } from "@/i18n/routing";
import { PaymentTrackingCode } from "@/components/PaymentTrackingCode";
import { formatPaymentRequestAmount, type PaymentAmountCurrency } from "@/lib/wallet-money";

export type PaymentsStatsSnapshot = {
  pendingPayments: number;
  approvedPayments: number;
  approvedPaymentsList: Array<{
    id: string;
    trackingCode: string;
    createdAt: string;
    amountCurrency: PaymentAmountCurrency;
    amountCents: number;
    amountSyp: number;
    methodName: string;
    userEmail: string;
    userName: string | null;
    clientNote: string | null;
    proofUrl: string | null;
  }>;
  successfulOrders: number;
  chargedUsers: number;
  unchargedUsers: number;
  topServices: Array<{ serviceId: string; name: string; count: number }>;
  recentOrders: {
    api: Array<{
      id: string;
      createdAt: string;
      userEmail: string;
      userName: string | null;
      serviceName: string;
      link: string;
      quantity: number;
      chargeCents: number;
      status: string;
    }>;
    manual: Array<{
      id: string;
      createdAt: string;
      userEmail: string;
      userName: string | null;
      serviceName: string;
      link: string;
      units: number;
      totalUsd: string;
      status: string;
    }>;
    offers: Array<{
      id: string;
      createdAt: string;
      userEmail: string;
      userName: string | null;
      offerNameEn: string;
      offerNameAr: string;
      itemsCount: number;
      chargeCents: number;
      status: string;
    }>;
  };
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
  const t = useTranslations("adminOverview.stats");
  const [showApproved, setShowApproved] = useState(false);

  return (
    <CollapsibleSection id="admin-payments-stats" title={t("title")}>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("pendingPayments")} value={String(stats.pendingPayments)} />
        <button
          type="button"
          className="text-left"
          onClick={() => setShowApproved((v) => !v)}
          aria-expanded={showApproved}
        >
          <StatCard label={t("approvedPaymentsClick")} value={String(stats.approvedPayments)} />
        </button>
        <StatCard label={t("successfulOrders")} value={String(stats.successfulOrders)} />
        <StatCard
          label={t("chargedUncharged")}
          value={`${stats.chargedUsers} / ${stats.unchargedUsers}`}
        />
      </div>

      {showApproved ? (
        <div className="mt-6 rounded-xl border border-[#2C4E7A]/10 bg-white p-4">
          <div className="text-sm font-semibold text-[#1F3A5F]">{t("approvedDetailsTitle")}</div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
                <tr>
                  <th className="px-2 py-2">{t("code")}</th>
                  <th className="px-2 py-2">{t("when")}</th>
                  <th className="px-2 py-2">{t("client")}</th>
                  <th className="px-2 py-2">{t("method")}</th>
                  <th className="px-2 py-2">{t("amount")}</th>
                  <th className="px-2 py-2">{t("note")}</th>
                  <th className="px-2 py-2">{t("proof")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.approvedPaymentsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-3 text-[#2C4E7A]/75">
                      {t("noApprovedYet")}
                    </td>
                  </tr>
                ) : (
                  stats.approvedPaymentsList.map((p) => (
                    <tr key={p.id} className="border-t border-[#2C4E7A]/8 align-top">
                      <td className="px-2 py-2">
                        <PaymentTrackingCode code={p.trackingCode} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-[#2C4E7A]/90">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-[#2C4E7A]/90">
                        <div className="font-medium text-[#1F3A5F]">{p.userEmail}</div>
                        {p.userName ? <div className="text-xs">{p.userName}</div> : null}
                      </td>
                      <td className="px-2 py-2 font-medium text-[#1F3A5F]">{p.methodName}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-semibold text-[#1F3A5F]">
                        {formatPaymentRequestAmount(p)}
                      </td>
                      <td className="max-w-[280px] px-2 py-2 text-[#2C4E7A]/90">
                        {p.clientNote ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        {p.proofUrl ? (
                          <a
                            href={p.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#1F3A5F] underline"
                          >
                            {t("open")}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-[#2C4E7A]/10 bg-white p-4">
        <div className="text-sm font-semibold text-[#1F3A5F]">{t("mostOrdered")}</div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-2 py-2">{t("service")}</th>
                <th className="px-2 py-2">{t("completedOrders")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.topServices.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-2 py-3 text-[#2C4E7A]/75">
                    {t("noCompletedYet")}
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

      <div className="mt-6 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("allOrdersTitle")}</div>
            <p className="mt-1 text-sm text-[#2C4E7A]/85">{t("allOrdersMovedHelp")}</p>
          </div>
          <Link
            href="/admin/payments-and-orders"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
          >
            {t("openPaymentsAndOrders")}
          </Link>
        </div>
      </div>
    </CollapsibleSection>
  );
}
