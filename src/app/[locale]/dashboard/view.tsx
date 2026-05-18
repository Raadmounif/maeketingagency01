"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { pillClassForStatus } from "@/components/StatusPill";
import { PaymentTrackingCode } from "@/components/PaymentTrackingCode";
import { useRouter } from "@/i18n/routing";
import { checkMinDeposit } from "@/lib/payment-method-minimum";
import { dollarsToCents } from "@/lib/wallet";
import {
  formatPaymentRequestAmount,
  formatSypWhole,
  formatUsdFromCents,
  type PaymentAmountCurrency,
} from "@/lib/wallet-money";
import { createPaymentRequestAction, uploadPaymentProofAction } from "./actions";
import { useDashboardUrlHash } from "./use-dashboard-url-hash";

type FormToast = { kind: "success" | "error"; message: string };

type Method = {
  id: string;
  name: string;
  descriptionText: string | null;
  descriptionMediaUrl: string | null;
  minDepositUsdCents: number;
  minDepositSyp: number;
};

function formatUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

type PaymentRow = {
  id: string;
  trackingCode: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
  amountCurrency: PaymentAmountCurrency;
  amountCents: number;
  amountSyp: number;
  methodName: string;
  clientNote: string | null;
  proofUrl: string | null;
};

type ApiOrderRow = {
  id: string;
  createdAt: string;
  serviceName: string;
  link: string;
  quantity: number;
  chargeCents: number;
  status:
    | "PENDING"
    | "PROCESSING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "PARTIAL"
    | "CANCELED"
    | "FAILED";
  providerOrderId: number | null;
};

type ManualOrderRow = {
  id: string;
  createdAt: string;
  serviceName: string;
  link: string;
  units: number;
  unitPriceUsd: string;
  totalUsd: string;
  status: "ORDERED" | "DONE";
  clientNote: string | null;
};

function paymentStatusLabel(
  status: PaymentRow["status"],
  t: ReturnType<typeof useTranslations<"dashboardPage">>,
) {
  switch (status) {
    case "APPROVED":
      return t("paymentStatusApproved");
    case "REJECTED":
      return t("paymentStatusRejected");
    case "REFUNDED":
      return t("paymentStatusRefunded");
    default:
      return t("paymentStatusPending");
  }
}

function apiOrderStatusLabel(
  status: ApiOrderRow["status"],
  t: ReturnType<typeof useTranslations<"dashboardPage">>,
) {
  switch (status) {
    case "PROCESSING":
      return t("orderStatusProcessing");
    case "IN_PROGRESS":
      return t("orderStatusInProgress");
    case "COMPLETED":
      return t("orderStatusCompleted");
    case "PARTIAL":
      return t("orderStatusPartial");
    case "CANCELED":
      return t("orderStatusCanceled");
    case "FAILED":
      return t("orderStatusFailed");
    default:
      return t("orderStatusPending");
  }
}

