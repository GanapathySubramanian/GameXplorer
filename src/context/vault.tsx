"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type VaultItem = {
  id: number;
  name: string;
  cover?: { url: string } | null;
  addedAt: number;
};

type VaultContextType = {
  items: VaultItem[];
  add: (item: { id: number; name: string; cover?: { url: string } | null }) => void;
  remove: (id: number) => void;
  has: (id: number) => boolean;
  clear: () => void;
};

const STORAGE = "gx:vault.v1";
const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<VaultItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      console.error("failed read vault", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(items));
    } catch (e) {
      console.error("failed persist vault", e);
    }
  }, [items]);

  const add = (it: { id: number; name: string; cover?: { url: string } | null }) => {
    setItems((prev) => {
      if (prev.find((p) => p.id === it.id)) return prev;
      return [{ id: it.id, name: it.name, cover: it.cover ?? null, addedAt: Date.now() }, ...prev];
    });
  };

  const remove = (id: number) => setItems((prev) => prev.filter((p) => p.id !== id));

  const has = (id: number) => items.some((i) => i.id === id);

  const clear = () => setItems([]);

  return <VaultContext.Provider value={{ items, add, remove, has, clear }}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
