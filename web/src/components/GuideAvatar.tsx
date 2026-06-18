import type { CSSProperties } from "react";

// The circular logo next to a guide title. Shows the captured site's favicon
// when available, otherwise a gradient document icon.
export function GuideAvatar({
  logoUrl,
  size = 52,
}: {
  logoUrl?: string | null;
  size?: number;
}) {
  const base: CSSProperties = { width: size, height: size };

  if (logoUrl) {
    return (
      <span
        className="guide-avatar"
        style={{
          ...base,
          background: "#fff",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 14px rgba(20,16,48,0.1)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          style={{ width: size * 0.62, height: size * 0.62, objectFit: "contain" }}
        />
      </span>
    );
  }

  return (
    <span className="guide-avatar" style={base}>
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3.5h9.5L19 8v12.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-17Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 12.5l2.2 2.2 4.3-4.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
