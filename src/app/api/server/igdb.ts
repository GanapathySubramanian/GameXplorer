// src/app/api/server/igdb.ts
import "server-only";

// Fallback to the official IGDB base URL if not provided in env.
const IGDB = process.env.IGDB_BASE_URL ?? "https://api.igdb.com/v4";

// Read env vars but do not throw at module import time. Validation happens when
// we actually attempt to request a token so builds or static analysis won't fail
// when secrets aren't present.
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

let tokenCache: { token: string; expiresAt: number } | null = null;

// --- Rate limiting / concurrency controls (per-process) ---
// IGDB rate limits: 4 requests / second and up to 8 open requests.
const RATE_LIMIT = 4; // tokens per second
const CAPACITY = RATE_LIMIT;
let tokens = CAPACITY;
let lastRefill = Date.now();

function refillTokens() {
  const now = Date.now();
  const elapsedMs = now - lastRefill;
  if (elapsedMs <= 0) return;
  const add = (elapsedMs / 1000) * RATE_LIMIT;
  if (add > 0) {
    tokens = Math.min(CAPACITY, tokens + add);
    lastRefill = now;
  }
}

let inFlight = 0;
const MAX_INFLIGHT = 8;

async function waitForSlot() {
  // Wait until both a token is available and inFlight < MAX_INFLIGHT.
  while (true) {
    refillTokens();
    if (tokens >= 1 && inFlight < MAX_INFLIGHT) {
      tokens -= 1;
      inFlight += 1;
      return;
    }
    // Sleep a short time then retry.
    await new Promise((r) => setTimeout(r, 100));
  }
}

function releaseSlot() {
  inFlight = Math.max(0, inFlight - 1);
}

async function getTwitchToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing Twitch credentials: set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in environment variables."
    );
  }

  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt - 60_000) return tokenCache.token;

  // Request a new token (do not cache the promise globally - keep it simple).
  const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;
  const res = await fetch(url, { method: "POST", cache: "no-store" });
  if (!res.ok) {
    // Avoid returning raw body to the client; include status for debugging.
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`Twitch token error: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

/**
 * Fetch wrapper for IGDB that enforces rate limits, concurrency limits and retry/backoff
 * for transient errors (429, 5xx). Returns parsed JSON on success.
 */
export async function igdb(resource: string, body: string, cache: RequestCache = "no-store") {
  // Acquire slot (rate-limit + concurrency)
  await waitForSlot();
  try {
    const token = await getTwitchToken();

    const endpoint = `${IGDB}/${resource}`;
    const maxRetries = 3;
    let attempt = 0;

    while (true) {
      attempt += 1;
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Client-ID": CLIENT_ID!,
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body,
          cache,
        });

        if (res.ok) {
          // Parse JSON (may throw if response is not JSON)
          return await res.json();
        }

        // Handle 429 / rate limit
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const waitMs = retryAfter ? Number(retryAfter) * 1000 : 500 * Math.pow(2, attempt - 1);
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          const text = await res.text().catch(() => "<no body>");
          throw new Error(`IGDB 429 Too Many Requests: ${text}`);
        }

        // Retry on server errors (5xx)
        if (res.status >= 500 && res.status < 600 && attempt <= maxRetries) {
          const waitMs = 500 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        // Non-retryable error: return sanitized message
        const errText = await res.text().catch(() => "<no body>");
        throw new Error(`IGDB error: ${res.status} ${errText}`);
      } catch (err) {
        // Network or parsing error — retry if under maxRetries
        if (attempt <= maxRetries) {
          const waitMs = 300 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw err;
      }
    }
  } finally {
    // Release concurrency slot regardless of outcome
    releaseSlot();
  }
}

export function formatIGDBImage(url?: string, size: string = "t_cover_big") {
  if (!url) return "";
  const withProto = url.startsWith("//") ? `https:${url}` : url;
  return withProto.replace(/t_[^/]+/, size);
}