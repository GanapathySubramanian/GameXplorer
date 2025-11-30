// src/app/api/igdb/query/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { igdb, formatIGDBImage } from "../../server/igdb";

// Simple in-memory cache for certain queries (trending). Keeps pages for a short TTL to reduce
// IGDB calls during bursts. Keyed by `trending:${limit}:${offset}`.
const trendingCache = new Map<string, { data: unknown[]; expiresAt: number }>();
const TRENDING_TTL = 60_000; // 60 seconds

/* ───────────────────────── Schemas ───────────────────────── */

const SearchInput = z.object({
  mode: z.literal("search"),
  term: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(12),
  offset: z.number().int().min(0).default(0),
});

const TrendingInput = z.object({
  mode: z.literal("trending"),
  limit: z.number().int().min(1).max(50).default(12),
  offset: z.number().int().min(0).default(0),
});

const DiscoverInput = z.object({
  mode: z.literal("discover"),
  filters: z.object({
    genres: z.array(z.number().int()).optional(),
    platforms: z.array(z.number().int()).optional(),
    year: z.number().int().optional(),        // release year (UTC)
    ratingMin: z.number().min(0).max(100).optional(),
  }).default({}),
  sort: z.enum([
    "total_rating desc",
    "first_release_date desc",
    "name asc",
  ]).optional(),
  limit: z.number().int().min(1).max(50).default(12),
  offset: z.number().int().min(0).default(0),
});

const TaxonomyInput = z.object({
  mode: z.literal("taxonomy"),
  resource: z.enum(["genres", "platforms", "game_modes", "themes"]),
});

const DetailInput = z.object({
  mode: z.literal("detail"),
  id: z.number().int(), // IGDB game ID
});

const BulkInput = z.object({
  mode: z.literal("bulk"),
  ids: z.array(z.number().int()).min(1).max(50),
});

// IMPORTANT: include ALL variants in the union
const Input = z.discriminatedUnion("mode", [
  SearchInput,
  TrendingInput,
  DiscoverInput,
  TaxonomyInput,
  DetailInput,
  BulkInput,
]);

/* ───────────────────────── Utils ───────────────────────── */

function yearRangeUnix(year: number) {
  const start = Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000);
  const end   = Math.floor(new Date(`${year + 1}-01-01T00:00:00Z`).getTime() / 1000);
  return { start, end };
}

/* ───────────────────────── Handler ───────────────────────── */

