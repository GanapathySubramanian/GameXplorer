"use client";

import { useEffect } from "react";

export default function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll while lightbox is open
  useEffect(() => {
    const bodyStyle = document.body.style;
    const prevOverflow = bodyStyle.overflow;
    const prevPaddingRight = bodyStyle.paddingRight;

    // prevent layout shift when removing scrollbar
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) bodyStyle.paddingRight = `${scrollBarWidth}px`;
    bodyStyle.overflow = "hidden";

    return () => {
      bodyStyle.overflow = prevOverflow;
      bodyStyle.paddingRight = prevPaddingRight;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="h-screen w-screen flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Screenshot" className="max-h-[95vh] max-w-[98vw] object-contain" />
          <button
            onClick={onClose}
            className="absolute right-6 top-6 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
