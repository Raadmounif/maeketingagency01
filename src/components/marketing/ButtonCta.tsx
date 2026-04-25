import type { ComponentProps } from "react";
import { Link } from "@/i18n/routing";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
  variant?: "gradient" | "outline" | "ghost";
};

export function ButtonCta({
  className = "",
  variant = "gradient",
  ...props
}: Props) {
  const base =
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F57C00] sm:w-auto active:brightness-95";

  const styles =
    variant === "gradient"
      ? "bg-gradient-to-r from-[#FF8C00] to-[#FFB347] text-[#1F3A5F] shadow-md shadow-orange-500/25 hover:brightness-105 active:brightness-95"
      : variant === "outline"
        ? "border border-[#2C4E7A]/25 bg-white text-[#1F3A5F] shadow-sm hover:bg-[#F5F7FA]"
        : "text-[#1F3A5F] hover:bg-white/10";

  return <Link className={`${base} ${styles} ${className}`} {...props} />;
}
