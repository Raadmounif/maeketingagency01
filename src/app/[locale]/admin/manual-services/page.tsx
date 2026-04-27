import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Link } from "@/i18n/routing";
import ManualServicesAdminClient from "./view";

export default async function ManualServicesAdminPage() {
  await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);

  const services = await prisma.customService.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });

  const orders = await prisma.customServiceOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      user: { select: { email: true, name: true } },
      service: { select: { id: true, name: true, priceUsd: true } },
    },
  });

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
              Admin
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F3A5F]">
              Manual services
            </h1>
            <p className="mt-2 max-w-2xl text-[#2C4E7A]/90">
              Add services that are not in the provider catalog. Track client orders and mark them
              done when fulfilled.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Back to Admin
            </Link>
            <Link
              href="/trust#manual-services"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              View on SMM Growth
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-6 shadow-sm">
          <ManualServicesAdminClient
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              priceUsd: s.priceUsd.toString(),
              enabled: s.enabled,
              sort: s.sort,
              updatedAt: s.updatedAt.toISOString(),
            }))}
            orders={orders.map((o) => ({
              id: o.id,
              status: o.status,
              createdAt: o.createdAt.toISOString(),
              clientNote: o.clientNote,
              userEmail: o.user.email,
              userName: o.user.name,
              serviceId: o.service.id,
              serviceName: o.service.name,
              priceUsd: o.service.priceUsd.toString(),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
