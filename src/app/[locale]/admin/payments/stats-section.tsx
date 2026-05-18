"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
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
  const locale = useLocale();
  const [showApproved, setShowApproved] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);

  function formatUsd(cents: number) {
    return (cents / 100).toFixed(2);
  }

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

      <div className="mt-6 rounded-xl border border-[#2C4E7A]/10 bg-white p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setShowAllOrders((v) => !v)}
          aria-expanded={showAllOrders}
        >
          <div className="text-sm font-semibold text-[#1F3A5F]">{t("allOrdersTitle")}</div>
          <div className="text-xs font-semibold text-[#2C4E7A]/70">{showAllOrders ? "−" : "+"}</div>
        </button>

        {showAllOrders ? (
          <div className="mt-4 space-y-6">
            <div>
              <div className="text-sm font-semibold text-[#1F3A5F]">{t("apiOrders")}</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
                    <tr>
                      <th className="px-2 py-2">{t("when")}</th>
                      <th className="px-2 py-2">{t("client")}</th>
                      <th className="px-2 py-2">{t("serviceOrOffer")}</th>
                      <th className="px-2 py-2">{t("details")}</th>
                      <th className="px-2 py-2">{t("amount")}</th>
                      <th className="px-2 py-2">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.api.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-2 py-3 text-[#2C4E7A]/75">
                          {t("noOrders")}
                        </td>
                      </tr>
                    ) : (
                      stats.recentOrders.api.map((o) => (
                        <tr key={o.id} className="border-t border-[#2C4E7A]/8 align-top">
                          <td className="whitespace-nowrap px-2 py-2 text-[#2C4E7A]/90">
                            {new Date(o.createdAt).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-[#2C4E7A]/90">
                            <div className="font-medium text-[#1F3A5F]">{o.userEmail}</div>
                            {o.userName ? <div className="text-xs">{o.userName}</div> : null}
                          </td>
                          <td className="px-2 py-2 text-[#1F3A5F]">{o.serviceName}</td>
                          <td className="px-2 py-2 text-[#2C4E7A]/90">
                            <div className="max-w-[360px] truncate" title={o.link}>
                              {o.link}
                            </div>
                            <div className="text-xs text-[#2C4E7A]/70">Qty: {o.quantity}</div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 font-semibold text-[#1F3A5F]">
                            ${formatUsd(o.chargeCents)}
                          </td>
                          <td className="px-2 py-2 font-semibold">{o.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-[#1F3A5F]">{t("manualOrders")}</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
                    <tr>
                      <th className="px-2 py-2">{t("when")}</th>
                      <th className="px-2 py-2">{t("client")}</th>
                      <th className="px-2 py-2">{t("serviceOrOffer")}</th>
                      <th className="px-2 py-2">{t("details")}</th>
                      <th className="px-2 py-2">{t("amount")}</th>
                      <th className="px-2 py-2">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.manual.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-2 py-3 text-[#2C4E7A]/75">
                          {t("noOrders")}
                        </td>
                      </tr>
                    ) : (
                      stats.recentOrders.manual.map((o) => (
                        <tr key={o.id} className="border-t border-[#2C4E7A]/8 align-top">
                          <td className="whitespace-nowrap px-2 py-2 text-[#2C4E7A]/90">
                            {new Date(o.createdAt).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-[#2C4E7A]/90">
                            <div className="font-medium text-[#1F3A5F]">{o.userEmail}</div>
                            {o.userName ? <div className="text-xs">{o.userName}</div> : null}
                          </td>
                          <td className="px-2 py-2 text-[#1F3A5F]">{o.serviceName}</td>
                          <td className="px-2 py-2 text-[#2C4E7A]/90">
                            <div className="max-w-[360px] truncate" title={o.link}>
                              {o.link}
                            </div>
                            <div className="text-xs text-[#2C4E7A]/70">Units: {o.units}</div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 font-semibold text-[#1F3A5F]">
                            ${o.totalUsd}
                          </td>
                          <td className="px-2 py-2 font-semibold">{o.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-[#1F3A5F]">{t("offerOrders")}</div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
                    <tr>
                      <th className="px-2 py-2">{t("when")}</th>
                      <th className="px-2 py-2">{t("client")}</th>
                      <th className="px-2 py-2">{t("serviceOrOffer")}</th>
                      <th className="px-2 py-2">{t("details")}</th>
                      <th className="px-2 py-2">{t("amount")}</th>
                      <th className="px-2 py-2">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.offers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-2 py-3 text-[#2C4E7A]/75">
                          {t("noOrders")}
                        </td>
                      </tr>
                    ) : (
                      stats.recentOrders.offers.map((o) => (
                        <tr key={o.id} className="border-t border-[#2C4E7A]/8 align-top">
                          <td className="whitespace-nowrap px-2 py-2 text-[#2C4E7A]/90">
                            {new Date(o.createdAt).toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-[#2C4E7A]/90">
                            <div className="font-medium text-[#1F3A5F]">{o.userEmail}</div>
                            {o.userName ? <div className="text-xs">{o.userName}</div> : null}
                          </td>
                          <td className="px-2 py-2 text-[#1F3A5F]">
                            {locale === "ar" ? o.offerNameAr : o.offerNameEn}
                          </td>
                          <td className="px-2 py-2 text-[#2C4E7A]/90">
                            <div className="text-xs text-[#2C4E7A]/70">Items: {o.itemsCount}</div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 font-semibold text-[#1F3A5F]">
                            ${formatUsd(o.chargeCents)}
                          </td>
                          <td className="px-2 py-2 font-semibold">{o.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}
