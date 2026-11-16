"use client";
import { motion, MotionConfig } from "motion/react";
/** Head-to-head split: optic for the left player, clay for the right. Animates in once. */
export function SplitBar({ a, b }: { a: number; b: number }) {
  const pa = a + b > 0 ? (a / (a + b)) * 100 : 50;
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <motion.span className="h-full bg-[#d6f24a]" initial={{ width: "50%" }} animate={{ width: `${pa}%` }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
        <span className="h-full flex-1 bg-[#f07a4f]" />
      </div>
    </MotionConfig>
  );
}
