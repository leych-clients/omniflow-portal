import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  isJobEmploymentType,
  isJobStatus,
  normalizeJobSlug,
  sanitizeJobHtml,
} from "@/lib/sanitize-job-html";

/** Public: open jobs only. Admin (Bearer/cookie): all statuses. */
export async function GET(req: NextRequest) {
  try {
    // Skip auth work for anonymous marketing-site traffic.
    const hasAuthHint =
      !!req.headers.get("authorization") ||
      req.cookies.getAll().some((c) => c.name.includes("auth") || c.name.includes("sb-"));
    const isAdmin = hasAuthHint ? (await verifyAdmin(req)).ok : false;

    let query = supabaseAdmin
      .from("job_openings")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("posted_at", { ascending: false, nullsFirst: false });

    if (!isAdmin) {
      query = query.eq("status", "open");
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const slugRaw =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug
        : title;
    const slug = normalizeJobSlug(slugRaw);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const employment_type = isJobEmploymentType(body.employment_type)
      ? body.employment_type
      : "full_time";
    const status = isJobStatus(body.status) ? body.status : "draft";

    const sort_order =
      typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
        ? body.sort_order
        : parseInt(String(body.sort_order ?? "0"), 10) || 0;

    const { data, error } = await supabaseAdmin
      .from("job_openings")
      .insert({
        title,
        slug,
        department:
          typeof body.department === "string" && body.department.trim()
            ? body.department.trim()
            : null,
        location:
          typeof body.location === "string" && body.location.trim()
            ? body.location.trim()
            : null,
        employment_type,
        summary:
          typeof body.summary === "string" && body.summary.trim()
            ? body.summary.trim().slice(0, 500)
            : null,
        description: sanitizeJobHtml(body.description),
        apply_email:
          typeof body.apply_email === "string" && body.apply_email.trim()
            ? body.apply_email.trim()
            : null,
        status,
        posted_at:
          typeof body.posted_at === "string" && body.posted_at
            ? body.posted_at.slice(0, 10)
            : null,
        sort_order,
      })
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
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
