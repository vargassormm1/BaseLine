// Shown instantly while a screen loads: the shape of the page, no layout shift when it arrives.
export default function Loading() {
  return (
    <div className="space-y-6 pt-2" role="status" aria-label="Loading">
      <div className="skeleton h-10 w-48" />
      <div className="skeleton h-56 w-full rounded-[28px]" />
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-[20px]" />)}</div>
      <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-[20px]" />)}</div>
    </div>
  );
}
