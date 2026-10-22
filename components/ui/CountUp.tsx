"use client";

import { useLayoutEffect, useRef } from "react";
import { formatINR } from "@/lib/format";

/**
 * Shows the final amount (also on the server and with reduced motion); on screen it counts up from
 * zero once, ease-out. The number itself is never computed here, only animated towards.
 */
export function CountUp({ value, className, durationMs = 900 }: { value: number; className?: string; durationMs?: number }) {
  const node = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / durationMs);
      el.textContent = formatINR(k === 1 ? value : value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = formatINR(0);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = formatINR(value);
    };
  }, [value, durationMs]);
  return (
    <span ref={node} className={className}>
      {formatINR(value)}
    </span>
  );
}
