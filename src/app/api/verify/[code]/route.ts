import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  clientIpFromHeaders,
  normalizeVerificationCode,
  toVerificationResult,
} from "@/lib/certificates";
import { getCertificateStore } from "@/lib/certificates-store";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/** Public: GET /api/verify/OF-XXXX-XXXX-XXXX */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limit = checkRateLimit(`verify:${clientIpFromHeaders((n) => req.headers.get(n))}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Try again shortly." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const { code: rawCode } = await params;
  const code = normalizeVerificationCode(decodeURIComponent(rawCode));
  if (!code) return NextResponse.json({ found: false }, { status: 404, headers: NO_STORE });

  try {
    const result = toVerificationResult(await getCertificateStore().getByCode(code));
    return NextResponse.json(result, { status: result.found ? 200 : 404, headers: NO_STORE });
  } catch (e) {
    console.error("verify certificate:", e);
    return NextResponse.json({ error: "Verification is temporarily unavailable" }, { status: 503, headers: NO_STORE });
  }
}
