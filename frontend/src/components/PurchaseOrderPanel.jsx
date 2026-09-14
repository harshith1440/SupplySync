import { useEffect, useState } from "react";
import {
  createPurchaseOrder,
  getPurchaseOrders,
} from "../api/purchaseOrderApi";

function PurchaseOrderPanel({ supplier, getToken }) {
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const products = supplier?.products || [];

  useEffect(() => {
    const initialQuantities = {};

    products.forEach((product) => {
      initialQuantities[product.sku] =
        product.minimumOrderQuantity;
    });

    setQuantities(initialQuantities);
  }, [supplier]);

  if (!supplier) {
    return (
      <div>
        <p>Select a supplier to create a purchase order.</p>
      </div>
    );
  }

  function updateQuantity(sku, value) {
    setQuantities((previous) => ({
      ...previous,
      [sku]: Number(value),
    }));
  }

  function calculateTotal() {
    return products.reduce((total, product) => {
      const quantity =
        quantities[product.sku] || 0;

      return (
        total +
        quantity * product.unitPrice
      );
    }, 0);
  }

  async function handleCreatePurchaseOrder() {
    setMessage("");
    setError("");

    const items = products
      .filter(
        (product) =>
          quantities[product.sku] > 0
      )
      .map((product) => ({
        sku: product.sku,
        quantity:
          quantities[product.sku],
      }));

    if (items.length === 0) {
      setError(
        "Please select at least one product."
      );
      return;
    }

    for (const item of items) {
      const product = products.find(
        (product) =>
          product.sku === item.sku
      );

      if (
        item.quantity <
        product.minimumOrderQuantity
      ) {
        setError(
          `${product.productName} requires a minimum quantity of ${product.minimumOrderQuantity}.`
        );
        return;
      }

      if (
        item.quantity >
        product.availableQuantity
      ) {
        setError(
          `Only ${product.availableQuantity} units of ${product.productName} are available.`
        );
        return;
      }
    }

    try {
      setLoading(true);

      const response =
        await createPurchaseOrder(
          supplier._id,
          items,
          getToken
        );

      setMessage(
        `Purchase order ${response.purchaseOrder.poNumber} created successfully.`
      );

      const refreshedQuantities = {};

      products.forEach((product) => {
        refreshedQuantities[
          product.sku
        ] =
          product.minimumOrderQuantity;
      });

      setQuantities(
        refreshedQuantities
      );
    } catch (error) {
      setError(
        error.message ||
          "Failed to create purchase order."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "20px",
      }}
    >
      <h2>
        {supplier.supplierName}
      </h2>

      <p>
        Products supplied by this
        supplier
      </p>

      <div>
        {products.map((product) => (
          <div
            key={product.sku}
            style={{
              borderBottom:
                "1px solid #eee",
              padding: "15px 0",
            }}
          >
            <h3>
              {product.productName}
            </h3>

            <p>
              SKU: {product.sku}
            </p>

            <p>
              Unit Price: ₹
              {product.unitPrice}
            </p>

            <p>
              MOQ:{" "}
              {
                product.minimumOrderQuantity
              }
            </p>

            <p>
              Available:{" "}
              {
                product.availableQuantity
              }
            </p>

            <label>
              Quantity:
              <input
                type="number"
                min={
                  product.minimumOrderQuantity
                }
                max={
                  product.availableQuantity
                }
                value={
                  quantities[
                    product.sku
                  ] ?? ""
                }
                onChange={(event) =>
                  updateQuantity(
                    product.sku,
                    event.target.value
                  )
                }
                style={{
                  marginLeft: "10px",
                  width: "100px",
                  padding: "6px",
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "20px",
          fontSize: "20px",
          fontWeight: "bold",
        }}
      >
        Total: ₹
        {calculateTotal().toFixed(2)}
      </div>

      {error && (
        <p
          style={{
            marginTop: "15px",
          }}
        >
          {error}
        </p>
      )}

      {message && (
        <p
          style={{
            marginTop: "15px",
          }}
        >
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={
          handleCreatePurchaseOrder
        }
        disabled={loading}
        style={{
          marginTop: "20px",
          padding:
            "10px 18px",
          cursor: loading
            ? "not-allowed"
            : "pointer",
        }}
      >
        {loading
          ? "Creating..."
          : "Create Purchase Order"}
      </button>
    </div>
  );
}

export default PurchaseOrderPanel;