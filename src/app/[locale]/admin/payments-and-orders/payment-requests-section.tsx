"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { PaymentTrackingCode } from "@/components/PaymentTrackingCode";
import { formatPaymentRequestAmount, type PaymentAmountCurrency } from "@/lib/wallet-money";
import {
  approvePaymentRequestAction,
  rejectPaymentRequestAction,
  refundPaymentRequestAction,
} from "../payments/actions";

type PaymentRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";

function statusPillClass(status: PaymentRequestStatus) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
    case "REJECTED":
      return "bg-rose-100 text-rose-900 border-rose-200";
    case "REFUNDED":
      return "bg-violet-100 text-violet-900 border-violet-200";
    case "PENDING":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-slate-100 text-slate-900 border-slate-200";
  }
}

export type PaymentRequestRow = {
  id: string;
  trackingCode: string;
  createdAt: string;
  status: PaymentRequestStatus;
  amountCurrency: PaymentAmountCurrency;
  amountCents: number;
  amountSyp: number;
  methodName: string;
  userEmail: string;
  userName: string | null;
  clientNote: string | null;
  proofUrl: string | null;
};

export function PaymentRequestsSection({
  isPlatformAdmin,
  requests,
}: {
  isPlatformAdmin: boolean;
  requests: PaymentRequestRow[];
}) {
  const t = useTranslations("adminPayments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [requestFilter, setRequestFilter] = useState<"PENDING" | "APPROVED" | "ALL">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRequests = useMemo(() => {
    const byStatus =
      requestFilter === "ALL" ? requests : requests.filter((r) => r.status === requestFilter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byStatus;

    return byStatus.filter((r) => {
      const amountText = formatPaymentRequestAmount(r).toLowerCase();
      const haystack = [
        r.trackingCode,
        r.userEmail,
        r.userName ?? "",
        r.methodName,
        r.status,
        r.clientNote ?? "",
        r.id,
        amountText,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, requestFilter, searchQuery]);

  function flash(m: string) {
    setMessage(m);
    window.setTimeout(() => setMessage(null), 5000);
  }

  function afterRequestAction(ok: boolean, errMsg?: string, successMsg?: string) {
    if (!ok) {
      flash(errMsg ?? "Action failed.");
      return;
    }
    if (successMsg) flash(successMsg);
    router.refresh();
  }

  return (
    <CollapsibleSection
      id="admin-payments-requests"
      title={t("requests.sectionTitle")}
      defaultOpen
    >
      {message ? (
        <div className="mt-2 rounded-lg border border-[#2C4E7A]/20 bg-white px-4 py-3 text-sm text-[#1F3A5F]">
          {message}
        </div>
      ) : null}

      <p className="mt-2 text-sm text-[#2C4E7A]">{t("requests.help")}</p>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="block flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
            {t("requests.searchLabel")}
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("requests.searchPlaceholder")}
            disabled={pending}
            className="mt-1.5 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4 lg:max-w-md"
          />
        </label>
        <label className="text-sm text-[#1F3A5F] lg:shrink-0">
          <span className="mr-2 font-medium">{t("requests.show")}</span>
          <select
            className="rounded-lg border border-[#2C4E7A]/20 bg-white px-3 py-2"
            value={requestFilter}
            onChange={(e) => setRequestFilter(e.target.value as typeof requestFilter)}
            disabled={pending}
          >
            <option value="PENDING">{t("requests.filterPending")}</option>
            <option value="APPROVED">{t("requests.filterApproved")}</option>
            <option value="ALL">{t("requests.filterAll")}</option>
          </select>
        </label>
      </div>

      <p className="mt-2 text-xs font-medium text-[#2C4E7A]/75">
        {t("requests.showingCount", { count: filteredRequests.length })}
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-[#2C4E7A]/12 bg-white">
        <table className="min-w-full text-left text-sm text-[#1F3A5F]">
          <thead className="border-b border-[#2C4E7A]/12 bg-[#E8EEF4] text-xs font-bold uppercase tracking-wide text-[#1F3A5F]">
            <tr>
              <th className="bg-[#DCE6F0] px-3 py-2.5">{t("requests.tableCode")}</th>
              <th className="px-3 py-2.5">{t("requests.tableWhen")}</th>
              <th className="px-3 py-2.5">{t("requests.tableClient")}</th>
              <th className="bg-[#DCE6F0] px-3 py-2.5">{t("requests.tableMethod")}</th>
              <th className="bg-[#DCE6F0] px-3 py-2.5">{t("requests.tableAmount")}</th>
              <th className="bg-[#DCE6F0] px-3 py-2.5">{t("requests.tableStatus")}</th>
              <th className="px-3 py-2">{t("requests.tableNote")}</th>
              <th className="px-3 py-2">{t("requests.tableProof")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-[#2C4E7A]">
                  {searchQuery.trim()
                    ? t("requests.noSearchResults")
                    : t("requests.noRequests")}
                </td>
              </tr>
            ) : (
              filteredRequests.map((r) => (
                <tr key={r.id} className="border-b border-[#2C4E7A]/8 align-top">
                  <td className="bg-[#F5F8FB] px-3 py-2">
                    <PaymentTrackingCode code={r.trackingCode} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[#2C4E7A]">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-[#2C4E7A]">
                    <div className="font-medium text-[#1F3A5F]">{r.userEmail}</div>
                    {r.userName ? <div className="text-xs">{r.userName}</div> : null}
                  </td>
                  <td className="bg-[#F5F8FB] px-3 py-2 font-medium text-[#1F3A5F]">{r.methodName}</td>
                  <td className="bg-[#F5F8FB] px-3 py-2 whitespace-nowrap font-semibold text-[#1F3A5F]">
                    {formatPaymentRequestAmount(r)}
                  </td>
                  <td className="bg-[#F5F8FB] px-3 py-2">
                    <span
                      className={[
                        "inline-flex rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide",
                        statusPillClass(r.status),
                      ].join(" ")}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-[#2C4E7A]">
                    {r.clientNote ?? t("requests.none")}
                  </td>
                  <td className="px-3 py-2">
                    {r.proofUrl ? (
                      <a
                        href={r.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[#1F3A5F] underline"
                      >
                        {t("requests.open")}
                      </a>
                    ) : (
                      t("requests.none")
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          onClick={() =>
                            startTransition(async () => {
                              const res = await approvePaymentRequestAction({ id: r.id });
                              afterRequestAction(
                                res.ok,
                                "message" in res ? res.message : undefined,
                                res.ok ? t("requests.approvedFlash") : undefined,
                              );
                            })
                          }
                        >
                          {t("requests.approve")}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                          onClick={() =>
                            startTransition(async () => {
                              const res = await rejectPaymentRequestAction({ id: r.id });
                              afterRequestAction(
                                res.ok,
                                "message" in res ? res.message : undefined,
                                res.ok ? t("requests.rejectedFlash") : undefined,
                              );
                            })
                          }
                        >
                          {t("requests.reject")}
                        </button>
                      </div>
                    ) : r.status === "APPROVED" && isPlatformAdmin ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-60"
                        onClick={() => {
                          if (!window.confirm(t("requests.refundConfirm"))) return;
                          startTransition(async () => {
                            const res = await refundPaymentRequestAction({ id: r.id });
                            afterRequestAction(
                              res.ok,
                              "message" in res ? res.message : undefined,
                              res.ok ? t("requests.refundedFlash") : undefined,
                            );
                          });
                        }}
                      >
                        {t("requests.refund")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}
