"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWishlist, WishlistStatus } from "@/context/wishlist";

const COLUMNS: { key: WishlistStatus; title: string }[] = [
  { key: "wishlist", title: "Yet to play" },
  { key: "playing", title: "Playing" },
  { key: "completed", title: "Completed" },
];

export default function WishlistPage() {
  const { items, updateStatus, removeItem, clear } = useWishlist();
  const router = useRouter();

  const byStatus = useMemo(() => {
    return {
      wishlist: items.filter((i) => i.status === "wishlist"),
      playing: items.filter((i) => i.status === "playing"),
      completed: items.filter((i) => i.status === "completed"),
    } as Record<WishlistStatus, typeof items>;
  }, [items]);

  const onDragStart = (e: React.DragEvent, gameId: number) => {
    e.dataTransfer.setData("text/plain", String(gameId));
    e.dataTransfer.effectAllowed = "move";
  };

  const allow = (e: React.DragEvent) => e.preventDefault();

  const onDropTo = (e: React.DragEvent, status: WishlistStatus) => {
    e.preventDefault();
    const gameId = Number(e.dataTransfer.getData("text/plain"));
    if (!gameId) return;
    updateStatus(gameId, status);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wishlist</h1>
        <div className="text-sm text-neutral-400">Drag items between columns to update status.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <section
            key={col.key}
            onDragOver={allow}
            onDrop={(e) => onDropTo(e, col.key)}
            className="rounded-md border border-neutral-800 border-dotted bg-neutral-900/30 p-3 flex flex-col h-[60vh] md:h-[70vh]"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">{col.title}</h2>
              <div className="text-xs text-neutral-400">{byStatus[col.key].length}</div>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="flex flex-col gap-4">
                {byStatus[col.key].map((it) => (
                  <div
                    key={it.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, it.gameId)}
                    onClick={() => router.push(`/gamedetails?id=${it.gameId}`)}
                    className="relative flex items-center gap-4 p-3 rounded-md bg-neutral-950 border border-neutral-800 cursor-grab hover:shadow-lg"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeItem(it.gameId);
                      }}
                      title="Remove"
                      className="absolute right-2 top-2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                        <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {it.gameData.cover?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.gameData.cover.url} alt={it.gameData.name} className="w-20 sm:w-24 h-24 sm:h-28 object-cover rounded" />
                    ) : (
                      <div className="w-20 sm:w-24 h-24 sm:h-28 bg-neutral-800 rounded" />
                    )}

                    <div className="flex-1">
                      <div className="font-medium text-base sm:text-lg">{it.gameData.name}</div>
                      <div className="text-xs sm:text-sm text-neutral-400 mt-1">Added {new Date(it.addedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6">
        <button onClick={() => clear()} className="text-sm px-3 py-2 rounded bg-neutral-800/80 text-neutral-100 hover:bg-neutral-700">
          Clear wishlist
        </button>
      </div>
    </main>
  );
}
