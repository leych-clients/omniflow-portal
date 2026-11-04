import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCertificateAdmin } from "@/lib/certificates-admin-auth";
import { getCertificateStore } from "@/lib/certificates-store";

export const dynamic = "force-dynamic";

const body = z.object({ reason: z.string().trim().min(3, "Reason is required").max(500) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyCertificateAdmin(req);
  if (!auth.ok) return auth.response;

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const updated = await getCertificateStore().revoke(id, parsed.data.reason);
    if (!updated) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error("admin revoke certificate:", e);
    return NextResponse.json({ error: "Failed to revoke certificate" }, { status: 500 });
  }
}
