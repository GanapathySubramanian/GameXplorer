"use client";

import AppShell from "@/components/layout/AppShell";
import "./globals.css";
import { WishlistProvider } from "@/context/wishlist";
import { VaultProvider } from "@/context/vault";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <SessionProvider>
          <WishlistProvider>
            <VaultProvider>
              <AppShell>{children}</AppShell>
            </VaultProvider>
          </WishlistProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
