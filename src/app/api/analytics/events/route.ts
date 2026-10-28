import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { verifyAuth } from "@/lib/verify-auth";
import { getRequestMetadata } from "@/lib/request-metadata";

const DEFAULT_LIMIT = 100;
const AI_STATS_WINDOW_DAYS = 30;
const ALLOWED_EVENT_TYPES = ["login", "logout"] as const;

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get("event_type");
    const userId = searchParams.get("user_id");
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      500
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

    let query = supabaseAdmin
      .from("activity_events")
      .select("id, event_type, user_id, resource_type, resource_id, metadata, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventType) {
      query = query.eq("event_type", eventType);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: events, error, count } = await query;

    if (error) {
      console.error("Analytics events error:", error);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    const userIds = [...new Set((events ?? []).map((e) => e.user_id))];
    const { data: usersData } = userIds.length
      ? await supabaseAdmin
          .from("users")
          .select("id, email, name")
          .in("id", userIds)
      : { data: [] };
    const userMap = new Map(
      (usersData ?? []).map((u) => [u.id, { email: u.email, name: u.name }])
    );

    const rows = (events ?? []).map((row) => {
      const user = userMap.get(row.user_id);
      const metadata = (row.metadata as Record<string, unknown>) ?? {};
      const resourceLabel =
        (row.resource_type === "manual" || row.resource_type === "software") &&
        metadata.title
          ? String(metadata.title)
          : row.resource_type === "user" && metadata.target_user_email
            ? String(metadata.target_user_email)
            : row.resource_type === "user" && metadata.target_user_name
              ? String(metadata.target_user_name)
              : row.resource_type && row.resource_id
                ? `${row.resource_type}:${row.resource_id}`
                : "-";

      return {
        id: row.id,
        event_type: row.event_type,
        user_id: row.user_id,
        user_email: user?.email ?? null,
        user_name: user?.name ?? null,
        resource_type: row.resource_type,
        resource_id: row.resource_id,
        resource_label: resourceLabel,
        metadata,
        created_at: row.created_at,
      };
    });

    // AI usage totals are counted in the database so they're accurate beyond the page limit.
    const aiEvents = () =>
      supabaseAdmin
        .from("activity_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "ai_interaction");
    const since = new Date(Date.now() - AI_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const [aiTotal, aiRecent, aiFailed] = await Promise.all([
      aiEvents(),
      aiEvents().gte("created_at", since),
      aiEvents().eq("metadata->>status", "error"),
    ]);

    return NextResponse.json({
      events: rows,
      total: count ?? rows.length,
      ai_stats: {
        total: aiTotal.count ?? 0,
        last_30_days: aiRecent.count ?? 0,
        failed: aiFailed.count ?? 0,
      },
    });
  } catch (error: unknown) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const eventType = typeof body.event_type === "string" ? body.event_type : null;
    const clientMetadata =
      typeof body.metadata === "object" && body.metadata !== null ? body.metadata : {};

    if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType as (typeof ALLOWED_EVENT_TYPES)[number])) {
      return NextResponse.json(
        { error: "Invalid or missing event_type. Allowed: login, logout" },
        { status: 400 }
      );
    }

    const requestMeta = getRequestMetadata(req);
    const metadata: Record<string, unknown> = {};
    for (const [k, v] of Object.entries({ ...requestMeta, ...clientMetadata })) {
      if (v != null && v !== "") metadata[k] = v;
    }

    const { error } = await supabaseAdmin.from("activity_events").insert({
      event_type: eventType,
      user_id: auth.userId,
      resource_type: null,
      resource_id: null,
      metadata,
    });

    if (error) {
      console.error("Analytics POST error:", error);
      return NextResponse.json(
        { error: "Failed to record event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Analytics POST error:", error);
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 }
    );
  }
}
