"use server";

import { revalidatePath } from "next/cache";
import {
  normalizeAdvertisingMediaUrl,
} from "@/lib/advertising-media";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { ensureSmmProviderConfig } from "@/lib/smm/provider-config";
import { syncSmmCatalogFromProvider } from "@/lib/smm/sync-catalog";
import { generateResellerApiKey, hashResellerApiKey } from "@/lib/reseller-key";
import { dollarsToCents, creditWallet } from "@/lib/wallet";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

async function requireSmmAdmin() {
  await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);
}

function normalizeOptionalUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function updateSmmProviderSettingsAction(input: {
  baseUrl: string;
  globalMarkupPercent: number;
  resellerMinMarginPct: number;
}) {
  await requireSmmAdmin();

  const baseUrl = String(input.baseUrl ?? "").trim();
  if (!baseUrl) return { ok: false as const, message: "Base URL is required." };

  await prisma.smmProviderConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      baseUrl,
      resellerMinMarginPct: Number(input.resellerMinMarginPct) || 0,
    },
    update: {
      baseUrl,
      resellerMinMarginPct: Number(input.resellerMinMarginPct) || 0,
    },
  });

  const pct = Number(input.globalMarkupPercent) || 0;
  const existing = await prisma.smmMarkupRule.findFirst({
    where: { scope: "GLOBAL", categoryId: null, serviceId: null },
  });

  if (existing) {
    await prisma.smmMarkupRule.update({
      where: { id: existing.id },
      data: { kind: "PERCENT", value: pct },
    });
  } else {
    await prisma.smmMarkupRule.create({
      data: { scope: "GLOBAL", kind: "PERCENT", value: pct },
    });
  }

  return { ok: true as const };
}

export async function syncSmmCatalogAction() {
  await requireSmmAdmin();
  await ensureSmmProviderConfig();
  const res = await syncSmmCatalogFromProvider();
  return { ok: true as const, imported: res.imported };
}

export async function updateSmmServiceVisibilityAction(input: {
  updates: Array<{ id: string; enabledForClients?: boolean; enabledForResellers?: boolean }>;
}) {
  await requireSmmAdmin();

  for (const u of input.updates) {
    const data: { enabledForClients?: boolean; enabledForResellers?: boolean } = {};
    if (typeof u.enabledForClients === "boolean") data.enabledForClients = u.enabledForClients;
    if (typeof u.enabledForResellers === "boolean") {
      data.enabledForResellers = u.enabledForResellers;
    }
    if (!Object.keys(data).length) continue;

    await prisma.smmService.update({
      where: { id: u.id },
      data,
    });
  }

  return { ok: true as const };
}

