"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import type { CustomServiceOrderStatus, SmmOfferOrderStatus } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { StatusPill } from "@/components/StatusPill";
import { updateManualOrderStatusAction, updateOfferOrderStatusAction } from "./actions";

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

const MANUAL_STATUSES: CustomServiceOrderStatus[] = ["ORDERED", "DONE"];
const OFFER_STATUSES: SmmOfferOrderStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"];

export function AllOrdersSection({
  orders,
  defaultOpen = true,
}: {
  orders: RecentOrdersSnapshot;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("adminOverview.stats");
  const tOrders = useTranslations("adminPaymentsAndOrders.orders");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [manualStatusById, setManualStatusById] = useState<Record<string, CustomServiceOrderStatus>>({});
  const [offerStatusById, setOfferStatusById] = useState<Record<string, SmmOfferOrderStatus>>({});

  function formatUsd(cents: number) {
    return (cents / 100).toFixed(2);
  }

  const manualLabel = useMemo(
    () =>
      ({
        ORDERED: tOrders("manualStatusOrdered"),
        DONE: tOrders("manualStatusDone"),
      }) satisfies Record<CustomServiceOrderStatus, string>,
    [tOrders],
  );

  const offerLabel = useMemo(
    () =>
      ({
        PENDING: tOrders("offerStatusPending"),
        PROCESSING: tOrders("offerStatusProcessing"),
        COMPLETED: tOrders("offerStatusCompleted"),
        FAILED: tOrders("offerStatusFailed"),
      }) satisfies Record<SmmOfferOrderStatus, string>,
    [tOrders],
  );

  function saveManualStatus(orderId: string, status: CustomServiceOrderStatus, previous: string) {
    setError(null);
    setManualStatusById((prev) => ({ ...prev, [orderId]: status }));
    startTransition(async () => {
      const res = await updateManualOrderStatusAction({ orderId, status });
      if (!res.ok) {
        setManualStatusById((prev) => {
          const next = { ...prev };
          if (previous === status) delete next[orderId];
          else next[orderId] = previous as CustomServiceOrderStatus;
          return next;
        });
        setError(res.message ?? tOrders("statusUpdateFailed"));
        return;
      }
      router.refresh();
    });
  }

  function saveOfferStatus(orderId: string, status: SmmOfferOrderStatus, previous: string) {
    setError(null);
    setOfferStatusById((prev) => ({ ...prev, [orderId]: status }));
    startTransition(async () => {
      const res = await updateOfferOrderStatusAction({ orderId, status });
      if (!res.ok) {
        setOfferStatusById((prev) => {
          const next = { ...prev };
          if (previous === status) delete next[orderId];
          else next[orderId] = previous as SmmOfferOrderStatus;
          return next;
        });
        setError(res.message ?? tOrders("statusUpdateFailed"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <CollapsibleSection id="admin-all-orders" title={t("allOrdersTitle")} defaultOpen={defaultOpen}>
      <div className="mt-2 space-y-6">
        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

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
              : orders.manual.map((o) => {
                  const current =
                    manualStatusById[o.id] ?? (o.status as CustomServiceOrderStatus);
                  return (
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
                        <select
                          className="min-w-[7.5rem] rounded-lg border border-[#2C4E7A]/20 bg-white px-2 py-1.5 text-sm font-semibold text-[#1F3A5F] shadow-sm outline-none focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
                          value={current}
                          disabled={pending}
                          aria-label={tOrders("changeManualStatus", { id: o.id })}
                          onChange={(e) =>
                            saveManualStatus(o.id, e.target.value as CustomServiceOrderStatus, o.status)
                          }
                        >
                          {MANUAL_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {manualLabel[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
          }
        />

        <OrdersTable
          title={t("offerOrders")}
          empty={t("noOrders")}
          headers={[t("when"), t("client"), t("serviceOrOffer"), t("details"), t("amount"), t("status")]}
          rows={
            orders.offers.length === 0
              ? null
              : orders.offers.map((o) => {
                  const current = offerStatusById[o.id] ?? (o.status as SmmOfferOrderStatus);
                  return (
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
                        <select
                          className="min-w-[8.5rem] rounded-lg border border-[#2C4E7A]/20 bg-white px-2 py-1.5 text-sm font-semibold text-[#1F3A5F] shadow-sm outline-none focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
                          value={current}
                          disabled={pending}
                          aria-label={tOrders("changeOfferStatus", { id: o.id })}
                          onChange={(e) =>
                            saveOfferStatus(o.id, e.target.value as SmmOfferOrderStatus, o.status)
                          }
                        >
                          {OFFER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {offerLabel[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
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
