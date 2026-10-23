"use client";

import { useEffect, useState } from "react";
import { SLOW_AFTER_MS } from "@/lib/limits";

/** True once `active` has stayed true for `afterMs`; resets when it turns false. */
export function useSlow(active: boolean, afterMs: number = SLOW_AFTER_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setSlow(true), afterMs);
    return () => {
      clearTimeout(t);
      setSlow(false);
    };
  }, [active, afterMs]);
  return active && slow;
}
