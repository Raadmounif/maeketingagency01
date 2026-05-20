"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Link } from "@/i18n/routing";
import {
  createSmmClientCategoryAction,
  deleteSmmClientCategoryAction,
  addServiceToSmmClientCategoryAction,
  removeServiceFromSmmClientCategoryAction,
  addManualServiceToSmmClientCategoryAction,
  removeManualServiceFromSmmClientCategoryAction,
  syncSmmCatalogAction,
  updateSmmAdvertisingBoardAction,
  uploadSmmAdvertisingBoardPhotoAction,
  addSmmTopPickAction,
  deleteSmmTopPickAction,
  updateSmmTopPickAction,
  updateSmmClientCategoryAction,
  updateSmmProviderSettingsAction,
  updateSmmServiceClientCopyAction,
  updateSmmServiceVisibilityAction,
  upsertSmmServiceMarkupPercentAction,
} from "./actions";

type ServiceRow = {
  id: string;
  providerServiceId: number;
  name: string;
  clientTitle: string | null;
  clientDescription: string | null;
  enabledForClients: boolean;
  /** When set, overrides default markup % for this API service. */
  markupPercent: number | null;
};

type CategoryRow = {
  id: string;
  name: string;
  services: ServiceRow[];
};

type Defaults = {
  baseUrl: string;
  globalMarkupPercent: number;
  clientCategories: Array<{
    id: string;
    nameEn: string;
    nameAr: string;
    offerPriceCents: number;
    enabled: boolean;
    sort: number;
    items: Array<{
      id: string;
      serviceId: string;
      serviceName: string;
      markupPct: number;
      offerQuantity: number;
    }>;
    manualItems: Array<{
      id: string;
      customServiceId: string;
      customServiceName: string;
      offerUnits: number;
      sort: number;
    }>;
  }>;
  categories: CategoryRow[];
};

type ClientCategoryRow = Defaults["clientCategories"][number];

type ClientCategoryUiRow = ClientCategoryRow & {
  offerPriceUsd: string;
};

type AdvertisingBoardPayload = {
  enabled: boolean;
  title: string;
  body: string;
  linkUrl: string | null;
  mediaUrl: string | null;
  mediaKind: "auto" | "image" | "video" | null;
};

type AdvertisingBoardForm = {
  title: string;
  body: string;
  mediaUrl: string;
};

function boardToForm(p: AdvertisingBoardPayload): AdvertisingBoardForm {
  return {
    title: p.title,
    body: p.body,
    mediaUrl: p.mediaUrl ?? "",
  };
}

function buildFlags(categories: CategoryRow[]) {
  const m: Record<string, boolean> = {};
  for (const c of categories) {
    for (const s of c.services) {
      m[s.id] = s.enabledForClients;
    }
  }
  return m;
}

