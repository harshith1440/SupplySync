import React, { useEffect, useState } from "react";
import { ShoppingBag, PlusCircle } from "lucide-react";
import { createPurchaseOrder } from "../api/purchaseOrderApi";
import { ErrorAlert, SuccessAlert } from "./UIComponents";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PurchaseOrderPanel({ supplier, getToken, onPurchaseOrderCreated, isApproved = true }) {
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const products = (supplier?.products || []).filter(
    (product) => product.active !== false && Number(product.availableQuantity) > 0
  );

  useEffect(() => {
    const initialQuantities = {};
    products.forEach((product) => {
      initialQuantities[product.sku] = product.minimumOrderQuantity || 1;
    });
    setQuantities(initialQuantities);
    setMessage("");
    setError("");
  }, [supplier]);

  if (!supplier) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="card-body text-center text-muted" style={{ padding: "40px 20px" }}>
          <ShoppingBag size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
          <p className="font-semibold">No Supplier Selected</p>
          <p className="text-xs">Please select a supplier from the dropdown above to create a purchase order.</p>
        </div>
      </div>
    );
  }

  function updateQuantity(sku, value) {
    setQuantities((previous) => ({
      ...previous,
      [sku]: Math.max(0, Number(value)),
    }));
  }

  function calculateTotal() {
    return products.reduce((total, product) => {
      const quantity = quantities[product.sku] || 0;
      return total + quantity * (product.unitPrice || 0);
    }, 0);
  }

  async function handleCreatePurchaseOrder() {
    setMessage("");
    setError("");

    const items = products
      .filter((product) => (quantities[product.sku] || 0) > 0)
      .map((product) => ({
        sku: product.sku,
        quantity: quantities[product.sku],
      }));

    if (items.length === 0) {
      setError("Please select at least one product with quantity > 0.");
      return;
    }

    for (const item of items) {
      const product = products.find((p) => p.sku === item.sku);

      if (item.quantity < product.minimumOrderQuantity) {
        setError(`${product.productName} requires a minimum order quantity of ${product.minimumOrderQuantity}.`);
        return;
      }

      if (item.quantity > product.availableQuantity) {
        setError(`Only ${product.availableQuantity} units of ${product.productName} are available in stock.`);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await createPurchaseOrder(supplier._id, items, getToken);

      setMessage(`Purchase Order ${response.purchaseOrder?.poNumber || ""} created successfully!`);

      const refreshedQuantities = {};
      products.forEach((product) => {
        refreshedQuantities[product.sku] = product.minimumOrderQuantity || 1;
      });
      setQuantities(refreshedQuantities);

      if (onPurchaseOrderCreated) {
        onPurchaseOrderCreated();
      }
    } catch (err) {
      setError(err.message || "Failed to create purchase order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6" style={{ marginTop: "20px" }}>
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="stat-icon-wrapper primary">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Create Order for {supplier.businessName || supplier.supplierName}</h3>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              Lead Time: {supplier.leadTimeDays} days | Reliability: {supplier.reliabilityScore}%
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && <ErrorAlert message={error} />}
        {message && <SuccessAlert message={message} />}

        <div className="overflow-x-auto" style={{ marginBottom: "20px" }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Product Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">SKU</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Unit Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">MOQ</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Available</th>
                <th style={{ width: "160px" }}>Order Quantity</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td colSpan={8} className="text-center text-muted" style={{ padding: "24px" }}>
                    No products listed for this supplier.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const qty = quantities[product.sku] ?? 0;
                  const itemTotal = qty * (product.unitPrice || 0);

                  return (
                    <tr key={product.sku}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{product.productName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200" style={{ fontSize: "0.75rem" }}>
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">{product.category || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{formatCurrency(product.unitPrice)}</td>
                      <td className="px-6 py-4">{product.minimumOrderQuantity}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`badge ${
                            product.availableQuantity > 0 ? "badge-success" : "badge-danger"
                          }`}
                        >
                          {product.availableQuantity} units
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                          style={{ padding: "6px 10px" }}
                          min={product.minimumOrderQuantity}
                          max={product.availableQuantity}
                          value={qty || ""}
                          onChange={(e) => updateQuantity(product.sku, e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{formatCurrency(itemTotal)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            background: "var(--slate-50)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--slate-200)",
          }}
        >
          <div>
            <p className="text-xs text-muted" style={{ margin: 0 }}>Total Order Estimate</p>
            <h2 className="m-0 text-primary-700">{formatCurrency(calculateTotal())}</h2>
            {!isApproved && (
              <p className="text-xs text-amber-600 font-semibold mt-1">
                Account pending Admin approval. Purchase order placement is locked until approved.
              </p>
            )}
          </div>

          <button
            type="button"
            className="btn btn-gradient btn-lg"
            onClick={handleCreatePurchaseOrder}
            disabled={loading || !isApproved || products.length === 0 || calculateTotal() === 0}
            title={!isApproved ? "Account pending approval" : ""}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <PlusCircle size={18} />
                <span>Submit Purchase Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrderPanel;