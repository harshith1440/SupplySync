const forecastItems = [
  {
    id: 1,
    product: "Premium Basmati Rice",
    category: "Groceries",
    currentStock: 42,
    predictedDemand: 96,
    recommendedReorder: 54,
    status: "High Demand",
  },
  {
    id: 2,
    product: "Organic Wheat Flour",
    category: "Groceries",
    currentStock: 68,
    predictedDemand: 74,
    recommendedReorder: 6,
    status: "Normal",
  },
  {
    id: 3,
    product: "Cold Pressed Oil",
    category: "Cooking Essentials",
    currentStock: 24,
    predictedDemand: 63,
    recommendedReorder: 39,
    status: "High Demand",
  },
  {
    id: 4,
    product: "Green Tea Pack",
    category: "Beverages",
    currentStock: 81,
    predictedDemand: 45,
    recommendedReorder: 0,
    status: "Low Demand",
  },
  {
    id: 5,
    product: "Almond Milk",
    category: "Dairy Alternatives",
    currentStock: 37,
    predictedDemand: 52,
    recommendedReorder: 15,
    status: "Normal",
  },
  {
    id: 6,
    product: "Whole Grain Cereal",
    category: "Breakfast",
    currentStock: 19,
    predictedDemand: 58,
    recommendedReorder: 39,
    status: "High Demand",
  },
];

const statusStyles = {
  "High Demand": "bg-rose-50 text-rose-700 ring-rose-600/20",
  Normal: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "Low Demand": "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function DemandForecastPage() {
  const highDemandCount = forecastItems.filter(
    (item) => item.status === "High Demand"
  ).length;
  const lowDemandCount = forecastItems.filter(
    (item) => item.status === "Low Demand"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200/80 bg-white shadow-sm">
        <div className="mx-auto flex min-h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/20">
              S
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">SupplySync</p>
              <p className="text-[11px] font-medium text-slate-400">AI Procurement Platform</p>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800">Retailer Portal</p>
            <p className="text-xs text-slate-400">Demand planning workspace</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            Planning intelligence
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Demand Forecast
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review predicted product demand and plan replenishment before your next selling cycle.
          </p>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Forecasted Products" value={forecastItems.length} detail="Across active categories" icon="#" tone="blue" />
          <SummaryCard label="High Demand Items" value={highDemandCount} detail="Prioritize for replenishment" icon="!" tone="rose" />
          <SummaryCard label="Low Demand Items" value={lowDemandCount} detail="Monitor before reordering" icon="-" tone="slate" />
          <SummaryCard label="Forecast Period" value="30 days" detail="Rolling planning window" icon="~" tone="green" />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-6 sm:flex-row sm:items-center sm:px-7">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Product demand outlook</h2>
              <p className="mt-1 text-sm text-slate-500">Static planning preview for the next 30 days.</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
              Demonstration data
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {[
                    "Product",
                    "Category",
                    "Current Stock",
                    "Predicted Demand",
                    "Recommended Reorder",
                    "Demand Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecastItems.map((item) => (
                  <tr key={item.id} className="transition hover:bg-blue-50/30">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600 ring-1 ring-blue-100">
                          {item.product.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">{item.product}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{item.category}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-700">{item.currentStock} units</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${Math.min(item.predictedDemand, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{item.predictedDemand} units</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={item.recommendedReorder > 0 ? "font-semibold text-amber-600" : "font-medium text-slate-400"}>
                        {item.recommendedReorder > 0 ? `${item.recommendedReorder} units` : "No reorder"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusStyles[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">i</div>
            <div>
              <h2 className="font-semibold text-blue-900">Planning note</h2>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                Forecast values are for interface demonstration only and are not connected to inventory or supplier data yet.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, tone }) {
  const toneStyles = {
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${toneStyles[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

export default DemandForecastPage;
