import { useState } from "react";

const orders = [
  { id: "PO-2026-041", supplier: "FreshMart Distributors", items: 8, orderDate: "14 Sep 2026", delivery: "18 Sep 2026", amount: 68400, status: "Pending" },
  { id: "PO-2026-040", supplier: "DailyNeeds Wholesale", items: 12, orderDate: "12 Sep 2026", delivery: "16 Sep 2026", amount: 92800, status: "Approved" },
  { id: "PO-2026-039", supplier: "Prime Supply Co.", items: 6, orderDate: "10 Sep 2026", delivery: "12 Sep 2026", amount: 45600, status: "In Transit" },
  { id: "PO-2026-038", supplier: "ValueKart Suppliers", items: 15, orderDate: "05 Sep 2026", delivery: "09 Sep 2026", amount: 112500, status: "Completed" },
  { id: "PO-2026-037", supplier: "QuickTrade Distribution", items: 9, orderDate: "02 Sep 2026", delivery: "07 Sep 2026", amount: 73800, status: "Completed" },
];

const statusStyles = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Approved: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "In Transit": "bg-violet-50 text-violet-700 ring-violet-600/20",
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

function PurchaseOrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const formatCurrency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  const countByStatus = (status) => orders.filter((order) => order.status === status).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PageHeader eyebrow="Retailer Portal" title="Purchase Orders" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Procurement workspace</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="mt-2 text-sm text-slate-500">Track orders, delivery timelines and supplier commitments in one place.</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Orders" value={orders.length} tone="blue" />
          <SummaryCard label="Pending Orders" value={countByStatus("Pending")} tone="amber" />
          <SummaryCard label="Approved Orders" value={countByStatus("Approved")} tone="violet" />
          <SummaryCard label="Completed Orders" value={countByStatus("Completed")} tone="green" />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-6 sm:px-7">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Order activity</h2>
            <p className="mt-1 text-sm text-slate-500">Static demonstration data for the procurement workflow.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead><tr className="border-b border-slate-200 bg-slate-50/80">
                {["PO Number", "Supplier", "Items", "Order Date", "Expected Delivery", "Total Amount", "Status", "Action"].map((heading) => <th key={heading} className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{heading}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => <tr key={order.id} className="transition hover:bg-blue-50/30">
                  <td className="px-6 py-5 text-sm font-bold text-blue-700">{order.id}</td>
                  <td className="px-6 py-5"><p className="font-semibold text-slate-900">{order.supplier}</p><p className="mt-1 text-xs text-slate-400">Supplier network</p></td>
                  <td className="px-6 py-5 text-sm text-slate-600">{order.items} items</td>
                  <td className="px-6 py-5 text-sm text-slate-600">{order.orderDate}</td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-700">{order.delivery}</td>
                  <td className="px-6 py-5 text-sm font-semibold text-slate-900">{formatCurrency(order.amount)}</td>
                  <td className="px-6 py-5"><span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[order.status]}`}>{order.status}</span></td>
                  <td className="px-6 py-5"><button type="button" onClick={() => setSelectedOrder(order)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50">View Details</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selectedOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
        <button type="button" aria-label="Close order details" className="absolute inset-0 h-full w-full" onClick={() => setSelectedOrder(null)} />
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Order details</p><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedOrder.id}</h2></div><button type="button" onClick={() => setSelectedOrder(null)} className="text-xl text-slate-400 hover:text-slate-700" aria-label="Close">x</button></div>
          <div className="grid grid-cols-2 gap-3 p-6"><Detail label="Supplier" value={selectedOrder.supplier} /><Detail label="Items" value={`${selectedOrder.items} products`} /><Detail label="Order Date" value={selectedOrder.orderDate} /><Detail label="Delivery" value={selectedOrder.delivery} /><Detail label="Total Amount" value={formatCurrency(selectedOrder.amount)} /><Detail label="Status" value={selectedOrder.status} /></div>
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={() => setSelectedOrder(null)} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">Close</button></div>
        </div>
      </div>}
    </div>
  );
}

function PageHeader({ eyebrow, title }) {
  return <header className="border-b border-slate-200/80 bg-white shadow-sm"><div className="mx-auto flex min-h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"><div><p className="text-sm font-medium text-slate-400">{eyebrow}</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{title}</h2></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">R</div></div></header>;
}

function SummaryCard({ label, value, tone }) {
  const tones = { blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p><div className={`mt-4 h-1.5 w-12 rounded-full ${tones[tone].split(" ")[0]}`} /></div>;
}

function Detail({ label, value }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1.5 font-semibold text-slate-900">{value}</p></div>; }

export default PurchaseOrdersPage;
