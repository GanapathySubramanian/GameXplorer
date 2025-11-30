"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type WishlistStatus = "wishlist" | "playing" | "completed";

export type WishlistItem = {
  id: number;
  name: string;
  cover?: { url: string } | null;
  status: WishlistStatus;
  addedAt: number;
};

type WishlistContextType = {
  items: WishlistItem[];
  addItem: (item: { id: number; name: string; cover?: { url: string } | null; status?: WishlistStatus }) => void;
  removeItem: (id: number) => void;
  updateStatus: (id: number, status: WishlistStatus) => void;
  clear: () => void;
};

const STORAGE_KEY = "gx:wishlist.v1";

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to read wishlist from storage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to persist wishlist", e);
    }
  }, [items]);

  const addItem = (item: { id: number; name: string; cover?: { url: string } | null; status?: WishlistStatus }) => {
    setItems((prev) => {
      if (prev.find((p) => p.id === item.id)) return prev;
      const next: WishlistItem = {
        id: item.id,
        name: item.name,
        cover: item.cover ?? null,
        status: item.status ?? "wishlist",
        addedAt: Date.now(),
      };
      return [next, ...prev];
    });
  };

  const removeItem = (id: number) => setItems((prev) => prev.filter((p) => p.id !== id));

  const updateStatus = (id: number, status: WishlistStatus) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));

  const clear = () => setItems([]);

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, updateStatus, clear }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
