"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, message: "Email is already registered." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, name: name || null, passwordHash, role: "CLIENT" },
  });

  return { ok: true, message: "Account created. You can now log in." };
}

