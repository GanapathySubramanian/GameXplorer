import React from "react";

type IconProps = {
  name: "search" | "clear" | "spinner" | "empty";
  className?: string;
};

export default function Icon({ name, className = "" }: IconProps) {
  if (name === "search") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
  }

  if (name === "clear") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  if (name === "spinner") {
    return (
      <svg className={className} viewBox="0 0 50 50" aria-hidden>
        <circle cx="25" cy="25" r="20" strokeWidth="5" stroke="currentColor" strokeDasharray="90" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // empty / placeholder icon
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12A9 9 0 113 12a9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M9.172 16.172a4 4 0 005.656 0" />
    </svg>
  );
}
