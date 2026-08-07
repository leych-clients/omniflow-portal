import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

const BUCKET = "manuals";
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const filename = (body.filename as string)?.trim();
    const folder = (body.folder as string)?.trim() || "uncategorized";
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;

    if (!filename) {
      return NextResponse.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 1 GB" },
        { status: 400 }
      );
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${safeFolder}/${safeFilename}`;

    const { data: signData, error: signError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (signError || !signData?.token || !signData?.signedUrl) {
      console.error("Manuals presign error:", signError);
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
    console.error("Manuals presign error:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
