"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {
  createPaymentMethodAction,
  deletePaymentMethodAction,
  updatePaymentMethodAction,
} from "./actions";
import { WalletExchangeForm } from "./wallet-exchange-form";

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

export default function PaymentsAdminClient(props: {
  isPlatformAdmin: boolean;
  walletSypPerUsd: string;
  methods: MethodRow[];
}) {
  const t = useTranslations("adminPayments");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newText, setNewText] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newEnabled, setNewEnabled] = useState(true);
  const [newSort, setNewSort] = useState("0");
  const [newMinUsd, setNewMinUsd] = useState("");
  const [newMinSyp, setNewMinSyp] = useState("");

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

      <CollapsibleSection id="admin-payments-wallet-fx" title={t("walletExchange.sectionTitle")}>
        <p className="mt-2 text-sm text-[#2C4E7A]">{t("walletExchange.sectionHelp")}</p>
        <div className="mt-4">
          <WalletExchangeForm defaultSypPerUsd={props.walletSypPerUsd} />
        </div>
      </CollapsibleSection>

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

