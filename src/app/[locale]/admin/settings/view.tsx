"use client";

import { useState, useTransition } from "react";
import { updateMarketingContentAction, updateSocialLinksAction } from "./actions";

type Defaults = {
  twitterUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  contactUsUrl: string;
  marketingContent?: unknown;
};

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

export function SocialLinksForm({ defaults }: { defaults: Defaults }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await updateSocialLinksAction(fd);
      setStatus(res.ok ? "Saved." : ("message" in res ? res.message : "Failed to save."));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          name="linkedinUrl"
          label="LinkedIn URL"
          placeholder="https://www.linkedin.com/company/yourpage"
          defaultValue={defaults.linkedinUrl}
        />
        <Field
          name="twitterUrl"
          label="X (Twitter) URL"
          placeholder="https://x.com/yourhandle"
          defaultValue={defaults.twitterUrl}
        />
        <Field
          name="instagramUrl"
          label="Instagram URL"
          placeholder="https://instagram.com/yourhandle"
          defaultValue={defaults.instagramUrl}
        />
        <Field
          name="facebookUrl"
          label="Facebook URL"
          placeholder="https://facebook.com/yourpage"
          defaultValue={defaults.facebookUrl}
        />
        <Field
          name="youtubeUrl"
          label="YouTube URL"
          placeholder="https://youtube.com/@yourchannel"
          defaultValue={defaults.youtubeUrl}
        />
        <Field
          name="contactUsUrl"
          label="Header “Contact us” link (https)"
          placeholder="https://wa.me/… or https://t.me/…"
          defaultValue={defaults.contactUsUrl}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#2C4E7A]/75">
          Leave a field empty to hide that icon in the footer. Contact link appears in the site header when set.
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save links"}
        </button>
      </div>

      {status ? (
        <div className="text-sm font-semibold text-[#1F3A5F]">{status}</div>
      ) : null}
    </form>
  );
}

