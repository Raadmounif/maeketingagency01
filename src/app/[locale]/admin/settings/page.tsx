import { Link } from "@/i18n/routing";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { SiteSectionsForm, SocialLinksForm } from "./view";

export default async function AdminSettingsPage() {
  await requireRole("PLATFORM_ADMIN");

  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
              Admin
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F3A5F]">
              Site Settings
            </h1>
            <p className="mt-2 max-w-2xl text-[#2C4E7A]/90">
              Social links appear as icon buttons in the site footer. Only
              Platform Admin can edit them.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Users & roles
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <CollapsibleSection id="admin-settings-social" title="Footer social links">
            <SocialLinksForm
              defaults={{
                twitterUrl: settings?.twitterUrl ?? "",
                linkedinUrl: settings?.linkedinUrl ?? "",
                facebookUrl: settings?.facebookUrl ?? "",
                instagramUrl: settings?.instagramUrl ?? "",
                youtubeUrl: settings?.youtubeUrl ?? "",
                marketingContent: settings?.marketingContent ?? null,
              }}
            />
          </CollapsibleSection>
        </div>

        <div className="mt-8">
          <CollapsibleSection id="admin-settings-marketing" title="Landing page sections">
            <p className="mt-2 max-w-2xl text-sm text-[#2C4E7A]/85">
              Edit the home page advertising board (hero), section names, and content for About, Proof, and Contact.
              Saved content is per-language (English/Arabic).
            </p>
            <div className="mt-4">
              <SiteSectionsForm
                defaults={{
                  twitterUrl: settings?.twitterUrl ?? "",
                  linkedinUrl: settings?.linkedinUrl ?? "",
                  facebookUrl: settings?.facebookUrl ?? "",
                  instagramUrl: settings?.instagramUrl ?? "",
                  youtubeUrl: settings?.youtubeUrl ?? "",
                  marketingContent: settings?.marketingContent ?? null,
                }}
              />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </main>
  );
}

