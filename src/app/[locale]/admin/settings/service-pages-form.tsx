"use client";

import { useState, useTransition } from "react";
import { SERVICE_PAGE_CATALOG, type ServicePageSlug } from "@/lib/service-pages";
import { updateServicePagesContentAction, uploadServicePagePhotoAction } from "./actions";

function ServicePageCollapsible({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;

  return (
    <section className="overflow-hidden rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA]">
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/60"
      >
        <span>
          <span className="block text-sm font-semibold text-[#1F3A5F]">{title}</span>
          <span className="mt-0.5 block text-xs text-[#2C4E7A]/80">{subtitle}</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-[#2C4E7A]/80" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
        className="border-t border-[#2C4E7A]/10 px-4 pb-4 pt-3"
      >
        {children}
      </div>
    </section>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-[#1F3A5F]">{label}</div>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  placeholder,
  defaultValue,
  rows = 4,
  value,
  onChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <label className="block">
      <div className="text-sm font-semibold text-[#1F3A5F]">{label}</div>
      <textarea
        name={name}
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue: defaultValue ?? "" })}
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full resize-y rounded-xl border border-[#2C4E7A]/20 bg-white px-4 py-3 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
      />
    </label>
  );
}

function getPath(obj: unknown, path: string, fallback = ""): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return fallback;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : fallback;
}

function getLines(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[p];
  }
  if (Array.isArray(cur)) return cur.map(String).join("\n");
  return "";
}

function getGalleryLines(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[p];
  }
  if (!Array.isArray(cur)) return "";
  return cur
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const r = item as Record<string, unknown>;
      const url = String(r.url ?? "").trim();
      const caption = String(r.caption ?? "").trim();
      if (!url) return "";
      return caption ? `${url}|${caption}` : url;
    })
    .filter(Boolean)
    .join("\n");
}