function TextArea({
  name,
  label,
  placeholder,
  defaultValue,
  rows = 4,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="text-sm font-semibold text-[#1F3A5F]">{label}</div>
      <textarea
        name={name}
        defaultValue={defaultValue}
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

function getQuotesLines(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[p];
  }
  if (!Array.isArray(cur)) return "";
  return cur
    .map((q) => {
      if (!q || typeof q !== "object") return "";
      const r = q as Record<string, unknown>;
      const quote = String(r.quote ?? "").trim();
      const name = String(r.name ?? "").trim();
      const role = String(r.role ?? "").trim();
      if (!quote) return "";
      return [quote, name, role].join("|");
    })
    .filter(Boolean)
    .join("\n");
}

export function SiteSectionsForm({ defaults }: { defaults: Defaults }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const mc = (defaults.marketingContent ?? {}) as Record<string, unknown>;

  function Subsection({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) {
    return (
      <section className="rounded-xl border border-[#2C4E7A]/10 bg-[#F5F7FA] p-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold text-[#1F3A5F]">{title}</div>
          {description ? <p className="text-xs text-[#2C4E7A]/80">{description}</p> : null}
        </div>
        <div className="mt-4 grid gap-4">{children}</div>
      </section>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateMarketingContentAction(fd);
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

          <div className="mt-5 grid gap-6">
            <Subsection
              title="Home hero"
              description="Top of the landing page. Leave a field empty to use the built-in default. Optional link wraps the headline block only. Media supports HTTPS image/GIF, direct video (.mp4/.webm), or YouTube/Vimeo."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  name={`mc_${locale}_hero_kicker`}
                  label="Badge / kicker"
                  placeholder="Growth & transformation, engineered for teams"
                  defaultValue={getPath(mc, `${locale}.hero.kicker`)}
                />
                <Field
                  name={`mc_${locale}_hero_title`}
                  label="Headline"
                  placeholder="Forward motion for your next chapter."
                  defaultValue={getPath(mc, `${locale}.hero.title`)}
                />
              </div>
              <TextArea
                name={`mc_${locale}_hero_subtitle`}
                label="Subcopy"
                placeholder="Supporting paragraph…"
                defaultValue={getPath(mc, `${locale}.hero.subtitle`)}
                rows={3}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  name={`mc_${locale}_hero_linkUrl`}
                  label="Optional link (https://…)"
                  placeholder="https://example.com/campaign"
                  defaultValue={getPath(mc, `${locale}.hero.linkUrl`)}
                />
                <label className="block">
                  <div className="text-sm font-semibold text-[#1F3A5F]">Media mode</div>
                  <select
                    name={`mc_${locale}_hero_media_kind`}
                    defaultValue={getPath(mc, `${locale}.hero.mediaKind`) || "auto"}
                    className="mt-2 h-11 w-full rounded-xl border border-[#2C4E7A]/20 bg-white px-4 text-sm text-[#1F3A5F] shadow-sm outline-none ring-orange-500/10 focus:ring-4"
                  >
                    <option value="auto">Auto — detect image / GIF / YouTube / Vimeo / video file</option>
                    <option value="image">Image or GIF (picture element)</option>
                    <option value="video">Video (HTML5 or embed)</option>
                  </select>
                </label>
              </div>
              <Field
                name={`mc_${locale}_hero_mediaUrl`}
                label="Media URL"
                placeholder="https://cdn.example.com/banner.gif"
                defaultValue={getPath(mc, `${locale}.hero.mediaUrl`)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  name={`mc_${locale}_hero_stat1_title`}
                  label="Stat 1 — title"
                  placeholder="24/7"
                  defaultValue={getPath(mc, `${locale}.hero.stat1Title`)}
                />
                <Field
                  name={`mc_${locale}_hero_stat1_subtitle`}
                  label="Stat 1 — subtitle"
                  placeholder="Always-on platform mindset"
                  defaultValue={getPath(mc, `${locale}.hero.stat1Subtitle`)}
                />
                <Field
                  name={`mc_${locale}_hero_stat2_title`}
                  label="Stat 2 — title"
                  placeholder="One login"
                  defaultValue={getPath(mc, `${locale}.hero.stat2Title`)}
                />
                <Field
                  name={`mc_${locale}_hero_stat2_subtitle`}
                  label="Stat 2 — subtitle"
                  placeholder="Shared access across services"
                  defaultValue={getPath(mc, `${locale}.hero.stat2Subtitle`)}
                />
              </div>
            </Subsection>

            <Subsection title="About / Value proposition">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  name={`mc_${locale}_about_kicker`}
                  label="Kicker"
                  placeholder="Value proposition"
                  defaultValue={getPath(mc, `${locale}.about.kicker`)}
                />
                <Field
                  name={`mc_${locale}_about_title`}
                  label="Title"
                  placeholder="Trust is the operating system of transformation."
                  defaultValue={getPath(mc, `${locale}.about.title`)}
                />
              </div>
              <TextArea
                name={`mc_${locale}_about_body`}
                label="Body"
                placeholder="Paragraph text…"
                defaultValue={getPath(mc, `${locale}.about.body`)}
                rows={4}
              />
              <TextArea
                name={`mc_${locale}_about_bullets`}
                label="Bullets (one per line)"
                placeholder={"Bullet 1\nBullet 2\nBullet 3"}
                defaultValue={getLines(mc, `${locale}.about.bullets`)}
                rows={4}
              />
            </Subsection>

            <Subsection title="Proof">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  name={`mc_${locale}_proof_title`}
                  label="Title"
                  placeholder="Proof, not promises"
                  defaultValue={getPath(mc, `${locale}.proof.title`)}
                />
                <Field
                  name={`mc_${locale}_proof_subtitle`}
                  label="Subtitle"
                  placeholder="Teams choose PalmyraShift when…"
                  defaultValue={getPath(mc, `${locale}.proof.subtitle`)}
                />
              </div>
              <TextArea
                name={`mc_${locale}_proof_quotes`}
                label='Quotes (one per line: "quote|name|role")'
                placeholder='Great result...|Client Name|Role'
                defaultValue={getQuotesLines(mc, `${locale}.proof.quotes`)}
                rows={5}
              />
            </Subsection>

            <Subsection title="Contact">
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  name={`mc_${locale}_contact_title`}
                  label="Title"
                  placeholder="Contact"
                  defaultValue={getPath(mc, `${locale}.contact.title`)}
                />
                <Field
                  name={`mc_${locale}_contact_email`}
                  label="Email"
                  placeholder="hello@palmyrashift.com"
                  defaultValue={getPath(mc, `${locale}.contact.email`)}
                />
                <Field
                  name={`mc_${locale}_contact_website`}
                  label="Website"
                  placeholder="palmyrashift.com"
                  defaultValue={getPath(mc, `${locale}.contact.website`)}
                />
              </div>
            </Subsection>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#2C4E7A]/75">
          Leave fields empty to fall back to the default site copy.
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save sections"}
        </button>
      </div>

      {status ? <div className="text-sm font-semibold text-[#1F3A5F]">{status}</div> : null}
    </form>
  );
}

