import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { UsersTable } from "./table";

export default async function AdminUsersPage() {
  await requireRole("PLATFORM_ADMIN");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    take: 100,
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
              Users & Roles
            </h1>
            <p className="mt-2 max-w-2xl text-[#2C4E7A]/90">
              Workflow: a person registers normally, then you promote them to{" "}
              <span className="font-semibold text-[#1F3A5F]">STAFF</span> or{" "}
              <span className="font-semibold text-[#1F3A5F]">
                SERVICE_OWNER
              </span>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/settings"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Site settings
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-6 shadow-sm">
          <UsersTable users={users} />
        </div>
      </div>
    </main>
  );
}

