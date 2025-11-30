"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Game type matching IGDB API response
export type Game = {
  id: number;
  name: string;
  cover?: { url: string } | null;
  first_release_date?: number;
  platforms?: Array<{ abbreviation: string }>;
  genres?: Array<{ name: string }>;
  total_rating?: number;
  total_rating_count?: number;
};

export type VaultItem = {
  id: string;
  gameId: number;
  gameData: Game;
  addedAt: string;
};

type VaultContextType = {
  items: VaultItem[];
  add: (game: Game) => Promise<void>;
  remove: (id: number) => Promise<void>;
  has: (id: number) => boolean;
  clear: () => void;
  isLoading: boolean;
};

const STORAGE = "gx:vault.v1";
const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMigrated, setHasMigrated] = useState(false);

  // Fetch items from API when authenticated
  useEffect(() => {
    if (status === "loading") return;

    if (session?.user) {
      fetchItems();
    } else {
      // Load from localStorage if not authenticated
      loadFromLocalStorage();
      setIsLoading(false);
    }
  }, [session, status]);

  // Migrate localStorage data to database on first sign-in
  useEffect(() => {
    if (session?.user && !hasMigrated && items.length === 0) {
      migrateFromLocalStorage();
    }
  }, [session, hasMigrated, items.length]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/vault");
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch vault items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const localItems = JSON.parse(raw);
        // Convert old format to new format
        setItems(localItems.map((item: any) => ({
          id: item.id?.toString() || String(item.gameId || item.id),
          gameId: item.id || item.gameId,
          gameData: {
            id: item.id || item.gameId,
            name: item.name,
            cover: item.cover || (item.coverUrl ? { url: item.coverUrl } : null),
          },
          addedAt: new Date(item.addedAt).toISOString(),
        })));
      }
    } catch (e) {
      console.error("Failed to read vault from localStorage", e);
    }
  };

  const migrateFromLocalStorage = async () => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) {
        setHasMigrated(true);
        return;
      }

      const localItems = JSON.parse(raw);
      if (localItems.length === 0) {
        setHasMigrated(true);
        return;
      }

      // Ask user if they want to migrate
      const shouldMigrate = confirm(
        `We found ${localItems.length} games in your local collection. Would you like to import them to your account?`
      );

      if (shouldMigrate) {
        for (const item of localItems) {
          const gameData = {
            id: item.id || item.gameId,
            name: item.name,
            cover: item.cover || (item.coverUrl ? { url: item.coverUrl } : null),
          };
          await add(gameData);
        }
        localStorage.removeItem(STORAGE);
      }

      setHasMigrated(true);
    } catch (error) {
      console.error("Failed to migrate vault data:", error);
      setHasMigrated(true);
    }
  };

  const add = async (game: Game) => {
    if (session?.user) {
      // Add to database
      try {
        const response = await fetch("/api/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            gameData: game,
          }),
        });

        if (response.ok) {
          const newItem = await response.json();
          setItems((prev) => [newItem, ...prev]);
        } else if (response.status === 409) {
          // Already exists
          console.log("Game already in vault");
        } else {
          throw new Error("Failed to add to vault");
        }
      } catch (error) {
        console.error("Error adding to vault:", error);
      }
    } else {
      // Add to localStorage
      setItems((prev) => {
        if (prev.find((p) => p.gameId === game.id)) return prev;
        const newItem: VaultItem = {
          id: String(game.id),
          gameId: game.id,
          gameData: game,
          addedAt: new Date().toISOString(),
        };
        const updated = [newItem, ...prev];
        localStorage.setItem(STORAGE, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const remove = async (id: number) => {
    if (session?.user) {
      // Remove from database
      try {
        const response = await fetch(`/api/vault?gameId=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setItems((prev) => prev.filter((p) => p.gameId !== id));
        } else {
          throw new Error("Failed to remove from vault");
        }
      } catch (error) {
        console.error("Error removing from vault:", error);
      }
    } else {
      // Remove from localStorage
      setItems((prev) => {
        const updated = prev.filter((p) => p.gameId !== id);
        localStorage.setItem(STORAGE, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const has = (id: number) => items.some((i) => i.gameId === id);

  const clear = () => {
    setItems([]);
    if (!session?.user) {
      localStorage.removeItem(STORAGE);
    }
  };

  return (
    <VaultContext.Provider value={{ items, add, remove, has, clear, isLoading }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
