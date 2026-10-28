export default function AdminLoading() {
  return <div role="status" aria-label="Loading admin workspace" className="grid gap-6 md:grid-cols-[200px_1fr]">
    <aside className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4"><div className="tb-skeleton h-5 w-28 rounded-lg" />{[0,1,2,3,4,5].map(i => <div key={i} className="tb-skeleton h-9 rounded-lg" />)}</aside>
    <section className="space-y-4"><div className="tb-skeleton h-8 w-56 rounded-xl" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i => <div key={i} className="tb-skeleton h-32 rounded-2xl" />)}</div><div className="tb-skeleton h-56 rounded-2xl" /></section>
  </div>;
}
