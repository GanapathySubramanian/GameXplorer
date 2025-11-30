"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Lightbox from "@/components/common/Lightbox";
import GameCard from "@/components/common/GameCard";
import { useWishlist } from "@/context/wishlist";
import { useVault } from "@/context/vault";
import { useSearchParams } from "next/navigation";

/* ---------- Types ---------- */
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
  cover?: { url: string };
  screenshots?: Shot[];
  platforms?: Named[];
  genres?: Named[];
  game_modes?: Named[];
  videos?: Video[];
  websites?: Link[];
  involved_companies?: { company?: Named }[];
  similar_games?: number[];
};

/* ---------- Utils ---------- */
const fmtDate = (unix?: number) => (unix ? new Date(unix * 1000).toLocaleDateString() : "");
const listNames = (arr?: Named[]) => (arr ?? []).map((i) => i.name).filter(Boolean);
const firstYouTube = (arr?: Video[]) => arr?.[0]?.video_id ?? null;
const storeLinks = (web?: Link[]) => {
  if (!web) return [];
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

/* ---------- Small UI primitives ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-900/70 border border-neutral-800 px-3 py-1 text-xs md:text-sm">
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-sm md:text-base font-medium">{value}</div>
    </div>
  );
}

/* ---------- Actions component (wishlist + vault) ---------- */
function WishlistVaultActions({ game }: { game: GameDetail }) {
  const wishlist = useWishlist();
  const vault = useVault();

  const inWishlist = wishlist.items.some((i) => i.gameId === game.id);
  const inVault = vault.has(game.id);

  const toggleWishlist = () => {
    if (inWishlist) wishlist.removeItem(game.id);
    else wishlist.addItem(game as any);
  };

  const toggleVault = () => {
    if (inVault) vault.remove(game.id);
    else vault.add(game as any);
  };

  return (
    <>
      <button
        onClick={toggleWishlist}
        aria-pressed={inWishlist}
        className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        {inWishlist ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.99 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.09 4.81 13.76 4 15.5 4 18.01 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
          </svg>
        )}
        <span>{inWishlist ? "In Wishlist" : "Add to Wishlist"}</span>
      </button>

      <button
        onClick={toggleVault}
        aria-pressed={inVault}
        className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
        title={inVault ? "Remove from vault" : "Add to vault (purchased)"}
      >
        {inVault ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM9 11h6v2H9v-2z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        )}
        <span>{inVault ? "Purchased" : "Add to Vault"}</span>
      </button>
    </>
  );
}

