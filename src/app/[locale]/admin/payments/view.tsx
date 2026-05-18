"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { PaymentTrackingCode } from "@/components/PaymentTrackingCode";
import { formatPaymentRequestAmount, type PaymentAmountCurrency } from "@/lib/wallet-money";
import {
  approvePaymentRequestAction,
  createPaymentMethodAction,
  deletePaymentMethodAction,
  rejectPaymentRequestAction,
  refundPaymentRequestAction,
  updatePaymentMethodAction,
} from "./actions";

type MethodRow = {
  id: string;
  name: string;
  descriptionText: string | null;
  descriptionMediaUrl: string | null;
  enabled: boolean;
  sort: number;
  minDepositUsdCents: number;
  minDepositSyp: number;
  updatedAt: string;
};

function formatMinUsdInput(cents: number) {
  if (cents <= 0) return "";
  return (cents / 100).toFixed(2);
}

function formatMinSypInput(syp: number) {
  if (syp <= 0) return "";
  return String(syp);
}

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

type RequestRow = {
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

export default function PaymentsAdminClient(props: {
  isPlatformAdmin: boolean;
  methods: MethodRow[];
  requests: RequestRow[];
}) {
  const t = useTranslations("adminPayments");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function afterRequestAction(ok: boolean, errMsg?: string, successMsg?: string) {
    if (!ok) {
      flash(errMsg ?? "Action failed.");
      return;
    }
    if (successMsg) flash(successMsg);
    router.refresh();
  }

  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);
  const [newSort, setNewSort] = useState("0");
  const [newMinUsd, setNewMinUsd] = useState("");
  const [newMinSyp, setNewMinSyp] = useState("");

  const [requestFilter, setRequestFilter] = useState<"PENDING" | "APPROVED" | "ALL">("PENDING");
  const filteredRequests = useMemo(() => {
    if (requestFilter === "ALL") return props.requests;
    return props.requests.filter((r) => r.status === requestFilter);
  }, [props.requests, requestFilter]);

  function flash(m: string) {
    setMessage(m);
    window.setTimeout(() => setMessage(null), 5000);
  }

  return (
    <div className="space-y-10">
      {message ? (
        <div className="rounded-lg border border-[#2C4E7A]/20 bg-white px-4 py-3 text-sm text-[#1F3A5F]">
          {message}
        </div>
      ) : null}

      <CollapsibleSection id="admin-payments-methods" title={t("methods.sectionTitle")}>
        <p className="mt-2 text-sm text-[#2C4E7A]">
          {t("methods.help")}
        </p>

        <form
          className="mt-4 grid gap-3 rounded-xl border border-[#2C4E7A]/15 bg-[#F5F7FA] p-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await createPaymentMethodAction({
                name: newName,
                descriptionText: newText,
                descriptionMediaUrl: newMediaUrl,
                enabled: newEnabled,
                sort: Number(newSort),
                minDepositUsd: newMinUsd,
                minDepositSyp: newMinSyp,
              });
              if (!res.ok) {
                flash(res.message);
                return;
              }
              setNewName("");
              setNewText("");
              setNewMediaUrl("");
              setNewEnabled(true);
              setNewSort("0");
              setNewMinUsd("");
              setNewMinSyp("");
              flash(t("methods.created"));
            });
          }}
        >
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1F3A5F]">
              {t("methods.name")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/25 bg-white px-3 text-sm text-[#1F3A5F]"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={pending}
              maxLength={255}
              required
            />
          </label>
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1F3A5F]">
              {t("methods.descriptionOptional")}
            </div>
            <textarea
              className="mt-2 min-h-[80px] w-full rounded-xl border border-[#2C4E7A]/25 bg-white px-3 py-2 text-sm text-[#1F3A5F]"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              disabled={pending}
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1F3A5F]">
              {t("methods.photoUrlOptional")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/25 bg-white px-3 text-sm text-[#1F3A5F]"
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              disabled={pending}
              maxLength={512}
              placeholder="https://…"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1F3A5F]">
              {t("methods.sort")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/25 bg-white px-3 text-sm text-[#1F3A5F]"
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              disabled={pending}
              inputMode="numeric"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1F3A5F]">
              {t("methods.minDepositUsd")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/25 bg-white px-3 text-sm text-[#1F3A5F]"
              value={newMinUsd}
              onChange={(e) => setNewMinUsd(e.target.value)}
              disabled={pending}
              inputMode="decimal"
              placeholder={t("methods.minDepositUsdPlaceholder")}
            />
            <p className="mt-1 text-xs text-[#2C4E7A]">{t("methods.minDepositUsdHelp")}</p>
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1F3A5F]">
              {t("methods.minDepositSyp")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/25 bg-white px-3 text-sm text-[#1F3A5F]"
              value={newMinSyp}
              onChange={(e) => setNewMinSyp(e.target.value)}
              disabled={pending}
              inputMode="numeric"
              placeholder={t("methods.minDepositSypPlaceholder")}
            />
            <p className="mt-1 text-xs text-[#2C4E7A]">{t("methods.minDepositSypHelp")}</p>
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#1F3A5F] md:col-span-2">
            <input
              type="checkbox"
              checked={newEnabled}
              onChange={(e) => setNewEnabled(e.target.checked)}
              disabled={pending}
            />
            {t("methods.enabled")}
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1F3A5F] px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? t("methods.saving") : t("methods.addMethod")}
            </button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto rounded-lg border border-[#2C4E7A]/12 bg-white">
          <table className="min-w-full text-left text-sm text-[#1F3A5F]">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#E8EEF4] text-xs font-bold uppercase tracking-wide text-[#1F3A5F]">
              <tr>
                <th className="px-3 py-2.5">{t("methods.tableName")}</th>
                <th className="bg-[#DCE6F0] px-3 py-2.5">{t("methods.tableEnabled")}</th>
                <th className="bg-[#DCE6F0] px-3 py-2.5">{t("methods.tableSort")}</th>
                <th className="px-3 py-2.5">{t("methods.tablePhotoUrl")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {props.methods.map((m) => (
                <MethodRowEditor
                  key={`${m.id}:${m.updatedAt}`}
                  row={m}
                  pending={pending}
                  isPlatformAdmin={props.isPlatformAdmin}
                  onFlash={flash}
                  startTransition={startTransition}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="admin-payments-requests"
        title={t("requests.sectionTitle")}
        defaultOpen
      >
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-[#2C4E7A]">
            {t("requests.help")}
          </p>
          <label className="text-sm text-[#1F3A5F]">
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
                    {t("requests.noRequests")}
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
                      ) : r.status === "APPROVED" && props.isPlatformAdmin ? (
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
    </div>
  );
}

function MethodRowEditor(props: {
  row: MethodRow;
  pending: boolean;
  isPlatformAdmin: boolean;
  onFlash: (m: string) => void;
  startTransition: (fn: () => void) => void;
}) {
  const t = useTranslations("adminPayments.methods");
  const [name, setName] = useState(props.row.name);
  const [enabled, setEnabled] = useState(props.row.enabled);
  const [sort, setSort] = useState(String(props.row.sort));
  const [mediaUrl, setMediaUrl] = useState(props.row.descriptionMediaUrl ?? "");
  const [text, setText] = useState(props.row.descriptionText ?? "");
  const [minUsd, setMinUsd] = useState(formatMinUsdInput(props.row.minDepositUsdCents));
  const [minSyp, setMinSyp] = useState(formatMinSypInput(props.row.minDepositSyp));

  return (
    <tr className="border-b border-[#2C4E7A]/8 align-top">
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[180px] rounded border border-[#2C4E7A]/25 bg-white px-2 py-1 text-sm text-[#1F3A5F]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
        />
        <textarea
          className="mt-2 w-full min-w-[220px] rounded border border-[#2C4E7A]/25 bg-white px-2 py-1 text-sm text-[#1F3A5F]"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#1F3A5F]">
              {t("minDepositUsd")}
            </span>
            <input
              className="mt-1 w-full rounded border border-[#2C4E7A]/25 bg-white px-2 py-1 text-sm text-[#1F3A5F]"
              value={minUsd}
              onChange={(e) => setMinUsd(e.target.value)}
              inputMode="decimal"
              placeholder={t("minDepositUsdPlaceholder")}
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#1F3A5F]">
              {t("minDepositSyp")}
            </span>
            <input
              className="mt-1 w-full rounded border border-[#2C4E7A]/25 bg-white px-2 py-1 text-sm text-[#1F3A5F]"
              value={minSyp}
              onChange={(e) => setMinSyp(e.target.value)}
              inputMode="numeric"
              placeholder={t("minDepositSypPlaceholder")}
            />
          </label>
        </div>
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-20 rounded border border-[#2C4E7A]/25 bg-white px-2 py-1 text-sm text-[#1F3A5F]"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          inputMode="numeric"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[220px] rounded border border-[#2C4E7A]/25 bg-white px-2 py-1 text-sm text-[#1F3A5F]"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          maxLength={512}
          placeholder="https://…"
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button
          type="button"
          disabled={props.pending}
          className="mr-2 rounded bg-[#1F3A5F] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          onClick={() => {
            props.startTransition(async () => {
              const res = await updatePaymentMethodAction({
                id: props.row.id,
                name,
                descriptionText: text,
                descriptionMediaUrl: mediaUrl,
                enabled,
                sort: Number(sort),
                minDepositUsd: minUsd,
                minDepositSyp: minSyp,
              });
              if (!res.ok) props.onFlash(res.message);
              else props.onFlash(t("saved"));
            });
          }}
        >
          Save
        </button>
        {props.isPlatformAdmin ? (
          <button
            type="button"
            disabled={props.pending}
            className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
            onClick={() => {
              if (!window.confirm(t("deleteConfirm"))) return;
              props.startTransition(async () => {
                const res = await deletePaymentMethodAction({ id: props.row.id });
                if (!res.ok) props.onFlash(res.message);
                else props.onFlash(t("deleted"));
              });
            }}
          >
            Delete
          </button>
        ) : null}
      </td>
    </tr>
  );
}

