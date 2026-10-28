import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isCertificatesDemo, effectiveStatus } from "@/lib/certificates";
import { verifyCertificateAdmin } from "@/lib/certificates-admin-auth";
import {
  DuplicateRegistrationError,
  getCertificateStore,
  issueCertificate,
} from "@/lib/certificates-store";

export const dynamic = "force-dynamic";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const optionalDate = isoDate.nullish().transform((v) => v || null);

const manualBody = z.object({
  recipient_name: z.string().trim().min(1).max(200),
  company_name: z.string().trim().max(500).nullish().transform((v) => v || null),
  course_title: z.string().trim().min(1).max(300),
  completed_on: isoDate,
  expires_on: optionalDate,
});

const registrationBody = z.object({
  registration_id: z.string().uuid(),
  expires_on: optionalDate,
});

export async function GET(req: NextRequest) {
  const auth = await verifyCertificateAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const items = (await getCertificateStore().list()).map((c) => ({ ...c, effective_status: effectiveStatus(c) }));
    return NextResponse.json({ items, demo: isCertificatesDemo() });
  } catch (e) {
    console.error("admin GET certificates:", e);
    return NextResponse.json({ error: "Failed to load certificates" }, { status: 500 });
  }
}

/** Issue from a roster entry ({ registration_id }) or manually, e.g. to backfill legacy certificates. */
export async function POST(req: NextRequest) {
  const auth = await verifyCertificateAdmin(req);
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed =
    raw && typeof raw === "object" && "registration_id" in raw
      ? registrationBody.safeParse(raw)
      : manualBody.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".");
    return NextResponse.json(
      { error: issue ? `${field ? `${field}: ` : ""}${issue.message}` : "Invalid request" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  try {
    let fields;
    if ("registration_id" in body) {
      if (isCertificatesDemo()) {
        return NextResponse.json({ error: "Roster issuance is not available in demo mode" }, { status: 400 });
      }
      const { certificateFieldsFromRegistration, RegistrationNotEligibleError } = await import(
        "@/lib/certificates-registration"
      );
      try {
        fields = await certificateFieldsFromRegistration(body.registration_id, body.expires_on);
      } catch (e) {
        if (e instanceof RegistrationNotEligibleError) {
          return NextResponse.json({ error: e.message }, { status: 400 });
        }
        throw e;
      }
    } else {
      fields = body;
    }

    const cert = await issueCertificate({ ...fields, issued_by: auth.userId });
    return NextResponse.json({ item: cert }, { status: 201 });
  } catch (e) {
    if (e instanceof DuplicateRegistrationError) {
      return NextResponse.json({ error: "A certificate was already issued for this registration" }, { status: 409 });
    }
    console.error("admin POST certificates:", e);
    return NextResponse.json({ error: "Failed to issue certificate" }, { status: 500 });
  }
}
