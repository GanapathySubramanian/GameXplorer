"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type WishlistStatus = "wishlist" | "playing" | "completed";

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

export type WishlistItem = {
  id: string;
  gameId: number;
  gameData: Game;
  status: WishlistStatus;
  addedAt: string;
  updatedAt: string;
};

type WishlistContextType = {
  items: WishlistItem[];
  addItem: (game: Game, status?: WishlistStatus) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  updateStatus: (id: number, status: WishlistStatus) => Promise<void>;
  clear: () => void;
  isLoading: boolean;
};

const STORAGE_KEY = "gx:wishlist.v1";

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMigrated, setHasMigrated] = useState(false);

  // Fetch items from API when authenticated
  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (session?.user) {
      fetchItems();
    } else {
      // Load from localStorage if not authenticated
      loadFromLocalStorage();
      setIsLoading(false);
    }
  }, [session, sessionStatus]);

  // Migrate localStorage data to database on first sign-in
  useEffect(() => {
    if (session?.user && !hasMigrated && items.length === 0) {
      migrateFromLocalStorage();
    }
  }, [session, hasMigrated, items.length]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/wishlist");
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch wishlist items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
          status: item.status || "wishlist",
          addedAt: new Date(item.addedAt).toISOString(),
          updatedAt: new Date(item.addedAt).toISOString(),
        })));
      }
    } catch (e) {
      console.error("Failed to read wishlist from storage", e);
    }
  };

  const migrateFromLocalStorage = async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
        `We found ${localItems.length} games in your wishlist. Would you like to import them to your account?`
      );

      if (shouldMigrate) {
        for (const item of localItems) {
          const gameData = {
            id: item.id || item.gameId,
            name: item.name,
            cover: item.cover || (item.coverUrl ? { url: item.coverUrl } : null),
          };
          await addItem(gameData, item.status || "wishlist");
        }
        localStorage.removeItem(STORAGE_KEY);
        alert("Successfully imported your wishlist!");
      }

      setHasMigrated(true);
    } catch (error) {
      console.error("Failed to migrate wishlist data:", error);
      setHasMigrated(true);
    }
  };

  const addItem = async (game: Game, status: WishlistStatus = "wishlist") => {
    if (session?.user) {
      // Add to database
      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            gameData: game,
            status,
          }),
        });

        if (response.ok) {
          const newItem = await response.json();
          setItems((prev) => [newItem, ...prev]);
        } else if (response.status === 409) {
          // Already exists
          console.log("Game already in wishlist");
        } else {
          throw new Error("Failed to add to wishlist");
        }
      } catch (error) {
        console.error("Error adding to wishlist:", error);
        alert("Failed to add game to wishlist. Please try again.");
      }
    } else {
      // Add to localStorage
      setItems((prev) => {
        if (prev.find((p) => p.gameId === game.id)) return prev;
        const newItem: WishlistItem = {
          id: String(game.id),
          gameId: game.id,
          gameData: game,
          status,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [newItem, ...prev];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const removeItem = async (id: number) => {
    if (session?.user) {
      // Remove from database
      try {
        const response = await fetch(`/api/wishlist?gameId=${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setItems((prev) => prev.filter((p) => p.gameId !== id));
        } else {
          throw new Error("Failed to remove from wishlist");
        }
      } catch (error) {
        console.error("Error removing from wishlist:", error);
        alert("Failed to remove game from wishlist. Please try again.");
      }
    } else {
      // Remove from localStorage
      setItems((prev) => {
        const updated = prev.filter((p) => p.gameId !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const updateStatus = async (id: number, status: WishlistStatus) => {
    if (session?.user) {
      // Update in database
      try {
        const response = await fetch("/api/wishlist", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: id, status }),
        });

        if (response.ok) {
          const updatedItem = await response.json();
          setItems((prev) =>
            prev.map((p) => (p.gameId === id ? updatedItem : p))
          );
        } else {
          throw new Error("Failed to update wishlist status");
        }
      } catch (error) {
        console.error("Error updating wishlist status:", error);
        alert("Failed to update status. Please try again.");
      }
    } else {
      // Update in localStorage
      setItems((prev) => {
        const updated = prev.map((p) =>
          p.gameId === id ? { ...p, status, updatedAt: new Date().toISOString() } : p
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const clear = () => {
    setItems([]);
    if (!session?.user) {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, updateStatus, clear, isLoading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
