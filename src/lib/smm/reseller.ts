import { prisma } from "@/lib/prisma";
import { hashResellerApiKey } from "@/lib/reseller-key";

export async function findEnabledResellerByApiKey(apiKey: string) {
  const key = apiKey.trim();
  if (!key) return null;

  const hash = hashResellerApiKey(key);
  return prisma.resellerAccount.findFirst({
    where: { enabled: true, apiKeyHash: hash },
    include: { user: true },
  });
}
