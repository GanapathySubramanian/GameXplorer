import AppShell from "@/components/layout/AppShell";
import "./globals.css";
import { WishlistProvider } from "@/context/wishlist";
import { VaultProvider } from "@/context/vault";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <WishlistProvider>
          <VaultProvider>
            <AppShell>{children}</AppShell>
          </VaultProvider>
        </WishlistProvider>
      </body>
    </html>
  );
}
