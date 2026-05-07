"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {
  approvePaymentRequestAction,
  createPaymentMethodAction,
  deletePaymentMethodAction,
  rejectPaymentRequestAction,
  refundPaymentRequestAction,
  updatePaymentMethodAction,
} from "./actions";

function formatUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

type MethodRow = {
  id: string;
  name: string;
  descriptionText: string | null;
  descriptionMediaUrl: string | null;
  enabled: boolean;
  sort: number;
  updatedAt: string;
};

type RequestRow = {
  id: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";
  amountCents: number;
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
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);
  const [newSort, setNewSort] = useState("0");

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
        <p className="mt-2 text-sm text-[#2C4E7A]/85">
          {t("methods.help")}
        </p>

        <form
          className="mt-4 grid gap-3 rounded-xl border border-[#2C4E7A]/10 bg-white p-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await createPaymentMethodAction({
                name: newName,
                descriptionText: newText,
                descriptionMediaUrl: newMediaUrl,
                enabled: newEnabled,
                sort: Number(newSort),
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
              flash(t("methods.created"));
            });
          }}
        >
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("methods.name")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={pending}
              maxLength={255}
              required
            />
          </label>
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("methods.descriptionOptional")}
            </div>
            <textarea
              className="mt-2 min-h-[80px] w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 py-2 text-sm text-[#1F3A5F]"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              disabled={pending}
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("methods.photoUrlOptional")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              disabled={pending}
              maxLength={512}
              placeholder="https://…"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/70">
              {t("methods.sort")}
            </div>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-3 text-sm text-[#1F3A5F]"
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              disabled={pending}
              inputMode="numeric"
            />
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
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-3 py-2">{t("methods.tableName")}</th>
                <th className="px-3 py-2">{t("methods.tableEnabled")}</th>
                <th className="px-3 py-2">{t("methods.tableSort")}</th>
                <th className="px-3 py-2">{t("methods.tablePhotoUrl")}</th>
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

      <CollapsibleSection id="admin-payments-requests" title={t("requests.sectionTitle")}>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-[#2C4E7A]/85">
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
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#2C4E7A]/12 bg-[#F5F7FA] text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/80">
              <tr>
                <th className="px-3 py-2">{t("requests.tableWhen")}</th>
                <th className="px-3 py-2">{t("requests.tableClient")}</th>
                <th className="px-3 py-2">{t("requests.tableMethod")}</th>
                <th className="px-3 py-2">{t("requests.tableAmount")}</th>
                <th className="px-3 py-2">{t("requests.tableStatus")}</th>
                <th className="px-3 py-2">{t("requests.tableNote")}</th>
                <th className="px-3 py-2">{t("requests.tableProof")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-[#2C4E7A]/75">
                    {t("requests.noRequests")}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="border-b border-[#2C4E7A]/8 align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-[#2C4E7A]/90">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[#2C4E7A]/90">
                      <div className="font-medium text-[#1F3A5F]">{r.userEmail}</div>
                      {r.userName ? <div className="text-xs">{r.userName}</div> : null}
                    </td>
                    <td className="px-3 py-2">{r.methodName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">${formatUsd(r.amountCents)}</td>
                    <td className="px-3 py-2 font-semibold">{r.status}</td>
                    <td className="max-w-[220px] px-3 py-2 text-[#2C4E7A]/90">
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
                                if (!res.ok) flash(res.message);
                                else flash(t("requests.approvedFlash"));
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
                                if (!res.ok) flash(res.message);
                                else flash(t("requests.rejectedFlash"));
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
                              if (!res.ok) flash(res.message);
                              else flash(t("requests.refundedFlash"));
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

  return (
    <tr className="border-b border-[#2C4E7A]/8 align-top">
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[180px] rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
        />
        <textarea
          className="mt-2 w-full min-w-[220px] rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-20 rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          inputMode="numeric"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full min-w-[220px] rounded border border-[#2C4E7A]/15 px-2 py-1 text-sm"
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

