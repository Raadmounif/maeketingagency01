"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { StatusPill } from "@/components/StatusPill";

export type RecentOrdersSnapshot = {
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

export function AllOrdersSection({
  orders,
  defaultOpen = true,
}: {
  orders: RecentOrdersSnapshot;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("adminOverview.stats");
  const locale = useLocale();

  function formatUsd(cents: number) {
    return (cents / 100).toFixed(2);
  }

  return (
    <CollapsibleSection id="admin-all-orders" title={t("allOrdersTitle")} defaultOpen={defaultOpen}>
      <div className="mt-2 space-y-6">
        <OrdersTable
          title={t("apiOrders")}
          empty={t("noOrders")}
          headers={[t("when"), t("client"), t("serviceOrOffer"), t("details"), t("amount"), t("status")]}
          rows={
            orders.api.length === 0
              ? null
              : orders.api.map((o) => (
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
                    <td className="px-2 py-2">
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))
          }
        />

        <OrdersTable
          title={t("manualOrders")}
          empty={t("noOrders")}
          headers={[t("when"), t("client"), t("serviceOrOffer"), t("details"), t("amount"), t("status")]}
          rows={
            orders.manual.length === 0
              ? null
              : orders.manual.map((o) => (
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
                    <td className="px-2 py-2">
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))
          }
        />

        <OrdersTable
          title={t("offerOrders")}
          empty={t("noOrders")}
          headers={[t("when"), t("client"), t("serviceOrOffer"), t("details"), t("amount"), t("status")]}
          rows={
            orders.offers.length === 0
              ? null
              : orders.offers.map((o) => (
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
                    <td className="px-2 py-2">
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))
          }
        />
      </div>
    </CollapsibleSection>
  );
}

function OrdersTable({
  title,
  empty,
  headers,
  rows,
}: {
  title: string;
  empty: string;
  headers: string[];
  rows: ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-[#1F3A5F]">{title}</div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-2 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={headers.length} className="px-2 py-3 text-[#2C4E7A]/75">
                  {empty}
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
