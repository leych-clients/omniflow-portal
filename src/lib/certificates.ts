import { createHmac, randomInt, timingSafeEqual } from "crypto";

export type CertificateStatus = "valid" | "revoked" | "superseded";
export type EffectiveCertificateStatus = CertificateStatus | "expired";

export interface CertificateRecord {
  id: string;
  verification_code: string;
  registration_id: string | null;
  recipient_name: string;
  company_name: string | null;
  course_title: string;
  /** YYYY-MM-DD */
  completed_on: string;
  /** YYYY-MM-DD */
  expires_on: string | null;
  status: CertificateStatus;
  revoked_at: string | null;
  revoked_reason: string | null;
  signature: string;
  issued_at: string;
}

export type NewCertificateFields = Pick<
  CertificateRecord,
  "recipient_name" | "company_name" | "course_title" | "completed_on" | "expires_on"
> & { registration_id?: string | null; user_id?: string | null; session_id?: string | null; course_id?: string | null; issued_by?: string | null };

/** What the public verification page/API is allowed to see. */
export interface PublicCertificate {
  verification_code: string;
  recipient_name: string;
  company_name: string | null;
  course_title: string;
  completed_on: string;
  expires_on: string | null;
  issued_at: string;
  revoked_at: string | null;
}

export type VerificationResult =
  | { found: false }
  | {
      found: true;
      status: EffectiveCertificateStatus;
      /** false means the stored row no longer matches its signature (possible tampering). */
      integrity: boolean;
      certificate: PublicCertificate;
    };

/** Explicit opt-in so the in-memory store and auth bypass can never turn on by accident. */
export function isCertificatesDemo(): boolean {
  return process.env.CERTIFICATES_DEMO === "1";
}

// No 0/O, 1/I/L to avoid transcription mistakes when someone types a code from paper.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_GROUPS = 3;
const CODE_GROUP_LEN = 4;

export function generateVerificationCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < CODE_GROUPS; g++) {
    let part = "";
    for (let i = 0; i < CODE_GROUP_LEN; i++) {
      part += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    groups.push(part);
  }
  return `OF-${groups.join("-")}`;
}

/** Accepts "of 7k3m 9qxd 4tlr", "OF-7K3M-9QXD-4TLR", "OF7K3M9QXD4TLR" etc. Returns null if it cannot be a code. */
export function normalizeVerificationCode(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("OF") ? raw.slice(2) : raw;
  if (body.length !== CODE_GROUPS * CODE_GROUP_LEN) return null;
  const groups: string[] = [];
  for (let g = 0; g < CODE_GROUPS; g++) {
    groups.push(body.slice(g * CODE_GROUP_LEN, (g + 1) * CODE_GROUP_LEN));
  }
  return `OF-${groups.join("-")}`;
}

const DEMO_SIGNING_SECRET = "omniflow-certificates-demo-secret-not-for-production";

function getSigningSecret(): string {
  const secret = process.env.CERTIFICATE_SIGNING_SECRET;
  if (secret) return secret;
  if (isCertificatesDemo()) return DEMO_SIGNING_SECRET;
  throw new Error("CERTIFICATE_SIGNING_SECRET is not configured");
}

type SignedFields = Pick<
  CertificateRecord,
  "verification_code" | "recipient_name" | "company_name" | "course_title" | "completed_on" | "expires_on"
>;

function canonicalPayload(f: SignedFields): string {
  return JSON.stringify([
    "v1",
    f.verification_code,
    f.recipient_name,
    f.company_name ?? "",
    f.course_title,
    f.completed_on,
    f.expires_on ?? "",
  ]);
}

export function signCertificate(f: SignedFields): string {
  return createHmac("sha256", getSigningSecret()).update(canonicalPayload(f)).digest("hex");
}

export function hasValidSignature(record: CertificateRecord): boolean {
  let expected: Buffer;
  try {
    expected = Buffer.from(signCertificate(record), "hex");
  } catch {
    return false;
  }
  const actual = Buffer.from(record.signature ?? "", "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function effectiveStatus(
  record: Pick<CertificateRecord, "status" | "expires_on">,
  today: string = new Date().toISOString().slice(0, 10)
): EffectiveCertificateStatus {
  if (record.status === "valid" && record.expires_on && record.expires_on < today) return "expired";
  return record.status;
}

export function toVerificationResult(record: CertificateRecord | null): VerificationResult {
  if (!record) return { found: false };
  return {
    found: true,
    status: effectiveStatus(record),
    integrity: hasValidSignature(record),
    certificate: {
      verification_code: record.verification_code,
      recipient_name: record.recipient_name,
      company_name: record.company_name,
      course_title: record.course_title,
      completed_on: record.completed_on,
      expires_on: record.expires_on,
      issued_at: record.issued_at,
      revoked_at: record.revoked_at,
    },
  };
}

export function formatCertificateDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets: Map<string, Bucket> = ((globalThis as { __certRateLimit?: Map<string, Bucket> }).__certRateLimit ??=
  new Map());

/**
 * Per-instance, in-memory limiter to slow code enumeration. On serverless hosting this is best-effort
 * only; put a shared limiter (Upstash, Vercel WAF) in front for production-grade protection.
 */
export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const fwd = get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return get("x-real-ip") ?? "unknown";
}
