"use client";

import { useVault } from "@/context/vault";
import GameCard from "@/components/common/GameCard";

export default function Vault() {
	const { items, remove, clear } = useVault();

	return (
		<main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
			<div className="mb-6 grid md:grid-cols-[1fr,240px] items-start md:items-center gap-2">
				<div>
					<h1 className="text-3xl font-bold">Vault</h1>
				</div>
				<div className="mt-2 md:mt-0 text-sm text-neutral-400 text-left md:text-right">
					Your purchased/owned games.
				</div>
			</div>

			{items.length === 0 ? (
				<div className="text-neutral-400">Your vault is empty. Mark games as purchased to add them here.</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
								{items.map((it) => (
									<div key={it.id} className="relative">
										<GameCard id={it.id} name={it.name} cover={it.cover} />
									</div>
								))}
				</div>
			)}

			{items.length > 0 && (
				<div className="mt-6">
					<button onClick={() => clear()} className="text-sm px-3 py-2 rounded bg-neutral-800/80 text-neutral-100 hover:bg-neutral-700">
						Clear vault
					</button>
				</div>
			)}
		</main>
	);
}
