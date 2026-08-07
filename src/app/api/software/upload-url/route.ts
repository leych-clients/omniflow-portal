import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

const BUCKET = "software";
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const filename = (body.filename as string)?.trim() || `file-${Date.now()}.zip`;
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 1 GB" },
        { status: 400 }
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = safeName.toLowerCase().endsWith(".zip") ? safeName : `${safeName}.zip`;

    const { data: signData, error: signError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (signError || !signData?.token || !signData?.signedUrl) {
      console.error("Software presign error:", signError);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bucket: BUCKET,
      path,
      token: signData.token,
      signedUrl: signData.signedUrl,
    });
  } catch (error: unknown) {
    console.error("Software presign error:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
