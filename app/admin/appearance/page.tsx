import { createClient } from "@/lib/supabase/server";
import { saveSiteTheme } from "./actions";

export const dynamic = "force-dynamic";

const presets = [
  { id:"emerald",name:"TradeBridge Emerald",description:"The original green identity. Calm, trusted and familiar.",colors:["#ecfdf5","#10b981","#047857"] },
  { id:"ocean",name:"Ocean Blue",description:"A confident blue palette for a modern commerce experience.",colors:["#eff6ff","#3b82f6","#1d4ed8"] },
  { id:"amber",name:"Warm Amber",description:"A warm, energetic storefront identity inspired by the reference dashboard.",colors:["#fffbeb","#f59e0b","#b45309"] },
  { id:"violet",name:"Modern Violet",description:"A premium creative palette with clear contrast.",colors:["#f5f3ff","#8b5cf6","#6d28d9"] },
  { id:"rose",name:"Rose",description:"A bold and friendly palette for a distinctive brand.",colors:["#fff1f2","#f43f5e","#be123c"] },
];

export default async function AdminAppearancePage({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}) {
 const params=await searchParams;
 const supabase=await createClient();
 const {data}=await supabase.from("platform_settings").select("value").eq("key","site_theme").maybeSingle();
 const saved=(data?.value as {preset?:string}|null)?.preset||"emerald";
 return <div className="space-y-6">
  <header><p className="eyebrow">Brand & storefront experience</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Website appearance</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Choose the brand color system used across TradeBridge. Your selection is stored in Supabase and read by the public website layout.</p></header>
  {params.success&&<p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{params.success}</p>}
  {params.error&&<p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{params.error}</p>}
  <form action={saveSiteTheme} className="space-y-5">
   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{presets.map(p=><label key={p.id} className={`relative cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${saved===p.id?"border-brand-500 ring-2 ring-brand-100":"border-slate-200"}`}>
    <input type="radio" name="preset" value={p.id} defaultChecked={saved===p.id} className="sr-only"/>
    <div className="mb-4 flex h-24 overflow-hidden rounded-2xl border border-black/5"><div className="w-1/3" style={{background:p.colors[0]}}/><div className="w-1/3" style={{background:p.colors[1]}}/><div className="w-1/3" style={{background:p.colors[2]}}/></div>
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-black text-slate-900">{p.name}</h2>{saved===p.id?<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">CURRENT THEME</span>:<span className="text-xs text-slate-400">Select</span>}</div>
    <p className="mt-2 text-xs leading-5 text-slate-500">{p.description}</p>
   </label>)}</div>
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div><p className="text-sm font-bold text-slate-900">Publish appearance changes</p><p className="mt-1 text-xs text-slate-500">This changes the shared brand accent colors, not product content or payment settings.</p></div><button className="btn" type="submit">Save and publish theme</button></div>
  </form>
  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h2 className="text-sm font-bold text-slate-800">What changes?</h2><p className="mt-1 text-xs leading-5 text-slate-500">The selected palette is applied to brand-colored buttons, links, badges and other theme-aware components on the storefront. The dashboard itself keeps its neutral control-center styling for readability.</p></section>
 </div>;
}
