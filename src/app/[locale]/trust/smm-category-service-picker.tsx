"use client";

import { useTranslations } from "next-intl";
import { platformVisualForCategoryName } from "@/lib/smm/platform-category-visual";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  min: number;
  max: number;
  rate: string;
};

type Category = {
  id: string;
  name: string;
  services: Service[];
};

export function SmmCategoryServicePicker({
  categories,
  selectedCategoryId,
  selectedServiceId,
  onCategoryChange,
  onServiceChange,
}: {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedServiceId: string;
  onCategoryChange: (categoryId: string | null) => void;
  onServiceChange: (serviceId: string) => void;
}) {
  const t = useTranslations("smmTrust.order");

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) ?? null;

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-[#2C4E7A]/12 bg-white px-4 py-6 text-center text-sm text-[#2C4E7A]/80">
        {t("noApiServices")}
      </p>
    );
  }

  if (!selectedCategory) {
    return (
      <div>
        <div className="text-sm font-semibold text-[#1F3A5F]">{t("choosePlatform")}</div>
        <p className="mt-1 text-xs text-[#2C4E7A]/75">{t("choosePlatformHelp")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => {
            const visual = platformVisualForCategoryName(cat.name);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={[
                  "group flex flex-col items-center gap-2 rounded-xl border border-[#2C4E7A]/12 bg-white p-4 text-center shadow-sm transition",
                  "hover:-translate-y-0.5 hover:border-[#2C4E7A]/25 hover:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-4",
                  visual.ringClass,
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold uppercase tracking-tight shadow-inner",
                    visual.tileClass,
                  ].join(" ")}
                  aria-hidden
                >
                  {visual.abbr}
                </span>
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-[#1F3A5F]">
                  {cat.name}
                </span>
                <span className="text-xs font-medium text-[#2C4E7A]/70">
                  {t("serviceCount", { count: cat.services.length })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            onCategoryChange(null);
            onServiceChange("");
          }}
          className="inline-flex h-9 items-center rounded-lg border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] transition hover:bg-[#F5F7FA]"
        >
          {t("backToPlatforms")}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#1F3A5F]">{selectedCategory.name}</div>
          <div className="text-xs text-[#2C4E7A]/75">{t("selectService")}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {selectedCategory.services.map((s) => {
          const active = s.id === selectedServiceId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onServiceChange(s.id)}
              className={[
                "rounded-xl border px-4 py-3 text-left transition",
                active
                  ? "border-[#FF8C00] bg-white shadow-md ring-2 ring-orange-500/20"
                  : "border-[#2C4E7A]/12 bg-white hover:border-[#2C4E7A]/25 hover:bg-[#F5F7FA]",
              ].join(" ")}
            >
              <div className="text-sm font-semibold text-[#1F3A5F]">{s.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#2C4E7A]/75">
                <span>${s.rate}/1000</span>
                <span>·</span>
                <span>
                  {t("min")} {s.min} · {t("max")} {s.max}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
