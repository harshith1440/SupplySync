import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";

import {
  getInventory,
  getLowStockInventory,
  getExpiredInventory,
  getExpiringSoonInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "../api/inventoryApi";
import {
  getForecastBasedSupplierRecommendation,
} from "../api/supplierRecommendationApi";
import { getPurchaseOrders } from "../api/purchaseOrderApi";
import { createPaymentOrder, verifyPayment } from "../api/paymentApi";


import { getDemandForecast } from "../api/forecastApi";
import { getSuppliers } from "../api/supplierApi";

import PurchaseOrderPanel from "../components/PurchaseOrderPanel";
import LogoutButton from "../components/LogoutButton";

function RetailerDashboard() {
  const { getToken } = useAuth();

  const [inventory, setInventory] = useState([]);
  const [lowStockInventory, setLowStockInventory] = useState([]);
  const [expiredInventory, setExpiredInventory] = useState([]);
  const [expiringSoonInventory, setExpiringSoonInventory] = useState([]);

  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [forecastSearchTerm, setForecastSearchTerm] = useState("");

  const [supplierRecommendation, setSupplierRecommendation] =
    useState(null);
  const [supplierRecommendationLoading, setSupplierRecommendationLoading] =
    useState(false);
  const [supplierRecommendationError, setSupplierRecommendationError] =
    useState("");

  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierLoading, setSupplierLoading] = useState(true);
  const [supplierError, setSupplierError] = useState("");

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseOrdersLoading, setPurchaseOrdersLoading] = useState(true);
  const [purchaseOrdersError, setPurchaseOrdersError] = useState("");
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [expiryLoading, setExpiryLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    productName: "",
    sku: "",
    barcode: "",
    brand: "",
    category: "",
    unit: "piece",
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    quantity: "",
    purchasePrice: "",
    sellingPrice: "",
    reorderLevel: "10",
    supplierName: "",
  });

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");

      const data = await getInventory(getToken);

      setInventory(data.inventory);
    } catch (error) {
      console.error("Inventory error:", error);
      setError(error.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function loadLowStockInventory() {
    try {
      setLowStockLoading(true);

      const data = await getLowStockInventory(getToken);

      setLowStockInventory(data.inventory);
    } catch (error) {
      console.error("Low-stock inventory error:", error);
      setError(error.message || "Failed to load low-stock inventory");
    } finally {
      setLowStockLoading(false);
    }
  }

  async function loadExpiryData() {
    try {
      setExpiryLoading(true);

      const [expiredData, expiringSoonData] = await Promise.all([
        getExpiredInventory(getToken),
        getExpiringSoonInventory(getToken),
      ]);

      setExpiredInventory(expiredData.inventory);
      setExpiringSoonInventory(expiringSoonData.inventory);
    } catch (error) {
      console.error("Expiry inventory error:", error);
      setError(error.message || "Failed to load expiry information");
    } finally {
      setExpiryLoading(false);
    }
  }

  async function loadSupplierRecommendation(sku) {
    try {
      setSupplierRecommendationLoading(true);
      setSupplierRecommendationError("");

      const data =
        await getForecastBasedSupplierRecommendation(
          sku,
          getToken
        );

      setSupplierRecommendation(
        data.recommendation
      );
    } catch (error) {
      console.error(
        "Supplier recommendation error:",
        error
      );

      setSupplierRecommendation(null);
      setSupplierRecommendationError(
        error.message ||
          "Failed to generate supplier recommendation"
      );
    } finally {
      setSupplierRecommendationLoading(false);
    }
  }

  async function loadForecast(sku) {
    try {
      setForecastLoading(true);
      setForecastError("");
      setSupplierRecommendation(null);
      setSupplierRecommendationError("");

      const data = await getDemandForecast(
        sku,
        getToken
      );

      setForecast(data);

      await loadSupplierRecommendation(sku);
    } catch (error) {
      console.error("Demand forecast error:", error);
      setForecast(null);
      setSupplierRecommendation(null);
      setSupplierRecommendationError("");
      setForecastError(
        error.message || "Failed to load demand forecast"
      );
    } finally {
      setForecastLoading(false);
    }
  }

  async function loadSuppliers() {
    try {
      setSupplierLoading(true);
      setSupplierError("");

      const data = await getSuppliers(getToken);

      setSuppliers(data.suppliers || []);

      if (data.suppliers?.length > 0) {
        setSelectedSupplierId(
          data.suppliers[0]._id
        );
      } else {
        setSelectedSupplierId("");
      }
    } catch (error) {
      console.error("Supplier error:", error);
      setSuppliers([]);
      setSelectedSupplierId("");
      setSupplierError(
        error.message || "Failed to load suppliers"
      );
    } finally {
      setSupplierLoading(false);
    }
  }

  async function loadPurchaseOrders() {
    try {
      setPurchaseOrdersLoading(true);
      setPurchaseOrdersError("");

      const data = await getPurchaseOrders(getToken);
      setPurchaseOrders(data.purchaseOrders || []);
    } catch (error) {
      console.error("Purchase orders error:", error);
      setPurchaseOrders([]);
      setPurchaseOrdersError(
        error.message || "Failed to load purchase orders"
      );
    } finally {
      setPurchaseOrdersLoading(false);
    }
  }

  async function loadRazorpayScript() {
    if (window.Razorpay) {
      return true;
    }

    return new Promise((resolve) => {
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true));
        existingScript.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  }

  async function handlePayment(purchaseOrder) {
    if (!purchaseOrder?._id) {
      return;
    }

    try {
      setPaymentLoadingId(purchaseOrder._id);
      setPaymentError("");
      setPaymentSuccess("");

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        throw new Error(
          "Failed to load Razorpay Checkout. Please check your internet connection and try again."
        );
      }

      const orderData = await createPaymentOrder(
        purchaseOrder._id,
        getToken
      );

      const razorpayOrder = orderData.razorpayOrder;

      const options = {
        key: orderData.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "SupplySync AI",
        description: `Payment for ${orderData.purchaseOrder.poNumber}`,
        order_id: razorpayOrder.id,
        notes: {
          poNumber: orderData.purchaseOrder.poNumber,
          supplierName: orderData.purchaseOrder.supplierName,
        },

        prefill: {
          contact: "+919977665544",
        },

        readonly: {
          contact: true,
        },

        handler: async function (response) {
          try {
            setPaymentError("");

            await verifyPayment(
              {
                purchaseOrderId: purchaseOrder._id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
              getToken
            );

            setPaymentSuccess(
              `Payment successful for ${purchaseOrder.poNumber}.`
            );

            await loadPurchaseOrders();

            setSelectedPurchaseOrder((currentOrder) => {
              if (!currentOrder) {
                return currentOrder;
              }

              return {
                ...currentOrder,
                paymentStatus: "paid",
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              };
            });
          } catch (error) {
            console.error("Payment verification error:", error);
            setPaymentError(
              error.message ||
                "Payment was completed but verification failed. Please contact support."
            );
          } finally {
            setPaymentLoadingId(null);
          }
        },

        modal: {
          ondismiss: function () {
            setPaymentLoadingId(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response.error);

        setPaymentError(
          response.error?.description ||
            "Payment failed. Please try again."
        );

        setPaymentLoadingId(null);
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(
        error.message || "Failed to start payment"
      );
      setPaymentLoadingId(null);
    }
  }

  async function loadDashboardData() {
    await Promise.all([
      loadInventory(),
      loadLowStockInventory(),
      loadExpiryData(),
      loadPurchaseOrders(),
    ]);
  }

  useEffect(() => {
    loadDashboardData();
  }, [getToken]);

  useEffect(() => {
    loadSuppliers();
  }, [getToken]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormData({
      productName: "",
      sku: "",
      barcode: "",
      brand: "",
      category: "",
      unit: "piece",
      batchNumber: "",
      manufacturingDate: "",
      expiryDate: "",
      quantity: "",
      purchasePrice: "",
      sellingPrice: "",
      reorderLevel: "10",
      supplierName: "",
    });

    setEditingId(null);
    setShowForm(false);
  }

  function handleAddClick() {
    setEditingId(null);

    setFormData({
      productName: "",
      sku: "",
      barcode: "",
      brand: "",
      category: "",
      unit: "piece",
      batchNumber: "",
      manufacturingDate: "",
      expiryDate: "",
      quantity: "",
      purchasePrice: "",
      sellingPrice: "",
      reorderLevel: "10",
      supplierName: "",
    });

    setError("");
    setShowForm(true);
  }

  function formatDateForInput(date) {
    if (!date) {
      return "";
    }

    return new Date(date).toISOString().split("T")[0];
  }

  function formatDateForDisplay(date) {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString("en-IN");
  }

  function handleEditClick(item) {
    setEditingId(item._id);

    setFormData({
      productName: item.productName || "",
      sku: item.sku || "",
      barcode: item.barcode || "",
      brand: item.brand || "",
      category: item.category || "",
      unit: item.unit || "piece",
      batchNumber: item.batchNumber || "",
      manufacturingDate: formatDateForInput(
        item.manufacturingDate
      ),
      expiryDate: formatDateForInput(item.expiryDate),
      quantity: String(item.quantity ?? ""),
      purchasePrice: String(
        item.purchasePrice ?? item.price ?? ""
      ),
      sellingPrice: String(
        item.sellingPrice ?? item.price ?? ""
      ),
      reorderLevel: String(item.reorderLevel ?? 10),
      supplierName: item.supplierName || "",
    });

    setError("");
    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      if (
        formData.manufacturingDate &&
        formData.expiryDate &&
        new Date(formData.expiryDate) <
          new Date(formData.manufacturingDate)
      ) {
        setError(
          "Expiry date cannot be before manufacturing date."
        );
        setSubmitting(false);
        return;
      }

      const product = {
        productName: formData.productName,
        sku: formData.sku,
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        category: formData.category,
        unit: formData.unit,
        batchNumber: formData.batchNumber || null,
        manufacturingDate:
          formData.manufacturingDate || null,
        expiryDate: formData.expiryDate || null,
        quantity: Number(formData.quantity),
        purchasePrice:
          formData.purchasePrice === ""
            ? null
            : Number(formData.purchasePrice),
        sellingPrice:
          formData.sellingPrice === ""
            ? null
            : Number(formData.sellingPrice),
        price:
          formData.sellingPrice === ""
            ? null
            : Number(formData.sellingPrice),
        reorderLevel: Number(formData.reorderLevel),
        supplierName: formData.supplierName || null,
      };

      if (editingId) {
        const data = await updateInventoryItem(
          editingId,
          product,
          getToken
        );

        setInventory((currentInventory) =>
          currentInventory.map((item) =>
            item._id === editingId ? data.inventory : item
          )
        );
      } else {
        const data = await createInventoryItem(
          product,
          getToken
        );

        setInventory((currentInventory) => [
          data.inventory,
          ...currentInventory,
        ]);
      }

      await Promise.all([
        loadLowStockInventory(),
        loadExpiryData(),
      ]);

      resetForm();
    } catch (error) {
      console.error("Inventory save error:", error);
      setError(error.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteInventoryItem(id, getToken);

      setInventory((currentInventory) =>
        currentInventory.filter((item) => item._id !== id)
      );

      await Promise.all([
        loadLowStockInventory(),
        loadExpiryData(),
      ]);
    } catch (error) {
      console.error("Delete inventory error:", error);
      setError(error.message || "Failed to delete product");
    }
  }

  const categories = [
    ...new Set(inventory.map((item) => item.category)),
  ];

  const filteredInventory = inventory.filter((item) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      item.productName.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search);

    const matchesCategory =
      categoryFilter === "all" ||
      item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const filteredForecastProducts = inventory.filter((item) => {
    const search = forecastSearchTerm.toLowerCase().trim();

    return (
      item.productName.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search)
    );
  });

  return (
    <div>
      <div>
        <h1>Retailer Dashboard</h1>
        <LogoutButton />
      </div>

      <hr />

      <div>
        <h2>Inventory</h2>

        <button onClick={handleAddClick}>
          + Add Product
        </button>
      </div>

      {error && <p>{error}</p>}

      {/* LOW STOCK */}
      <div>
        <h3>Low Stock</h3>

        {lowStockLoading ? (
          <p>Checking stock levels...</p>
        ) : (
          <>
            <p>
              {lowStockInventory.length} product
              {lowStockInventory.length !== 1 ? "s" : ""} currently
              need{lowStockInventory.length === 1 ? "s" : ""} restocking.
            </p>

            {lowStockInventory.length > 0 && (
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Reorder Level</th>
                  </tr>
                </thead>

                <tbody>
                  {lowStockInventory.map((item) => (
                    <tr key={item._id}>
                      <td>{item.productName}</td>
                      <td>{item.sku}</td>
                      <td>{item.quantity}</td>
                      <td>{item.reorderLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <hr />

      {/* EXPIRY INFORMATION */}
      <div>
        <h3>Expiry Alerts</h3>

        {expiryLoading ? (
          <p>Checking expiry dates...</p>
        ) : (
          <>
            <h4>
              ⚠️ Expired Products: {expiredInventory.length}
            </h4>

            {expiredInventory.length > 0 && (
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Batch</th>
                    <th>Quantity</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>

                <tbody>
                  {expiredInventory.map((item) => (
                    <tr key={item._id}>
                      <td>{item.productName}</td>
                      <td>{item.sku}</td>
                      <td>{item.batchNumber || "-"}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {formatDateForDisplay(item.expiryDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <br />

            <h4>
              ⏰ Expiring Within 7 Days:{" "}
              {expiringSoonInventory.length}
            </h4>

            {expiringSoonInventory.length > 0 && (
              <table border="1" cellPadding="10">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Batch</th>
                    <th>Quantity</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>

                <tbody>
                  {expiringSoonInventory.map((item) => (
                    <tr key={item._id}>
                      <td>{item.productName}</td>
                      <td>{item.sku}</td>
                      <td>{item.batchNumber || "-"}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {formatDateForDisplay(item.expiryDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <hr />

      {/* DEMAND FORECAST */}
      <div>
        <h3>Demand Forecast</h3>

        <p>
          Select a product to view its predicted demand for the
          next 7 days.
        </p>

        <input
          type="text"
          placeholder="Search product, SKU or category..."
          value={forecastSearchTerm}
          onChange={(event) => {
            const value = event.target.value;

            setForecastSearchTerm(value);
            setForecastError("");

            const search = value.toLowerCase().trim();

            if (!search) {
              setForecast(null);
              setSupplierRecommendation(null);
              setSupplierRecommendationError("");
              return;
            }

            const matches = inventory.filter((item) => {
              return (
                item.productName
                  .toLowerCase()
                  .includes(search) ||
                item.sku
                  .toLowerCase()
                  .includes(search) ||
                item.category
                  .toLowerCase()
                  .includes(search)
              );
            });

            // If the search identifies exactly one product,
            // automatically load its forecast.
            if (matches.length === 1) {
              loadForecast(matches[0].sku);
            } else {
              setForecast(null);
              setSupplierRecommendation(null);
              setSupplierRecommendationError("");
            }
          }}
        />

        <br />
        <br />

        {forecastSearchTerm &&
          filteredForecastProducts.length > 0 && (
            <div>
              <p>
                {filteredForecastProducts.length} product
                {filteredForecastProducts.length !== 1 ? "s" : ""} found.
              </p>

              {filteredForecastProducts.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => {
                    setForecastSearchTerm(item.productName);
                    loadForecast(item.sku);
                  }}
                  style={{
                    marginRight: "8px",
                    marginBottom: "8px",
                  }}
                >
                  {item.productName} ({item.sku})
                </button>
              ))}
            </div>
          )}

        {forecastSearchTerm &&
          filteredForecastProducts.length === 0 && (
            <p>No products found.</p>
          )}

        {!forecastSearchTerm && (
          <select
            value={forecast?.sku || ""}
            onChange={(event) => {
              const selectedSku = event.target.value;

              if (!selectedSku) {
                setForecast(null);
                setForecastError("");
                setSupplierRecommendation(null);
                setSupplierRecommendationError("");
                return;
              }

              loadForecast(selectedSku);
            }}
          >
            <option value="">Select a product</option>

            {inventory.map((item) => (
              <option key={item._id} value={item.sku}>
                {item.productName} ({item.sku})
              </option>
            ))}
          </select>
        )}

        {forecastLoading && (
          <p>Generating demand forecast...</p>
        )}

        {forecastError && (
          <p>{forecastError}</p>
        )}

        {forecast && !forecastLoading && (
          <div>
            <h4>
              {forecast.productName} ({forecast.sku})
            </h4>

            <p>
              Model: {forecast.model}
            </p>

            <p>
              Historical days used:{" "}
              {forecast.historicalDaysUsed}
            </p>

            <p>
              Average daily demand:{" "}
              {forecast.averageDailyDemand} units
            </p>

            <p>
              Total historical demand:{" "}
              {forecast.totalHistoricalDemand} units
            </p>

            <h4>Next 7 Days</h4>

            <table border="1" cellPadding="10">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Predicted Demand</th>
                </tr>
              </thead>

              <tbody>
                {forecast.forecast.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>
                      {day.predictedDemand} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <br />

            <h4>AI Supplier Recommendation</h4>

            {supplierRecommendationLoading && (
              <p>
                Analyzing suppliers based on forecast...
              </p>
            )}

            {supplierRecommendationError && (
              <p>
                {supplierRecommendationError}
              </p>
            )}

            {supplierRecommendation &&
              !supplierRecommendationLoading && (
                <div>
                  <p>
                    Current Stock:{" "}
                    {supplierRecommendation.currentStock} units
                  </p>

                  <p>
                    Forecast Demand:{" "}
                    {supplierRecommendation.forecastDemand} units
                  </p>

                  <p>
                    Safety Stock:{" "}
                    {supplierRecommendation.safetyStock} units
                  </p>

                  <p>
                    Required Quantity:{" "}
                    <strong>
                      {supplierRecommendation.requiredQuantity} units
                    </strong>
                  </p>

                  {!supplierRecommendation.orderRequired ? (
                    <p>
                      ✓ Current inventory is sufficient. No purchase
                      order is required.
                    </p>
                  ) : supplierRecommendation.recommendedSupplier ? (
                    <div>
                      <p>
                        <strong>
                          Recommended Supplier:
                        </strong>{" "}
                        {
                          supplierRecommendation
                            .recommendedSupplier
                            .supplierName
                        }
                      </p>

                      <p>
                        Unit Price: ₹
                        {
                          supplierRecommendation
                            .recommendedSupplier
                            .recommendedProduct
                            .unitPrice
                        }
                      </p>

                      <p>
                        Lead Time:{" "}
                        {
                          supplierRecommendation
                            .recommendedSupplier
                            .leadTimeDays
                        }{" "}
                        days
                      </p>

                      <p>
                        Reliability:{" "}
                        {
                          supplierRecommendation
                            .recommendedSupplier
                            .reliabilityScore
                        }
                        %
                      </p>

                      <p>
                        Rating:{" "}
                        {
                          supplierRecommendation
                            .recommendedSupplier
                            .rating
                        }
                        /5
                      </p>

                      <p>
                        Recommendation Score:{" "}
                        {
                          supplierRecommendation
                            .recommendedSupplier
                            .score
                        }
                      </p>

                      {supplierRecommendation
                        .recommendedSupplier
                        .reasons?.length > 0 && (
                        <div>
                          <strong>Why this supplier:</strong>
                          <ul>
                            {supplierRecommendation
                              .recommendedSupplier
                              .reasons.map(
                                (reason, index) => (
                                  <li key={index}>
                                    {reason}
                                  </li>
                                )
                              )}
                          </ul>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const recommendedSupplierId =
                            supplierRecommendation
                              .recommendedSupplier
                              ._id;

                          const supplierExists =
                            suppliers.some(
                              (supplier) =>
                                String(supplier._id) ===
                                String(recommendedSupplierId)
                            );

                          if (supplierExists) {
                            setSelectedSupplierId(
                              String(recommendedSupplierId)
                            );
                          } else {
                            setSupplierError(
                              "Recommended supplier is not available in the supplier list."
                            );
                          }
                        }}
                      >
                        Use Recommended Supplier
                      </button>
                    </div>
                  ) : (
                    <p>
                      No suitable supplier was found for this product.
                    </p>
                  )}

                  {supplierRecommendation.alternatives?.length > 0 && (
                    <div>
                      <h4>Alternative Suppliers</h4>

                      <table border="1" cellPadding="10">
                        <thead>
                          <tr>
                            <th>Supplier</th>
                            <th>Unit Price</th>
                            <th>Lead Time</th>
                            <th>MOQ</th>
                            <th>Availability</th>
                            <th>Score</th>
                          </tr>
                        </thead>

                        <tbody>
                          {supplierRecommendation.alternatives.map(
                            (supplier) => (
                              <tr key={supplier._id}>
                                <td>
                                  {supplier.supplierName}
                                </td>
                                <td>
                                  ₹
                                  {
                                    supplier
                                      .recommendedProduct
                                      .unitPrice
                                  }
                                </td>
                                <td>
                                  {supplier.leadTimeDays} days
                                </td>
                                <td>
                                  {
                                    supplier
                                      .recommendedProduct
                                      .minimumOrderQuantity
                                  }
                                </td>
                                <td>
                                  {
                                    supplier
                                      .recommendedProduct
                                      .availableQuantity
                                  }
                                </td>
                                <td>
                                  {supplier.score}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      <hr />

      {/* PURCHASE ORDERS */}
      <div>
        <h3>Purchase Orders</h3>

        <p>
          Create one purchase order with multiple products
          from the same supplier.
        </p>

        {supplierLoading ? (
          <p>Loading suppliers...</p>
        ) : supplierError ? (
          <p>{supplierError}</p>
        ) : suppliers.length === 0 ? (
          <p>No active suppliers found.</p>
        ) : (
          <>
            <label>
              Select Supplier:
            </label>

            <br />

            <select
              value={selectedSupplierId}
              onChange={(event) =>
                setSelectedSupplierId(
                  event.target.value
                )
              }
            >
              <option value="">
                Select a supplier
              </option>

              {suppliers.map((supplier) => (
                <option
                  key={supplier._id}
                  value={supplier._id}
                >
                  {supplier.supplierName}
                </option>
              ))}
            </select>

            {selectedSupplierId && (
              <PurchaseOrderPanel
                supplier={suppliers.find(
                  (supplier) =>
                    supplier._id ===
                    selectedSupplierId
                )}
                getToken={getToken}
                onPurchaseOrderCreated={loadPurchaseOrders}
              />
            )}
          </>
        )}
      </div>

      <hr />

      {/* PURCHASE ORDER HISTORY */}
      <div>
        <h3>Purchase Order History</h3>

        {purchaseOrdersLoading ? (
          <p>Loading purchase orders...</p>
        ) : purchaseOrdersError ? (
          <p>{purchaseOrdersError}</p>
        ) : purchaseOrders.length === 0 ? (
          <p>No purchase orders created yet.</p>
        ) : (
          <>
            <p>
              {purchaseOrders.length} purchase order
              {purchaseOrders.length !== 1 ? "s" : ""} found.
            </p>

            {paymentError && <p>{paymentError}</p>}

            {paymentSuccess && <p>{paymentSuccess}</p>}

            <table border="1" cellPadding="10">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Order Status</th>
                  <th>Payment Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((purchaseOrder) => (
                  <tr key={purchaseOrder._id}>
                    <td>{purchaseOrder.poNumber}</td>
                    <td>
                      {purchaseOrder.supplierName ||
                        purchaseOrder.supplierId?.supplierName ||
                        "-"}
                    </td>
                    <td>{purchaseOrder.items?.length || 0}</td>
                    <td>₹{Number(purchaseOrder.totalAmount || 0).toFixed(2)}</td>
                    <td>{purchaseOrder.orderStatus}</td>
                    <td>{purchaseOrder.paymentStatus}</td>
                    <td>{formatDateForDisplay(purchaseOrder.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedPurchaseOrder(purchaseOrder)}
                      >
                        View Details
                      </button>
                    </td>
                    <td>
                      {purchaseOrder.paymentStatus === "paid" ? (
                        <strong>Paid</strong>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePayment(purchaseOrder)}
                          disabled={paymentLoadingId === purchaseOrder._id}
                        >
                          {paymentLoadingId === purchaseOrder._id
                            ? "Opening..."
                            : "Pay Now"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedPurchaseOrder && (
              <div>
                <br />
                <h4>Purchase Order Details</h4>

                <p><strong>PO Number:</strong> {selectedPurchaseOrder.poNumber}</p>
                <p>
                  <strong>Supplier:</strong>{" "}
                  {selectedPurchaseOrder.supplierName ||
                    selectedPurchaseOrder.supplierId?.supplierName ||
                    "-"}
                </p>
                <p><strong>Order Status:</strong> {selectedPurchaseOrder.orderStatus}</p>
                <p><strong>Payment Status:</strong> {selectedPurchaseOrder.paymentStatus}</p>
                <p><strong>Created:</strong> {formatDateForDisplay(selectedPurchaseOrder.createdAt)}</p>

                <h4>Items</h4>
                <table border="1" cellPadding="10">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchaseOrder.items?.map((item, index) => (
                      <tr key={`${item.sku}-${index}`}>
                        <td>{item.productName}</td>
                        <td>{item.sku}</td>
                        <td>{item.quantity}</td>
                        <td>₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td>₹{Number(item.totalPrice || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <br />
                <p><strong>Subtotal:</strong> ₹{Number(selectedPurchaseOrder.subtotal || 0).toFixed(2)}</p>
                <p><strong>Total Amount:</strong> ₹{Number(selectedPurchaseOrder.totalAmount || 0).toFixed(2)}</p>

                {selectedPurchaseOrder.paymentStatus !== "paid" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePayment(selectedPurchaseOrder)}
                      disabled={paymentLoadingId === selectedPurchaseOrder._id}
                    >
                      {paymentLoadingId === selectedPurchaseOrder._id
                        ? "Opening Payment..."
                        : "Pay Now"}
                    </button>

                    {" "}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedPurchaseOrder(null)}
                >
                  Close Details
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <hr />

      {/* PRODUCT FORM */}
      {showForm && (
        <div>
          <h3>
            {editingId ? "Edit Product" : "Add New Product"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div>
              <label>Product Name</label>
              <br />
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleInputChange}
                placeholder="e.g. Aashirvaad Atta"
                required
              />
            </div>

            <br />

            <div>
              <label>SKU</label>
              <br />
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="e.g. ATTA-5KG"
                required
              />
            </div>

            <br />

            <div>
              <label>Barcode</label>
              <br />
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                placeholder="e.g. 8901234567890"
              />
            </div>

            <br />

            <div>
              <label>Brand</label>
              <br />
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="e.g. Aashirvaad"
              />
            </div>

            <br />

            <div>
              <label>Category</label>
              <br />
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g. Groceries"
                required
              />
            </div>

            <br />

            <div>
              <label>Unit</label>
              <br />
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
              >
                <option value="piece">Piece</option>
                <option value="packet">Packet</option>
                <option value="box">Box</option>
                <option value="bottle">Bottle</option>
                <option value="can">Can</option>
                <option value="kg">Kg</option>
                <option value="gram">Gram</option>
                <option value="litre">Litre</option>
                <option value="ml">ML</option>
              </select>
            </div>

            <br />

            <div>
              <label>Batch Number</label>
              <br />
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleInputChange}
                placeholder="e.g. BTH-2026-091"
              />
            </div>

            <br />

            <div>
              <label>Manufacturing Date</label>
              <br />
              <input
                type="date"
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleInputChange}
              />
            </div>

            <br />

            <div>
              <label>Expiry Date</label>
              <br />
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
              />
            </div>

            <br />

            <div>
              <label>Quantity</label>
              <br />
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 50"
                required
              />
            </div>

            <br />

            <div>
              <label>Purchase Price</label>
              <br />
              <input
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="e.g. 220"
              />
            </div>

            <br />

            <div>
              <label>Selling Price</label>
              <br />
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="e.g. 250"
              />
            </div>

            <br />

            <div>
              <label>Reorder Level</label>
              <br />
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 10"
                required
              />
            </div>

            <br />

            <div>
              <label>Supplier Name</label>
              <br />
              <input
                type="text"
                name="supplierName"
                value={formData.supplierName}
                onChange={handleInputChange}
                placeholder="e.g. Metro Distributors"
              />
            </div>

            <br />

            <button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update Product"
                  : "Add Product"}
            </button>

            {" "}

            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <hr />

      {/* SEARCH AND FILTER */}
      <div>
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        {" "}

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
        >
          <option value="all">All Categories</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <br />

      {/* INVENTORY TABLE */}
      {loading && <p>Loading inventory...</p>}

      {!loading && !error && inventory.length === 0 && (
        <div>
          <h3>No products yet</h3>
          <p>
            Your inventory is empty. Add your first product to get started.
          </p>
        </div>
      )}

      {!loading &&
        inventory.length > 0 &&
        filteredInventory.length === 0 && (
          <p>No products match your search or filter.</p>
        )}

      {!loading && filteredInventory.length > 0 && (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Selling Price</th>
              <th>Expiry Date</th>
              <th>Reorder Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredInventory.map((item) => {
              const isLowStock = lowStockInventory.some(
                (lowStockItem) =>
                  lowStockItem._id === item._id
              );

              const isExpired = expiredInventory.some(
                (expiredItem) =>
                  expiredItem._id === item._id
              );

              const isExpiringSoon =
                expiringSoonInventory.some(
                  (expiringItem) =>
                    expiringItem._id === item._id
                );

              return (
                <tr
                  key={item._id}
                  style={
                    isExpired
                      ? {
                          backgroundColor: "#ffcccc",
                        }
                      : isExpiringSoon
                        ? {
                            backgroundColor: "#fff0cc",
                          }
                        : isLowStock
                          ? {
                              backgroundColor: "#ffe5e5",
                            }
                          : {}
                  }
                >
                  <td>{item.productName}</td>

                  <td>{item.sku}</td>

                  <td>{item.brand || "-"}</td>

                  <td>{item.category}</td>

                  <td>{item.quantity}</td>

                  <td>{item.unit || "piece"}</td>

                  <td>
                    ₹
                    {item.sellingPrice ??
                      item.price ??
                      "-"}
                  </td>

                  <td>
                    {formatDateForDisplay(
                      item.expiryDate
                    )}
                  </td>

                  <td>{item.reorderLevel}</td>

                  <td>
                    {isExpired ? (
                      <strong>❌ EXPIRED</strong>
                    ) : isExpiringSoon ? (
                      <strong>⏰ EXPIRING SOON</strong>
                    ) : isLowStock ? (
                      <strong>⚠️ LOW STOCK</strong>
                    ) : (
                      "✓ Normal"
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        handleEditClick(item)
                      }
                    >
                      Edit
                    </button>

                    {" "}

                    <button
                      onClick={() =>
                        handleDelete(item._id)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RetailerDashboard;