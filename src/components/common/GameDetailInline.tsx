"use client";

import { useEffect, useState, useMemo } from "react";
import { useWishlist } from "@/context/wishlist";
import { useVault } from "@/context/vault";

type Named = { name: string };
type Link = { url: string };
type Video = { video_id: string };
type Shot = { url: string };

type GameDetail = {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  aggregated_rating?: number;
  total_rating_count?: number;
  first_release_date?: number;
  cover?: { url: string } | null;
  screenshots?: Shot[];
  platforms?: Named[];
  genres?: Named[];
  game_modes?: Named[];
  videos?: Video[];
  websites?: Link[];
  involved_companies?: { company?: Named }[];
};

const fmtDate = (unix?: number) => (unix ? new Date(unix * 1000).toLocaleDateString() : "");
const listNames = (arr?: Named[]) => (arr ?? []).map((i) => i.name).filter(Boolean) as string[];
const firstYouTube = (arr?: Video[]) => arr?.[0]?.video_id ?? null;
const storeLinks = (web?: Link[]) => {
  if (!web) return [] as string[];
  const prefs = ["steam", "playstation", "xbox", "epicgames", "nintendo", "gog"];
  return web
    .map((w) => w.url)
    .filter(Boolean)
    .sort((a, b) => {
      const ai = prefs.findIndex((k) => a.toLowerCase().includes(k));
      const bi = prefs.findIndex((k) => b.toLowerCase().includes(k));
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .slice(0, 8);
};

export default function GameDetailInline({ id, onClose }: { id: number; onClose?: () => void }) {
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const wishlist = (() => {
    try {
      return useWishlist();
    } catch (e) {
      return null;
    }
  })();
  const vault = (() => {
    try {
      return useVault();
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    setErr(null);
    setGame(null);
    fetch("/api/igdb/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "detail", id: Number(id) }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setGame(data);
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e));
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  const trailer = useMemo(() => firstYouTube(game?.videos), [game]);
  const genres = useMemo(() => listNames(game?.genres), [game]);
  const platforms = useMemo(() => listNames(game?.platforms), [game]);
  const companies = useMemo(
    () => (game?.involved_companies ?? []).map((c) => c.company?.name).filter(Boolean) as string[],
    [game]
  );
  const links = useMemo(() => storeLinks(game?.websites), [game]);

  if (loading) return <div className="p-4">Loading details…</div>;
  if (err) return <div className="p-4 text-red-400">Error: {err}</div>;
  if (!game) return <div className="p-4">No details.</div>;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex gap-4">
        <div className="w-[140px] flex-shrink-0">
          {game.cover?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.cover.url} alt={game.name} className="w-full rounded-lg object-cover" />
          ) : (
            <div className="w-full h-36 bg-neutral-800 rounded-lg" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold">{game.name}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const exists = wishlist?.items.find((i) => i.id === game.id);
                  if (exists) wishlist?.removeItem(game.id);
                  else wishlist?.addItem({ id: game.id, name: game.name, cover: game.cover ?? null, status: "wishlist" });
                }}
                title={wishlist?.items.find((i) => i.id === game.id) ? "Remove from wishlist" : "Add to wishlist"}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 border border-neutral-800 text-white mr-2"
              >
                {wishlist?.items.find((i) => i.id === game.id) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.99 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18.01 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => {
                  const has = vault?.has(game.id);
                  if (has) vault?.remove(game.id);
                  else {
                    vault?.add({ id: game.id, name: game.name, cover: game.cover ?? null });
                  }
                }}
                title={vault?.has(game.id) ? "Remove from vault" : "Add to vault (purchased)"}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 border border-neutral-800 text-white mr-2"
              >
                {vault?.has(game.id) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM9 11h6v2H9v-2z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => onClose?.()}
                className="text-sm text-neutral-400 hover:text-neutral-200"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-2 text-sm text-neutral-300">
            {game.summary ?? game.storyline ?? "No description available."}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-300">
            {game.first_release_date && (
              <div>
                <div className="text-xs text-neutral-400">Release</div>
                <div>{fmtDate(game.first_release_date)}</div>
              </div>
            )}
            {typeof game.aggregated_rating === "number" && (
              <div>
                <div className="text-xs text-neutral-400">Rating</div>
                <div>{Math.round(game.aggregated_rating)}</div>
              </div>
            )}
            {genres.length > 0 && (
              <div>
                <div className="text-xs text-neutral-400">Genres</div>
                <div>{genres.join(", ")}</div>
              </div>
            )}
            {platforms.length > 0 && (
              <div>
                <div className="text-xs text-neutral-400">Platforms</div>
                <div>{platforms.join(" • ")}</div>
              </div>
            )}
          </div>

          {trailer && (
            <div className="mt-3">
              <div className="text-xs text-neutral-400">Trailer</div>
              <div className="mt-1 aspect-video w-full rounded-md overflow-hidden border border-neutral-800 bg-black">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${trailer}`}
                  title="Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-neutral-400">Stores</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {links.map((u) => (
                  <a
                    key={u}
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-neutral-800 bg-neutral-900/50 px-2 py-1 text-sm hover:bg-neutral-800"
                  >
                    {new URL(u).hostname.replace("www.", "")}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
