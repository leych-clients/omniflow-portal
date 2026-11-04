import { supabaseAdmin } from "@/lib/supabase-admin";
import type { NewCertificateFields } from "@/lib/certificates";

export class RegistrationNotEligibleError extends Error {}

function localDate(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(iso)
    );
  } catch {
    return iso.slice(0, 10);
  }
}

/** Builds the certificate snapshot from a roster entry. Only confirmed, registered attendees qualify. */
export async function certificateFieldsFromRegistration(
  registrationId: string,
  expiresOn: string | null
): Promise<NewCertificateFields> {
  const { data: reg, error } = await supabaseAdmin
    .from("training_registrations")
    .select("id, user_id, session_id, status, attendance_status, certificate_company_name, first_name, last_name")
    .eq("id", registrationId)
    .maybeSingle();
  if (error) throw error;
  if (!reg) throw new RegistrationNotEligibleError("Registration not found");
  if (reg.status !== "registered") throw new RegistrationNotEligibleError("Registration is not an active seat");
  if (reg.attendance_status !== "confirmed") {
    throw new RegistrationNotEligibleError("Attendance must be confirmed before issuing a certificate");
  }

  const [{ data: session }, { data: user }] = await Promise.all([
    supabaseAdmin
      .from("training_sessions")
      .select("id, title, course_id, starts_at, ends_at, timezone")
      .eq("id", reg.session_id)
      .maybeSingle(),
    supabaseAdmin.from("users").select("name, first_name, last_name").eq("id", reg.user_id).maybeSingle(),
  ]);
  if (!session) throw new RegistrationNotEligibleError("Training session not found");

  let courseTitle: string | null = null;
  if (session.course_id) {
    const { data: course } = await supabaseAdmin.from("courses").select("title").eq("id", session.course_id).maybeSingle();
    courseTitle = (course?.title as string | undefined) ?? null;
  }
  courseTitle = courseTitle ?? (session.title as string | null);
  if (!courseTitle) throw new RegistrationNotEligibleError("Session has no course title");

  const recipient =
    [reg.first_name, reg.last_name].filter(Boolean).join(" ").trim() ||
    (user?.name as string | null) ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  if (!recipient) throw new RegistrationNotEligibleError("Attendee has no name on file");

  return {
    registration_id: reg.id as string,
    user_id: reg.user_id as string,
    session_id: reg.session_id as string,
    course_id: (session.course_id as string | null) ?? null,
    recipient_name: recipient,
    company_name: (reg.certificate_company_name as string | null)?.trim() || null,
    course_title: courseTitle,
    completed_on: localDate((session.ends_at ?? session.starts_at) as string, (session.timezone as string) || "UTC"),
    expires_on: expiresOn,
  };
}
