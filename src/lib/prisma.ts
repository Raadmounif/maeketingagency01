import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: ["error", "warn"],
  });
}

/** True when this Prisma Client matches the current schema (delegates + generated field enums). */
function prismaClientMatchesSchema(client: PrismaClient): boolean {
  const c = client as unknown as {
    smmClientCategory?: { findMany?: unknown };
    customService?: { findMany?: unknown };
  };
  const smmFields = Prisma.SmmServiceScalarFieldEnum as Record<string, string>;
  const hasSmmClientCopy =
    smmFields?.clientTitle === "clientTitle" && smmFields?.clientDescription === "clientDescription";

  return (
    typeof c.smmClientCategory?.findMany === "function" &&
    typeof c.customService?.findMany === "function" &&
    hasSmmClientCopy
  );
}

function getOrCreatePrisma(): PrismaClient {
  let client = globalForPrisma.prisma;

  if (client && !prismaClientMatchesSchema(client)) {
    void client.$disconnect();
    globalForPrisma.prisma = undefined;
    client = undefined;
  }

  if (!client) {
    client = createPrismaClient();
    if (!prismaClientMatchesSchema(client)) {
      throw new Error(
        "Prisma Client is out of date. Run `npx prisma generate`, delete `.next`, then restart `npm run dev`.",
      );
    }
    globalForPrisma.prisma = client;
  }

  return client;
}

/**
 * Lazy proxy so dev / Turbopack HMR does not keep a stale `PrismaClient` that passed an older
 * schema check but is missing newer delegates (e.g. `customService`).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const real = getOrCreatePrisma();
    const value = Reflect.get(real, prop, real);
    if (typeof value === "function") {
      return value.bind(real);
    }
    return value;
  },
});
