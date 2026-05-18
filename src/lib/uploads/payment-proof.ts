import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_SUBDIR = "payment-proofs";
const MAX_BYTES = 6 * 1024 * 1024;

export function isValidPaymentProofUrl(url: string | null | undefined): boolean {
  const s = String(url ?? "").trim();
  if (!s.length) return false;
  if (s.includes("..")) return false;
  if (s.startsWith(`/uploads/${UPLOAD_SUBDIR}/`)) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function savePaymentProofImage(file: File, userId: string) {
  if (!file.type.startsWith("image/")) {
    return { ok: false as const, message: "Only image files are allowed (PNG, JPG, WebP, GIF)." };
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return { ok: false as const, message: "Image must be under 6MB." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const buf = Buffer.from(await file.arrayBuffer());
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = crypto.randomBytes(6).toString("hex");
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "user";
  const filename = `pay-${safeUser}-${stamp}-${rand}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", UPLOAD_SUBDIR);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buf);

  return { ok: true as const, url: `/uploads/${UPLOAD_SUBDIR}/${filename}` };
}
