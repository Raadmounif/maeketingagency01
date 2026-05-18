import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { ServicePageSlug } from "@/lib/service-pages";
import { SERVICE_PAGE_UPLOAD_SUBDIR } from "@/lib/uploads/service-page-media-url";

const MAX_BYTES = 6 * 1024 * 1024;

export async function saveServicePageImage(
  file: File,
  slug: ServicePageSlug,
  locale: "en" | "ar",
) {
  if (!file.type.startsWith("image/")) {
    return { ok: false as const, message: "Only image uploads are supported (PNG, JPG, WebP, GIF)." };
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
  const filename = `sp-${slug}-${locale}-${stamp}-${rand}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", SERVICE_PAGE_UPLOAD_SUBDIR);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buf);

  return {
    ok: true as const,
    url: `/uploads/${SERVICE_PAGE_UPLOAD_SUBDIR}/${filename}`,
  };
}
