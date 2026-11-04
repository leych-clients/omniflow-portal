import { randomUUID } from "crypto";
import {
  generateVerificationCode,
  isCertificatesDemo,
  signCertificate,
  type CertificateRecord,
  type NewCertificateFields,
} from "@/lib/certificates";

interface CertificateStore {
  getByCode(code: string): Promise<CertificateRecord | null>;
  getByRegistrationId(registrationId: string): Promise<CertificateRecord | null>;
  list(): Promise<CertificateRecord[]>;
  insert(row: CertificateRecord, extra: NewCertificateFields): Promise<CertificateRecord>;
  revoke(id: string, reason: string): Promise<CertificateRecord | null>;
}

export class DuplicateCodeError extends Error {}
export class DuplicateRegistrationError extends Error {}

/* ---------------------------------- demo ---------------------------------- */

export const DEMO_CODES = {
  valid: "OF-7K3M-9QXD-4TLR",
  expired: "OF-H6TP-3JZF-2MVS",
  revoked: "OF-B2RN-5WHA-8CYE",
  tampered: "OF-X4GD-7NKU-6PBQ",
} as const;

function buildSeed(): Map<string, CertificateRecord> {
  const rows = new Map<string, CertificateRecord>();
  const add = (
    code: string,
    fields: Pick<CertificateRecord, "recipient_name" | "company_name" | "course_title" | "completed_on" | "expires_on">,
    extra: Partial<CertificateRecord> = {}
  ) => {
    const base = { verification_code: code, ...fields };
    const rec: CertificateRecord = {
      id: randomUUID(),
      registration_id: null,
      status: "valid",
      revoked_at: null,
      revoked_reason: null,
      issued_at: `${fields.completed_on}T17:00:00.000Z`,
      ...base,
      signature: signCertificate(base),
      ...extra,
    };
    rows.set(rec.id, rec);
  };

  add(DEMO_CODES.valid, {
    recipient_name: "Maria Gonzalez",
    company_name: "Permian Midstream Partners",
    course_title: "OMNI Flow Computer Configuration & Custody Transfer",
    completed_on: "2026-06-12",
    expires_on: "2029-06-12",
  });
  add(DEMO_CODES.expired, {
    recipient_name: "James O'Connor",
    company_name: "Gulf Coast Pipeline Co.",
    course_title: "OMNI 6000/7000 Fundamentals",
    completed_on: "2022-03-04",
    expires_on: "2025-03-04",
  });
  add(
    DEMO_CODES.revoked,
    {
      recipient_name: "Daniel Whitfield",
      company_name: "Summit Measurement Services",
      course_title: "OMNI Flow Computer Configuration & Custody Transfer",
      completed_on: "2026-02-20",
      expires_on: "2029-02-20",
    },
    { status: "revoked", revoked_at: "2026-09-02T15:30:00.000Z", revoked_reason: "Issued in error; attendee did not complete the course" }
  );

  // Simulates someone editing a row directly in the database: the signature no longer matches.
  const original = {
    verification_code: DEMO_CODES.tampered,
    recipient_name: "Priya Raman",
    company_name: "Blue Ridge Terminals",
    course_title: "OMNI Flow Computer Fundamentals",
    completed_on: "2026-04-10",
    expires_on: "2029-04-10",
  };
  add(
    DEMO_CODES.tampered,
    { ...original, course_title: "OMNI Flow Computer Advanced Configuration" },
    { signature: signCertificate(original) }
  );

  return rows;
}

// Seeding signs records, which needs the signing secret, so it must only run when demo mode is
// actually used and never at module load (next build imports this module without demo mode).
function demoRows(): Map<string, CertificateRecord> {
  const g = globalThis as { __certDemoStore?: Map<string, CertificateRecord> };
  return (g.__certDemoStore ??= buildSeed());
}

