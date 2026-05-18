import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { savePaymentProofForUser } from "@/lib/payment-requests-core";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as unknown as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ ok: false, message: "Choose an image to upload." }, { status: 400 });
  }

  try {
    const saved = await savePaymentProofForUser(userId, file);
    if (!saved.ok) {
      return NextResponse.json({ ok: false, message: saved.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url: saved.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
