import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRWF } from "@/lib/format";

export const dynamic = "force-dynamic";

type OrderRow = { id:string; total_rwf:number; status:string; created_at:string; shops:{name:string}|null };
type ShopRow = { id:string; name:string; type:string; district:string; status:string; created_at:string };
const tone:Record<string,string>={new:"bg-sky-100 text-sky-800",confirmed:"bg-blue-100 text-blue-800",preparing:"bg-amber-100 text-amber-800",out_for_delivery:"bg-violet-100 text-violet-800",ready:"bg-indigo-100 text-indigo-800",completed:"bg-emerald-100 text-emerald-800",cancelled:"bg-rose-100 text-rose-800",pending:"bg-amber-100 text-amber-800",approved:"bg-emerald-100 text-emerald-800",suspended:"bg-rose-100 text-rose-800"};
const pretty=(s:string)=>s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const date=(s:string)=>new Intl.DateTimeFormat("en-RW",{dateStyle:"medium",timeStyle:"short"}).format(new Date(s));

export default async function AdminDashboardPage() {
 const supabase=await createClient();
 const count=async(table:string,filter?:[string,string])=>{let q=supabase.from(table).select("id",{count:"exact",head:true});if(filter)q=q.eq(filter[0],filter[1]);const {count:n}=await q;return n??0;};
 const since=new Date(Date.now()-6*86400000).toISOString();
 const [users,sellers,buyers,pendingShops,approvedShops,suspendedShops,orders,pendingPayments,completedOrders,recentOrderRows,recentShopRows,weekRows,activeListings]=await Promise.all([
  count("profiles"),count("profiles",["role","seller"]),count("profiles",["role","buyer"]),count("shops",["status","pending"]),count("shops",["status","approved"]),count("shops",["status","suspended"]),count("orders"),count("order_payments",["status","pending"]),
  supabase.from("orders").select("total_rwf").eq("status","completed"),
  supabase.from("orders").select("id,total_rwf,status,created_at,shops(name)").order("created_at",{ascending:false}).limit(7),
  supabase.from("shops").select("id,name,type,district,status,created_at").order("created_at",{ascending:false}).limit(5),
  supabase.from("orders").select("total_rwf,created_at,status").gte("created_at",since).order("created_at",{ascending:true}).limit(500),
  count("listings",["active","true"])
 ]);
 const volume=(completedOrders.data??[]).reduce((sum,row)=>sum+Number(row.total_rwf??0),0);
 const recent=(recentOrderRows.data??[]) as unknown as OrderRow[];
 const shops=(recentShopRows.data??[]) as ShopRow[];
 const week=weekRows.data??[];
 const bars=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const key=d.toISOString().slice(0,10);return {label:d.toLocaleDateString("en",{weekday:"short"}),value:week.filter(r=>r.created_at.slice(0,10)===key).reduce((s,r)=>s+Number(r.total_rwf??0),0)};});
 const max=Math.max(1,...bars.map(b=>b.value));
 const stats=[
  {label:"Total customers",value:buyers.toLocaleString(),hint:"Buyer accounts",icon:"◎",accent:"bg-sky-50 text-sky-700"},
  {label:"Seller accounts",value:sellers.toLocaleString(),hint:"Registered seller profiles",icon:"♙",accent:"bg-violet-50 text-violet-700"},
  {label:"Approved businesses",value:approvedShops.toLocaleString(),hint:"Published storefronts",icon:"▤",accent:"bg-emerald-50 text-emerald-700"},
  {label:"Total orders",value:orders.toLocaleString(),hint:"All order records",icon:"⇄",accent:"bg-amber-50 text-amber-700"},
  {label:"Completed sales",value:formatRWF(volume),hint:"Gross completed order value",icon:"R",accent:"bg-emerald-50 text-emerald-700"},
  {label:"Pending payments",value:pendingPayments.toLocaleString(),hint:"Need verification",icon:"◷",accent:"bg-rose-50 text-rose-700"}
 ];
 const actions=[
  {href:"/admin/shops?status=pending",name:"Review businesses",desc:`${pendingShops} waiting for approval`,icon:"▤"},
  {href:"/admin/payments",name:"Verify customer payments",desc:`${pendingPayments} payment reviews pending`,icon:"▣"},
  {href:"/admin/users",name:"Manage accounts",desc:`${users} registered accounts`,icon:"♙"},
  {href:"/admin/appearance",name:"Customize website",desc:"Brand colors and appearance",icon:"◐"}
 ];
 return <div className="space-y-7">
  <section className="flex flex-wrap items-end justify-between gap-4">
   <div><p className="eyebrow">Good operations start with visibility</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Platform overview</h1><p className="mt-1 text-sm text-slate-500">Your TradeBridge marketplace, operations and performance at a glance.</p></div>
   <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"/>Connected to Supabase</div>
  </section>
  {(pendingShops>0||pendingPayments>0)&&<section className="grid gap-3 md:grid-cols-2">
   {pendingShops>0&&<Link href="/admin/shops?status=pending" className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 transition hover:-translate-y-0.5"><div className="flex items-center gap-2 text-sm font-bold text-amber-950">⚑ Business approvals required</div><p className="mt-1 text-sm text-amber-800">{pendingShops} business applications are waiting for review.</p><span className="mt-3 inline-block text-xs font-bold text-amber-900">Open approval queue →</span></Link>}
   {pendingPayments>0&&<Link href="/admin/payments" className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-4 transition hover:-translate-y-0.5"><div className="flex items-center gap-2 text-sm font-bold text-sky-950">◷ Payment verification queue</div><p className="mt-1 text-sm text-sky-800">{pendingPayments} customer payments need a decision.</p><span className="mt-3 inline-block text-xs font-bold text-sky-900">Review transactions →</span></Link>}
  </section>}
  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(s=><article key={s.label} className="rounded-2xl border border-[#e8e4dc] bg-white p-5 shadow-[0_5px_24px_rgba(35,31,24,.035)]"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{s.label}</p><span className={`grid h-10 w-10 place-items-center rounded-2xl text-lg font-bold ${s.accent}`}>{s.icon}</span></div><p className="mt-4 break-words text-2xl font-black tracking-tight text-slate-950">{s.value}</p><p className="mt-1 text-xs text-slate-400">{s.hint}</p></article>)}</section>
  <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
   <article className="rounded-3xl border border-[#e8e4dc] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">Order value trend</p><p className="mt-1 text-xs text-slate-500">Daily order value · last 7 days · RWF</p></div><Link href="/admin/orders" className="text-xs font-bold text-brand-700">View orders →</Link></div>
    <div className="mt-7 flex h-44 items-end gap-3 border-b border-slate-100 pb-2">{bars.map((b,i)=><div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div title={formatRWF(b.value)} className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-brand-700 to-brand-500 transition-all" style={{height:`${Math.max(5,b.value/max*100)}%`}}/><span className="text-[10px] font-medium text-slate-400">{b.label}</span></div>)}</div>
    <div className="mt-4 flex flex-wrap justify-between gap-3"><div><p className="text-xs text-slate-500">Completed order value</p><p className="mt-1 text-xl font-black text-slate-900">{formatRWF(volume)}</p></div><div className="text-right"><p className="text-xs text-slate-500">Order records</p><p className="mt-1 text-xl font-black text-slate-900">{orders.toLocaleString()}</p></div></div>
   </article>
   <article className="rounded-3xl border border-[#e8e4dc] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start justify-between"><div><p className="text-sm font-bold text-slate-900">Marketplace health</p><p className="mt-1 text-xs text-slate-500">Business review status</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">LIVE</span></div>
    {[{name:"Approved",value:approvedShops,color:"bg-emerald-500"},{name:"Pending review",value:pendingShops,color:"bg-amber-400"},{name:"Suspended",value:suspendedShops,color:"bg-rose-400"}].map(x=><div key={x.name} className="mt-6"><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-slate-600">{x.name}</span><strong className="text-slate-900">{x.value}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${x.color}`} style={{width:`${(x.value/Math.max(1,approvedShops+pendingShops+suspendedShops))*100}%`}}/></div></div>)}
    <div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">All users</p><p className="mt-1 text-xl font-black">{users}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Active listings</p><p className="mt-1 text-xl font-black">{activeListings}</p></div></div>
   </article>
  </section>
  <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-base font-black text-slate-950">Quick actions</h2><p className="mt-1 text-xs text-slate-500">Frequently used control-center tools</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(a=><Link key={a.href} href={a.href} className="group rounded-2xl border border-[#e8e4dc] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-brand-100 hover:shadow-md"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-lg font-bold text-brand-700">{a.icon}</span><p className="mt-3 text-sm font-bold text-slate-900">{a.name}</p><p className="mt-1 text-xs text-slate-500">{a.desc}</p><p className="mt-3 text-xs font-bold text-brand-700">Open tool ↗</p></Link>)}</div></section>
  <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
   <article className="overflow-hidden rounded-3xl border border-[#e8e4dc] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black">Recent orders</h2><p className="mt-1 text-xs text-slate-500">Latest activity across all sellers</p></div><Link href="/admin/orders" className="text-xs font-bold text-brand-700">View all →</Link></div>{recent.length?recent.map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 px-5 py-3.5 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{o.shops?.name||"TradeBridge order"}</p><p className="mt-1 text-[11px] text-slate-400">#{o.id.slice(0,8)} · {date(o.created_at)}</p></div><div className="text-right"><p className="text-sm font-black text-slate-900">{formatRWF(Number(o.total_rwf||0))}</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${tone[o.status]||"bg-slate-100 text-slate-700"}`}>{pretty(o.status)}</span></div></div>):<p className="p-8 text-center text-sm text-slate-400">No orders have been recorded yet.</p>}</article>
   <article className="overflow-hidden rounded-3xl border border-[#e8e4dc] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-black">Business directory</h2><p className="mt-1 text-xs text-slate-500">Recently registered businesses</p></div><Link href="/admin/shops" className="text-xs font-bold text-brand-700">Manage →</Link></div>{shops.length?shops.map(s=><div key={s.id} className="flex items-center justify-between gap-3 border-b border-slate-50 px-5 py-3.5 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{s.name}</p><p className="mt-1 text-[11px] text-slate-400">{pretty(s.type)} · {s.district||"Rwanda"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone[s.status]||"bg-slate-100 text-slate-700"}`}>{pretty(s.status)}</span></div>):<p className="p-8 text-center text-sm text-slate-400">No businesses registered yet.</p>}<div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50 text-center"><div className="p-3"><p className="text-lg font-black">{pendingShops}</p><p className="text-[10px] text-slate-500">Pending</p></div><div className="border-x border-slate-200 p-3"><p className="text-lg font-black">{approvedShops}</p><p className="text-[10px] text-slate-500">Approved</p></div><div className="p-3"><p className="text-lg font-black">{suspendedShops}</p><p className="text-[10px] text-slate-500">Suspended</p></div></div></article>
  </section>
 </div>;
}
