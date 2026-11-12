/** Placeholder shown while a detail page streams in (Suspense fallback). */
export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-24 rounded bg-line" />
      <div className="mt-6 h-9 w-2/3 rounded bg-line" />
      <div className="mt-3 h-4 w-1/3 rounded bg-line" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-line/60" />
        ))}
      </div>
      <div className="mt-8 h-48 rounded-xl bg-line/60" />
    </div>
  );
}
