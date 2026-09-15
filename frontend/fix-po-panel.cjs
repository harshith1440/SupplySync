const fs = require("fs");
const path = require("path");

const fullPath = path.join(__dirname, "src/components/PurchaseOrderPanel.jsx");
let content = fs.readFileSync(fullPath, "utf8");

content = content.replace(/style=\{\{ padding: "16px", background: "var\(--slate-50\)", borderRadius: "var\(--radius-md\)", border: "1px solid var\(--slate-200\)", marginBottom: "20px" \}\}/g, 'className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-5"');
content = content.replace(/style=\{\{ margin: 0, color: "var\(--primary-700\)" \}\}/g, 'className="m-0 text-primary-700"');

fs.writeFileSync(fullPath, content);
