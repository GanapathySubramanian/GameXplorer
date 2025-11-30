"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import GameCard from "@/components/common/GameCard";

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

export default function Trending() {
	const [games, setGames] = useState<Game[]>([]);
	const [loading, setLoading] = useState(false);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const LIMIT = 18;
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	// use a ref lock to avoid duplicate fetches when scrolling rapidly
	const isLoadingRef = useRef(false);

	const fetchTrending = useCallback(async (currentOffset: number, append = false) => {
		// prevent concurrent fetches
		if (isLoadingRef.current) return;
		isLoadingRef.current = true;
		setLoading(true);

		const controller = new AbortController();
		try {
			const r = await fetch("/api/igdb/query", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mode: "trending", limit: LIMIT, offset: currentOffset }),
				signal: controller.signal,
			});
			if (!r.ok) throw new Error(await r.text());
			const data = await r.json();
			if (append) setGames((prev) => [...prev, ...(data ?? [])]);
			else setGames(data ?? []);
			setHasMore((data ?? []).length === LIMIT);
		} catch (e) {
			if (!append) setGames([]);
		} finally {
			isLoadingRef.current = false;
			setLoading(false);
		}

		return () => controller.abort();
	}, [LIMIT]);

	useEffect(() => {
		// initial load
		setOffset(0);
		fetchTrending(0, false);
	}, [fetchTrending]);

	const handleLoadMore = () => {
		const newOffset = offset + LIMIT;
		setOffset(newOffset);
		fetchTrending(newOffset, true);
	};

	// Infinite scroll sentinel
	useEffect(() => {
		if (!sentinelRef.current) return;
		const el = sentinelRef.current;
		const obs = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
						handleLoadMore();
					}
				});
			},
			{ rootMargin: "200px" }
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [hasMore, handleLoadMore]);

	return (
		<main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
				{games.map((g) => (
					<GameCard key={g.id} {...g} />
				))}

				{/* Show skeletons when loading initial page or when appending */}
				{loading && games.length === 0 &&
					Array.from({ length: LIMIT }).map((_, i) => (
						<div key={`skeleton-${i}`} className="animate-pulse">
							<div className="h-40 bg-neutral-800 rounded-lg" />
							<div className="h-3 mt-3 bg-neutral-800 rounded" />
							<div className="h-3 mt-2 w-2/3 bg-neutral-800 rounded" />
						</div>
					))}
			</div>

			{/* sentinel for infinite scroll */}
			<div ref={sentinelRef} className="h-1" />

			{/* optional loading indicator */}
			{loading && (
				<div className="mt-6 text-center text-neutral-400">Loading more trending games…</div>
			)}
		</main>
	);
}
