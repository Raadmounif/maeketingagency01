import { Link } from "@/i18n/routing";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();
  const role = (session?.user as unknown as { role?: string })?.role;
  const isAdmin = role === "PLATFORM_ADMIN";

  return (
    <main className="flex-1 bg-white px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-xl border border-[#2C4E7A]/12 bg-[#F5F7FA] p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-[#1F3A5F]">
            Dashboard
          </h1>
          <p className="mt-2 text-[#2C4E7A]/90">
            Signed in as{" "}
            <span className="font-semibold text-[#1F3A5F]">
              {session?.user?.email ?? "unknown"}
            </span>
            .
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/services"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FFB347] px-5 text-sm font-semibold text-[#1F3A5F] shadow-md shadow-orange-500/20 transition hover:brightness-105"
            >
              Explore services
            </Link>
            <Link
              href="/trust"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
            >
              SMM Growth
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2C4E7A]/20 bg-white px-5 text-sm font-semibold text-[#1F3A5F] shadow-sm transition hover:bg-[#F5F7FA]"
              >
                Admin
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

