"use client";
import { motion } from "motion/react";
import { Check, CircleHelp, Landmark } from "lucide-react";

/** Floating "match preview" chips layered over the hero globe. */
const CHIPS = [
  { icon: Check, cls: "text-ok", title: "Chevening Scholarship", sub: "You're eligible · £45k", pos: "left-0 top-[12%] sm:left-[2%]", d: 0.6 },
  { icon: CircleHelp, cls: "text-warn", title: "GREAT Scholarship", sub: "Add IELTS to check", pos: "right-0 top-[38%] sm:right-[2%]", d: 0.9 },
  { icon: Landmark, cls: "text-cyan", title: "No-cosigner loan", sub: "Covers your gap", pos: "bottom-[10%] left-[8%]", d: 1.2 },
];

export default function HeroChips() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
      {CHIPS.map((c, i) => (
        <motion.div
          key={c.title}
          className={`absolute ${c.pos}`}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
          transition={{
            opacity: { delay: c.d, duration: 0.5 },
            scale: { delay: c.d, duration: 0.5 },
            y: { delay: c.d, duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/80 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-md">
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-white/5 ${c.cls}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">{c.title}</span>
              <span className="text-xs text-muted">{c.sub}</span>
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
