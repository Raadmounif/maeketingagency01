import {
  type AdvertisingMediaKind,
  parseAdvertisingMedia,
} from "@/lib/advertising-media";

const frameClass =
  "mt-4 w-full max-w-3xl overflow-hidden rounded-xl border border-[#2C4E7A]/12 bg-black/5 shadow-sm";

export function AdvertisingMediaBlock({
  url,
  kind,
  className = "",
}: {
  url: string | null;
  kind?: AdvertisingMediaKind | null;
  /** Extra wrapper classes (e.g. max width on trust page). */
  className?: string;
}) {
  const parsed = parseAdvertisingMedia(url, kind ?? "auto");
  if (parsed.variant === "none") return null;

  if (parsed.variant === "iframe") {
    return (
      <div className={`${frameClass} aspect-video ${className}`.trim()}>
        <iframe
          src={parsed.src}
          title="Promotional video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (parsed.variant === "video") {
    return (
      <div className={`${frameClass} ${className}`.trim()}>
        <video
          src={parsed.src}
          controls
          playsInline
          className="max-h-[min(70vh,520px)] w-full object-contain"
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div className={`${frameClass} ${className}`.trim()}>
      {/* Admin-configured arbitrary HTTPS URLs; next/image remotePatterns would not cover all CDNs. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic external URLs from site settings */}
      <img
        src={parsed.src}
        alt=""
        loading="lazy"
        className="max-h-[min(70vh,520px)] w-full object-contain"
      />
    </div>
  );
}
