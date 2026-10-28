import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAuth } from "@/lib/verify-auth";
import { askChatbase, ChatbaseError } from "@/lib/chatbase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_LOGGED_QUESTION_LENGTH = 500;
const GENERIC_ERROR = "The assistant is unavailable right now. Please try again.";

type InteractionLog = {
  status: "success" | "error";
  question: string;
  durationMs: number;
  answerLength?: number;
  httpStatus?: number;
};

/** Records AI usage in activity_events. Never throws: logging must not break the chat. */
async function logInteraction(userId: string, log: InteractionLog) {
  try {
    const metadata: Record<string, unknown> = {
      status: log.status,
      question: log.question.slice(0, MAX_LOGGED_QUESTION_LENGTH),
      duration_ms: log.durationMs,
    };
    if (log.answerLength !== undefined) metadata.answer_length = log.answerLength;
    if (log.httpStatus !== undefined) metadata.http_status = log.httpStatus;

    const { error } = await supabaseAdmin.from("activity_events").insert({
      event_type: "ai_interaction",
      user_id: userId,
      resource_type: null,
      resource_id: null,
      metadata,
    });
    if (error) console.error("[ai-assistant] Failed to record interaction:", error);
  } catch (error) {
    console.error("[ai-assistant] Failed to record interaction:", error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return auth.response;

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("locked")
    .eq("id", auth.userId)
    .single();
  if (userRow?.locked) {
    return NextResponse.json(
      {
        error:
          "Account pending approval. This feature will be available once an administrator unlocks your account.",
      },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const startedAt = Date.now();
  try {
    const { text } = await askChatbase(message);
    await logInteraction(auth.userId, {
      status: "success",
      question: message,
      durationMs: Date.now() - startedAt,
      answerLength: text.length,
    });
    // Only the answer text goes back to the browser: no provider details.
    return NextResponse.json({ text });
  } catch (error) {
    const httpStatus = error instanceof ChatbaseError ? error.status : 0;
    console.error("[ai-assistant] Assistant provider error:", error);
    await logInteraction(auth.userId, {
      status: "error",
      question: message,
      durationMs: Date.now() - startedAt,
      httpStatus,
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 502 });
  }
}
