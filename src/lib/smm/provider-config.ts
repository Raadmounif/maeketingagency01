import { prisma } from "@/lib/prisma";

export async function getSmmProviderConfig() {
  return prisma.smmProviderConfig.findUnique({ where: { id: 1 } });
}

export async function ensureSmmProviderConfig() {
  const envBase = process.env.SMM_PROVIDER_BASE_URL?.trim() ?? "";
  const defaultBase = envBase.length ? envBase : "https://smmturk.org";

  return prisma.smmProviderConfig.upsert({
    where: { id: 1 },
    create: { id: 1, baseUrl: defaultBase },
    update: {},
  });
}

export async function getSmmProviderBaseUrl() {
  const cfg = await getSmmProviderConfig();
  const fromDb = cfg?.baseUrl?.trim() ?? "";
  if (fromDb.length) return fromDb;
  return process.env.SMM_PROVIDER_BASE_URL?.trim() ?? "";
}
