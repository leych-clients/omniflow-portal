function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function guessContentType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) return "application/zip";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

const PRESIGN_TIMEOUT_MS = 30_000;
/** Large software ZIPs can take several minutes on slower links. */
const STORAGE_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Get a presigned upload URL from the API, then PUT the file directly to Supabase Storage.
 * Uses plain fetch (not the browser Supabase client) so auth/session locks cannot hang the upload.
 * getAuthHeaders is accepted for call-site compatibility but unused — cookies auth the presign route.
 */
export async function uploadFileViaPresign(
  presignUrl: string,
  _getAuthHeaders: () => Promise<Record<string, string>>,
  presignBody: Record<string, unknown>,
  file: File
): Promise<{ path: string; filename: string; size: string }> {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url = presignUrl.startsWith("http") ? presignUrl : `${base}${presignUrl}`;

  const presignController = new AbortController();
  const presignTimeout = setTimeout(() => presignController.abort(), PRESIGN_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(presignBody),
      credentials: "include",
      signal: presignController.signal,
    });
  } catch (e) {
    clearTimeout(presignTimeout);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Upload timed out. Please try again.");
    }
    throw e;
  }
  clearTimeout(presignTimeout);

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    path?: string;
    signedUrl?: string;
    token?: string;
  };
  if (!res.ok) throw new Error(data.error || "Failed to get upload URL");

  const path = data.path?.trim();
  const signedUrl = data.signedUrl?.trim();
  if (!path || !signedUrl) {
    throw new Error("Invalid upload URL response from server");
  }

  const uploadController = new AbortController();
  const uploadTimeout = setTimeout(() => uploadController.abort(), STORAGE_UPLOAD_TIMEOUT_MS);

  try {
    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": guessContentType(file),
        "x-upsert": "true",
      },
      body: file,
      signal: uploadController.signal,
    });
    if (!putRes.ok) {
      const detail = await putRes.text().catch(() => "");
      throw new Error(
        detail
          ? `Storage upload failed (${putRes.status}): ${detail.slice(0, 200)}`
          : `Storage upload failed (${putRes.status})`
      );
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("File upload timed out. Please try again on a faster connection.");
    }
    throw e;
  } finally {
    clearTimeout(uploadTimeout);
  }

  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return { path, filename, size: formatFileSize(file.size) };
}
