import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/verify-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildSessionContext,
  notifyInternalTrainingSignup,
  notifyTrainingAttendee,
} from "@/lib/training-notify-email";
import {
  getSessionDisplayTitle,
  loadTrainingSessionDays,
  loadUserNotifyFields,
} from "@/lib/training-session-queries";
import { trainingSessionCannotSelfServeSignup } from "@/lib/training-session-public";
import { trainingEnrollmentBodySchema, trainingEnrollmentRow } from "@/lib/training-enrollment";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id: sessionId } = await params;

    const json = await req.json().catch(() => null);
    const parsed = trainingEnrollmentBodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please complete all required enrollment fields.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const enrollment = parsed.data;

    const { data: gate, error: gateErr } = await supabaseAdmin
      .from("training_sessions")
      .select("status, registration_closes_at, waitlist_enabled")
      .eq("id", sessionId)
      .single();
    if (gateErr || !gate) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (
      trainingSessionCannotSelfServeSignup(
        gate.status as string,
        gate.registration_closes_at as string | null,
        gate.waitlist_enabled as boolean | null
      )
    ) {
      return NextResponse.json(
        { error: "Signup is not available for this class." },
        { status: 400 }
      );
    }

    const { data: rows, error } = await supabaseAdmin.rpc("register_for_training_session", {
      p_session_id: sessionId,
      p_user_id: auth.userId,
    });

    if (error) {
      console.error("register_for_training_session:", error);
      return NextResponse.json({ error: error.message || "Signup failed" }, { status: 500 });
    }

    const row = (Array.isArray(rows) ? rows[0] : rows) as Record<string, unknown> | undefined | null;
    const outError = row?.out_error as string | undefined | null;
    if (outError) {
      return NextResponse.json({ error: outError }, { status: 400 });
    }

    const regId = row?.out_registration_id as string | undefined;
    const regStatus = row?.out_status as string | undefined;
    const wlPos = row?.out_waitlist_position as number | null | undefined;

    if (regId) {
      const rowPayload = trainingEnrollmentRow(enrollment);
      const { error: updErr } = await supabaseAdmin
        .from("training_registrations")
        .update(rowPayload)
        .eq("id", regId);
      if (updErr) {
        console.error("training_registrations enrollment update:", updErr);
        return NextResponse.json(
          { error: "Signup could not save your details. Please try again or contact support." },
          { status: 500 }
        );
      }
    }

    const { data: sess } = await supabaseAdmin.from("training_sessions").select("*").eq("id", sessionId).single();
    if (sess && regId) {
      const title = await getSessionDisplayTitle(sess as Parameters<typeof getSessionDisplayTitle>[0]);
      const days = await loadTrainingSessionDays(sessionId);
      const ctx = buildSessionContext(sessionId, {
        title,
        days,
        timezone: sess.timezone as string,
        location: sess.location as string,
      });
      const user = await loadUserNotifyFields(auth.userId);
      const schedule = { days, timezone: ctx.timezone };
      if (regStatus === "registered") {
        notifyTrainingAttendee("registration_confirmed", user.email, user.name, ctx);
        notifyInternalTrainingSignup([], {
          attendeeEmail: user.email,
          attendeeName: user.name,
          sessionTitle: title,
          status: "registered",
          enrollment,
          schedule,
        });
      } else if (regStatus === "waitlisted") {
        notifyTrainingAttendee("waitlist_joined", user.email, user.name, ctx, {
          waitlistPosition: wlPos ?? undefined,
        });
        notifyInternalTrainingSignup([], {
          attendeeEmail: user.email,
          attendeeName: user.name,
          sessionTitle: title,
          status: "waitlisted",
          enrollment,
          schedule,
        });
      }
    }

    return NextResponse.json({
      registration_id: regId,
      status: regStatus,
      waitlist_position: wlPos ?? null,
      message:
        regStatus === "registered"
          ? "You’re signed up for this class."
          : regStatus === "waitlisted"
            ? "You’re on the waitlist."
            : "OK",
    });
  } catch (e: unknown) {
    console.error("POST register:", e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id: sessionId } = await params;

    const { data: beforeSess } = await supabaseAdmin.from("training_sessions").select("*").eq("id", sessionId).single();

    const { data: rows, error } = await supabaseAdmin.rpc("cancel_my_training_registration", {
      p_session_id: sessionId,
      p_user_id: auth.userId,
    });

    if (error) {
      console.error("cancel_my_training_registration:", error);
      return NextResponse.json({ error: error.message || "Cancel failed" }, { status: 500 });
    }

    const crow = (Array.isArray(rows) ? rows[0] : rows) as Record<string, unknown> | undefined | null;
    const cancelErr = crow?.out_error as string | undefined | null;
    if (cancelErr) {
      return NextResponse.json({ error: cancelErr }, { status: 400 });
    }

    const promotedUserId = crow?.out_promoted_user_id as string | null | undefined;

    if (beforeSess) {
      const title = await getSessionDisplayTitle(beforeSess as Parameters<typeof getSessionDisplayTitle>[0]);
      const days = await loadTrainingSessionDays(sessionId);
      const ctx = buildSessionContext(sessionId, {
        title,
        days,
        timezone: beforeSess.timezone as string,
        location: beforeSess.location as string,
      });
      const canceller = await loadUserNotifyFields(auth.userId);
      notifyTrainingAttendee("registration_cancelled_self", canceller.email, canceller.name, ctx);

      if (promotedUserId) {
        const promoted = await loadUserNotifyFields(promotedUserId);
        notifyTrainingAttendee("promoted_from_waitlist", promoted.email, promoted.name, ctx);
      }
    }

    return NextResponse.json({ success: true, promoted_user_id: promotedUserId ?? null });
  } catch (e: unknown) {
    console.error("DELETE register:", e);
    return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
  }
}
