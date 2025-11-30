"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 200);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!visible) return null;

  return (
    <button
      aria-label="Scroll to top"
      onClick={handleClick}
      className={
        "fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-neutral-800/95 text-neutral-100 flex items-center justify-center shadow-lg hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-600"
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-6 h-6"
        aria-hidden
      >
        {/* Chevron up */}
        <path
          fillRule="evenodd"
          d="M10 5.23a.75.75 0 01.53.22l5 5a.75.75 0 11-1.06 1.06L10 7.06 5.53 11.57a.75.75 0 11-1.06-1.06l5-5A.75.75 0 0110 5.23z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