export async function updateSmmServiceClientCopyAction(input: {
  id: string;
  clientTitle: string;
  clientDescription: string;
}) {
  await requireSmmAdmin();

  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Missing service id." };

  const clientTitle = String(input.clientTitle ?? "").trim().slice(0, 512) || null;
  const clientDescription = String(input.clientDescription ?? "").trim() || null;

  await prisma.smmService.update({
    where: { id },
    data: { clientTitle, clientDescription },
  });

  revalidatePath("/admin/smm");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function createSmmClientCategoryAction(input: {
  nameEn: string;
  nameAr: string;
  offerPriceUsd?: number | string;
  enabled: boolean;
  sort: number;
}) {
  await requireSmmAdmin();

  const nameEn = String(input.nameEn ?? "").trim().slice(0, 255);
  const nameAr = String(input.nameAr ?? "").trim().slice(0, 255);
  if (!nameEn || !nameAr) return { ok: false as const, message: "Both English and Arabic names are required." };

  const offerPriceUsd = Number(String(input.offerPriceUsd ?? "").trim() || "0");
  if (!Number.isFinite(offerPriceUsd) || offerPriceUsd < 0) {
    return { ok: false as const, message: "Offer price must be 0 or greater." };
  }
  const offerPriceCents = Math.max(0, Math.ceil(offerPriceUsd * 100 - 1e-9));

  const cat = await prisma.smmClientCategory.create({
    data: {
      nameEn,
      nameAr,
      offerPriceCents,
      enabled: Boolean(input.enabled),
      sort: Number(input.sort) || 0,
    },
    select: { id: true },
  });

  return { ok: true as const, id: cat.id };
}

export async function updateSmmClientCategoryAction(input: {
  id: string;
  nameEn: string;
  nameAr: string;
  offerPriceUsd?: number | string;
  enabled: boolean;
  sort: number;
}) {
  await requireSmmAdmin();

  const id = String(input.id ?? "").trim();
  const nameEn = String(input.nameEn ?? "").trim().slice(0, 255);
  const nameAr = String(input.nameAr ?? "").trim().slice(0, 255);
  if (!id) return { ok: false as const, message: "Missing category id." };
  if (!nameEn || !nameAr) return { ok: false as const, message: "Both English and Arabic names are required." };

  const offerPriceUsd = Number(String(input.offerPriceUsd ?? "").trim() || "0");
  if (!Number.isFinite(offerPriceUsd) || offerPriceUsd < 0) {
    return { ok: false as const, message: "Offer price must be 0 or greater." };
  }
  const offerPriceCents = Math.max(0, Math.ceil(offerPriceUsd * 100 - 1e-9));

  await prisma.smmClientCategory.update({
    where: { id },
    data: {
      nameEn,
      nameAr,
      offerPriceCents,
      enabled: Boolean(input.enabled),
      sort: Number(input.sort) || 0,
    },
  });

  return { ok: true as const };
}

export async function deleteSmmClientCategoryAction(input: { id: string }) {
  await requireSmmAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Missing category id." };
  await prisma.smmClientCategory.delete({ where: { id } });
  return { ok: true as const };
}

export async function addServiceToSmmClientCategoryAction(input: {
  categoryId: string;
  serviceId: string;
  markupPct: number;
  offerQuantity: number;
  sort: number;
}) {
  await requireSmmAdmin();

  const categoryId = String(input.categoryId ?? "").trim();
  const serviceId = String(input.serviceId ?? "").trim();
  if (!categoryId || !serviceId) return { ok: false as const, message: "Category and service are required." };

  const markupPct = Number(input.markupPct) || 0;
  const offerQuantity = Math.floor(Number(input.offerQuantity) || 0);
  if (offerQuantity <= 0) {
    return { ok: false as const, message: "Offer quantity must be greater than 0." };
  }
  const sort = Number(input.sort) || 0;

  try {
    await prisma.smmClientCategoryItem.create({
      data: { categoryId, serviceId, markupPct, offerQuantity, sort },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to add service";
    if (msg.includes("Unique constraint") || msg.includes("Unique") || msg.includes("P2002")) {
      return { ok: false as const, message: "This service is already assigned to a client category." };
    }
    return { ok: false as const, message: "Failed to add service." };
  }

  return { ok: true as const };
}

export async function removeServiceFromSmmClientCategoryAction(input: { itemId: string }) {
  await requireSmmAdmin();
  const itemId = String(input.itemId ?? "").trim();
  if (!itemId) return { ok: false as const, message: "Missing item id." };
  await prisma.smmClientCategoryItem.delete({ where: { id: itemId } });
  return { ok: true as const };
}

export async function addManualServiceToSmmClientCategoryAction(input: {
  categoryId: string;
  customServiceId: string;
  offerUnits: number;
  sort: number;
}) {
  await requireSmmAdmin();
  const categoryId = String(input.categoryId ?? "").trim();
  const customServiceId = String(input.customServiceId ?? "").trim();
  if (!categoryId || !customServiceId) {
    return { ok: false as const, message: "Category and manual service are required." };
  }

  const offerUnits = Math.floor(Number(input.offerUnits) || 0);
  if (offerUnits <= 0) return { ok: false as const, message: "Units must be greater than 0." };

  try {
    await prisma.smmClientCategoryManualItem.create({
      data: {
        categoryId,
        customServiceId,
        offerUnits,
        sort: Number(input.sort) || 0,
      },
      select: { id: true },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") || msg.includes("Unique") || msg.includes("P2002")) {
      return {
        ok: false as const,
        message: "This manual service is already assigned to this featured offer.",
      };
    }
    return { ok: false as const, message: "Failed to add manual service." };
  }

  revalidatePath("/admin/smm");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function removeManualServiceFromSmmClientCategoryAction(input: { itemId: string }) {
  await requireSmmAdmin();
  const itemId = String(input.itemId ?? "").trim();
  if (!itemId) return { ok: false as const, message: "Missing item id." };
  await prisma.smmClientCategoryManualItem.delete({ where: { id: itemId } });
  revalidatePath("/admin/smm");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function issueResellerApiKeyAction(input: { email: string; discountPct: number }) {
  await requireRole("PLATFORM_ADMIN");

  const email = String(input.email ?? "").toLowerCase().trim();
  if (!email) return { ok: false as const, message: "Email is required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, message: "User not found." };

  const apiKey = generateResellerApiKey();
  const hash = hashResellerApiKey(apiKey);
  const discountPct = Number(input.discountPct) || 0;

  await prisma.resellerAccount.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      enabled: true,
      apiKeyHash: hash,
      discountPct,
    },
    update: {
      enabled: true,
      apiKeyHash: hash,
      discountPct,
    },
  });

  return { ok: true as const, apiKey };
}

export async function creditUserWalletAction(input: { email: string; amountUsd: number }) {
  await requireRole("PLATFORM_ADMIN");

  const email = String(input.email ?? "").toLowerCase().trim();
  if (!email) return { ok: false as const, message: "Email is required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, message: "User not found." };

  const amountUsd = Number(input.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false as const, message: "Invalid amount." };
  }

  const amountCents = dollarsToCents(amountUsd);

  await prisma.$transaction(async (tx) => {
    await creditWallet(tx, {
      userId: user.id,
      amountCents,
      note: "Admin wallet credit",
    });
  });

  return { ok: true as const };
}

export async function updateSmmAdvertisingBoardAction(input: {
  locale: "en" | "ar";
  enabled: boolean;
  title: string;
  body: string;
  linkUrl: string | null;
  mediaUrl: string | null;
  mediaKind: string | null;
}) {
  await requireSmmAdmin();

  const locale = input.locale === "ar" ? "ar" : "en";
  const title = String(input.title ?? "").trim().slice(0, 255);
  const body = String(input.body ?? "").trim().slice(0, 10000);
  const linkUrl = normalizeOptionalUrl(input.linkUrl);

  if (String(input.linkUrl ?? "").trim() && !linkUrl) {
    return { ok: false as const, message: "Invalid link URL (use http or https)." };
  }

  const mediaRaw = String(input.mediaUrl ?? "").trim();
  const mediaUrl = normalizeAdvertisingMediaUrl(input.mediaUrl);
  if (mediaRaw && !mediaUrl) {
    return { ok: false as const, message: "Invalid media URL (use http or https)." };
  }

  const mk = String(input.mediaKind ?? "").trim().toLowerCase();
  const mediaKind =
    mk === "image" || mk === "video" ? mk : null;

  await prisma.smmAdvertisingBoard.upsert({
    where: { locale },
    create: {
      locale,
      enabled: Boolean(input.enabled),
      title,
      body,
      linkUrl,
      mediaUrl,
      mediaKind,
    },
    update: {
      enabled: Boolean(input.enabled),
      title,
      body,
      linkUrl,
      mediaUrl,
      mediaKind,
    },
  });

  return { ok: true as const };
}

export async function uploadSmmAdvertisingBoardPhotoAction(formData: FormData) {
  await requireSmmAdmin();
  const localeRaw = String(formData.get("locale") ?? "").trim();
  const locale = localeRaw === "ar" ? "ar" : "en";
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, message: "Missing file." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false as const, message: "Only image uploads are supported." };
  }
  const maxBytes = 6 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    return { ok: false as const, message: "Image must be under 6MB." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const buf = Buffer.from(await file.arrayBuffer());
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = crypto.randomBytes(6).toString("hex");
  const filename = `smm-ad-${locale}-${stamp}-${rand}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "smm-ad-board");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buf);

  // Public URL served by Next from /public
  return { ok: true as const, url: `/uploads/smm-ad-board/${filename}` };
}

export async function addSmmTopPickAction(input: {
  kind: "API" | "MANUAL" | "OFFER";
  refId: string;
  sort?: number;
  enabled?: boolean;
}) {
  await requireSmmAdmin();
  const kind = input.kind === "MANUAL" ? "MANUAL" : input.kind === "OFFER" ? "OFFER" : "API";
  const refId = String(input.refId ?? "").trim();
  if (!refId) return { ok: false as const, message: "Missing item." };
  const sort = Number.isFinite(Number(input.sort)) ? Number(input.sort) : 0;
  const enabled = input.enabled !== false;

  await prisma.smmTopServicePick.create({
    data: {
      kind,
      refId,
      sort,
      enabled,
    },
  });

  revalidatePath("/admin/smm");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function updateSmmTopPickAction(input: {
  id: string;
  sort?: number;
  enabled?: boolean;
}) {
  await requireSmmAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Missing pick id." };
  const data: { sort?: number; enabled?: boolean } = {};
  if (input.sort !== undefined) data.sort = Number(input.sort) || 0;
  if (input.enabled !== undefined) data.enabled = Boolean(input.enabled);

  await prisma.smmTopServicePick.update({ where: { id }, data });
  revalidatePath("/admin/smm");
  revalidatePath("/trust");
  return { ok: true as const };
}

export async function deleteSmmTopPickAction(input: { id: string }) {
  await requireSmmAdmin();
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false as const, message: "Missing pick id." };
  await prisma.smmTopServicePick.delete({ where: { id } });
  revalidatePath("/admin/smm");
  revalidatePath("/trust");
  return { ok: true as const };
}

/**
 * Per-service PERCENT markup on top of provider rate (clients + reseller pricing).
 * Empty `percentText` removes the override so the default/global markup applies.
 */
export async function upsertSmmServiceMarkupPercentAction(input: {
  serviceId: string;
  categoryId: string;
  percentText: string;
}) {
  await requireSmmAdmin();

  const serviceId = String(input.serviceId ?? "").trim();
  const categoryId = String(input.categoryId ?? "").trim();
  if (!serviceId || !categoryId) {
    return { ok: false as const, message: "Missing service or category." };
  }

  const raw = String(input.percentText ?? "").trim();

  await prisma.smmMarkupRule.deleteMany({
    where: { scope: "SERVICE", serviceId },
  });

  if (!raw.length) {
    revalidatePath("/admin/smm");
    revalidatePath("/trust");
    return { ok: true as const };
  }

  const pct = Number(raw);
  if (!Number.isFinite(pct) || pct < 0) {
    return { ok: false as const, message: "Markup must be a non-negative number." };
  }

  const clamped = Math.min(1000, pct);

  await prisma.smmMarkupRule.create({
    data: {
      scope: "SERVICE",
      kind: "PERCENT",
      value: clamped,
      categoryId,
      serviceId,
    },
  });

  revalidatePath("/admin/smm");
  revalidatePath("/trust");
  return { ok: true as const };
}
