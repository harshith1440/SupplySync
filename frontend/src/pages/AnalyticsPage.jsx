import { useState } from "react";

const categories = [
  { name: "Groceries", value: 82, trend: "+14%" },
  { name: "Beverages", value: 68, trend: "+8%" },
  { name: "Cooking Essentials", value: 57, trend: "+5%" },
  { name: "Dairy Alternatives", value: 44, trend: "-2%" },
];

const suppliers = [
  { name: "FreshMart Distributors", reliability: 92, orders: 18, spend: "Rs. 4.8L" },
  { name: "DailyNeeds Wholesale", reliability: 90, orders: 15, spend: "Rs. 3.9L" },
  { name: "Prime Supply Co.", reliability: 88, orders: 14, spend: "Rs. 3.2L" },
  { name: "ValueKart Suppliers", reliability: 86, orders: 12, spend: "Rs. 2.6L" },
];

function AnalyticsPage() {
  const [range, setRange] = useState("Last 30 days");
  const [category, setCategory] = useState("All categories");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white shadow-sm"><div className="mx-auto flex min-h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><div><p className="text-sm font-medium text-slate-400">Retailer Portal</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Analytics</h2></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">R</div></div></header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Business intelligence</p><h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics</h1><p className="mt-2 text-sm text-slate-500">Understand purchasing patterns, supplier performance and inventory risk.</p></div><div className="flex flex-col gap-3 sm:flex-row"><select value={range} onChange={(event) => setRange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"><option>All categories</option><option>Groceries</option><option>Beverages</option><option>Cooking Essentials</option></select></div></div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total Purchase Value" value="Rs. 18.6L" detail="+12.4% vs prior period" tone="blue" /><Metric label="Inventory Value" value="Rs. 24.8L" detail="Healthy stock coverage" tone="green" /><Metric label="Average Supplier Reliability" value="89%" detail="Across 5 active suppliers" tone="violet" /><Metric label="Stockout Risk" value="8.2%" detail="3 products need attention" tone="amber" /></div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:col-span-3"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-900">Category performance</h2><p className="mt-1 text-sm text-slate-500">Relative demand performance for {range.toLowerCase()}.</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Static demo</span></div><div className="mt-7 space-y-5">{categories.map((item) => <div key={item.name}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">{item.name}</span><span className={item.trend.startsWith("-") ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>{item.trend}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${item.value}%` }} /></div></div>)}</div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:col-span-2"><h2 className="text-xl font-bold text-slate-900">Inventory insights</h2><p className="mt-1 text-sm text-slate-500">Signals worth reviewing this period.</p><div className="mt-6 space-y-3"><Insight title="Replenishment opportunity" text="6 products are trending above their reorder level." tone="blue" /><Insight title="Supplier concentration" text="FreshMart accounts for 26% of purchase value." tone="amber" /><Insight title="Healthy coverage" text="Average stock coverage is 18 days." tone="green" /></div></section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-6 sm:px-7"><h2 className="text-xl font-bold text-slate-900">Supplier performance</h2><p className="mt-1 text-sm text-slate-500">A static comparison of reliability and purchasing activity.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px]"><thead><tr className="border-b border-slate-200 bg-slate-50/80">{["Supplier", "Reliability", "Orders", "Purchase Value"].map((heading) => <th key={heading} className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{suppliers.map((supplier) => <tr key={supplier.name} className="hover:bg-blue-50/30"><td className="px-6 py-5 font-semibold text-slate-900">{supplier.name}</td><td className="px-6 py-5"><div className="flex items-center gap-3"><div className="h-2 w-24 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${supplier.reliability}%` }} /></div><span className="text-sm font-semibold text-slate-700">{supplier.reliability}%</span></div></td><td className="px-6 py-5 text-sm text-slate-600">{supplier.orders}</td><td className="px-6 py-5 text-sm font-semibold text-slate-900">{supplier.spend}</td></tr>)}</tbody></table></div></section>
        <p className="mt-5 text-xs text-slate-400">All analytics shown on this page are static demonstration data.</p>
      </main>
    </div>
  );
}

function Metric({ label, value, detail, tone }) { const tones = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600" }; return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p><div className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{detail}</div></div>; }
function Insight({ title, text, tone }) { const tones = { blue: "bg-blue-100 text-blue-700", amber: "bg-amber-100 text-amber-700", green: "bg-emerald-100 text-emerald-700" }; return <div className="flex gap-3 rounded-xl bg-slate-50 p-4"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tones[tone]}`}>i</div><div><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div></div>; }

export default AnalyticsPage;
