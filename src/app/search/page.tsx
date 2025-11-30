"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import GameCard from "@/components/common/GameCard";
import Icon from "@/components/common/Icon";

type Game = {
  id: number;
  name: string;
  cover?: { url: string } | null;
  first_release_date?: number;
  platforms?: { abbreviation: string }[];
  genres?: { name: string }[];
  total_rating?: number;
  total_rating_count?: number;
};

export default function Search() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 12;

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch games when debounced query changes
  const searchGames = useCallback(
    async (searchQuery: string, currentOffset: number, append: boolean = false) => {
      if (!searchQuery.trim()) {
        setGames([]);
        setHasSearched(false);
        setHasMore(true);
        return;
      }

      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const response = await fetch("/api/igdb/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "search",
            term: searchQuery,
            limit: LIMIT,
            offset: currentOffset,
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (append) {
          setGames((prev) => {
            // Deduplicate by game ID to prevent duplicate key errors
            const existingIds = new Set(prev.map(g => g.id));
            const newGames = data.filter((g: Game) => !existingIds.has(g.id));
            return [...prev, ...newGames];
          });
        } else {
          setGames(data);
        }

        setHasMore(data.length === LIMIT);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search games");
        if (!append) setGames([]);
      } finally {
        setLoading(false);
      }
    },
    [LIMIT]
  );

  // Trigger search on debounced query change
  useEffect(() => {
    setOffset(0);
    searchGames(debouncedQuery, 0, false);
  }, [debouncedQuery, searchGames]);

  // Load more results
  const handleLoadMore = useCallback(() => {
    setOffset((prev) => {
      const newOffset = prev + LIMIT;
      searchGames(debouncedQuery, newOffset, true);
      return newOffset;
    });
  }, [debouncedQuery, searchGames, LIMIT]);

  // Infinite scroll: observe sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loading) {
            handleLoadMore();
          }
        });
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, handleLoadMore]);

  // Clear search
  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setGames([]);
    setHasSearched(false);
    setOffset(0);
    setHasMore(true);
    setError(null);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Search Games
        </h1>
        <p className="text-neutral-400">
          Search from thousands of games in the IGDB database
        </p>
      </div>

      {/* Search Input */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for games... (e.g., Zelda, Mario, Elden Ring)"
            className="w-full px-4 py-3 pl-12 pr-12 rounded-xl border border-neutral-800 bg-neutral-900/50 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-transparent"
            autoFocus
          />
          
          {/* Search Icon */}
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />

          {/* Clear Button */}
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              aria-label="Clear search"
            >
              <Icon name="clear" className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Info */}
        {debouncedQuery && !loading && hasSearched && (
          <div className="mt-3 text-sm text-neutral-400">
            {games.length > 0 ? (
              <>
                Found {games.length} result{games.length !== 1 ? "s" : ""} for &quot;{debouncedQuery}&quot;
              </>
            ) : (
              <>No results found for &quot;{debouncedQuery}&quot;</>
            )}
          </div>
        )}
      </div>

      {/* Loading State (Initial) */}
      {loading && games.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-neutral-700 border-t-neutral-300 rounded-full animate-spin mb-4" />
          <p className="text-neutral-400 text-sm">Searching games...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <p className="text-red-400 mb-2">⚠️ {error}</p>
          <button
            onClick={() => searchGames(debouncedQuery, 0, false)}
            className="text-sm text-neutral-400 hover:text-neutral-200 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State (No Search) */}
      {!hasSearched && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-4">
            <Icon name="search" className="w-8 h-8 text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-neutral-200">Start searching</h3>
          <p className="text-neutral-400 text-sm max-w-md">
            Enter a game title, franchise, or keyword to discover games from the IGDB database
          </p>
        </div>
      )}

      {/* Empty State (No Results) */}
      {hasSearched && !loading && games.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-4">
            <Icon name="empty" className="w-8 h-8 text-neutral-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-neutral-200">No games found</h3>
          <p className="text-neutral-400 text-sm max-w-md mb-4">
            We couldn&apos;t find any games matching &quot;{debouncedQuery}&quot;
          </p>
          <button
            onClick={handleClear}
            className="text-sm text-neutral-400 hover:text-neutral-200 underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Results Grid */}
      {games.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {games.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-3 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
                    Loading more...
                  </span>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} />
    </main>
  );
}