function ClientCategoriesManager({
  allServices,
  manualServices,
  categories,
  pending,
  onMessage,
  refresh,
}: {
  allServices: Array<{ id: string; name: string }>;
  manualServices: Array<{ id: string; name: string; enabled: boolean }>;
  categories: ClientCategoryRow[];
  pending: boolean;
  onMessage: (msg: string | null) => void;
  refresh: () => void;
}) {
  const t = useTranslations("adminSmm");
  const [uiPending, startTransition] = useTransition();
  const busy = pending || uiPending;

  const [cats, setCats] = useState<ClientCategoryUiRow[]>(() =>
    categories.map((c) => ({
      ...c,
      offerPriceUsd: ((Number(c.offerPriceCents) || 0) / 100).toFixed(2),
      items: [...c.items],
      manualItems: [...c.manualItems],
    })),
  );

  const [createNameEn, setCreateNameEn] = useState("");
  const [createNameAr, setCreateNameAr] = useState("");
  const [createEnabled, setCreateEnabled] = useState(true);
  const [createSort, setCreateSort] = useState("0");
  const [createOfferPriceUsd, setCreateOfferPriceUsd] = useState("0");

  const [addCategoryId, setAddCategoryId] = useState<string>("");
  const [addServiceId, setAddServiceId] = useState<string>("");
  const [addMarkupPct, setAddMarkupPct] = useState("0");
  const [addOfferQuantity, setAddOfferQuantity] = useState("1000");
  const [addSort, setAddSort] = useState("0");

  const [addManualCategoryId, setAddManualCategoryId] = useState<string>("");
  const [addCustomServiceId, setAddCustomServiceId] = useState<string>("");
  const [addOfferUnits, setAddOfferUnits] = useState("1");
  const [addManualSort, setAddManualSort] = useState("0");

  function createCategory() {
    onMessage(null);
    startTransition(async () => {
      const res = await createSmmClientCategoryAction({
        nameEn: createNameEn,
        nameAr: createNameAr,
        offerPriceUsd: createOfferPriceUsd,
        enabled: createEnabled,
        sort: Number(createSort),
      });
      onMessage(res.ok ? t("status.createdClientCategory") : res.message);
      if (res.ok) {
        setCreateNameEn("");
        setCreateNameAr("");
        setCreateEnabled(true);
        setCreateSort("0");
        setCreateOfferPriceUsd("0");
      }
      refresh();
    });
  }

  function saveCategory(c: ClientCategoryUiRow) {
    onMessage(null);
    startTransition(async () => {
      const res = await updateSmmClientCategoryAction({
        id: c.id,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        offerPriceUsd: c.offerPriceUsd,
        enabled: c.enabled,
        sort: Number(c.sort),
      });
      onMessage(res.ok ? t("status.savedCategory") : res.message);
      refresh();
    });
  }

  function deleteCategory(id: string) {
    onMessage(null);
    startTransition(async () => {
      const res = await deleteSmmClientCategoryAction({ id });
      onMessage(res.ok ? t("status.deletedCategory") : res.message);
      refresh();
    });
  }

  function addService() {
    onMessage(null);
    startTransition(async () => {
      const res = await addServiceToSmmClientCategoryAction({
        categoryId: addCategoryId,
        serviceId: addServiceId,
        markupPct: Number(addMarkupPct),
        offerQuantity: Number(addOfferQuantity),
        sort: Number(addSort),
      });
      onMessage(res.ok ? t("status.addedServiceToCategory") : res.message);
      if (res.ok) {
        setAddServiceId("");
        setAddMarkupPct("0");
        setAddOfferQuantity("1000");
        setAddSort("0");
      }
      refresh();
    });
  }

  function removeItem(itemId: string) {
    onMessage(null);
    startTransition(async () => {
      const res = await removeServiceFromSmmClientCategoryAction({ itemId });
      onMessage(res.ok ? t("status.removedServiceFromCategory") : res.message);
      refresh();
    });
  }

  function addManualService() {
    onMessage(null);
    startTransition(async () => {
      const res = await addManualServiceToSmmClientCategoryAction({
        categoryId: addManualCategoryId,
        customServiceId: addCustomServiceId,
        offerUnits: Number(addOfferUnits),
        sort: Number(addManualSort),
      });
      onMessage(res.ok ? t("status.addedServiceToCategory") : res.message);
      if (res.ok) {
        setAddCustomServiceId("");
        setAddOfferUnits("1");
        setAddManualSort("0");
      }
      refresh();
    });
  }

  function removeManualItem(itemId: string) {
    onMessage(null);
    startTransition(async () => {
      const res = await removeManualServiceFromSmmClientCategoryAction({ itemId });
      onMessage(res.ok ? t("status.removedServiceFromCategory") : res.message);
      refresh();
    });
  }

  return (
    <div>
      <div className="text-sm font-semibold text-[#1F3A5F]">{t("offers.sectionTitle")}</div>
      <p className="mt-2 text-xs text-[#2C4E7A]/80">{t("offers.help")}</p>

      <div className="mt-5 grid gap-4 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 lg:grid-cols-5">
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.nameEn")}</div>
          <input
            value={createNameEn}
            onChange={(e) => setCreateNameEn(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.nameAr")}</div>
          <input
            value={createNameAr}
            onChange={(e) => setCreateNameAr(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.sort")}</div>
          <input
            value={createSort}
            onChange={(e) => setCreateSort(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.offerPriceUsd")}</div>
          <input
            value={createOfferPriceUsd}
            onChange={(e) => setCreateOfferPriceUsd(e.target.value)}
            inputMode="decimal"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <div className="flex items-end justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F3A5F]">
            <input
              type="checkbox"
              checked={createEnabled}
              onChange={(e) => setCreateEnabled(e.target.checked)}
            />
            {t("offers.enabled")}
          </label>
          <button
            type="button"
            disabled={busy || !createNameEn.trim() || !createNameAr.trim()}
            onClick={createCategory}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-xs font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {t("offers.create")}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.category")}</div>
          <select
            value={addCategoryId}
            onChange={(e) => setAddCategoryId(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          >
            <option value="">{t("offers.choose")}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn} / {c.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label className="block lg:col-span-2">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.service")}</div>
          <select
            value={addServiceId}
            onChange={(e) => setAddServiceId(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          >
            <option value="">{t("offers.choose")}</option>
            {allServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.markupPct")}</div>
          <input
            value={addMarkupPct}
            onChange={(e) => setAddMarkupPct(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.offerQuantity")}</div>
          <input
            value={addOfferQuantity}
            onChange={(e) => setAddOfferQuantity(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.sort")}</div>
          <input
            value={addSort}
            onChange={(e) => setAddSort(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy || !addCategoryId || !addServiceId}
            onClick={addService}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
          >
            {t("offers.addToCategory")}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.category")}</div>
          <select
            value={addManualCategoryId}
            onChange={(e) => setAddManualCategoryId(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          >
            <option value="">{t("offers.choose")}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn} / {c.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label className="block lg:col-span-2">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.manualService")}</div>
          <select
            value={addCustomServiceId}
            onChange={(e) => setAddCustomServiceId(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          >
            <option value="">{t("offers.choose")}</option>
            {manualServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.enabled ? "" : t("offers.disabledSuffix")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.units")}</div>
          <input
            value={addOfferUnits}
            onChange={(e) => setAddOfferUnits(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.sort")}</div>
          <input
            value={addManualSort}
            onChange={(e) => setAddManualSort(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={busy || !addManualCategoryId || !addCustomServiceId}
            onClick={addManualService}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
          >
            {t("offers.addManual")}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {cats.length === 0 ? (
          <div className="text-sm text-[#2C4E7A]/80">{t("offers.noCategories")}</div>
        ) : (
          cats.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#2C4E7A]/12 bg-white">
              <div className="grid gap-3 border-b border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 md:grid-cols-5">
                <label className="block md:col-span-2">
                  <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.nameEn")}</div>
                  <input
                    value={c.nameEn}
                    onChange={(e) =>
                      setCats((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, nameEn: e.target.value } : x)),
                      )
                    }
                    className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                  />
                </label>
                <label className="block md:col-span-2">
                  <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.nameAr")}</div>
                  <input
                    value={c.nameAr}
                    onChange={(e) =>
                      setCats((prev) =>
                        prev.map((x) => (x.id === c.id ? { ...x, nameAr: e.target.value } : x)),
                      )
                    }
                    className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                  />
                </label>
                <label className="block">
                  <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.sort")}</div>
                  <input
                    value={String(c.sort)}
                    onChange={(e) =>
                      setCats((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, sort: Number(e.target.value) || 0 } : x,
                        ),
                      )
                    }
                    inputMode="numeric"
                    className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                  />
                </label>
                <label className="block">
                  <div className="text-xs font-semibold text-[#1F3A5F]">{t("offers.offerPriceUsd")}</div>
                  <input
                    value={c.offerPriceUsd}
                    onChange={(e) =>
                      setCats((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, offerPriceUsd: e.target.value } : x,
                        ),
                      )
                    }
                    inputMode="decimal"
                    className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                  />
                </label>
                <div className="flex items-end justify-between gap-3 md:col-span-5">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F3A5F]">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={(e) =>
                        setCats((prev) =>
                          prev.map((x) => (x.id === c.id ? { ...x, enabled: e.target.checked } : x)),
                        )
                      }
                    />
                    {t("offers.enabled")}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveCategory(cats.find((x) => x.id === c.id) ?? c)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                    >
                      {t("offers.save")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteCategory(c.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/20 bg-white px-4 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {t("offers.delete")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#2C4E7A]/10">
                {c.items.length === 0 && c.manualItems.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[#2C4E7A]/80">{t("offers.noServicesAssigned")}</div>
                ) : null}

                {c.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1F3A5F]">{it.serviceName}</div>
                      <div className="mt-1 text-xs text-[#2C4E7A]/75">
                        {t("offers.markupLabel", { pct: it.markupPct })}
                      </div>
                      <div className="mt-1 text-xs text-[#2C4E7A]/75">
                        {t("offers.offerQtyLabel", { qty: it.offerQuantity })}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeItem(it.id)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                    >
                      {t("offers.remove")}
                    </button>
                  </div>
                ))}

                {c.manualItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#1F3A5F]">
                        {it.customServiceName}{" "}
                        <span className="text-xs font-medium text-[#2C4E7A]/70">{t("offers.manualTag")}</span>
                      </div>
                      <div className="mt-1 text-xs text-[#2C4E7A]/75">
                        {t("offers.unitsLabel", { units: it.offerUnits })}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeManualItem(it.id)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                    >
                      {t("offers.remove")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SmmAdvertisingBoardsForm({
  boards,
  topPicks,
  options,
  onMessage,
  refresh,
}: {
  boards: { en: AdvertisingBoardPayload; ar: AdvertisingBoardPayload };
  topPicks: Array<{
    id: string;
    kind: "API" | "MANUAL" | "OFFER";
    refId: string;
    enabled: boolean;
    sort: number;
    updatedAt: string;
  }>;
  options: {
    apiServices: Array<{ id: string; name: string }>;
    manualServices: Array<{ id: string; name: string; enabled: boolean }>;
    offers: Array<{ id: string; nameEn: string; nameAr: string; enabled: boolean }>;
  };
  onMessage: (msg: string | null) => void;
  refresh: () => void;
}) {
  const t = useTranslations("adminSmm");
  const locale = useLocale();
  const [adPending, startAdTransition] = useTransition();
  const [uploading, startUploadTransition] = useTransition();
  const [adEn, setAdEn] = useState(() => boardToForm(boards.en));
  const [adAr, setAdAr] = useState(() => boardToForm(boards.ar));
  const [pickKind, setPickKind] = useState<"API" | "MANUAL" | "OFFER">("API");
  const [pickRefId, setPickRefId] = useState("");
  const [pickSort, setPickSort] = useState("0");

  function uploadPhoto(locale: "en" | "ar", file: File) {
    startUploadTransition(async () => {
      onMessage(null);
      const fd = new FormData();
      fd.set("locale", locale);
      fd.set("file", file);
      const res = await uploadSmmAdvertisingBoardPhotoAction(fd);
      if (!res.ok) {
        onMessage(res.message);
        return;
      }
      if (locale === "en") setAdEn((p) => ({ ...p, mediaUrl: res.url }));
      else setAdAr((p) => ({ ...p, mediaUrl: res.url }));
    });
  }

  function saveAdvertisingBoard(locale: "en" | "ar") {
    const b = locale === "en" ? adEn : adAr;
    onMessage(null);
    startAdTransition(async () => {
      const res = await updateSmmAdvertisingBoardAction({
        locale,
        enabled: Boolean(b.title.trim() || b.body.trim() || b.mediaUrl.trim()),
        title: b.title,
        body: b.body,
        linkUrl: null,
        mediaUrl: b.mediaUrl.trim() ? b.mediaUrl.trim() : null,
        mediaKind: b.mediaUrl.trim() ? "image" : null,
      });
      onMessage(
        res.ok
          ? t("ads.savedBoard", { lang: locale === "en" ? t("ads.langEn") : t("ads.langAr") })
          : res.message,
      );
      refresh();
    });
  }

  function PreviewCard(props: { title: string; body: string; mediaUrl: string }) {
    const bg = props.mediaUrl.trim();
    return (
      <div
        className="overflow-hidden rounded-xl border border-[#2C4E7A]/12 bg-white shadow-sm"
        style={bg ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className={["p-4", bg ? "bg-gradient-to-b from-black/55 via-black/35 to-black/60 text-white" : ""].join(" ")}>
          <div className={["text-base font-bold", bg ? "text-white" : "text-[#1F3A5F]"].join(" ")}>
            {props.title.trim() || "—"}
          </div>
          <div className={["mt-2 whitespace-pre-wrap text-sm", bg ? "text-white/90" : "text-[#2C4E7A]/90"].join(" ")}>
            {props.body.trim() || ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-semibold text-[#1F3A5F]">{t("ads.sectionTitle")}</div>
      <p className="mt-2 text-xs text-[#2C4E7A]/80">
        {t("ads.sectionHelpPrefix")} <span className="font-semibold">/trust</span>{" "}
        {t("ads.sectionHelpSuffix")}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/75">
            {t("ads.langEn")}
          </div>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.title")}</div>
            <input
              value={adEn.title}
              onChange={(e) => setAdEn((p) => ({ ...p, title: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.body")}</div>
            <textarea
              value={adEn.body}
              onChange={(e) => setAdEn((p) => ({ ...p, body: e.target.value }))}
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-[#2C4E7A]/20 bg-white px-3 py-2 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <div className="mt-4 grid gap-3">
            <label className="block">
              <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.uploadPhoto")}</div>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                className="mt-2 block w-full text-sm text-[#1F3A5F]"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  uploadPhoto("en", f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {adEn.mediaUrl.trim() ? (
              <button
                type="button"
                disabled={uploading}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                onClick={() => setAdEn((p) => ({ ...p, mediaUrl: "" }))}
              >
                {t("ads.removePhoto")}
              </button>
            ) : null}
            <PreviewCard title={adEn.title} body={adEn.body} mediaUrl={adEn.mediaUrl} />
          </div>
          <button
            type="button"
            disabled={adPending}
            onClick={() => saveAdvertisingBoard("en")}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-xs font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {uploading ? t("ads.uploading") : t("ads.saveEn")}
          </button>
        </div>

        <div className="rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/75">
            {t("ads.langAr")}
          </div>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.title")}</div>
            <input
              value={adAr.title}
              onChange={(e) => setAdAr((p) => ({ ...p, title: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.body")}</div>
            <textarea
              value={adAr.body}
              onChange={(e) => setAdAr((p) => ({ ...p, body: e.target.value }))}
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-[#2C4E7A]/20 bg-white px-3 py-2 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <div className="mt-4 grid gap-3">
            <label className="block">
              <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.uploadPhoto")}</div>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                className="mt-2 block w-full text-sm text-[#1F3A5F]"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  uploadPhoto("ar", f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {adAr.mediaUrl.trim() ? (
              <button
                type="button"
                disabled={uploading}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                onClick={() => setAdAr((p) => ({ ...p, mediaUrl: "" }))}
              >
                {t("ads.removePhoto")}
              </button>
            ) : null}
            <PreviewCard title={adAr.title} body={adAr.body} mediaUrl={adAr.mediaUrl} />
          </div>
          <button
            type="button"
            disabled={adPending}
            onClick={() => saveAdvertisingBoard("ar")}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-xs font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {uploading ? t("ads.uploading") : t("ads.saveAr")}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4">
        <div className="text-sm font-semibold text-[#1F3A5F]">{t("ads.topServicesTitle")}</div>
        <p className="mt-1 text-xs text-[#2C4E7A]/80">{t("ads.topServicesHelp")}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block">
            <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.pickType")}</div>
            <select
              value={pickKind}
              onChange={(e) => {
                const v = e.target.value === "MANUAL" ? "MANUAL" : e.target.value === "OFFER" ? "OFFER" : "API";
                setPickKind(v);
                setPickRefId("");
              }}
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F]"
            >
              <option value="API">{t("ads.pickApi")}</option>
              <option value="MANUAL">{t("ads.pickManual")}</option>
              <option value="OFFER">{t("ads.pickOffer")}</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.pickItem")}</div>
            <select
              value={pickRefId}
              onChange={(e) => setPickRefId(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F]"
            >
              <option value="">{t("ads.pickItem")}</option>
              {pickKind === "API"
                ? options.apiServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                : pickKind === "MANUAL"
                  ? options.manualServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.enabled ? "" : " (disabled)"}
                      </option>
                    ))
                  : options.offers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {locale === "ar" ? o.nameAr : o.nameEn}
                        {o.enabled ? "" : " (disabled)"}
                      </option>
                    ))}
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-semibold text-[#1F3A5F]">{t("ads.pickSort")}</div>
            <input
              value={pickSort}
              onChange={(e) => setPickSort(e.target.value)}
              inputMode="numeric"
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F]"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={adPending || !pickRefId}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1F3A5F] px-4 text-xs font-semibold text-white disabled:opacity-60"
            onClick={() => {
              onMessage(null);
              startAdTransition(async () => {
                const res = await addSmmTopPickAction({
                  kind: pickKind,
                  refId: pickRefId,
                  sort: Number(pickSort) || 0,
                  enabled: true,
                });
                onMessage(res.ok ? null : res.message);
                if (res.ok) {
                  setPickRefId("");
                  refresh();
                }
              });
            }}
          >
            {t("ads.addPick")}
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {topPicks.length === 0 ? (
            <div className="rounded-xl border border-[#2C4E7A]/10 bg-white px-4 py-3 text-sm text-[#2C4E7A]/80">
              {t("ads.noPicks")}
            </div>
          ) : (
            topPicks.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-[#2C4E7A]/10 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1F3A5F]">
                    {p.kind === "API"
                      ? t("ads.pickApi")
                      : p.kind === "MANUAL"
                        ? t("ads.pickManual")
                        : t("ads.pickOffer")}{" "}
                    <span className="text-xs font-medium text-[#2C4E7A]/70">({p.refId})</span>
                  </div>
                  <div className="mt-1 text-xs text-[#2C4E7A]/75">
                    {t("ads.pickSort")}: {p.sort} · {p.enabled ? t("ads.pickEnabled") : t("ads.pickHidden")}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#1F3A5F]">
                    {t("ads.pickSort")}
                    <input
                      defaultValue={String(p.sort)}
                      inputMode="numeric"
                      className="h-9 w-20 rounded-lg border border-[#2C4E7A]/20 px-2 text-xs"
                      onBlur={(e) => {
                        const next = Number(e.currentTarget.value) || 0;
                        if (next === p.sort) return;
                        startAdTransition(async () => {
                          await updateSmmTopPickAction({ id: p.id, sort: next });
                          refresh();
                        });
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#1F3A5F]">
                    <input
                      type="checkbox"
                      defaultChecked={p.enabled}
                      onChange={(e) => {
                        startAdTransition(async () => {
                          await updateSmmTopPickAction({ id: p.id, enabled: e.currentTarget.checked });
                          refresh();
                        });
                      }}
                    />
                    {p.enabled ? t("ads.pickEnabled") : t("ads.pickHidden")}
                  </label>
                  <button
                    type="button"
                    disabled={adPending}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] transition hover:bg-[#F5F7FA] disabled:opacity-60"
                    onClick={() => {
                      onMessage(null);
                      startAdTransition(async () => {
                        const res = await deleteSmmTopPickAction({ id: p.id });
                        onMessage(res.ok ? null : res.message);
                        refresh();
                      });
                    }}
                  >
                    {t("ads.deletePick")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmmAdminClient({
  defaults,
  catalogVersion,
  advertisingBoards,
  adBoardVersionKey,
  clientCategoriesVersionKey,
  topPicks,
  topPickOptions,
}: {
  defaults: Defaults;
  catalogVersion: string;
  advertisingBoards: { en: AdvertisingBoardPayload; ar: AdvertisingBoardPayload };
  adBoardVersionKey: string;
  clientCategoriesVersionKey: string;
  topPicks: Array<{
    id: string;
    kind: "API" | "MANUAL" | "OFFER";
    refId: string;
    enabled: boolean;
    sort: number;
    updatedAt: string;
  }>;
  topPickOptions: {
    apiServices: Array<{ id: string; name: string }>;
    manualServices: Array<{ id: string; name: string; enabled: boolean }>;
    offers: Array<{ id: string; nameEn: string; nameAr: string; enabled: boolean }>;
  };
}) {
  const t = useTranslations("adminSmm");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startUiTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const [baseUrl, setBaseUrl] = useState(defaults.baseUrl);
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState(
    String(defaults.globalMarkupPercent ?? 0),
  );
  const [query, setQuery] = useState("");

  const [flags, setFlags] = useState(() => buildFlags(defaults.categories));
  useEffect(() => {
    startUiTransition(() => {
      setFlags(buildFlags(defaults.categories));
    });
  }, [catalogVersion, defaults.categories]);

  const [clientCopy, setClientCopy] = useState<Record<string, { t: string; d: string }>>({});
  const [markupDraft, setMarkupDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    startUiTransition(() => {
      const m: Record<string, { t: string; d: string }> = {};
      const mk: Record<string, string> = {};
      for (const c of defaults.categories) {
        for (const s of c.services) {
          m[s.id] = {
            t: s.clientTitle ?? "",
            d: s.clientDescription ?? "",
          };
          mk[s.id] = s.markupPercent != null ? String(s.markupPercent) : "";
        }
      }
      setClientCopy(m);
      setMarkupDraft(mk);
    });
  }, [catalogVersion, defaults.categories]);

  const clientCategories = defaults.clientCategories ?? [];
  const allServicesFlat = useMemo(
    () =>
      defaults.categories.flatMap((c) =>
        c.services
          .filter((s) => s.enabledForClients)
          .map((s) => ({ id: s.id, name: s.name })),
      ),
    [defaults.categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return defaults.categories;

    return defaults.categories
      .map((c) => ({
        ...c,
        services: c.services.filter((s) => {
          const t = (clientCopy[s.id]?.t ?? s.clientTitle ?? "").toLowerCase();
          const d = (clientCopy[s.id]?.d ?? s.clientDescription ?? "").toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            t.includes(q) ||
            d.includes(q) ||
            String(s.providerServiceId).includes(q)
          );
        }),
      }))
      .filter((c) => c.services.length > 0);
  }, [defaults.categories, query, clientCopy]);

  function refresh() {
    router.refresh();
  }

  function saveProvider() {
    setStatus(null);
    startUiTransition(async () => {
      const res = await updateSmmProviderSettingsAction({
        baseUrl,
        globalMarkupPercent: Number(globalMarkupPercent),
      });
      setStatus(res.ok ? t("status.savedProviderSettings") : res.message);
      refresh();
    });
  }

  function doSync() {
    setStatus(null);
    startUiTransition(async () => {
      const res = await syncSmmCatalogAction();
      setStatus(
        res.ok
          ? t("status.syncedImported", { count: res.imported })
          : t("status.syncFailed"),
      );
      refresh();
    });
  }

  function bulkSetClients(value: boolean) {
    const ids = filtered.flatMap((c) => c.services.map((s) => s.id));
    if (!ids.length) return;

    setFlags((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = value;
      return next;
    });

    setStatus(null);
    startUiTransition(async () => {
      await updateSmmServiceVisibilityAction({
        updates: ids.map((id) => ({ id, enabledForClients: value })),
      });
      setStatus(t("status.updatedVisibility"));
      refresh();
    });
  }

  function saveClientCopy(serviceId: string) {
    const row = clientCopy[serviceId];
    if (!row) return;
    setStatus(null);
    startUiTransition(async () => {
      const res = await updateSmmServiceClientCopyAction({
        id: serviceId,
        clientTitle: row.t,
        clientDescription: row.d,
      });
      setStatus(res.ok ? t("status.savedClientCopy") : res.message);
      if (res.ok) refresh();
    });
  }

  function saveServiceMarkup(serviceId: string, categoryId: string) {
    setStatus(null);
    startUiTransition(async () => {
      const res = await upsertSmmServiceMarkupPercentAction({
        serviceId,
        categoryId,
        percentText: markupDraft[serviceId] ?? "",
      });
      setStatus(res.ok ? t("status.savedApiMarkup") : res.message);
      if (res.ok) refresh();
    });
  }

  function toggleClient(id: string, value: boolean) {
    setFlags((prev) => ({ ...prev, [id]: value }));

    setStatus(null);
    startUiTransition(async () => {
      await updateSmmServiceVisibilityAction({
        updates: [{ id, enabledForClients: value }],
      });
      setStatus(t("status.updatedVisibility"));
      refresh();
    });
  }

  return (
    <div className="space-y-8">
      <CollapsibleSection id="admin-smm-ads" title={t("sections.ads")}>
        <SmmAdvertisingBoardsForm
          key={adBoardVersionKey}
          boards={advertisingBoards}
          topPicks={topPicks}
          options={topPickOptions}
          onMessage={setStatus}
          refresh={refresh}
        />
      </CollapsibleSection>

      <CollapsibleSection id="admin-smm-manual" title={t("sections.manual")}>
        <p className="mt-2 text-sm text-[#2C4E7A]/85">
          {t("manual.help")}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin/manual-services"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
          >
            {t("manual.open")}
          </Link>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="admin-smm-provider" title={t("sections.provider")}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="text-sm font-semibold text-[#1F3A5F]">{t("provider.baseUrl")}</div>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={t("provider.baseUrlPlaceholder")}
            className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
          />
          <div className="mt-2 text-xs text-[#2C4E7A]/75">
            {t("provider.apiKeyHintPrefix")}{" "}
            <span className="font-mono">SMM_PROVIDER_API_KEY</span> (not stored in DB).
          </div>
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-[#1F3A5F]">{t("provider.defaultMarkup")}</div>
          <input
            value={globalMarkupPercent}
            onChange={(e) => setGlobalMarkupPercent(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
          <div className="mt-2 text-xs text-[#2C4E7A]/75">
            {t("provider.defaultMarkupHint")}
          </div>
        </label>

      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#2C4E7A]/75">{status ?? ""}</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={saveProvider}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
          >
            {pending ? t("provider.saving") : t("provider.saveSettings")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={doSync}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {pending ? t("provider.syncing") : t("provider.syncCatalog")}
          </button>
        </div>
      </div>

      </CollapsibleSection>

      <CollapsibleSection id="admin-smm-catalog" title={t("sections.catalog")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("catalog.visibilityTitle")}</div>
            <div className="mt-1 text-xs text-[#2C4E7A]/75">
              {t("catalog.visibilityHint")}
            </div>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("catalog.searchPlaceholder")}
            className="h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4 sm:w-80"
          />
        </div>

        <div className="mt-4">
          <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-4">
            <div className="text-sm font-semibold text-[#1F3A5F]">{t("catalog.clients")}</div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => bulkSetClients(true)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm disabled:opacity-60"
              >
                {t("catalog.selectAll")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => bulkSetClients(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm disabled:opacity-60"
              >
                {t("catalog.unselectAll")}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {filtered.length === 0 ? (
            <div className="text-sm text-[#2C4E7A]/80">No services in this view.</div>
          ) : (
            filtered.map((cat) => (
              <div key={cat.id} className="rounded-xl border border-[#2C4E7A]/12">
                <div className="border-b border-[#2C4E7A]/10 bg-[#F5F7FA] px-4 py-3 text-sm font-semibold text-[#1F3A5F]">
                  {cat.name}
                </div>
                <div className="max-h-[min(70vh,56rem)] divide-y divide-[#2C4E7A]/10 overflow-y-auto overscroll-contain">
                  {cat.services.map((s) => {
                    const enabled = flags[s.id] ?? s.enabledForClients;
                    const copy = clientCopy[s.id] ?? { t: "", d: "" };
                    return (
                      <div key={s.id} className="flex flex-col">
                        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[#1F3A5F]">
                              {s.name}
                            </div>
                            <div className="mt-1 text-xs text-[#2C4E7A]/75">
                              Provider ID: {s.providerServiceId}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F3A5F]">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => toggleClient(s.id, e.target.checked)}
                              />
                              Client
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2 border-t border-[#2C4E7A]/8 bg-[#F5F7FA]/60 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/75">
                            API markup (this service)
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <label className="block min-w-0 flex-1 text-xs text-[#1F3A5F]">
                              Markup % (PERCENT on provider rate)
                              <input
                                value={markupDraft[s.id] ?? ""}
                                onChange={(e) =>
                                  setMarkupDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                                }
                                inputMode="decimal"
                                placeholder={`Default ${globalMarkupPercent}%`}
                                className="mt-1 h-10 w-full rounded-lg border border-[#2C4E7A]/15 bg-white px-3 py-2 text-sm text-[#1F3A5F]"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => saveServiceMarkup(s.id, cat.id)}
                              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm ring-1 ring-[#2C4E7A]/15 disabled:opacity-60"
                            >
                              Save markup
                            </button>
                          </div>
                          <div className="text-[11px] text-[#2C4E7A]/75">
                            Leave empty to use the default % above. Applies to SMM Growth pricing for this service.
                          </div>
                        </div>
                        <div className="space-y-2 border-t border-[#2C4E7A]/8 bg-[#F5F7FA]/60 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/75">
                            Client-facing (SMM Growth)
                          </div>
                          <label className="block text-xs text-[#1F3A5F]">
                            Title override (optional)
                            <input
                              value={copy.t}
                              onChange={(e) =>
                                setClientCopy((prev) => ({
                                  ...prev,
                                  [s.id]: { ...copy, t: e.target.value },
                                }))
                              }
                              placeholder="Leave empty to use API name above"
                              className="mt-1 w-full rounded-lg border border-[#2C4E7A]/15 bg-white px-3 py-2 text-sm text-[#1F3A5F]"
                              maxLength={512}
                            />
                          </label>
                          <label className="block text-xs text-[#1F3A5F]">
                            Description (optional)
                            <textarea
                              value={copy.d}
                              onChange={(e) =>
                                setClientCopy((prev) => ({
                                  ...prev,
                                  [s.id]: { ...copy, d: e.target.value },
                                }))
                              }
                              placeholder="Shown to customers on SMM Growth instead of raw API text"
                              rows={3}
                              className="mt-1 w-full rounded-lg border border-[#2C4E7A]/15 bg-white px-3 py-2 text-sm text-[#1F3A5F]"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => saveClientCopy(s.id)}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#1F3A5F] px-4 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Save client copy
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="admin-smm-offers" title={t("sections.offers")}>
        <ClientCategoriesManager
          key={clientCategoriesVersionKey}
          allServices={allServicesFlat}
          manualServices={topPickOptions.manualServices}
          categories={clientCategories}
          pending={pending}
          onMessage={setStatus}
          refresh={refresh}
        />
      </CollapsibleSection>

    </div>
  );
}
