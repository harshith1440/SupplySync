import { useState } from "react";

const suppliers = [
  { id: 1, name: "FreshMart Distributors", type: "Distributor", location: "Hyderabad", reliability: 92, delivery: "2 days", products: 18, status: "Available" },
  { id: 2, name: "DailyNeeds Wholesale", type: "Distributor", location: "Bengaluru", reliability: 90, delivery: "3 days", products: 15, status: "Available" },
  { id: 3, name: "Prime Supply Co.", type: "Direct Supplier", location: "Mumbai", reliability: 88, delivery: "2 days", products: 14, status: "Available" },
  { id: 4, name: "ValueKart Suppliers", type: "Distributor", location: "Chennai", reliability: 86, delivery: "4 days", products: 12, status: "Available" },
  { id: 5, name: "QuickTrade Distribution", type: "Distributor", location: "Pune", reliability: 85, delivery: "5 days", products: 10, status: "Available" },
];

function SupplierListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const search = searchTerm.toLowerCase().trim();
    return supplier.name.toLowerCase().includes(search) ||
      supplier.type.toLowerCase().includes(search) ||
      supplier.location.toLowerCase().includes(search);
  });

  const averageReliability = Math.round(
    suppliers.reduce((total, supplier) => total + supplier.reliability, 0) / suppliers.length
  );
  const averageDelivery = Math.round(
    suppliers.reduce((total, supplier) => total + Number.parseInt(supplier.delivery, 10), 0) / suppliers.length
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex min-h-24 items-center justify-between px-4 sm:px-6 lg:px-10">
          <div>
            <p className="text-sm font-medium text-slate-400">Retailer Portal</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Suppliers</h1>
          </div>
          <button type="button" onClick={() => window.history.back()} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Back
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-10">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Supplier network</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Supplier performance</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">View supplier availability, reliability and delivery performance.</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Suppliers" value={suppliers.length} icon="#" tone="blue" />
          <SummaryCard label="Available Suppliers" value={suppliers.filter((supplier) => supplier.status === "Available").length} icon="+" tone="green" />
          <SummaryCard label="Average Reliability" value={`${averageReliability}%`} icon="%" tone="amber" />
          <SummaryCard label="Average Delivery" value={`${averageDelivery} days`} icon="~" tone="slate" />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-6 sm:px-7">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">Supplier directory</h3>
                <p className="mt-1 text-sm text-slate-500">Compare your current supplier network at a glance.</p>
              </div>
              <p className="text-sm text-slate-500">Showing <span className="font-semibold text-slate-900">{filteredSuppliers.length}</span> suppliers</p>
            </div>
            <div className="relative mt-5 max-w-xl">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">Search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search suppliers, type or location..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-16 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          {filteredSuppliers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {['Supplier', 'Type', 'Location', 'Reliability', 'Delivery Time', 'Products', 'Action'].map((heading) => (
                      <th key={heading} className={`px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 ${heading === 'Action' ? 'text-right' : ''}`}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="transition hover:bg-blue-50/30">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600 ring-1 ring-blue-100">{supplier.name.charAt(0)}</div>
                          <div>
                            <p className="font-semibold text-slate-900">{supplier.name}</p>
                            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="mr-1.5">+</span>{supplier.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">{supplier.type}</td>
                      <td className="px-6 py-5 text-sm text-slate-600">{supplier.location}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${supplier.reliability}%` }} /></div>
                          <span className="text-sm font-semibold text-slate-700">{supplier.reliability}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-5"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{supplier.delivery}</span></td>
                      <td className="px-6 py-5 text-sm font-semibold text-slate-700">{supplier.products}</td>
                      <td className="px-6 py-5 text-right">
                        <button type="button" onClick={() => setSelectedSupplier(supplier)} className="rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold text-slate-900">No suppliers found</p>
              <p className="mt-1 text-sm text-slate-500">Try a different search.</p>
            </div>
          )}
        </section>
      </main>

      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Close supplier details" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setSelectedSupplier(null)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Supplier details</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{selectedSupplier.name}</h2>
              </div>
              <button type="button" onClick={() => setSelectedSupplier(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">x</button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-6">
              <Detail label="Supplier Type" value={selectedSupplier.type} />
              <Detail label="Location" value={selectedSupplier.location} />
              <Detail label="Reliability" value={`${selectedSupplier.reliability}%`} accent />
              <Detail label="Delivery Time" value={selectedSupplier.delivery} />
            </div>
            <div className="mx-6 mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">Supplier availability</p>
              <p className="mt-1 text-sm text-blue-700">Currently supports <strong>{selectedSupplier.products}</strong> products in the supplier network.</p>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setSelectedSupplier(null)} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone }) {
  const toneClasses = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", slate: "bg-slate-100 text-slate-600" };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${toneClasses[tone]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-xs text-slate-400">Updated from supplier network</p>
    </div>
  );
}

function Detail({ label, value, accent = false }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-400">{label}</p><p className={`mt-1.5 font-semibold ${accent ? "text-blue-600" : "text-slate-900"}`}>{value}</p></div>;
}

export default SupplierListPage;
