import { headers } from "next/headers";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/certificates";

export async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3009";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function rateLimitCurrentRequest(): Promise<{ ok: boolean; retryAfterSec: number }> {
  const h = await headers();
  return checkRateLimit(`verify:${clientIpFromHeaders((n) => h.get(n))}`);
}
