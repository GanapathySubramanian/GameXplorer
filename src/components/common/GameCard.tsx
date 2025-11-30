"use client";

import Link from "next/link";
import { useWishlist } from "@/context/wishlist";
import { useVault } from "@/context/vault";

type GameCardProps = {
  id: number;
  name: string;
  cover?: { url: string } | null;
  first_release_date?: number;
  platforms?: { abbreviation: string }[];
  genres?: { name: string }[];
  total_rating?: number;
  total_rating_count?: number;
};

export default function GameCard({
  id,
  name,
  cover,
  first_release_date,
  platforms,
  genres,
  total_rating,
  total_rating_count,
}: GameCardProps) {
  const releaseYear = first_release_date
    ? new Date(first_release_date * 1000).getFullYear()
    : null;

  const platformList = platforms?.map((p) => p.abbreviation).filter(Boolean).slice(0, 3) || [];
  const genreList = genres?.map((g) => g.name).filter(Boolean).slice(0, 2) || [];
  // wishlist hook (app is wrapped with provider in layout)
  let items: { id: number }[] = [];
  let addItem: any = () => {};
  let removeItem: any = () => {};
  try {
    const _wl = useWishlist();
    items = _wl.items;
    addItem = _wl.addItem;
    removeItem = _wl.removeItem;
  } catch (e) {
    // provider not available yet (shouldn't happen once layout wraps provider)
  }
  const exists = items.find((it) => it.id === id);
  // vault hook
  let vaultHas = false;
  let vaultAdd: any = () => {};
  let vaultRemove: any = () => {};
  try {
    const _v = useVault();
    vaultHas = _v.has(id);
    vaultAdd = _v.add;
    vaultRemove = _v.remove;
  } catch (e) {
    // provider not present
  }

  return (
    <Link
      href={`/gamedetails?id=${id}`}
      className="block rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 hover:shadow-lg transition-shadow"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] bg-neutral-800 overflow-hidden">
        {/* subtle action buttons (wishlist, vault) */}
        <div className="absolute left-3 top-3 z-20 flex gap-2">
          <button
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (exists) removeItem(id);
              else addItem({ id, name, cover: cover ?? null, status: "wishlist" });
            }}
            title={exists ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={!!exists}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 text-white border border-neutral-800"
          >
            {exists ? (
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
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (vaultHas) vaultRemove(id);
              else {
                // Add to vault but do not implicitly remove from wishlist.
                // Previously the code removed the item from wishlist when a game
                // was added to the vault which caused the behavior you observed.
                // Keep both lists independent so users can keep a game in wishlist
                // even after adding it to their vault.
                vaultAdd({ id, name, cover: cover ?? null });
              }
            }}
            title={vaultHas ? "Remove from vault" : "Add to vault"}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 text-white border border-neutral-800"
          >
            {vaultHas ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM9 11h6v2H9v-2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            )}
          </button>
        </div>

        {cover?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={name}
            className="w-full h-full object-cover transition-transform hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">No Image</div>
        )}

        {/* Rating Badge */}
        {typeof total_rating === "number" && (
          <div className="absolute right-3 bottom-3 z-20 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-neutral-800 text-neutral-100 text-sm font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
              <path fill="currentColor" d="M12 .587l3.668 7.431L23.4 9.75l-5.6 5.46L18.8 24 12 19.897 5.2 24l.999-8.79L.6 9.75l7.732-1.732L12 .587z" />
            </svg>
            <span>{Math.round(total_rating)}</span>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 text-neutral-100">{name}</h3>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-neutral-400">
          <span>{releaseYear ?? ""}</span>
          {platformList.length > 0 && <span>• {platformList.join(", ")}</span>}
        </div>
        {genreList.length > 0 && (
          <div className="mt-2 text-[12px] text-neutral-400">{genreList.join(" • ")}</div>
        )}
      </div>
    </Link>
  );
}
