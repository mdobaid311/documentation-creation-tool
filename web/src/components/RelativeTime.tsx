"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/format";

// Renders a relative timestamp on the client only. Relative time depends on
// "now", which differs between the server render and the browser, so we render
// nothing on the server and fill it in after mount to stay hydration-safe.
export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(relativeTime(iso));
  }, [iso]);
  return <span suppressHydrationWarning>{label}</span>;
}