function ServicePageMediaFields({
  locale,
  slug,
  prefix,
  base,
  mc,
  disabled,
}: {
  locale: "en" | "ar";
  slug: ServicePageSlug;
  prefix: string;
  base: string;
  mc: Record<string, unknown>;
  disabled: boolean;
}) {
  const [mediaUrl, setMediaUrl] = useState(() => getPath(mc, `${base}.mediaUrl`));
  const [gallery, setGallery] = useState(() => getGalleryLines(mc, `${base}.gallery`));
  const [uploading, startUpload] = useTransition();
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  function uploadHero(file: File) {
    setUploadNote(null);
    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("slug", slug);
    fd.set("file", file);
    startUpload(async () => {
      const res = await uploadServicePagePhotoAction(fd);
      if (!res.ok) {
        setUploadNote(res.message);
        return;
      }
      setMediaUrl(res.url);
      setUploadNote("Hero image uploaded.");
    });
  }

  function uploadGalleryFiles(files: FileList) {
    setUploadNote(null);
    const list = Array.from(files);
    if (!list.length) return;

    startUpload(async () => {
      const added: string[] = [];
      for (const file of list) {
        const fd = new FormData();
        fd.set("locale", locale);
        fd.set("slug", slug);
        fd.set("file", file);
        const res = await uploadServicePagePhotoAction(fd);
        if (!res.ok) {
          setUploadNote(res.message);
          return;
        }
        added.push(res.url);
      }
      setGallery((prev) => {
        const lines = prev
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        return [...lines, ...added].join("\n");
      });
      setUploadNote(
        added.length === 1 ? "Gallery photo added." : `${added.length} gallery photos added.`,
      );
    });
  }

  const busy = disabled || uploading;
  const galleryUrls = gallery
    .split(/\r?\n/)
    .map((line) => line.split("|")[0]?.trim() ?? "")
    .filter(Boolean);

  return (
    <>
      <div className="rounded-xl border border-[#2C4E7A]/10 bg-white p-4">
        <div className="text-sm font-semibold text-[#1F3A5F]">Hero image / video</div>
        <p className="mt-1 text-xs text-[#2C4E7A]/80">
          Upload a photo to the server, or paste an external https URL for images and videos.
        </p>

        <label className="mt-3 block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Upload hero photo</div>
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="mt-2 block w-full text-sm text-[#1F3A5F]"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadHero(f);
              e.currentTarget.value = "";
            }}
          />
        </label>

        <label className="mt-3 block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Hero media URL</div>
          <input
            name={`${prefix}mediaUrl`}
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://… or /uploads/service-pages/…"
            className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 placeholder:text-[#2C4E7A]/60 focus:ring-4"
          />
        </label>

        {mediaUrl.trim() ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="h-20 w-28 overflow-hidden rounded-lg border border-[#2C4E7A]/15 bg-[#F5F7FA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl.trim()} alt="" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMediaUrl("")}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-3 text-xs font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA] disabled:opacity-60"
            >
              Remove hero media
            </button>
          </div>
        ) : null}

        <label className="mt-4 block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Media mode</div>
          <select
            name={`${prefix}mediaKind`}
            defaultValue={getPath(mc, `${base}.mediaKind`) || "auto"}
            className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
          >
            <option value="auto">Auto</option>
            <option value="image">Image / GIF</option>
            <option value="video">Video</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-[#2C4E7A]/10 bg-white p-4">
        <div className="text-sm font-semibold text-[#1F3A5F]">Photo gallery</div>
        <p className="mt-1 text-xs text-[#2C4E7A]/80">
          Upload one or more photos, or edit lines below. Optional caption:{" "}
          <span className="font-mono">url|caption</span>
        </p>

        <label className="mt-3 block">
          <div className="text-xs font-semibold text-[#1F3A5F]">Upload gallery photos</div>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            className="mt-2 block w-full text-sm text-[#1F3A5F]"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) uploadGalleryFiles(files);
              e.currentTarget.value = "";
            }}
          />
        </label>

        <TextArea
          name={`${prefix}gallery`}
          label="Gallery URLs"
          placeholder="/uploads/service-pages/…|Optional caption"
          value={gallery}
          onChange={setGallery}
          rows={4}
        />

        {galleryUrls.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {galleryUrls.map((url) => (
              <div
                key={url}
                className="h-16 w-20 overflow-hidden rounded-lg border border-[#2C4E7A]/15 bg-[#F5F7FA]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {uploadNote ? <p className="text-xs font-semibold text-[#2C4E7A]">{uploadNote}</p> : null}
      {uploading ? <p className="text-xs text-[#2C4E7A]/75">Uploading…</p> : null}
    </>
  );
}

export function ServicePagesForm({ marketingContent }: { marketingContent?: unknown }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const mc = (marketingContent ?? {}) as Record<string, unknown>;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateServicePagesContentAction(fd);
      setStatus(res.ok ? "Saved." : ("message" in res ? res.message : "Failed to save."));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {(["en", "ar"] as const).map((locale) => (
        <div key={locale} className="rounded-xl border border-[#2C4E7A]/12 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
            {locale === "en" ? "English" : "Arabic"}
          </div>

          <div className="mt-5 grid gap-3">
            {SERVICE_PAGE_CATALOG.map((entry) => {
              const base = `${locale}.servicePages.${entry.slug}`;
              const prefix = `sp_${locale}_${entry.slug}_`;
              return (
                <ServicePageCollapsible
                  key={`${locale}-${entry.slug}`}
                  id={`admin-sp-${locale}-${entry.slug}`}
                  title={entry.name}
                  subtitle={`Public page: /${entry.slug}`}
                >
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        name={`${prefix}kicker`}
                        label="Badge / kicker"
                        placeholder="Marketing"
                        defaultValue={getPath(mc, `${base}.kicker`)}
                      />
                      <Field
                        name={`${prefix}title`}
                        label="Headline"
                        placeholder="Page title"
                        defaultValue={getPath(mc, `${base}.title`)}
                      />
                    </div>
                    <TextArea
                      name={`${prefix}subtitle`}
                      label="Subtitle"
                      defaultValue={getPath(mc, `${base}.subtitle`)}
                      rows={2}
                    />
                    <TextArea
                      name={`${prefix}body`}
                      label="Body text"
                      defaultValue={getPath(mc, `${base}.body`)}
                      rows={4}
                    />
                    <TextArea
                      name={`${prefix}bullets`}
                      label="Bullets (one per line)"
                      placeholder={"Point one\nPoint two"}
                      defaultValue={getLines(mc, `${base}.bullets`)}
                      rows={3}
                    />
                    <ServicePageMediaFields
                      locale={locale}
                      slug={entry.slug}
                      prefix={prefix}
                      base={base}
                      mc={mc}
                      disabled={pending}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        name={`${prefix}bookCallLabel`}
                        label="Book a call — button label"
                        placeholder="Book a call"
                        defaultValue={getPath(mc, `${base}.bookCallLabel`)}
                      />
                      <Field
                        name={`${prefix}bookCallUrl`}
                        label="Book a call — URL (optional)"
                        placeholder="Leave empty to use header Contact us link"
                        defaultValue={getPath(mc, `${base}.bookCallUrl`)}
                      />
                    </div>
                  </div>
                </ServicePageCollapsible>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#2C4E7A]/75">
          Photos are stored on the server under{" "}
          <span className="font-mono">public/uploads/service-pages</span>. Click Save after
          uploading.
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save service pages"}
        </button>
      </div>

      {status ? <div className="text-sm font-semibold text-[#1F3A5F]">{status}</div> : null}
    </form>
  );
}
