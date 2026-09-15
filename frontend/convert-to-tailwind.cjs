const fs = require("fs");
const path = require("path");

const filesToConvert = [
  "src/pages/RetailerDashboard.jsx",
  "src/components/PurchaseOrderPanel.jsx"
];

for (const filePath of filesToConvert) {
  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, "utf8");

  // Basic structure replacements
  content = content.replace(/className="card"/g, 'className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6"');
  content = content.replace(/className="card-header"/g, 'className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4"');
  content = content.replace(/className="card-body"/g, 'className="p-6"');
  content = content.replace(/className="grid-stats"/g, 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8"');
  
  // Table replacements
  content = content.replace(/className="table-container"/g, 'className="overflow-x-auto"');
  content = content.replace(/className="custom-table"/g, 'className="w-full text-left border-collapse"');
  
  // Forms & Inputs
  content = content.replace(/className="input-with-icon"/g, 'className="relative"');
  content = content.replace(/className="input-icon"/g, 'className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"');
  content = content.replace(/className="form-input"/g, 'className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"');
  content = content.replace(/className="form-select"/g, 'className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow cursor-pointer"');
  content = content.replace(/className="form-label"/g, 'className="block text-sm font-semibold text-slate-700 mb-1.5"');
  content = content.replace(/className="form-group"/g, 'className="mb-4"');

  // Badge replacements
  content = content.replace(/className="badge badge-neutral"/g, 'className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"');
  content = content.replace(/className="badge badge-primary"/g, 'className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 border border-primary-200"');
  content = content.replace(/className="badge badge-info"/g, 'className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200"');
  content = content.replace(/className="badge badge-success"/g, 'className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"');
  content = content.replace(/className="badge badge-warning"/g, 'className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"');
  content = content.replace(/className="badge badge-danger"/g, 'className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200"');

  // Button replacements
  content = content.replace(/className="btn btn-sm btn-primary"/g, 'className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors"');
  content = content.replace(/className="btn btn-sm btn-secondary"/g, 'className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"');
  content = content.replace(/className="btn btn-sm btn-danger"/g, 'className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition-colors"');
  content = content.replace(/className="btn btn-sm btn-ghost"/g, 'className="px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"');
  content = content.replace(/className="btn btn-primary"/g, 'className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors"');
  content = content.replace(/className="btn btn-secondary"/g, 'className="px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"');

  // Table header standardizations
  content = content.replace(/<th>/g, '<th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">');
  content = content.replace(/<tr>/g, '<tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">');
  content = content.replace(/<td className="font-semibold">/g, '<td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">');
  content = content.replace(/<td className="font-bold">/g, '<td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">');
  content = content.replace(/<td className="font-semibold" style={{ color: "var\(--primary-600\)" }}>/g, '<td className="px-6 py-4 whitespace-nowrap font-semibold text-primary-600">');
  content = content.replace(/<td>/g, '<td className="px-6 py-4">');

  fs.writeFileSync(fullPath, content);
}
console.log("Conversion complete.");
