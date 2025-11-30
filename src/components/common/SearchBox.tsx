"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Result = {
  id: number;
  name: string;
  cover?: { url: string } | null;
};

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!debounced) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch("/api/igdb/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "search", term: debounced, limit: 6, offset: 0 }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setResults(data ?? []);
        setOpen(true);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // click outside to close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const gotoDetail = (id: number) => {
    router.push(`/gamedetails?id=${id}`);
    setOpen(false);
    setQ("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => debounced && setOpen(true)}
          placeholder="Search games..."
          className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-900 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          aria-label="Search games"
        />
      </form>

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-30 mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 shadow-lg">
          <div className="p-2">
            {loading && <div className="text-sm text-neutral-500">Searching…</div>}
            {!loading && results.length === 0 && (
              <div className="text-sm text-neutral-500">No results</div>
            )}
          </div>

          <div className="divide-y divide-neutral-800 max-h-80 overflow-auto">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => gotoDetail(r.id)}
                className="w-full text-left p-2 hover:bg-neutral-900/40 flex items-center gap-3"
              >
                {r.cover?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.cover.url} alt={r.name} className="w-10 h-12 object-cover rounded" />
                ) : (
                  <div className="w-10 h-12 bg-neutral-800 rounded" />
                )}
                <div className="text-left">
                  <div className="text-sm font-medium">{r.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