const demoStore: CertificateStore = {
  async getByCode(code) {
    for (const r of demoRows().values()) if (r.verification_code === code) return r;
    return null;
  },
  async getByRegistrationId(registrationId) {
    for (const r of demoRows().values()) if (r.registration_id === registrationId) return r;
    return null;
  },
  async list() {
    return [...demoRows().values()].sort((a, b) => b.issued_at.localeCompare(a.issued_at));
  },
  async insert(row) {
    for (const r of demoRows().values()) if (r.verification_code === row.verification_code) throw new DuplicateCodeError();
    demoRows().set(row.id, row);
    return row;
  },
  async revoke(id, reason) {
    const r = demoRows().get(id);
    if (!r) return null;
    const next: CertificateRecord = { ...r, status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: reason };
    demoRows().set(id, next);
    return next;
  },
};

/* -------------------------------- supabase -------------------------------- */

const COLUMNS =
  "id, verification_code, registration_id, recipient_name, company_name, course_title, completed_on, expires_on, status, revoked_at, revoked_reason, signature, issued_at";

async function admin() {
  const { supabaseAdmin } = await import("@/lib/supabase-admin");
  return supabaseAdmin;
}

const supabaseStore: CertificateStore = {
  async getByCode(code) {
    const db = await admin();
    const { data, error } = await db.from("certificates").select(COLUMNS).eq("verification_code", code).maybeSingle();
    if (error) throw error;
    return (data as CertificateRecord | null) ?? null;
  },
  async getByRegistrationId(registrationId) {
    const db = await admin();
    const { data, error } = await db
      .from("certificates")
      .select(COLUMNS)
      .eq("registration_id", registrationId)
      .maybeSingle();
    if (error) throw error;
    return (data as CertificateRecord | null) ?? null;
  },
  async list() {
    const db = await admin();
    const { data, error } = await db
      .from("certificates")
      .select(COLUMNS)
      .order("issued_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as CertificateRecord[];
  },
  async insert(row, extra) {
    const db = await admin();
    const { data, error } = await db
      .from("certificates")
      .insert({
        ...row,
        registration_id: extra.registration_id ?? null,
        user_id: extra.user_id ?? null,
        session_id: extra.session_id ?? null,
        course_id: extra.course_id ?? null,
        issued_by: extra.issued_by ?? null,
      })
      .select(COLUMNS)
      .single();
    if (error) {
      if (error.code === "23505") {
        if (error.message.includes("registration_id")) throw new DuplicateRegistrationError();
        throw new DuplicateCodeError();
      }
      throw error;
    }
    return data as CertificateRecord;
  },
  async revoke(id, reason) {
    const db = await admin();
    const { data, error } = await db
      .from("certificates")
      .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: reason })
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    return (data as CertificateRecord | null) ?? null;
  },
};

export function getCertificateStore(): CertificateStore {
  return isCertificatesDemo() ? demoStore : supabaseStore;
}

/* ---------------------------------- issue --------------------------------- */

export async function issueCertificate(fields: NewCertificateFields): Promise<CertificateRecord> {
  const store = getCertificateStore();
  if (fields.registration_id) {
    const existing = await store.getByRegistrationId(fields.registration_id);
    if (existing) throw new DuplicateRegistrationError();
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const signed = {
      verification_code: generateVerificationCode(),
      recipient_name: fields.recipient_name,
      company_name: fields.company_name,
      course_title: fields.course_title,
      completed_on: fields.completed_on,
      expires_on: fields.expires_on,
    };
    const row: CertificateRecord = {
      id: randomUUID(),
      ...signed,
      registration_id: fields.registration_id ?? null,
      status: "valid",
      revoked_at: null,
      revoked_reason: null,
      signature: signCertificate(signed),
      issued_at: new Date().toISOString(),
    };
    try {
      return await store.insert(row, fields);
    } catch (e) {
      if (e instanceof DuplicateCodeError) continue;
      throw e;
    }
  }
  throw new Error("Could not allocate a unique verification code");
}
