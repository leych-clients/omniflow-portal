import type { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { isCertificatesDemo } from "@/lib/certificates";

/** Admin check for certificate routes. Demo mode (explicit env flag) has no Supabase and skips auth. */
export async function verifyCertificateAdmin(
  req: NextRequest
): Promise<{ ok: true; userId: string | null } | { ok: false; response: NextResponse }> {
  if (isCertificatesDemo()) return { ok: true, userId: null };
  return verifyAdmin(req);
}
