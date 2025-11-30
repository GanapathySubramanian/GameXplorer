"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import SearchBox from "@/components/common/SearchBox";
import ScrollToTop from "@/components/common/ScrollToTop";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // Close menu on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="site-header border-b border-neutral-800 py-3 px-4 md:px-6">
        {/* Mobile Layout */}
        <div className="flex md:hidden items-center gap-3">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/" className="text-lg font-bold tracking-tight whitespace-nowrap">
            GameXplorer
          </Link>

          {/* Search Box */}
          <div className="flex-1 ml-auto">
            <SearchBox />
          </div>
        </div>

        {/* Desktop Layout - 3 Column Grid */}
        <div className="hidden md:grid md:grid-cols-3 items-center gap-6 w-[100%]">
          {/* Left Column: Logo */}
          <div className="flex items-center justify-start">
            <Link href="/" className="text-xl font-bold tracking-tight whitespace-nowrap">
              GameXplorer
            </Link>
          </div>

          {/* Center Column: Navigation */}
          <nav className="flex items-center gap-1 justify-center">
            <Link 
              href="/" 
              className={`nav-link px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive("/") 
                  ? "bg-neutral-800 text-white" 
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
            >
              Home
            </Link>
            <Link 
              href="/trending" 
              className={`nav-link px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive("/trending") 
                  ? "bg-neutral-800 text-white" 
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
            >
              Trending
            </Link>
            <Link 
              href="/vault" 
              className={`nav-link px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive("/vault") 
                  ? "bg-neutral-800 text-white" 
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
            >
              Vault
            </Link>
            <Link 
              href="/wishlist" 
              className={`nav-link px-3 py-2 rounded-lg transition-colors text-sm ${
                isActive("/wishlist") 
                  ? "bg-neutral-800 text-white" 
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
            >
              Wishlist
            </Link>
          </nav>

          {/* Right Column: Search Box + Auth */}
          <div className="flex items-center justify-end gap-3">
            <div className="w-80 max-w-full">
              <SearchBox />
            </div>
            
            {/* Authentication UI */}
            {status === "loading" ? (
              <div className="w-9 h-9 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
              </div>
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-9 h-9 rounded-full overflow-hidden hover:opacity-90 transition-opacity ring-2 ring-neutral-700 hover:ring-neutral-600"
                  aria-label="User menu"
                >
                  {session.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt={session.user.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                      {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </button>
                
                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="p-4 border-b border-neutral-800">
                        <p className="font-semibold text-white truncate">{session.user?.name || "User"}</p>
                        <p className="text-sm text-neutral-400 truncate">{session.user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-neutral-800 transition-colors text-red-400 hover:text-red-300"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-neutral-200 transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-neutral-900 border-r border-neutral-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <span className="text-lg font-semibold">Menu</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Close menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col p-4 gap-2 flex-1">
            <Link
              href="/"
              className={`px-4 py-3 rounded-lg transition-colors ${
                isActive("/")
                  ? "bg-neutral-800 text-white"
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/trending"
              className={`px-4 py-3 rounded-lg transition-colors ${
                isActive("/trending")
                  ? "bg-neutral-800 text-white"
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Trending
            </Link>
            <Link
              href="/vault"
              className={`px-4 py-3 rounded-lg transition-colors ${
                isActive("/vault")
                  ? "bg-neutral-800 text-white"
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Vault
            </Link>
            <Link
              href="/wishlist"
              className={`px-4 py-3 rounded-lg transition-colors ${
                isActive("/wishlist")
                  ? "bg-neutral-800 text-white"
                  : "hover:bg-neutral-800 text-neutral-300"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              Wishlist
            </Link>
          </nav>

          {/* Mobile Auth Section */}
          <div className="p-4 border-t border-neutral-800">
            {status === "loading" ? (
              <div className="flex items-center justify-center py-3">
                <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
              </div>
            ) : session ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-neutral-700">
                    {session.user?.image ? (
                      <img 
                        src={session.user.image} 
                        alt={session.user.name || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm">{session.user?.name || "User"}</p>
                    <p className="text-xs text-neutral-400 truncate">{session.user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signIn("google");
                }}
                className="w-full px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-neutral-200 transition-colors"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">{children}</div>
      <ScrollToTop />
    </div>
  );
}
