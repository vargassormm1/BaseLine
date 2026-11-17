/** Head-to-head split: accent for the left player, slate for the right. Grows in once (CSS; off with reduced motion). */
export function SplitBar({ a, b }: { a: number; b: number }) {
  const pa = a + b > 0 ? (a / (a + b)) * 100 : 50;
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
      <span className="split-grow h-full origin-left bg-[#6fd3a0]" style={{ width: `${pa}%` }} />
      <span className="h-full flex-1 bg-white/25" />
    </div>
  );
}
