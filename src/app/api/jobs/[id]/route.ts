import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  isJobEmploymentType,
  isJobStatus,
  isUuid,
  normalizeJobSlug,
  sanitizeJobHtml,
} from "@/lib/sanitize-job-html";

/**
 * Public detail by slug (or id). Open jobs only unless admin.
 * Admin edit UI loads by UUID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: raw } = await params;
    const id = decodeURIComponent(raw);
    const hasAuthHint =
      !!req.headers.get("authorization") ||
      req.cookies.getAll().some((c) => c.name.includes("auth") || c.name.includes("sb-"));
    const isAdmin = hasAuthHint ? (await verifyAdmin(req)).ok : false;

    let query = supabaseAdmin.from("job_openings").select("*");
    if (isUuid(id)) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", normalizeJobSlug(id) || id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!isAdmin && data.status !== "open") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { id: raw } = await params;
    const id = decodeURIComponent(raw);
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "PATCH requires job id (UUID)" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title ?? "").trim();
      if (!title) {
        return NextResponse.json(
          { error: "title cannot be empty" },
          { status: 400 }
        );
      }
      updates.title = title;
    }
    if (body.slug !== undefined) {
      const slug = normalizeJobSlug(String(body.slug ?? ""));
      if (!slug) {
        return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      }
      updates.slug = slug;
    } else if (body.title !== undefined && body.regenerate_slug) {
      updates.slug = normalizeJobSlug(String(body.title));
    }
    if (body.department !== undefined) {
      updates.department =
        typeof body.department === "string" && body.department.trim()
          ? body.department.trim()
          : null;
    }
    if (body.location !== undefined) {
      updates.location =
        typeof body.location === "string" && body.location.trim()
          ? body.location.trim()
          : null;
    }
    if (body.employment_type !== undefined) {
      if (!isJobEmploymentType(body.employment_type)) {
        return NextResponse.json(
          { error: "Invalid employment_type" },
          { status: 400 }
        );
      }
      updates.employment_type = body.employment_type;
    }
    if (body.summary !== undefined) {
      updates.summary =
        typeof body.summary === "string" && body.summary.trim()
          ? body.summary.trim().slice(0, 500)
          : null;
    }
    if (body.description !== undefined) {
      updates.description = sanitizeJobHtml(body.description);
    }
    if (body.apply_email !== undefined) {
      updates.apply_email =
        typeof body.apply_email === "string" && body.apply_email.trim()
          ? body.apply_email.trim()
          : null;
    }
    if (body.status !== undefined) {
      if (!isJobStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.posted_at !== undefined) {
      updates.posted_at =
        typeof body.posted_at === "string" && body.posted_at
          ? body.posted_at.slice(0, 10)
          : null;
    }
    if (body.sort_order !== undefined) {
      const n =
        typeof body.sort_order === "number"
          ? body.sort_order
          : parseInt(String(body.sort_order), 10);
      updates.sort_order = Number.isFinite(n) ? n : 0;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("job_openings")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A job with this slug already exists" },
          { status: 409 }
        );
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Error updating job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { id: raw } = await params;
    const id = decodeURIComponent(raw);
    if (!isUuid(id)) {
      return NextResponse.json(
        { error: "DELETE requires job id (UUID)" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("job_openings")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