export default function DashboardClient(props: {
  walletBalanceDisplay: string;
  defaultPaymentCurrency: PaymentAmountCurrency;
  methods: Method[];
  payments: PaymentRow[];
  orderedServices: {
    api: ApiOrderRow[];
    manual: ManualOrderRow[];
  };
}) {
  const t = useTranslations("dashboardPage");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<FormToast | null>(null);

  const [methodId, setMethodId] = useState(props.methods[0]?.id ?? "");
  const [paymentCurrency, setPaymentCurrency] = useState<PaymentAmountCurrency>(
    props.defaultPaymentCurrency,
  );
  const [amount, setAmount] = useState("");
  const [proofCode, setProofCode] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const paymentCurrencyBtn = (active: boolean) =>
    [
      "rounded-md px-2.5 py-1 text-xs font-bold transition",
      active ? "bg-[#1F3A5F] text-white" : "bg-white text-[#2C4E7A]/80 hover:bg-[#F5F7FA]",
    ].join(" ");

  const { hashId: urlHashId, hashNonce: urlHashNonce } = useDashboardUrlHash();

  const selectedMethod = useMemo(
    () => props.methods.find((m) => m.id === methodId) ?? null,
    [props.methods, methodId],
  );

  const methodMinHint = useMemo(() => {
    if (!selectedMethod) return null;
    if (paymentCurrency === "USD" && selectedMethod.minDepositUsdCents > 0) {
      return t("methodMinHintUsd", {
        amount: formatUsdFromCents(selectedMethod.minDepositUsdCents),
      });
    }
    if (paymentCurrency === "SYP" && selectedMethod.minDepositSyp > 0) {
      return t("methodMinHintSyp", { amount: formatSypWhole(selectedMethod.minDepositSyp) });
    }
    return null;
  }, [selectedMethod, paymentCurrency, t]);

  function minDepositToastMessage(
    currency: PaymentAmountCurrency,
    violation: NonNullable<ReturnType<typeof checkMinDeposit>>,
  ) {
    if (violation.code === "below_min_usd") {
      return t("minDepositUsd", { amount: formatUsdFromCents(violation.minCents) });
    }
    return t("minDepositSyp", { amount: formatSypWhole(violation.minSyp) });
  }

  function showToast(kind: FormToast["kind"], message: string) {
    setToast({ kind, message });
  }

  useEffect(() => {
    if (!toast) return;
    document.getElementById("dash-payment-submit-feedback")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (urlHashId !== "dash-overview") return;
    queueMicrotask(() => {
      document.getElementById("dash-overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [urlHashId]);

  const sortedPayments = useMemo(() => props.payments, [props.payments]);
  const ordered = useMemo(() => {
    const merged: Array<
      | ({ kind: "API" } & ApiOrderRow)
      | ({ kind: "MANUAL" } & ManualOrderRow)
    > = [
      ...props.orderedServices.api.map((o) => ({ kind: "API" as const, ...o })),
      ...props.orderedServices.manual.map((o) => ({ kind: "MANUAL" as const, ...o })),
    ];
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  }, [props.orderedServices.api, props.orderedServices.manual]);

  return (
    <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
      <div id="dash-overview" className="scroll-mt-[5.75rem]">
        <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">{t("title")}</h1>
      </div>
      <div className="mt-2 text-[#2C4E7A]/90">
        {t("walletBalance")}{" "}
        <span className="font-semibold text-[#1F3A5F]">{props.walletBalanceDisplay}</span>
      </div>

      {toast ? (
        <div
          className={[
            "pointer-events-none fixed bottom-4 end-4 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg",
            toast.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-rose-300 bg-rose-50 text-rose-950",
          ].join(" ")}
          role="alert"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      <CollapsibleSection
        id="dash-add-funds"
        title={t("addFunds")}
        className="mt-8"
        defaultOpen
        urlHashId={urlHashId}
        urlHashNonce={urlHashNonce}
      >
        <p className="mt-2 text-sm text-[#2C4E7A]/85">
          {t.rich("addFundsHelp", {
            pending: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>

        {!props.methods.length ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {t("noPaymentMethods")}
          </p>
        ) : null}

        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();

            if (!props.methods.length) {
              showToast("error", t("noPaymentMethods"));
              return;
            }
            if (!methodId) {
              showToast("error", t("choosePaymentMethod"));
              return;
            }

            const amountNum = Number(String(amount).replace(",", ".").trim());
            if (!Number.isFinite(amountNum) || amountNum <= 0) {
              showToast("error", t("validationAmount"));
              return;
            }

            const method = props.methods.find((m) => m.id === methodId);
            if (!method) {
              showToast("error", t("choosePaymentMethod"));
              return;
            }

            const amountCents =
              paymentCurrency === "USD" ? dollarsToCents(amountNum) : 0;
            const amountSyp =
              paymentCurrency === "SYP" ? Math.floor(amountNum) : 0;
            const minViolation = checkMinDeposit(
              paymentCurrency,
              amountCents,
              amountSyp,
              {
                minDepositUsdCents: method.minDepositUsdCents,
                minDepositSyp: method.minDepositSyp,
              },
            );
            if (minViolation) {
              showToast("error", minDepositToastMessage(paymentCurrency, minViolation));
              return;
            }

            const code = proofCode.trim();
            if (code.length < 2 && !proofFile) {
              showToast("error", t("validationProof"));
              return;
            }

            startTransition(async () => {
              try {
                let proofUrl: string | undefined;
                if (proofFile) {
                  const uploadFd = new FormData();
                  uploadFd.set("file", proofFile);
                  const up = await uploadPaymentProofAction(uploadFd);
                  if (up.ok) {
                    proofUrl = up.url;
                  } else {
                    const apiRes = await fetch("/api/payments/upload-proof", {
                      method: "POST",
                      body: uploadFd,
                    });
                    const apiJson = (await apiRes.json()) as {
                      ok?: boolean;
                      url?: string;
                      message?: string;
                    };
                    if (apiJson.ok && apiJson.url) {
                      proofUrl = apiJson.url;
                    } else {
                      showToast(
                        "error",
                        apiJson.message ??
                          ("message" in up ? up.message : t("requestFailed")),
                      );
                      return;
                    }
                  }
                }

                const res = await createPaymentRequestAction({
                  methodId,
                  amount: amountNum,
                  currency: paymentCurrency,
                  proofCode: code,
                  proofUrl,
                });

                if (res.ok) {
                  showToast(
                    "success",
                    "trackingCode" in res && res.trackingCode
                      ? t("paymentCreatedWithCode", { code: res.trackingCode })
                      : t("paymentCreated"),
                  );
                  setAmount("");
                  setProofCode("");
                  setProofFile(null);
                  if (proofPreview) URL.revokeObjectURL(proofPreview);
                  setProofPreview(null);
                  router.refresh();
                  return;
                }

                showToast(
                  "error",
                  "message" in res ? res.message : t("requestFailed"),
                );
              } catch (err) {
                showToast("error", err instanceof Error ? err.message : t("requestFailed"));
              }
            });
          }}
        >
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("method")}
            </div>
            <select
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
              disabled={pending}
            >
              {props.methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("amount")}
            </div>
            <div
              className="mt-2 flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t("paymentCurrencyToggle")}
            >
              <div className="flex rounded-lg border border-[#2C4E7A]/20 bg-[#F5F7FA] p-0.5">
                <button
                  type="button"
                  className={paymentCurrencyBtn(paymentCurrency === "USD")}
                  onClick={() => setPaymentCurrency("USD")}
                  disabled={pending}
                >
                  USD
                </button>
                <button
                  type="button"
                  className={paymentCurrencyBtn(paymentCurrency === "SYP")}
                  onClick={() => setPaymentCurrency("SYP")}
                  disabled={pending}
                >
                  SYP
                </button>
              </div>
              <input
                className="h-11 min-w-0 flex-1 rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
                inputMode={paymentCurrency === "SYP" ? "numeric" : "decimal"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={pending}
                placeholder={
                  paymentCurrency === "SYP" ? t("amountSypPlaceholder") : t("amountUsdPlaceholder")
                }
              />
            </div>
            {methodMinHint ? (
              <p className="mt-2 text-sm font-medium text-[#1F3A5F]">{methodMinHint}</p>
            ) : null}
          </div>
          <div className="md:col-span-2 rounded-xl border border-[#2C4E7A]/15 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("paymentProofTitle")}</div>
            <p className="mt-1 text-xs text-[#2C4E7A]/80">{t("paymentProofHelp")}</p>
            <label className="mt-4 block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("proofCodeLabel")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={proofCode}
              onChange={(e) => setProofCode(e.target.value)}
              disabled={pending}
              placeholder={t("proofCodePlaceholder")}
              maxLength={512}
            />
            </label>
            <div className="my-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#2C4E7A]/15" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2C4E7A]/55">
                {t("proofOr")}
              </span>
              <span className="h-px flex-1 bg-[#2C4E7A]/15" />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("proofUploadLabel")}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[#2C4E7A]/25 bg-[#F5F7FA] px-4 text-sm font-semibold text-[#1F3A5F] transition hover:bg-white">
                {proofFile ? t("proofUploaded") : t("proofUploadButton")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (proofPreview) URL.revokeObjectURL(proofPreview);
                    setProofFile(f);
                    setProofPreview(f ? URL.createObjectURL(f) : null);
                    e.target.value = "";
                  }}
                />
              </label>
              {proofFile ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[#2C4E7A]/80 underline"
                  disabled={pending}
                  onClick={() => {
                    if (proofPreview) URL.revokeObjectURL(proofPreview);
                    setProofFile(null);
                    setProofPreview(null);
                  }}
                >
                  {t("proofRemove")}
                </button>
              ) : null}
            </div>
            {proofPreview ? (
              <img
                src={proofPreview}
                alt=""
                className="mt-3 max-h-40 rounded-lg border border-[#2C4E7A]/15 object-contain"
              />
            ) : null}
          </div>
          <div id="dash-payment-submit-feedback" className="md:col-span-2 space-y-3">
            {toast ? (
              <div
                className={[
                  "rounded-lg border px-4 py-3 text-sm font-medium",
                  toast.kind === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900",
                ].join(" ")}
                role="status"
              >
                {toast.message}
              </div>
            ) : null}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pending || !props.methods.length}
                className="inline-flex h-11 min-w-[10rem] items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-6 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
              >
                {pending ? t("submitting") : t("submitRequest")}
              </button>
            </div>
          </div>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        id="dash-payments"
        title={t("myPayments")}
        className="mt-8"
        urlHashId={urlHashId}
        urlHashNonce={urlHashNonce}
      >
        <div className="mt-3 overflow-x-auto rounded-lg border border-[#2C4E7A]/12">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-3 py-2">{t("trackingCode")}</th>
                <th className="px-3 py-2">{t("tableWhen")}</th>
                <th className="px-3 py-2">{t("tableMethod")}</th>
                <th className="px-3 py-2">{t("tableAmount")}</th>
                <th className="px-3 py-2">{t("tableStatus")}</th>
                <th className="px-3 py-2">{t("tableNote")}</th>
                <th className="px-3 py-2">{t("tableProof")}</th>
              </tr>
            </thead>
            <tbody className="text-[#1F3A5F]">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[#2C4E7A]">
                    {t("noPaymentsYet")}
                  </td>
                </tr>
              ) : (
                sortedPayments.map((p) => (
                  <tr key={p.id} className="border-b border-[#2C4E7A]/8">
                    <td className="px-3 py-2">
                      <PaymentTrackingCode
                        code={p.trackingCode}
                        copyLabel={t("copyCode")}
                        copiedLabel={t("copiedCode")}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#2C4E7A]">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium text-[#1F3A5F]">{p.methodName}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-[#1F3A5F]">
                      {formatPaymentRequestAmount(p)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-[#1F3A5F]">
                      {paymentStatusLabel(p.status, t)}
                    </td>
                    <td className="max-w-[220px] px-3 py-2 text-[#2C4E7A]">
                      {p.clientNote ?? t("emptyCell")}
                    </td>
                    <td className="px-3 py-2 text-[#2C4E7A]">
                      {p.proofUrl ? (
                        <a
                          href={p.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#1F3A5F] underline"
                        >
                          {t("openProof")}
                        </a>
                      ) : (
                        t("emptyCell")
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="dash-orders"
        title={t("orderedServices")}
        className="mt-8"
        urlHashId={urlHashId}
        urlHashNonce={urlHashNonce}
      >
        <p className="mt-2 text-sm text-[#2C4E7A]/85">{t("ordersHelp")}</p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-[#2C4E7A]/12">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-3 py-2">{t("orderTableWhen")}</th>
                <th className="px-3 py-2">{t("orderTableType")}</th>
                <th className="px-3 py-2">{t("orderTableService")}</th>
                <th className="px-3 py-2">{t("orderTableDetails")}</th>
                <th className="px-3 py-2">{t("orderTableTotal")}</th>
                <th className="px-3 py-2">{t("orderTableStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[#2C4E7A]/75">
                    {t("noOrdersYet")}
                  </td>
                </tr>
              ) : (
                ordered.map((o) => (
                  <tr key={`${o.kind}-${o.id}`} className="border-b border-[#2C4E7A]/8">
                    <td className="whitespace-nowrap px-3 py-2 text-[#2C4E7A]/90">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-[#1F3A5F]">
                      {o.kind === "API" ? t("orderTypeApi") : t("orderTypeManual")}
                    </td>
                    <td className="max-w-[260px] px-3 py-2 text-[#1F3A5F]">{o.serviceName}</td>
                    <td className="px-3 py-2 text-[#2C4E7A]/90">
                      {o.kind === "API" ? (
                        <div className="space-y-0.5">
                          <div className="max-w-[420px] truncate" title={o.link}>
                            {o.link}
                          </div>
                          <div className="text-xs text-[#2C4E7A]/75">
                            {t("orderQty", { qty: o.quantity })}
                            {o.providerOrderId
                              ? ` · ${t("orderProviderId", { id: o.providerOrderId })}`
                              : ""}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="max-w-[420px] truncate" title={o.link}>
                            {o.link}
                          </div>
                          <div className="text-xs text-[#2C4E7A]/75">
                            {t("orderUnits", { units: o.units })} ·{" "}
                            {t("orderUnitPrice", { price: o.unitPriceUsd })}
                          </div>
                          <div className="text-xs text-[#2C4E7A]/75">
                            {t("orderNote", {
                              note: o.clientNote?.trim() ? o.clientNote : t("emptyCell"),
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-[#1F3A5F]">
                      {o.kind === "API" ? `$${formatUsd(o.chargeCents)}` : `$${o.totalUsd}`}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                          pillClassForStatus(
                            o.kind === "API" ? o.status : o.status === "DONE" ? "SUCCEEDED" : "ORDERED",
                          ),
                        ].join(" ")}
                      >
                        {o.kind === "API"
                          ? apiOrderStatusLabel(o.status, t)
                          : o.status === "DONE"
                            ? t("orderStatusSucceeded")
                            : t("orderStatusOrdered")}
                      </span>
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

