import { requireRole } from "@/lib/rbac";
import { Link } from "@/i18n/routing";

export default async function AdminPage() {
  await requireRole("PLATFORM_ADMIN");

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">
            Admin
          </h1>
          <p className="mt-2 text-[#2C4E7A]/90">
            Platform administration area (RBAC-protected).
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              Manage users & roles
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Site settings
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

