import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { notifyHelpdesk } from "@/lib/notify-helpdesk";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAuth } from "@/lib/verify-auth";

export const dynamic = "force-dynamic";

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) return user.id;
  }

  const auth = await verifyAuth(req);
  return auth.ok ? auth.userId : null;
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: authData, error: authErr } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    const authUser = authData?.user;

    if (authErr || !authUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (authUser.app_metadata?.invited_by_admin === true) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (authUser.app_metadata?.self_registration_notified === true) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("users")
      .select("email, name, first_name, last_name, company, title, phone, locked, role")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "client" || profile.locked !== true) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const name =
      profile.name ||
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      undefined;

    const adminUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/users`
      : undefined;

    const result = await notifyHelpdesk("self_registered", {
      email: profile.email ?? authUser.email ?? "",
      name,
      company: profile.company ?? undefined,
      title: profile.title ?? undefined,
      phone: profile.phone ?? undefined,
      adminUrl,
    });

    if (result.ok) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...authUser.app_metadata,
          self_registration_notified: true,
        },
      });
    }

    return NextResponse.json({ ok: result.ok, error: result.error });
  } catch (error) {
    console.error("notify-self-registration:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
