/**
 * Server-only Chatbase client. Only import this from API routes / server code.
 * The browser talks to our own `/api/ai-assistant` route, never to Chatbase directly.
 */
const CHATBASE_API_URL = "https://www.chatbase.co/api/v1";
const REQUEST_TIMEOUT_MS = 55_000;

export class ChatbaseError extends Error {
  /** HTTP status returned by Chatbase, or 0 if the request never completed. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ChatbaseError";
    this.status = status;
  }
}

function getConfig(): { apiKey: string; botId: string } {
  // Prefer private server-side variables; fall back to the legacy NEXT_PUBLIC_ names
  // so existing deployments keep working until the env vars are renamed.
  const apiKey = process.env.CHATBASE_API_KEY ?? process.env.NEXT_PUBLIC_CHATBASE_API_KEY;
  const botId = process.env.CHATBASE_BOT_ID ?? process.env.NEXT_PUBLIC_CHATBASE_BOT_ID;

  if (!apiKey || !botId) {
    throw new ChatbaseError("Chatbase is not configured (missing API key or bot ID)", 0);
  }
  return { apiKey, botId };
}

export async function askChatbase(message: string): Promise<{ text: string }> {
  const { apiKey, botId } = getConfig();

  let response: Response;
  try {
    response = await fetch(`${CHATBASE_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
        chatbotId: botId,
        stream: false,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "request failed";
    throw new ChatbaseError(`Chatbase request failed: ${reason}`, 0);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new ChatbaseError(`Chatbase API error ${response.status}: ${errorText}`, response.status);
  }

  const data = (await response.json().catch(() => null)) as { text?: unknown } | null;
  if (!data || typeof data.text !== "string" || !data.text.trim()) {
    throw new ChatbaseError("Chatbase returned an empty response", response.status);
  }

  return { text: data.text };
}
