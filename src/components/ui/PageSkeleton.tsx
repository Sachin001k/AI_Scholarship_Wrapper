/** Shimmering placeholder shown while a detail page streams in (Suspense fallback). */
export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6 sm:py-12" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-28 rounded-full bg-white/10" />
      <div className="glass mt-4 rounded-[2rem] p-6 sm:p-10">
        <div className="h-5 w-32 rounded-full bg-white/10" />
        <div className="mt-5 h-10 w-3/4 rounded-2xl bg-white/10 sm:h-14" />
        <div className="mt-3 h-4 w-1/3 rounded-full bg-white/10" />
        <div className="mt-6 space-y-2">
          <div className="h-4 w-full rounded-full bg-white/5" />
          <div className="h-4 w-5/6 rounded-full bg-white/5" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="glass h-64 rounded-3xl" />
        <div className="glass h-48 rounded-3xl" />
      </div>
    </div>
  );
}