export async function POST(req: Request) {
  try {
    const input = Input.parse(await req.json());

    if (input.mode === "search") {
      const term = input.term.replace(/"/g, '\\"');
      const q = `
        search "${term}";
        fields id,name,first_release_date,cover.url,platforms.abbreviation,genres.name,total_rating,total_rating_count;
        where cover != null;
        limit ${input.limit}; offset ${input.offset};
      `;
      const data = await igdb("games", q);
      // data is the raw IGDB response; narrow typing here would be helpful but
      // the shape varies between endpoints — suppress the explicit any rule for now.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = (data as any[]).map((g: any) => ({
        ...g,
        cover: g.cover ? { ...g.cover, url: formatIGDBImage(g.cover.url, "t_cover_big") } : null,
      }));
      return NextResponse.json(normalized, { headers: { "Cache-Control": "no-store" } });
    }

    if (input.mode === "trending") {
      const q = `
        fields id,name,first_release_date,cover.url,platforms.abbreviation,genres.name,total_rating,total_rating_count;
        where cover != null & total_rating_count != null;
        sort total_rating_count desc;
        limit ${input.limit}; offset ${input.offset};
      `;
      const cacheKey = `trending:${input.limit}:${input.offset}`;
      const now = Date.now();
      const cached = trendingCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return NextResponse.json(cached.data, {
          headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=86400" },
        });
      }

      const data = await igdb("games", q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = (data as any[]).map((g: any) => ({
        ...g,
        cover: g.cover ? { ...g.cover, url: formatIGDBImage(g.cover.url, "t_cover_big") } : null,
      }));

      // store in cache
      trendingCache.set(cacheKey, { data: normalized, expiresAt: now + TRENDING_TTL });
      return NextResponse.json(normalized, {
        headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=86400" },
      });
    }

    if (input.mode === "discover") {
      const w: string[] = ["cover != null"];
      const f = input.filters;

      if (f.genres?.length)    w.push(`genres = (${f.genres.join(",")})`);
      if (f.platforms?.length) w.push(`platforms = (${f.platforms.join(",")})`);
      if (f.year) {
        const { start, end } = yearRangeUnix(f.year);
        w.push(`first_release_date >= ${start} & first_release_date < ${end}`);
      }
      if (typeof f.ratingMin === "number") w.push(`total_rating >= ${f.ratingMin}`);

      const sort = input.sort ?? "total_rating desc";
      const q = `
        fields id,name,first_release_date,cover.url,platforms.abbreviation,genres.name,total_rating,total_rating_count;
        where ${w.join(" & ")};
        sort ${sort};
        limit ${input.limit}; offset ${input.offset};
      `;
      const data = await igdb("games", q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = (data as any[]).map((g: any) => ({
        ...g,
        cover: g.cover ? { ...g.cover, url: formatIGDBImage(g.cover.url, "t_cover_big") } : null,
      }));
      return NextResponse.json(normalized, { headers: { "Cache-Control": "no-store" } });
    }

    if (input.mode === "taxonomy") {
      const map = {
        genres:     "fields id,name; sort name asc; limit 500;",
        platforms:  "fields id,name,abbreviation; sort name asc; limit 500;",
        game_modes: "fields id,name; sort name asc; limit 100;",
        themes:     "fields id,name; sort name asc; limit 100;",
      } as const;
      const data = await igdb(input.resource, map[input.resource], "force-cache");
      return NextResponse.json(data, { headers: { "Cache-Control": "s-maxage=86400" } });
    }

    if (input.mode === "bulk") {
      // fetch multiple games by id in a single IGDB call
      let ids = (input as { ids: number[] }).ids;
      // dedupe and validate ids
      ids = Array.from(new Set(ids.map((n) => Number(n)).filter((x) => Number.isFinite(x) && x > 0)));
      if (ids.length === 0) return NextResponse.json([], { headers: { "Cache-Control": "s-maxage=3600" } });
      const q = `
        fields id,name,first_release_date,cover.url,platforms.abbreviation,genres.name,aggregated_rating,total_rating,total_rating_count;
        where id = (${ids.join(",")});
        limit ${ids.length};
      `;
      const data = await igdb("games", q);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = (data as any[]).map((g: any) => ({
        ...g,
        cover: g.cover ? { ...g.cover, url: formatIGDBImage(g.cover.url, "t_cover_big") } : null,
      }));
      return NextResponse.json(normalized, { headers: { "Cache-Control": "s-maxage=3600" } });
    }

    if (input.mode === "detail") {
      const q = `
        fields id,name,summary,storyline,first_release_date,
        cover.url,
        screenshots.url,
        videos.video_id,
        websites.url,
        genres.name,
        platforms.name,
        game_modes.name,
        themes.name,
        involved_companies.company.name,
        similar_games,
        aggregated_rating,total_rating,total_rating_count;
        where id = ${input.id};
        limit 1;
      `;
        const data = await igdb("games", q);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const game = (data as any[])[0] ?? null;

      if (!game) {
        return NextResponse.json(null, { status: 404 });
      }

      // High‑res images for details
      const coverUrl = game.cover?.url ? formatIGDBImage(game.cover.url, "t_original") : null;
      const screenshots = Array.isArray(game.screenshots)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          game.screenshots.map((s: any) => ({ ...s, url: formatIGDBImage(s.url, "t_1080p") }))
        : [];

      // Ensure similar_games is normalized to a numeric id array so the client
      // can rely on a stable shape.
      const similar_games = Array.isArray(game.similar_games)
        ? game.similar_games.map((s: any) => Number(s)).filter((n: number) => Number.isFinite(n) && n > 0)
        : [];

      const normalized = {
        ...game,
        cover: game.cover ? { ...game.cover, url: coverUrl } : null,
        screenshots,
        similar_games,
      };

      return NextResponse.json(normalized, { headers: { "Cache-Control": "s-maxage=3600" } });
    }

    // Fallback (shouldn’t hit due to zod union)
    return NextResponse.json({ error: "Unhandled mode" }, { status: 400 });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message ?? "Bad request" }, { status: 400 });
  }
}