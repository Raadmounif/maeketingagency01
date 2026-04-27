import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { providerV2ListServices } from "@/lib/smm/provider-v2";
import { ensureSmmProviderConfig, getSmmProviderBaseUrl } from "@/lib/smm/provider-config";

export async function syncSmmCatalogFromProvider() {
  const cfg = await ensureSmmProviderConfig();
  const baseUrl = (await getSmmProviderBaseUrl()) || cfg.baseUrl;
  if (!baseUrl) {
    throw new Error("Missing provider base URL (set in Admin → SMM or SMM_PROVIDER_BASE_URL).");
  }

  const services = await providerV2ListServices({ baseUrl });

  // Stable category ordering: first time we see a category, append sort index.
  const categorySort = new Map<string, number>();
  let nextSort = (await prisma.smmCategory.count()) + 1;

  for (const s of services) {
    const categoryName = String(s.category ?? "Uncategorized").trim() || "Uncategorized";

    let sort = categorySort.get(categoryName);
    if (sort === undefined) {
      sort = nextSort++;
      categorySort.set(categoryName, sort);
    }

    const category = await prisma.smmCategory.upsert({
      where: { providerName: categoryName },
      create: { providerName: categoryName, sort },
      update: {},
    });

    const rate = new Prisma.Decimal(String(s.rate));
    const min = Number.parseInt(String(s.min), 10);
    const max = Number.parseInt(String(s.max), 10);

    await prisma.smmService.upsert({
      where: { providerServiceId: s.service },
      create: {
        providerServiceId: s.service,
        providerName: String(s.name),
        providerType: String(s.type ?? "Default"),
        providerRate: rate,
        providerMin: Number.isFinite(min) ? min : 0,
        providerMax: Number.isFinite(max) ? max : 0,
        providerRefill: Boolean(s.refill),
        providerCancel: Boolean(s.cancel),
        categoryId: category.id,
        enabledForClients: false,
        enabledForResellers: false,
      },
      update: {
        providerName: String(s.name),
        providerType: String(s.type ?? "Default"),
        providerRate: rate,
        providerMin: Number.isFinite(min) ? min : 0,
        providerMax: Number.isFinite(max) ? max : 0,
        providerRefill: Boolean(s.refill),
        providerCancel: Boolean(s.cancel),
        categoryId: category.id,
        // visibility flags intentionally NOT reset on sync
      },
    });
  }

  return { ok: true as const, imported: services.length };
}
