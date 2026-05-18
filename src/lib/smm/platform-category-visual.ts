export type PlatformCategoryVisual = {
  abbr: string;
  tileClass: string;
  ringClass: string;
};

/** ASCII-only initials — avoids hydration mismatches when names include emoji. */
function initialsFromCategoryName(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));

  if (words.length >= 2) {
    const a = words[0]!.match(/\p{L}/u)?.[0] ?? "";
    const b = words[1]!.match(/\p{L}/u)?.[0] ?? "";
    const pair = `${a}${b}`.toUpperCase();
    if (pair.length >= 2) return pair.slice(0, 2);
    if (pair.length === 1) return pair;
  }

  const letters = [...name.matchAll(/\p{L}/gu)].map((m) => m[0]!);
  if (letters.length >= 2) return `${letters[0]}${letters[1]}`.toUpperCase();
  if (letters.length === 1) return letters[0]!.toUpperCase();
  return "?";
}

/** Heuristic brand styling from provider category name (no external assets). */
export function platformVisualForCategoryName(name: string): PlatformCategoryVisual {
  const n = name.toLowerCase();

  if (n.includes("facebook") || /\bfb\b/.test(n)) {
    return {
      abbr: "f",
      tileClass: "bg-[#1877F2] text-white",
      ringClass: "ring-[#1877F2]/35",
    };
  }
  if (n.includes("instagram") || /\big\b/.test(n)) {
    return {
      abbr: "ig",
      tileClass: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white",
      ringClass: "ring-[#DD2A7B]/35",
    };
  }
  if (n.includes("tiktok") || n.includes("tik tok")) {
    return {
      abbr: "tt",
      tileClass: "bg-[#010101] text-white",
      ringClass: "ring-[#010101]/30",
    };
  }
  if (n.includes("youtube") || /\byt\b/.test(n)) {
    return {
      abbr: "yt",
      tileClass: "bg-[#FF0000] text-white",
      ringClass: "ring-[#FF0000]/35",
    };
  }
  if (n.includes("twitter") || n === "x" || n.includes(" x ")) {
    return {
      abbr: "x",
      tileClass: "bg-[#0F1419] text-white",
      ringClass: "ring-[#0F1419]/30",
    };
  }
  if (n.includes("telegram")) {
    return {
      abbr: "tg",
      tileClass: "bg-[#229ED9] text-white",
      ringClass: "ring-[#229ED9]/35",
    };
  }
  if (n.includes("linkedin")) {
    return {
      abbr: "in",
      tileClass: "bg-[#0A66C2] text-white",
      ringClass: "ring-[#0A66C2]/35",
    };
  }
  if (n.includes("spotify")) {
    return {
      abbr: "sp",
      tileClass: "bg-[#1DB954] text-white",
      ringClass: "ring-[#1DB954]/35",
    };
  }
  if (n.includes("snapchat") || n.includes("snap")) {
    return {
      abbr: "sc",
      tileClass: "bg-[#FFFC00] text-[#1F3A5F]",
      ringClass: "ring-[#FFFC00]/50",
    };
  }
  if (n.includes("whatsapp")) {
    return {
      abbr: "wa",
      tileClass: "bg-[#25D366] text-white",
      ringClass: "ring-[#25D366]/35",
    };
  }
  if (n.includes("discord")) {
    return {
      abbr: "dc",
      tileClass: "bg-[#5865F2] text-white",
      ringClass: "ring-[#5865F2]/35",
    };
  }
  if (n.includes("pinterest")) {
    return {
      abbr: "pi",
      tileClass: "bg-[#E60023] text-white",
      ringClass: "ring-[#E60023]/35",
    };
  }
  if (n.includes("threads")) {
    return {
      abbr: "th",
      tileClass: "bg-[#101010] text-white",
      ringClass: "ring-[#101010]/30",
    };
  }

  return {
    abbr: initialsFromCategoryName(name),
    tileClass: "bg-[#1F3A5F] text-white",
    ringClass: "ring-[#1F3A5F]/25",
  };
}
