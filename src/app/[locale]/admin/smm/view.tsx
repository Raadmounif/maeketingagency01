"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import {
  creditUserWalletAction,
  createSmmClientCategoryAction,
  deleteSmmClientCategoryAction,
  issueResellerApiKeyAction,
  addServiceToSmmClientCategoryAction,
  removeServiceFromSmmClientCategoryAction,
  syncSmmCatalogAction,
  updateSmmAdvertisingBoardAction,
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
  enabledForResellers: boolean;
  /** When set, overrides default markup % for this API service (clients + resellers). */
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
  resellerMinMarginPct: number;
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
  enabled: boolean;
  title: string;
  body: string;
  linkUrl: string;
  mediaUrl: string;
  mediaKind: "auto" | "image" | "video";
};

function boardToForm(p: AdvertisingBoardPayload): AdvertisingBoardForm {
  const k = p.mediaKind;
  const mediaKind: "auto" | "image" | "video" =
    k === "image" || k === "video" ? k : "auto";
  return {
    enabled: p.enabled,
    title: p.title,
    body: p.body,
    linkUrl: p.linkUrl ?? "",
    mediaUrl: p.mediaUrl ?? "",
    mediaKind,
  };
}

function buildFlags(categories: CategoryRow[]) {
  const m: Record<string, { c: boolean; r: boolean }> = {};
  for (const c of categories) {
    for (const s of c.services) {
      m[s.id] = { c: s.enabledForClients, r: s.enabledForResellers };
    }
  }
  return m;
}

