"use server";

import { cookies } from "next/headers";

export async function setWalletDisplayCurrencyAction(currency: "USD" | "SYP") {
  const c = currency === "SYP" ? "SYP" : "USD";
  (await cookies()).set("wallet_display_currency", c, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
  });
}
