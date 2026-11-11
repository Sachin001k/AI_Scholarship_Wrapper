"use client";
import { motion } from "motion/react";
import { useMemo } from "react";

const COLORS = ["#a78bfa", "#22d3ee", "#a3e635", "#facc15", "#f472b6"];

/** Deterministic PRNG (mulberry32) so renders stay pure. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-shot DOM confetti burst (no canvas, ~40 nodes). */
export default function Confetti({ count = 40 }: { count?: number }) {
  const pieces = useMemo(() => {
    const rand = seeded(count * 7919);
    return Array.from({ length: count }, (_, i) => ({
      x: (rand() - 0.5) * 900,
      y: 300 + rand() * 400,
      peak: -180 - rand() * 120,
      r: rand() * 720 - 360,
      d: rand() * 0.3,
      w: 6 + rand() * 6,
      c: COLORS[i % COLORS.length],
    }));
  }, [count]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-sm"
          style={{ width: p.w, height: p.w * 0.5, background: p.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.peak, p.y], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 2.2, delay: p.d, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