function ClientCategoriesManager({
  allServices,
  categories,
  pending,
  onMessage,
  refresh,
}: {
  allServices: Array<{ id: string; name: string }>;
  categories: ClientCategoryRow[];
  pending: boolean;
  onMessage: (msg: string | null) => void;
  refresh: () => void;
}) {
  const [uiPending, startTransition] = useTransition();
  const busy = pending || uiPending;

  const [cats, setCats] = useState<ClientCategoryUiRow[]>(() =>
    categories.map((c) => ({
      ...c,
      offerPriceUsd: ((Number(c.offerPriceCents) || 0) / 100).toFixed(2),
      items: [...c.items],
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
      onMessage(res.ok ? "Created client category." : res.message);
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
      onMessage(res.ok ? "Saved category." : res.message);
      refresh();
    });
  }

  function deleteCategory(id: string) {
    onMessage(null);
    startTransition(async () => {
      const res = await deleteSmmClientCategoryAction({ id });
      onMessage(res.ok ? "Deleted category." : res.message);
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
      onMessage(res.ok ? "Added service to client category." : res.message);
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
      onMessage(res.ok ? "Removed service from category." : res.message);
      refresh();
    });
  }

  return (
    <div>
      <div className="text-sm font-semibold text-[#1F3A5F]">Client categories</div>
      <p className="mt-2 text-xs text-[#2C4E7A]/80">
        Optional client categories on <span className="font-semibold">/trust</span>: each enabled category appears as
        one <span className="font-semibold">Featured offer</span> card (a single product). The trust page still lists
        every API service enabled for clients in the main order form and under provider categories. Assign services
        here for the offer card and for per-item markup % (overrides global/category pricing when applicable).
      </p>

      <div className="mt-5 grid gap-4 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 lg:grid-cols-5">
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Name (EN)</div>
          <input
            value={createNameEn}
            onChange={(e) => setCreateNameEn(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Name (AR)</div>
          <input
            value={createNameAr}
            onChange={(e) => setCreateNameAr(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Sort</div>
          <input
            value={createSort}
            onChange={(e) => setCreateSort(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Offer price (USD)</div>
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
            Enabled
          </label>
          <button
            type="button"
            disabled={busy || !createNameEn.trim() || !createNameAr.trim()}
            onClick={createCategory}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-xs font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            Create
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <div className="text-xs font-semibold text-[#1F3A5F]">Category</div>
          <select
            value={addCategoryId}
            onChange={(e) => setAddCategoryId(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          >
            <option value="">Choose…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn} / {c.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label className="block lg:col-span-2">
          <div className="text-xs font-semibold text-[#1F3A5F]">Service</div>
          <select
            value={addServiceId}
            onChange={(e) => setAddServiceId(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          >
            <option value="">Choose…</option>
            {allServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Markup %</div>
          <input
            value={addMarkupPct}
            onChange={(e) => setAddMarkupPct(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Offer quantity</div>
          <input
            value={addOfferQuantity}
            onChange={(e) => setAddOfferQuantity(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Sort</div>
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
            Add to category
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {cats.length === 0 ? (
          <div className="text-sm text-[#2C4E7A]/80">No client categories yet.</div>
        ) : (
          cats.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#2C4E7A]/12 bg-white">
              <div className="grid gap-3 border-b border-[#2C4E7A]/10 bg-[#F5F7FA] p-4 md:grid-cols-5">
                <label className="block md:col-span-2">
                  <div className="text-xs font-semibold text-[#1F3A5F]">Name (EN)</div>
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
                  <div className="text-xs font-semibold text-[#1F3A5F]">Name (AR)</div>
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
                  <div className="text-xs font-semibold text-[#1F3A5F]">Sort</div>
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
                  <div className="text-xs font-semibold text-[#1F3A5F]">Offer price (USD)</div>
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
                    Enabled
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => saveCategory(cats.find((x) => x.id === c.id) ?? c)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteCategory(c.id)}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/20 bg-white px-4 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#2C4E7A]/10">
                {c.items.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[#2C4E7A]/80">No services assigned.</div>
                ) : (
                  c.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[#1F3A5F]">{it.serviceName}</div>
                        <div className="mt-1 text-xs text-[#2C4E7A]/75">Markup: {it.markupPct}%</div>
                        <div className="mt-1 text-xs text-[#2C4E7A]/75">
                          Offer quantity: {it.offerQuantity}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeItem(it.id)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
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
  onMessage,
  refresh,
}: {
  boards: { en: AdvertisingBoardPayload; ar: AdvertisingBoardPayload };
  onMessage: (msg: string | null) => void;
  refresh: () => void;
}) {
  const [adPending, startAdTransition] = useTransition();
  const [adEn, setAdEn] = useState(() => boardToForm(boards.en));
  const [adAr, setAdAr] = useState(() => boardToForm(boards.ar));

  function saveAdvertisingBoard(locale: "en" | "ar") {
    const b = locale === "en" ? adEn : adAr;
    onMessage(null);
    startAdTransition(async () => {
      const res = await updateSmmAdvertisingBoardAction({
        locale,
        enabled: b.enabled,
        title: b.title,
        body: b.body,
        linkUrl: b.linkUrl.trim() ? b.linkUrl.trim() : null,
        mediaUrl: b.mediaUrl.trim() ? b.mediaUrl.trim() : null,
        mediaKind: b.mediaKind,
      });
      onMessage(
        res.ok ? `Saved ${locale === "en" ? "English" : "Arabic"} advertising board.` : res.message,
      );
      refresh();
    });
  }

  return (
    <div>
      <div className="text-sm font-semibold text-[#1F3A5F]">SMM Growth page — advertising board</div>
      <p className="mt-2 text-xs text-[#2C4E7A]/80">
        Shown on the public <span className="font-semibold">/trust</span> page for the matching site language when
        enabled. Platform admins and SMM Growth admins can edit both languages. Media: HTTPS image, GIF, .mp4/.webm,
        or YouTube/Vimeo links.
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/75">English (en)</div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A5F]">
            <input
              type="checkbox"
              checked={adEn.enabled}
              onChange={(e) => setAdEn((p) => ({ ...p, enabled: e.target.checked }))}
            />
            Enabled
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Title</div>
            <input
              value={adEn.title}
              onChange={(e) => setAdEn((p) => ({ ...p, title: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Body</div>
            <textarea
              value={adEn.body}
              onChange={(e) => setAdEn((p) => ({ ...p, body: e.target.value }))}
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-[#2C4E7A]/20 bg-white px-3 py-2 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Link (optional)</div>
            <input
              value={adEn.linkUrl}
              onChange={(e) => setAdEn((p) => ({ ...p, linkUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Media URL (optional)</div>
            <input
              value={adEn.mediaUrl}
              onChange={(e) => setAdEn((p) => ({ ...p, mediaUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Media mode</div>
            <select
              value={adEn.mediaKind}
              onChange={(e) =>
                setAdEn((p) => ({
                  ...p,
                  mediaKind: e.target.value as "auto" | "image" | "video",
                }))
              }
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            >
              <option value="auto">Auto</option>
              <option value="image">Image / GIF</option>
              <option value="video">Video / embed</option>
            </select>
          </label>
          <button
            type="button"
            disabled={adPending}
            onClick={() => saveAdvertisingBoard("en")}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-xs font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            Save English board
          </button>
        </div>

        <div className="rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#2C4E7A]/75">Arabic (ar)</div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#1F3A5F]">
            <input
              type="checkbox"
              checked={adAr.enabled}
              onChange={(e) => setAdAr((p) => ({ ...p, enabled: e.target.checked }))}
            />
            Enabled
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Title</div>
            <input
              value={adAr.title}
              onChange={(e) => setAdAr((p) => ({ ...p, title: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Body</div>
            <textarea
              value={adAr.body}
              onChange={(e) => setAdAr((p) => ({ ...p, body: e.target.value }))}
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-[#2C4E7A]/20 bg-white px-3 py-2 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Link (optional)</div>
            <input
              value={adAr.linkUrl}
              onChange={(e) => setAdAr((p) => ({ ...p, linkUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Media URL (optional)</div>
            <input
              value={adAr.mediaUrl}
              onChange={(e) => setAdAr((p) => ({ ...p, mediaUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
            />
          </label>
          <label className="mt-3 block">
            <div className="text-xs font-semibold text-[#1F3A5F]">Media mode</div>
            <select
              value={adAr.mediaKind}
              onChange={(e) =>
                setAdAr((p) => ({
                  ...p,
                  mediaKind: e.target.value as "auto" | "image" | "video",
                }))
              }
              className="mt-2 h-10 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
            >
              <option value="auto">Auto</option>
              <option value="image">Image / GIF</option>
              <option value="video">Video / embed</option>
            </select>
          </label>
          <button
            type="button"
            disabled={adPending}
            onClick={() => saveAdvertisingBoard("ar")}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-4 text-xs font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            Save Arabic board
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SmmAdminClient({
  defaults,
  isPlatformAdmin,
  catalogVersion,
  advertisingBoards,
  adBoardVersionKey,
  clientCategoriesVersionKey,
}: {
  defaults: Defaults;
  isPlatformAdmin: boolean;
  catalogVersion: string;
  advertisingBoards: { en: AdvertisingBoardPayload; ar: AdvertisingBoardPayload };
  adBoardVersionKey: string;
  clientCategoriesVersionKey: string;
}) {
  const router = useRouter();
  const [pending, startUiTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const [baseUrl, setBaseUrl] = useState(defaults.baseUrl);
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState(
    String(defaults.globalMarkupPercent ?? 0),
  );
  const [resellerMinMarginPct, setResellerMinMarginPct] = useState(
    String(defaults.resellerMinMarginPct ?? 0),
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

  const [resellerEmail, setResellerEmail] = useState("");
  const [resellerDiscount, setResellerDiscount] = useState("10");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const [creditEmail, setCreditEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState("25");

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
        resellerMinMarginPct: Number(resellerMinMarginPct),
      });
      setStatus(res.ok ? "Saved provider settings." : res.message);
      refresh();
    });
  }

  function doSync() {
    setStatus(null);
    startUiTransition(async () => {
      const res = await syncSmmCatalogAction();
      setStatus(res.ok ? `Synced. Imported ${res.imported} services.` : "Sync failed.");
      refresh();
    });
  }

  function bulkSet(which: "clients" | "resellers", value: boolean) {
    const ids = filtered.flatMap((c) => c.services.map((s) => s.id));
    if (!ids.length) return;

    setFlags((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const cur = next[id] ?? { c: false, r: false };
        next[id] = which === "clients" ? { ...cur, c: value } : { ...cur, r: value };
      }
      return next;
    });

    setStatus(null);
    startUiTransition(async () => {
      await updateSmmServiceVisibilityAction({
        updates: ids.map((id) =>
          which === "clients"
            ? { id, enabledForClients: value }
            : { id, enabledForResellers: value },
        ),
      });
      setStatus("Updated visibility.");
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
      setStatus(res.ok ? "Saved client-facing copy." : res.message);
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
      setStatus(res.ok ? "Saved API markup for service." : res.message);
      if (res.ok) refresh();
    });
  }

  function toggle(id: string, which: "clients" | "resellers", value: boolean) {
    setFlags((prev) => {
      const cur = prev[id] ?? { c: false, r: false };
      return {
        ...prev,
        [id]: which === "clients" ? { ...cur, c: value } : { ...cur, r: value },
      };
    });

    setStatus(null);
    startUiTransition(async () => {
      await updateSmmServiceVisibilityAction({
        updates:
          which === "clients"
            ? [{ id, enabledForClients: value }]
            : [{ id, enabledForResellers: value }],
      });
      setStatus("Saved.");
      refresh();
    });
  }

  function issueResellerKey() {
    setIssuedKey(null);
    setStatus(null);
    startUiTransition(async () => {
      const res = await issueResellerApiKeyAction({
        email: resellerEmail,
        discountPct: Number(resellerDiscount),
      });
      if (!res.ok) {
        setStatus(res.message);
        return;
      }
      setIssuedKey(res.apiKey);
      setStatus("Issued reseller API key (shown once).");
      refresh();
    });
  }

  function creditWallet() {
    setStatus(null);
    startUiTransition(async () => {
      const res = await creditUserWalletAction({
        email: creditEmail,
        amountUsd: Number(creditAmount),
      });
      setStatus(res.ok ? "Credited wallet." : res.message);
      refresh();
    });
  }

  return (
    <div className="space-y-8">
      <CollapsibleSection id="admin-smm-ads" title="SMM Growth — advertising board">
        <SmmAdvertisingBoardsForm
          key={adBoardVersionKey}
          boards={advertisingBoards}
          onMessage={setStatus}
          refresh={refresh}
        />
      </CollapsibleSection>

      <CollapsibleSection id="admin-smm-offers" title="Featured offers & client categories">
        <ClientCategoriesManager
          key={clientCategoriesVersionKey}
          allServices={allServicesFlat}
          categories={clientCategories}
          pending={pending}
          onMessage={setStatus}
          refresh={refresh}
        />
      </CollapsibleSection>

      {isPlatformAdmin ? (
        <CollapsibleSection id="admin-smm-reseller" title="Reseller API & wallet credit">
          <div className="text-sm font-semibold text-[#1F3A5F]">Reseller API</div>
          <p className="mt-2 text-xs text-[#2C4E7A]/80">
            Endpoint: <span className="font-mono">POST /api/reseller/v2</span> (same-origin). Body can be JSON or
            form fields. Supported actions: <span className="font-mono">services</span>,{" "}
            <span className="font-mono">add</span>, <span className="font-mono">status</span>,{" "}
            <span className="font-mono">balance</span>.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block md:col-span-1">
              <div className="text-sm font-semibold text-[#1F3A5F]">User email</div>
              <input
                value={resellerEmail}
                onChange={(e) => setResellerEmail(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                placeholder="reseller@example.com"
              />
            </label>
            <label className="block md:col-span-1">
              <div className="text-sm font-semibold text-[#1F3A5F]">Reseller discount (%)</div>
              <input
                value={resellerDiscount}
                onChange={(e) => setResellerDiscount(e.target.value)}
                inputMode="numeric"
                className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={pending || !resellerEmail}
                onClick={issueResellerKey}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
              >
                Issue / rotate API key
              </button>
            </div>
          </div>

          {issuedKey ? (
            <div className="mt-4 rounded-xl border border-[#2C4E7A]/15 bg-[#F5F7FA] p-4 text-xs text-[#1F3A5F]">
              <div className="font-semibold">API key (copy now)</div>
              <div className="mt-2 break-all font-mono">{issuedKey}</div>
            </div>
          ) : null}

          <div className="mt-8 border-t border-[#2C4E7A]/10 pt-6">
            <div className="text-sm font-semibold text-[#1F3A5F]">Wallet credit</div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block">
                <div className="text-sm font-semibold text-[#1F3A5F]">User email</div>
                <input
                  value={creditEmail}
                  onChange={(e) => setCreditEmail(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                />
              </label>
              <label className="block">
                <div className="text-sm font-semibold text-[#1F3A5F]">Amount (USD)</div>
                <input
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  inputMode="decimal"
                  className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={pending || !creditEmail}
                  onClick={creditWallet}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
                >
                  Credit wallet
                </button>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection id="admin-smm-provider" title="Provider & pricing">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <div className="text-sm font-semibold text-[#1F3A5F]">Provider base URL</div>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://smmturk.org"
            className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
          />
          <div className="mt-2 text-xs text-[#2C4E7A]/75">
            API key is read from server env <span className="font-mono">SMM_PROVIDER_API_KEY</span> (not stored in DB).
          </div>
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-[#1F3A5F]">Default markup (%)</div>
          <input
            value={globalMarkupPercent}
            onChange={(e) => setGlobalMarkupPercent(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
          <div className="mt-2 text-xs text-[#2C4E7A]/75">
            Fallback when a catalog service has no custom &quot;API markup&quot; below. Per-service overrides win.
          </div>
        </label>

        <label className="block">
          <div className="text-sm font-semibold text-[#1F3A5F]">Reseller min margin (%)</div>
          <input
            value={resellerMinMarginPct}
            onChange={(e) => setResellerMinMarginPct(e.target.value)}
            inputMode="numeric"
            className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          />
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
            {pending ? "Saving..." : "Save settings"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={doSync}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {pending ? "Syncing..." : "Sync catalog"}
          </button>
        </div>
      </div>

      </CollapsibleSection>

      <CollapsibleSection id="admin-smm-catalog" title="Catalog & service visibility">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[#1F3A5F]">Service visibility</div>
            <div className="mt-1 text-xs text-[#2C4E7A]/75">
              Default is OFF. Enable separately for Clients and Resellers.
            </div>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or provider ID…"
            className="h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-[#F5F7FA] px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4 sm:w-80"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-4">
            <div className="text-sm font-semibold text-[#1F3A5F]">Clients</div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => bulkSet("clients", true)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm disabled:opacity-60"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => bulkSet("clients", false)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm disabled:opacity-60"
              >
                Unselect all
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-4">
            <div className="text-sm font-semibold text-[#1F3A5F]">Resellers</div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => bulkSet("resellers", true)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm disabled:opacity-60"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => bulkSet("resellers", false)}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold text-[#1F3A5F] shadow-sm disabled:opacity-60"
              >
                Unselect all
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
                    const f = flags[s.id] ?? { c: s.enabledForClients, r: s.enabledForResellers };
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
                          <div className="flex shrink-0 items-center gap-6">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F3A5F]">
                              <input
                                type="checkbox"
                                checked={f.c}
                                onChange={(e) => toggle(s.id, "clients", e.target.checked)}
                              />
                              Client
                            </label>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#1F3A5F]">
                              <input
                                type="checkbox"
                                checked={f.r}
                                onChange={(e) => toggle(s.id, "resellers", e.target.checked)}
                              />
                              Reseller
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
                            Leave empty to use the default % above. Applies to SMM Growth and reseller API pricing for
                            this service.
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
    </div>
  );
}
