export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className="mx-auto max-w-7xl space-y-6 py-2">
      <span className="sr-only">Loading page…</span>
      <div className="tb-skeleton h-8 w-56 rounded-xl" />
      <div className="tb-skeleton h-4 w-80 max-w-full rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="tb-skeleton h-5 w-2/3 rounded-lg" />
          <div className="tb-skeleton mt-4 h-4 w-full rounded-lg" />
          <div className="tb-skeleton mt-2 h-4 w-4/5 rounded-lg" />
          <div className="tb-skeleton mt-6 h-10 w-28 rounded-xl" />
        </div>)}
      </div>
    </div>
  );
}
