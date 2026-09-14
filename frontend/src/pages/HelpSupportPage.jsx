import { useState } from "react";

const faqs = [
  { question: "How do I add a product to inventory?", answer: "Open the Inventory section, select Add Product, enter the product details and save. The item will appear in your live inventory list." },
  { question: "How are low-stock products identified?", answer: "A product is marked Low Stock when its quantity is at or below the reorder level saved for that product." },
  { question: "Where can I view supplier performance?", answer: "Open Suppliers from the retailer navigation to compare supplier availability, reliability and delivery performance." },
  { question: "Can I create a purchase order from this page?", answer: "Purchase Orders provides a planning view for order activity. The current prototype uses demonstration data while purchasing workflows are being connected." },
  { question: "What does Demand Forecast show?", answer: "Demand Forecast presents a static planning preview of predicted demand, recommended reorders and demand status by product." },
];

const topics = [
  ["Getting Started", "Learn the core SupplySync workflow from inventory through supplier planning."],
  ["Inventory", "Manage products, monitor stock levels and understand reorder alerts."],
  ["Suppliers", "Compare availability, reliability, delivery times and supported products."],
  ["Purchase Orders", "Review order statuses, delivery timelines and procurement activity."],
  ["Demand Forecast", "Use predicted demand signals to plan upcoming replenishment."],
];

function HelpSupportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const visibleFaqs = faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(searchTerm.toLowerCase().trim()));

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200/80 bg-white shadow-sm"><div className="mx-auto flex min-h-24 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"><div><p className="text-sm font-medium text-slate-400">Retailer Portal</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Help &amp; Support</h2></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">?</div></div></header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Support center</p><h1 className="text-3xl font-bold tracking-tight text-slate-900">Help &amp; Support</h1><p className="mt-2 text-sm text-slate-500">Find quick answers and practical guidance for your SupplySync workspace.</p></div>
      <section className="mb-8 rounded-2xl bg-blue-600 p-6 text-white shadow-lg shadow-blue-600/20 sm:p-8"><p className="text-sm font-semibold text-blue-100">How can we help?</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Search the SupplySync help center</h2><div className="mt-5 max-w-2xl"><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search questions or topics..." className="h-12 w-full rounded-xl border-0 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-blue-300" /></div></section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:col-span-3"><div className="mb-6"><h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2><p className="mt-1 text-sm text-slate-500">Common answers for daily retailer workflows.</p></div><div className="divide-y divide-slate-100">{visibleFaqs.map((faq) => { const isOpen = openFaq === faqs.indexOf(faq); return <div key={faq.question} className="py-4 first:pt-0"><button type="button" onClick={() => setOpenFaq(isOpen ? -1 : faqs.indexOf(faq))} className="flex w-full items-center justify-between gap-4 text-left"><span className="text-sm font-semibold text-slate-800">{faq.question}</span><span className="text-lg text-blue-600">{isOpen ? "-" : "+"}</span></button>{isOpen && <p className="mt-3 pr-8 text-sm leading-6 text-slate-500">{faq.answer}</p>}</div>; })}{visibleFaqs.length === 0 && <p className="py-6 text-sm text-slate-500">No help articles matched your search.</p>}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:col-span-2"><h2 className="text-xl font-bold text-slate-900">Explore topics</h2><p className="mt-1 text-sm text-slate-500">Browse guidance by workflow.</p><div className="mt-6 space-y-3">{topics.map(([title, text]) => <div key={title} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>)}</div></section></div>
      <section className="mt-6 flex flex-col justify-between gap-5 rounded-2xl border border-blue-100 bg-blue-50 p-6 sm:flex-row sm:items-center sm:p-7"><div><h2 className="text-xl font-bold text-blue-950">Still need a hand?</h2><p className="mt-1 text-sm leading-6 text-blue-800">Contact your SupplySync support team for help with your retailer workspace.</p></div><button type="button" className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:w-auto">Contact Support</button></section>
    </main>
  </div>;
}

export default HelpSupportPage;
