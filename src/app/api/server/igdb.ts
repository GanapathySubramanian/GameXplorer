// src/server/igdb.ts
import "server-only";

// Fallback to the official IGDB base URL if not provided in env.
// This prevents startup crashes in local/dev where env may be missing.
const IGDB = process.env.IGDB_BASE_URL ?? "https://api.igdb.com/v4";

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  // Throw early with a clear message so deploys fail fast and logs show what's wrong.
  throw new Error("Missing Twitch credentials: set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in env.");
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getTwitchToken() {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt - 60_000) return tokenCache.token;

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST", cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Twitch token error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return tokenCache.token;
}

export async function igdb(resource: string, body: string, cache: RequestCache = "no-store") {
  const token = await getTwitchToken();
  const res = await fetch(`${IGDB}/${resource}`, {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
    body,
    cache,
  });
  if (!res.ok) {
    throw new Error(`IGDB error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export function formatIGDBImage(url?: string, size: string = "t_cover_big") {
  if (!url) return "";
  const withProto = url.startsWith("//") ? `https:${url}` : url;
  return withProto.replace(/t_[^/]+/, size);
}