/* ---------- Page Content Component ---------- */
function GameDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [similarGames, setSimilarGames] = useState<any[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const getHighRes = (url?: string) => {
    if (!url) return "";
    return url.replace(/t_[^/]+/, "t_original");
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch("/api/igdb/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "detail", id: Number(id) }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setGame)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  // fetch similar games (batch) when available
  useEffect(() => {
    // ask the backend for recommendations derived from this game id. The
    // backend will prefer IGDB's similar_games, then fall back to genre-based
    // recommendations, then trending primitives as a final fallback.
    if (!id) return;
    setSimilarGames([]);
    fetch("/api/igdb/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "recommend", id: Number(id), limit: 12 }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => setSimilarGames(data ?? []))
      .catch(() => setSimilarGames([]));
  }, [id]);

  /* derived */
  const trailer = useMemo(() => firstYouTube(game?.videos), [game]);
  const genres = useMemo(() => listNames(game?.genres), [game]);
  const platforms = useMemo(() => listNames(game?.platforms), [game]);
  const modes = useMemo(() => listNames(game?.game_modes), [game]);
  const companies = useMemo(
    () => (game?.involved_companies ?? []).map((c) => c.company?.name).filter(Boolean) as string[],
    [game]
  );
  const links = useMemo(() => storeLinks(game?.websites), [game]);

  /* states */
  if (!id) return <main className="mx-auto max-w-6xl p-6">Pass a game <code>?id=</code> in the URL.</main>;
  if (loading)
    return (
      <main className="mx-auto max-w-6xl p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-48 rounded-2xl bg-neutral-900" />
          <div className="h-6 w-1/3 rounded bg-neutral-900" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 rounded bg-neutral-900" />
            <div className="h-20 rounded bg-neutral-900" />
            <div className="h-20 rounded bg-neutral-900" />
          </div>
        </div>
      </main>
    );
  if (err) return <main className="mx-auto max-w-6xl p-6 text-red-400">Error: {err}</main>;
  if (!game) return <main className="mx-auto max-w-6xl p-6">No data.</main>;

  /* hero background (blurred cover) */
  const heroBg =
    game.cover?.url
      ? { backgroundImage: `url(${game.cover.url})` }
      : undefined;

  return (
    <main className="mx-auto max-w-6xl">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-b-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-30"
          style={heroBg}
          aria-hidden
        />
        <div className="relative bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent">
          <div className="px-4 md:px-6 py-6 md:py-10 grid gap-6 md:grid-cols-[260px,1fr]">
            {/* Cover */}
            <div className="order-2 md:order-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={game.cover?.url || ""}
                alt={game.name}
                className="w-[220px] md:w-[260px] rounded-2xl border border-neutral-800 shadow"
              />
            </div>

            {/* Title + stats */}
            <div className="order-1 md:order-2 flex flex-col justify-end">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-[0_1px_0_rgba(0,0,0,.6)]">
                {game.name}
              </h1>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {game.first_release_date && (
                  <Stat label="Release" value={fmtDate(game.first_release_date)} />
                )}
                {typeof game.aggregated_rating === "number" && (
                  <Stat
                    label="Rating"
                    value={`${Math.round(game.aggregated_rating)}${
                      game.total_rating_count ? ` / ${game.total_rating_count} votes` : ""
                    }`}
                  />
                )}
                {genres.length > 0 && <Stat label="Genres" value={genres.slice(0, 2).join(", ")} />}
                {modes.length > 0 && <Stat label="Mode" value={modes.join(" • ")} />}
                {platforms.length > 0 && <Stat label="Platforms" value={`${platforms.length}`} />}
              </div>

              {/* quick action buttons (wishlist + vault) */}
              <div className="mt-4 flex gap-3">
                <WishlistVaultActions game={game} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="px-4 md:px-6 py-8 space-y-12 text-neutral-100">
        {/* Overview */}
        {game.summary && (
          <Section title="Overview">
            <p className="max-w-4xl leading-7 text-neutral-300">{game.summary}</p>
          </Section>
        )}

        {/* Tags */}
        {(genres.length > 0 || platforms.length > 0) && (
          <Section title="Tags & Platforms">
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <Chip key={`g-${g}`}>{g}</Chip>
              ))}
            </div>
            {game.platforms && game.platforms.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
                <span className="text-neutral-400">Platforms:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {game.platforms.map((p: any) => (
                    <span key={p.id ?? p.name} className="rounded-md bg-neutral-900/60 border border-neutral-800 px-2 py-0.5">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Trailer */}
        {trailer && (
          <Section title="Trailer">
            <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-2xl border border-neutral-800 bg-black">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${trailer}`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </Section>
        )}

        {/* Screenshots */}
        {game.screenshots && game.screenshots.length > 0 && (
          <Section title="Screenshots">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {game.screenshots.slice(0, 9).map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s.url}
                  src={s.url}
                  alt="Screenshot"
                  className="h-48 w-full rounded-xl border border-neutral-800 object-cover cursor-pointer"
                  loading="lazy"
                />
              ))}
            </div>
          </Section>
        )}

        {lightboxUrl && <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

        {/* Info grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Details list */}
          <div className="lg:col-span-2 space-y-6">
            <Section title="Details">
              <div className="grid gap-3 sm:grid-cols-2">
                {game.first_release_date && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="text-xs text-neutral-400">Release date</div>
                    <div className="text-sm md:text-base">{fmtDate(game.first_release_date)}</div>
                  </div>
                )}
                {modes.length > 0 && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="text-xs text-neutral-400">Game modes</div>
                    <div className="text-sm md:text-base">{modes.join(" • ")}</div>
                  </div>
                )}
                {genres.length > 0 && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="text-xs text-neutral-400">Genres</div>
                    <div className="text-sm md:text-base">{genres.join(", ")}</div>
                  </div>
                )}
                {platforms.length > 0 && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <div className="text-xs text-neutral-400">Platforms</div>
                    <div className="text-sm md:text-base">{platforms.join(" • ")}</div>
                  </div>
                )}
              </div>
            </Section>

            {/* Links / Stores */}
            {links.length > 0 && (
              <Section title="Where to find it">
                <ul className="flex flex-wrap gap-2">
                  {links.map((u) => (
                    <li key={u}>
                      <a
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800 cursor-pointer"
                      >
                        {new URL(u).hostname.replace("www.", "")}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          {/* Right: Companies */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight">Studios & Publishers</h3>
            {companies.length > 0 ? (
              <ul className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
                {companies.map((c) => (
                  <li key={c} className="text-sm">{c}</li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-400">
                No company information.
              </div>
            )}
          </div>
        </div>

        {/* Optional: Storyline collapsible */}
        {game.storyline && (
          <Section title="Storyline">
            <details className="group rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 open:bg-neutral-900/60">
              <summary className="cursor-pointer list-none text-sm text-neutral-300 hover:text-neutral-200">
                <span className="mr-2 inline-block rotate-0 transition-transform group-open:-rotate-90">▸</span>
                Read storyline
              </summary>
              <p className="mt-3 max-w-4xl whitespace-pre-wrap text-neutral-300">{game.storyline}</p>
            </details>
          </Section>
        )}

        {/* Recommended / Similar games (from backend recommend mode) */}
        {similarGames && similarGames.length > 0 && (
          <Section title="Recommended">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {similarGames.map((g: any) => (
                <GameCard
                  key={g.id}
                  id={g.id}
                  name={g.name}
                  cover={g.cover ?? null}
                  first_release_date={g.first_release_date}
                  platforms={g.platforms}
                  genres={g.genres}
                  total_rating={g.aggregated_rating ?? g.total_rating}
                  total_rating_count={g.total_rating_count}
                />
              ))}
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}

/* ---------- Page Wrapper with Suspense ---------- */
export default function GameDetails() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-6xl p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-48 rounded-2xl bg-neutral-900" />
          <div className="h-6 w-1/3 rounded bg-neutral-900" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 rounded bg-neutral-900" />
            <div className="h-20 rounded bg-neutral-900" />
            <div className="h-20 rounded bg-neutral-900" />
          </div>
        </div>
      </main>
    }>
      <GameDetailsContent />
    </Suspense>
  );
}
