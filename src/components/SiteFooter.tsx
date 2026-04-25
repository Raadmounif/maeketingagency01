import { Link } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { getMarketingContent, getSocialLinks } from "@/lib/site-settings";
import {
  IconFacebook,
  IconInstagram,
  IconLinkedIn,
  IconX,
  IconYouTube,
} from "@/components/social/SocialIcons";

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/services", label: "Service directory" },
  { href: "/trust", label: "SMM Growth" },
];

export async function SiteFooter() {
  const locale = (await getLocale()) as "en" | "ar";
  const mc = await getMarketingContent(locale);
  const social = await getSocialLinks();
  type Item = {
    href: string;
    label: string;
    Icon: (p: { className?: string }) => React.ReactNode;
  };

  const items: Item[] = [
    ...(social.linkedinUrl
      ? [{ href: social.linkedinUrl, label: "LinkedIn", Icon: IconLinkedIn }]
      : []),
    ...(social.twitterUrl ? [{ href: social.twitterUrl, label: "X", Icon: IconX }] : []),
    ...(social.instagramUrl
      ? [{ href: social.instagramUrl, label: "Instagram", Icon: IconInstagram }]
      : []),
    ...(social.facebookUrl
      ? [{ href: social.facebookUrl, label: "Facebook", Icon: IconFacebook }]
      : []),
    ...(social.youtubeUrl ? [{ href: social.youtubeUrl, label: "YouTube", Icon: IconYouTube }] : []),
  ];

  return (
    <footer className="border-t border-white/10 bg-[#152d4d] py-10 text-sm text-white/75 sm:py-14">
      <div
        className={`mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:gap-10 ${items.length ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {items.length ? (
          <div className="flex flex-wrap items-center gap-3">
            {items.map((it) => (
              <a
                key={it.label}
                href={it.href}
                target="_blank"
                rel="noreferrer"
                aria-label={it.label}
                className="inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/80 shadow-sm transition active:bg-white/15 hover:bg-white/10 hover:text-white"
              >
                <it.Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        ) : null}

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Navigate
          </div>
          <ul className="mt-3 space-y-0.5 sm:mt-4">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg py-2.5 text-base text-white/80 transition hover:bg-white/5 hover:text-white sm:text-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/50">
            {mc.contact.title}
          </div>
          <ul className="mt-3 space-y-1 sm:mt-4">
            <li>
              <a
                href={`mailto:${mc.contact.email}`}
                className="block break-all rounded-lg py-2.5 text-base text-white/80 transition hover:bg-white/5 hover:text-white sm:text-sm"
              >
                {mc.contact.email}
              </a>
            </li>
            <li>
              <span className="block py-1 text-sm text-white/60 sm:text-sm">
                {mc.contact.website}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 px-4 pt-6 text-xs text-white/55 sm:mt-12 sm:pt-8">
        © {new Date().getFullYear()} PalmyraShift. All rights reserved.
      </div>
    </footer>
  );
}
