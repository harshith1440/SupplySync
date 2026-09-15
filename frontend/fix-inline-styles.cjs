const fs = require("fs");
const path = require("path");

const fullPath = path.join(__dirname, "src/pages/RetailerDashboard.jsx");
let content = fs.readFileSync(fullPath, "utf8");

content = content.replace(/style=\{\{ color: "var\(--danger-600\)" \}\}/g, 'className="text-rose-600"');
content = content.replace(/style=\{\{ color: "var\(--danger-700\)", marginBottom: "12px" \}\}/g, 'className="text-rose-700 mb-3"');
content = content.replace(/style=\{\{ color: "var\(--warning-700\)", marginBottom: "12px" \}\}/g, 'className="text-amber-700 mb-3"');
content = content.replace(/style=\{\{ color: "var\(--primary-600\)" \}\}/g, 'className="text-primary-600"');
content = content.replace(/style=\{\{ margin: 0, color: "var\(--primary-700\)" \}\}/g, 'className="m-0 text-primary-700"');
content = content.replace(/style=\{\{ padding: "16px", borderRadius: "var\(--radius-md\)", background: "var\(--slate-50\)", border: "1px solid var\(--slate-200\)" \}\}/g, 'className="p-4 rounded-xl bg-slate-50 border border-slate-200"');
content = content.replace(/style=\{\{ display: "flex", gap: "12px", background: "var\(--slate-50\)", padding: "16px", borderRadius: "var\(--radius-lg\)", border: "1px solid var\(--slate-200\)" \}\}/g, 'className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200"');
content = content.replace(/style=\{\{ margin: 0, fontSize: "1.1rem", color: "var\(--slate-900\)" \}\}/g, 'className="m-0 text-lg text-slate-900 font-semibold"');
content = content.replace(/style=\{\{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" \}\}/g, 'className="flex gap-3 items-center flex-wrap"');
content = content.replace(/style=\{\{ textAlign: "right", padding: "12px 16px", background: "var\(--slate-50\)", borderRadius: "var\(--radius-md\)" \}\}/g, 'className="text-right p-3 bg-slate-50 rounded-xl"');

fs.writeFileSync(fullPath, content);
