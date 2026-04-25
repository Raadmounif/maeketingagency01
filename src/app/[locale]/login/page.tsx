import { Suspense } from "react";
import LoginView from "./view";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-14 dark:bg-zinc-950">
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-black">
            <div className="text-sm text-black/70 dark:text-white/70">
              Loading…
            </div>
          </div>
        </main>
      }
    >
      <LoginView />
    </Suspense>
  );
}

