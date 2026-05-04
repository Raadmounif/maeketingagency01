import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { Link } from "@/i18n/routing";
import { getPaymentsStats } from "./stats";
import { PaymentsStatsSection } from "./stats-section";
import PaymentsAdminClient from "./view";

export default async function AdminPaymentsPage() {
  const { role } = await requireRole(["PLATFORM_ADMIN", "SERVICE_OWNER"]);

  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });

  const requests = await prisma.paymentRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 400,
    include: {
      method: { select: { name: true } },
      user: { select: { email: true, name: true } },
    },
  });

  const pendingCount = await prisma.paymentRequest.count({ where: { status: "PENDING" } });
  const approvedCount = await prisma.paymentRequest.count({ where: { status: "APPROVED" } });
  const stats = await getPaymentsStats();

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#2C4E7A]/70">
              Admin
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1F3A5F]">Payments</h1>
            <p className="mt-2 max-w-2xl text-[#2C4E7A]/90">
              Configure payment methods and approve pending top-ups.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-amber-50 px-3 py-1 text-amber-900">
                Pending: <strong>{pendingCount}</strong>
              </span>
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-emerald-900">
                Approved: <strong>{approvedCount}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Back to Admin
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-10">
          <PaymentsStatsSection stats={stats} />
          <PaymentsAdminClient
            isPlatformAdmin={role === "PLATFORM_ADMIN"}
            methods={methods.map((m) => ({
              id: m.id,
              name: m.name,
              descriptionText: m.descriptionText,
              descriptionMediaUrl: m.descriptionMediaUrl,
              enabled: m.enabled,
              sort: m.sort,
              updatedAt: m.updatedAt.toISOString(),
            }))}
            requests={requests.map((r) => ({
              id: r.id,
              createdAt: r.createdAt.toISOString(),
              status: r.status,
              amountCents: r.amountCents,
              clientNote: r.clientNote,
              proofUrl: r.proofUrl,
              methodName: r.method.name,
              userEmail: r.user.email,
              userName: r.user.name,
            }))}
          />
        </div>
      </div>
    </main>
  );
}

