import { NextResponse } from "next/server";
import { handleResellerV2Request } from "@/lib/smm/reseller-handlers";

export const runtime = "nodejs";

async function readBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    const j = (await req.json()) as unknown;
    if (!j || typeof j !== "object" || Array.isArray(j)) return {};
    return Object.fromEntries(
      Object.entries(j as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]),
    );
  }

  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text).entries());
  }

  const fd = await req.formData();
  return Object.fromEntries([...fd.entries()].map(([k, v]) => [String(k), String(v)]));
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const result = await handleResellerV2Request(body);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
