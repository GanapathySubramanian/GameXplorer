import SearchBox from "@/components/common/SearchBox";
import ScrollToTop from "@/components/common/ScrollToTop";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="site-header border-b border-neutral-800 py-2 px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="text-lg font-semibold">GameXplorer</div>
          <nav className="hidden md:flex items-center gap-2">
            <a href="/" className="nav-link">Home</a>
            <a href="/trending" className="nav-link">Trending</a>
            <a href="/vault" className="nav-link">Vault</a>
            <a href="/wishlist" className="nav-link">Wishlist</a>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-4">
          <SearchBox />
        </div>
      </header>
      <div className="p-4">{children}</div>
      <ScrollToTop />
    </div>
  );
}
