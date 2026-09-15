import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  Package,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Search,
  Edit,
  Trash2,
  XCircle,
  Eye,
  Sparkles,
  CreditCard,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import {
  StatCard,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorAlert,
  SuccessAlert,
  Modal,
} from "../components/UIComponents";
import { getRetailerProfile, updateRetailerProfile } from "../api/userProfileApi";

import {
  getInventory,
  getLowStockInventory,
  getExpiredInventory,
  getExpiringSoonInventory,
  updateInventoryItem,
  deleteInventoryItem,
} from "../api/inventoryApi";
import { getForecastBasedSupplierRecommendation } from "../api/supplierRecommendationApi";
import {
  getPurchaseOrders,
  markPurchaseOrderDelivered,
  submitSupplierFeedback,
} from "../api/purchaseOrderApi";
import { createPaymentOrder, verifyPayment } from "../api/paymentApi";
import { getDemandForecast } from "../api/forecastApi";
import { getSuppliers } from "../api/supplierApi";
import { recordSale } from "../api/saleApi";

import PurchaseOrderPanel from "../components/PurchaseOrderPanel";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateForDisplay(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN");
}

function formatDateForInput(date) {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function getInventoryDisplayPrice(item) {
  return item.sellingPrice ?? item.purchasePrice ?? item.price;
}

function RetailerDashboard() {
  const { getToken } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState("overview");

  // Data States
  const [inventory, setInventory] = useState([]);
  const [lowStockInventory, setLowStockInventory] = useState([]);
  const [expiredInventory, setExpiredInventory] = useState([]);
  const [expiringSoonInventory, setExpiringSoonInventory] = useState([]);

  // Forecast & AI Recommendation States
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [forecastSearchTerm, setForecastSearchTerm] = useState("");

  const [supplierRecommendation, setSupplierRecommendation] = useState(null);
  const [supplierRecommendationLoading, setSupplierRecommendationLoading] = useState(false);
  const [supplierRecommendationError, setSupplierRecommendationError] = useState("");

  // Suppliers & Purchase Orders States
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierLoading, setSupplierLoading] = useState(true);
  const [supplierError, setSupplierError] = useState("");

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseOrdersLoading, setPurchaseOrdersLoading] = useState(true);
  const [purchaseOrdersError, setPurchaseOrdersError] = useState("");
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState("5");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [retailerProfile, setRetailerProfile] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "", businessName: "", contactPerson: "", email: "", phone: "",
    address: { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "", country: "India" },
  });

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // General Loading & Error States
  const [loading, setLoading] = useState(true);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [_expiryLoading, setExpiryLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saleItem, setSaleItem] = useState(null);
  const [saleQuantity, setSaleQuantity] = useState("");
  const [saleIdempotencyKey, setSaleIdempotencyKey] = useState("");
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleError, setSaleError] = useState("");

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

  // Data Loading Handlers
  async function loadInventory() {
    try {
      setLoading(true);
      setError("");
      const data = await getInventory(getToken);
      setInventory(data.inventory || []);
    } catch (err) {
      console.error("Inventory error:", err);
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function loadLowStockInventory() {
    try {
      setLowStockLoading(true);
      const data = await getLowStockInventory(getToken);
      setLowStockInventory(data.inventory || []);
    } catch (err) {
      console.error("Low-stock inventory error:", err);
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
      setExpiredInventory(expiredData.inventory || []);
      setExpiringSoonInventory(expiringSoonData.inventory || []);
    } catch (err) {
      console.error("Expiry inventory error:", err);
    } finally {
      setExpiryLoading(false);
    }
  }

  async function loadSupplierRecommendation(sku) {
    try {
      setSupplierRecommendationLoading(true);
      setSupplierRecommendationError("");
      const data = await getForecastBasedSupplierRecommendation(sku, getToken);
      setSupplierRecommendation(data.recommendation || null);
    } catch (err) {
      console.error("Supplier recommendation error:", err);
      setSupplierRecommendation(null);
      setSupplierRecommendationError(err.message || "Failed to generate supplier recommendation.");
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

      const data = await getDemandForecast(sku, getToken);
      setForecast(data);

      if (data.status === "insufficient_data") {
        setSupplierRecommendation(null);
        return;
      }

      await loadSupplierRecommendation(sku);
    } catch (err) {
      console.error("Demand forecast error:", err);
      setForecast(null);
      setSupplierRecommendation(null);
      setForecastError(err.message || "Failed to load demand forecast");
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
        setSelectedSupplierId(data.suppliers[0]._id);
      }
    } catch (err) {
      console.error("Supplier error:", err);
      setSuppliers([]);
      setSupplierError(err.message || "Failed to load suppliers");
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
    } catch (err) {
      console.error("Purchase orders error:", err);
      setPurchaseOrders([]);
      setPurchaseOrdersError(err.message || "Failed to load purchase orders");
    } finally {
      setPurchaseOrdersLoading(false);
    }
  }

  async function handleMarkDelivered(order) {
    try {
      setPurchaseOrdersError("");
      const data = await markPurchaseOrderDelivered(order._id, getToken);
      setPurchaseOrders((current) =>
        current.map((item) =>
          item._id === order._id ? data.purchaseOrder : item
        )
      );
    } catch (err) {
      setPurchaseOrdersError(err.message || "Failed to mark order as delivered.");
    }
  }

  async function handleSubmitFeedback(event) {
    event.preventDefault();
    try {
      setFeedbackSubmitting(true);
      setFeedbackError("");
      await submitSupplierFeedback(
        feedbackOrder._id,
        Number(feedbackRating),
        "",
        getToken
      );
      setFeedbackOrder(null);
      await loadPurchaseOrders();
    } catch (err) {
      setFeedbackError(err.message || "Failed to submit supplier feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  async function loadRetailerProfile() {
    try {
      const data = await getRetailerProfile(getToken);
      setRetailerProfile(data.profile || null);
    } catch (err) {
      console.error("Retailer profile error:", err);
    }
  }

  function openRetailerProfileForm() {
    const address = retailerProfile?.address || {};
    setProfileForm({
      name: retailerProfile?.name || "",
      businessName: retailerProfile?.businessName || address.businessName || "",
      contactPerson: retailerProfile?.contactPerson || address.contactPerson || "",
      email: retailerProfile?.email || "",
      phone: retailerProfile?.phone || address.phone || "",
      address: {
        addressLine1: address.addressLine1 || address.line1 || "",
        addressLine2: address.addressLine2 || address.line2 || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || address.postalCode || "",
        country: address.country || "India",
      },
    });
    setProfileFormError("");
    setShowProfileForm(true);
  }

  async function saveRetailerProfile(event) {
    event.preventDefault();
    try {
      setProfileFormError("");
      await updateRetailerProfile(profileForm, getToken);
      await loadRetailerProfile();
      setShowProfileForm(false);
    } catch (err) {
      setProfileFormError(err.message || "Failed to save retailer profile.");
    }
  }

  async function loadDashboardData() {
    await Promise.all([
      loadInventory(),
      loadLowStockInventory(),
      loadExpiryData(),
      loadPurchaseOrders(),
      loadSuppliers(),
      loadRetailerProfile(),
    ]);
  }

  useEffect(() => {
    loadDashboardData();
  }, [getToken]);

  // Razorpay Checkout Integration
  async function loadRazorpayScript() {
    if (window.Razorpay) return true;
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
    if (!purchaseOrder?._id) return;

    try {
      setPaymentLoadingId(purchaseOrder._id);
      setPaymentError("");
      setPaymentSuccess("");

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error(
          "Failed to load Razorpay Checkout script. Please check your internet connection."
        );
      }

      const orderData = await createPaymentOrder(purchaseOrder._id, getToken);
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

            setPaymentSuccess(`Payment successful for PO ${purchaseOrder.poNumber}!`);
            await Promise.all([
              loadPurchaseOrders(),
              loadInventory(),
              loadLowStockInventory(),
            ]);

            setSelectedPurchaseOrder((current) => {
              if (!current) return current;
              return {
                ...current,
                paymentStatus: "paid",
                orderStatus: "confirmed",
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              };
            });
          } catch (err) {
            console.error("Payment verification error:", err);
            setPaymentError(
              err.message || "Payment completed but verification failed. Please contact support."
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
        setPaymentError(response.error?.description || "Payment failed. Please try again.");
        setPaymentLoadingId(null);
      });

      razorpay.open();
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentError(err.message || "Failed to start Razorpay payment.");
      setPaymentLoadingId(null);
    }
  }

  // Form Handlers
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      manufacturingDate: formatDateForInput(item.manufacturingDate),
      expiryDate: formatDateForInput(item.expiryDate),
      quantity: String(item.quantity ?? ""),
      purchasePrice: String(item.purchasePrice ?? item.price ?? ""),
      sellingPrice: String(item.sellingPrice ?? item.price ?? ""),
      reorderLevel: String(item.reorderLevel ?? 10),
      supplierName: item.supplierName || "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      if (
        formData.manufacturingDate &&
        formData.expiryDate &&
        new Date(formData.expiryDate) < new Date(formData.manufacturingDate)
      ) {
        setError("Expiry date cannot be prior to manufacturing date.");
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
        manufacturingDate: formData.manufacturingDate || null,
        expiryDate: formData.expiryDate || null,
        quantity: Number(formData.quantity),
        purchasePrice: formData.purchasePrice === "" ? null : Number(formData.purchasePrice),
        sellingPrice: formData.sellingPrice === "" ? null : Number(formData.sellingPrice),
        price: formData.sellingPrice === "" ? null : Number(formData.sellingPrice),
        reorderLevel: Number(formData.reorderLevel),
        supplierName: formData.supplierName || null,
      };

      const data = await updateInventoryItem(editingId, product, getToken);
      setInventory((curr) =>
        curr.map((item) => (item._id === editingId ? data.inventory : item))
      );

      await Promise.all([loadLowStockInventory(), loadExpiryData()]);
      resetForm();
    } catch (err) {
      console.error("Inventory save error:", err);
      setError(err.message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this inventory product?")) return;
    try {
      setError("");
      await deleteInventoryItem(id, getToken);
      setInventory((curr) => curr.filter((item) => item._id !== id));
      await Promise.all([loadLowStockInventory(), loadExpiryData()]);
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete product.");
    }
  }

  function openSaleForm(item) {
    setSaleItem(item);
    setSaleQuantity("");
    setSaleIdempotencyKey(window.crypto?.randomUUID?.() || `${item._id}-${Date.now()}`);
    setSaleError("");
  }

  function closeSaleForm() {
    setSaleItem(null);
    setSaleQuantity("");
    setSaleIdempotencyKey("");
    setSaleError("");
  }

  async function handleSaleSubmit(event) {
    event.preventDefault();
    const quantity = Number(saleQuantity);

    if (!saleItem || !Number.isFinite(quantity) || quantity <= 0) {
      setSaleError("Sale quantity must be greater than zero.");
      return;
    }

    try {
      setSaleSubmitting(true);
      setSaleError("");
      const data = await recordSale(
        {
          sku: saleItem.sku,
          quantity,
          idempotencyKey: saleIdempotencyKey,
        },
        getToken
      );
      const updatedInventory = data.inventory;
      setInventory((current) =>
        current.map((item) =>
          item._id === updatedInventory._id ? updatedInventory : item
        )
      );
      await loadLowStockInventory();
      closeSaleForm();

      if (updatedInventory.quantity <= updatedInventory.reorderLevel) {
        setForecastSearchTerm(updatedInventory.sku);
        setActiveTab("alerts");
        loadForecast(updatedInventory.sku);
      }
    } catch (err) {
      setSaleError(err.message || "Failed to record sale.");
    } finally {
      setSaleSubmitting(false);
    }
  }

  // Filtered lists
  const categories = [...new Set(inventory.map((item) => item.category))];

  const filteredInventory = inventory.filter((item) => {
    const search = searchTerm.toLowerCase().trim();
    const matchesSearch =
      item.productName.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      (item.category && item.category.toLowerCase().includes(search));

    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const filteredForecastProducts = inventory.filter((item) => {
    const search = forecastSearchTerm.toLowerCase().trim();
    return (
      item.productName.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      (item.category && item.category.toLowerCase().includes(search))
    );
  });

  // Navigation Items
  const navItems = [
    { id: "overview", label: "Overview", icon: Package },
    { id: "inventory", label: "Inventory Catalog", icon: Package, badge: inventory.length },
    {
      id: "alerts",
      label: "Expiry & Stock Alerts",
      icon: AlertTriangle,
      badge: lowStockInventory.length + expiredInventory.length + expiringSoonInventory.length,
      badgeClass:
        expiredInventory.length > 0
          ? "badge-danger"
          : lowStockInventory.length > 0
          ? "badge-warning"
          : "badge-neutral",
    },
    { id: "forecast", label: "AI Demand Forecast", icon: Sparkles },
    { id: "orders", label: "Purchase Orders & Pay", icon: ShoppingCart, badge: purchaseOrders.length },
  ];

  return (
    <DashboardLayout
      role="retailer"
      title="Retailer Procurement Hub"
      subtitle="Inventory, Smart Demand Forecasting & Supplier Orders"
      navItems={navItems}
      activeNav={activeTab}
      onNavSelect={setActiveTab}
      onRefresh={loadDashboardData}
      refreshing={loading}
    >
      {error && <ErrorAlert message={error} onRetry={loadDashboardData} />}
      {paymentSuccess && <SuccessAlert message={paymentSuccess} />}
      {paymentError && <ErrorAlert message={paymentError} />}

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <StatCard
              title="Total Products"
              value={inventory.length}
              icon={Package}
              variant="primary"
            />
            <StatCard
              title="Low Stock Warning"
              value={lowStockInventory.length}
              icon={AlertTriangle}
              variant={lowStockInventory.length > 0 ? "warning" : "primary"}
            />
            <StatCard
              title="Expired Items"
              value={expiredInventory.length}
              icon={XCircle}
              variant={expiredInventory.length > 0 ? "danger" : "primary"}
            />
            <StatCard
              title="Expiring Soon (7d)"
              value={expiringSoonInventory.length}
              icon={Clock}
              variant={expiringSoonInventory.length > 0 ? "warning" : "primary"}
            />
            <StatCard
              title="Purchase Orders"
              value={purchaseOrders.length}
              icon={ShoppingCart}
              variant="info"
            />
          </div>

          {/* CRITICAL ALERTS BANNER IF ANY */}
          {(expiredInventory.length > 0 || lowStockInventory.length > 0) && (
            <div className="alert alert-warning" style={{ marginBottom: "24px" }}>
              <AlertTriangle size={22} style={{ flexShrink: 0 }} />
              <div>
                <p className="font-bold">Attention Required</p>
                <p className="text-sm">
                  You have {expiredInventory.length} expired product(s) and {lowStockInventory.length} product(s) needing reorder.
                </p>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                style={{ marginLeft: "auto" }}
                onClick={() => setActiveTab("alerts")}
              >
                Review Alerts
              </button>
            </div>
          )}

          {/* INVENTORY PREVIEW */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 style={{ margin: 0 }}>Stock Inventory Highlights</h3>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  Top stock items available in store
                </p>
              </div>
            </div>

            <div className="p-6" style={{ padding: 0 }}>
              {loading ? (
                <LoadingState message="Loading inventory items..." />
              ) : inventory.length === 0 ? (
                <EmptyState
                  title="Your inventory is empty"
                  description="Add your first stock product to begin managing inventory and AI forecasting."
                  action={null}
                />
              ) : (
                <div className="overflow-x-auto" style={{ border: "none", borderRadius: 0 }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Product Name</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">SKU</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Category</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Stock Qty</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Selling Price</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.slice(0, 6).map((item) => {
                        const isLowStock = item.quantity <= item.reorderLevel;
                        const isExpired = expiredInventory.some((e) => e._id === item._id);
                        const isExpiringSoon = expiringSoonInventory.some((es) => es._id === item._id);

                        return (
                          <tr key={item._id}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.productName}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200" style={{ fontSize: "0.75rem" }}>
                                {item.sku}
                              </span>
                            </td>
                            <td className="px-6 py-4">{item.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{item.quantity} {item.unit || "piece"}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">₹{getInventoryDisplayPrice(item) ?? "-"}</td>
                            <td className="px-6 py-4">
                              {isExpired ? (
                                <StatusBadge value="expired" />
                              ) : isExpiringSoon ? (
                                <StatusBadge value="expiring_soon" />
                              ) : item.quantity === 0 ? (
                                <StatusBadge value="out_of_stock" />
                              ) : isLowStock ? (
                                <StatusBadge value="low_stock" />
                              ) : (
                                <StatusBadge value="normal" />
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                className="px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                onClick={() => handleEditClick(item)}
                              >
                                <Edit size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                onClick={() => openSaleForm(item)}
                                disabled={item.quantity === 0}
                              >
                                <ShoppingCart size={14} /> Record Sale
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4" style={{ flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Inventory Catalog</h3>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Manage products, pricing, batches & stock reorder limits
              </p>
            </div>

            <div className="flex gap-3 items-center flex-wrap">
              <div className="relative" style={{ minWidth: "220px" }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                  placeholder="Search products, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow cursor-pointer"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

            </div>
          </div>

          <div className="p-6" style={{ padding: 0 }}>
            {loading ? (
              <LoadingState message="Fetching inventory list..." />
            ) : filteredInventory.length === 0 ? (
              <EmptyState
                title="No products match filter"
                description="Try changing your search term or category selector."
              />
            ) : (
              <div className="overflow-x-auto" style={{ border: "none", borderRadius: 0 }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Product Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">SKU</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Brand</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Category</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Qty</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Unit</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Selling Price</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Expiry Date</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Reorder Level</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const isLowStock = item.quantity <= item.reorderLevel;
                      const isExpired = expiredInventory.some((e) => e._id === item._id);
                      const isExpiringSoon = expiringSoonInventory.some((es) => es._id === item._id);

                      let rowClass = "";
                      if (isExpired) rowClass = "table-row-expired";
                      else if (isExpiringSoon) rowClass = "table-row-expiring";
                      else if (isLowStock) rowClass = "table-row-lowstock";

                      return (
                        <tr key={item._id} className={rowClass}>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.productName}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200" style={{ fontSize: "0.75rem" }}>
                              {item.sku}
                            </span>
                          </td>
                          <td className="px-6 py-4">{item.brand || "-"}</td>
                          <td className="px-6 py-4">{item.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{item.quantity}</td>
                          <td className="px-6 py-4">{item.unit || "piece"}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">₹{getInventoryDisplayPrice(item) ?? "-"}</td>
                          <td className="text-xs text-muted">{formatDateForDisplay(item.expiryDate)}</td>
                          <td className="px-6 py-4">{item.reorderLevel}</td>
                          <td className="px-6 py-4">
                            {isExpired ? (
                              <StatusBadge value="expired" />
                            ) : isExpiringSoon ? (
                              <StatusBadge value="expiring_soon" />
                            ) : item.quantity === 0 ? (
                              <StatusBadge value="out_of_stock" />
                            ) : isLowStock ? (
                              <StatusBadge value="low_stock" />
                            ) : (
                              <StatusBadge value="normal" />
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary btn-icon"
                                onClick={() => handleEditClick(item)}
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={() => openSaleForm(item)}
                                disabled={item.quantity === 0}
                                title="Record Sale"
                              >
                                <ShoppingCart size={14} /> Sale
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost btn-icon text-rose-600"
                                onClick={() => handleDelete(item._id)}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <div>
          {/* LOW STOCK SECTION */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6" style={{ marginBottom: "24px" }}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle className="text-warning" size={20} />
                <h3 style={{ margin: 0 }}>Low Stock Alerts ({lowStockInventory.length})</h3>
              </div>
            </div>
            <div className="p-6" style={{ padding: 0 }}>
              {lowStockLoading ? (
                <LoadingState message="Checking low stock levels..." />
              ) : lowStockInventory.length === 0 ? (
                <EmptyState title="All stock levels healthy" description="No products are currently below reorder levels." />
              ) : (
                <div className="overflow-x-auto" style={{ border: "none", borderRadius: 0 }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Product Name</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">SKU</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Current Stock</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Reorder Level</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockInventory.map((item) => (
                        <tr key={item._id} className="table-row-lowstock">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.productName}</td>
                          <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{item.sku}</span></td>
                          <td className="font-bold text-danger">
                            {item.quantity === 0 ? "OUT OF STOCK" : item.quantity}
                          </td>
                          <td className="px-6 py-4">{item.reorderLevel}</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors"
                              onClick={() => {
                                setForecastSearchTerm(item.sku);
                                setActiveTab("forecast");
                                loadForecast(item.sku);
                              }}
                            >
                              <Sparkles size={14} /> Forecast & Reorder
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* EXPIRED & EXPIRING SOON */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock className="text-danger" size={20} />
                <h3 style={{ margin: 0 }}>Expiry Risk Monitoring</h3>
              </div>
            </div>
            <div className="p-6">
              <h4 className="text-rose-700 mb-3">
                ❌ Expired Items ({expiredInventory.length})
              </h4>
              {expiredInventory.length === 0 ? (
                <p className="text-sm text-muted" style={{ marginBottom: "24px" }}>
                  No expired products detected in inventory.
                </p>
              ) : (
                <div className="overflow-x-auto" style={{ marginBottom: "24px" }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Product</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">SKU</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Batch</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Quantity</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiredInventory.map((item) => (
                        <tr key={item._id} className="table-row-expired">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.productName}</td>
                          <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{item.sku}</span></td>
                          <td className="px-6 py-4">{item.batchNumber || "-"}</td>
                          <td className="px-6 py-4">{item.quantity}</td>
                          <td className="font-bold text-danger">{formatDateForDisplay(item.expiryDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h4 className="text-amber-700 mb-3">
                ⏰ Expiring Within 7 Days ({expiringSoonInventory.length})
              </h4>
              {expiringSoonInventory.length === 0 ? (
                <p className="text-sm text-muted">No products expiring in the next 7 days.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Product</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">SKU</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Batch</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Quantity</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringSoonInventory.map((item) => (
                        <tr key={item._id} className="table-row-expiring">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.productName}</td>
                          <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{item.sku}</span></td>
                          <td className="px-6 py-4">{item.batchNumber || "-"}</td>
                          <td className="px-6 py-4">{item.quantity}</td>
                          <td className="font-bold text-warning">{formatDateForDisplay(item.expiryDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORECAST TAB */}
      {activeTab === "forecast" && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6" style={{ marginBottom: "24px" }}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={22} className="text-primary-600" />
                <div>
                  <h3 style={{ margin: 0 }}>AI Demand Forecasting & Supplier Matching</h3>
                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                    Predict demand trends for the next 7 days & auto-match optimal suppliers
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4" style={{ maxWidth: "480px" }}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Search or Select Product to Analyze</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                    placeholder="Search product name or SKU..."
                    value={forecastSearchTerm}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForecastSearchTerm(val);
                      setForecastError("");
                      const search = val.toLowerCase().trim();
                      if (!search) {
                        setForecast(null);
                        setSupplierRecommendation(null);
                        return;
                      }
                      const matches = inventory.filter(
                        (i) =>
                          i.productName.toLowerCase().includes(search) ||
                          i.sku.toLowerCase().includes(search)
                      );
                      if (matches.length === 1) {
                        loadForecast(matches[0].sku);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Quick Select Buttons */}
              {forecastSearchTerm && filteredForecastProducts.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {filteredForecastProducts.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                      onClick={() => {
                        setForecastSearchTerm(p.productName);
                        loadForecast(p.sku);
                      }}
                    >
                      {p.productName} ({p.sku})
                    </button>
                  ))}
                </div>
              )}

              {/* Dropdown fallback */}
              {!forecastSearchTerm && (
                <div className="mb-4" style={{ maxWidth: "480px" }}>
                  <select
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow cursor-pointer"
                    value={forecast?.sku || ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setForecast(null);
                        setSupplierRecommendation(null);
                        return;
                      }
                      loadForecast(e.target.value);
                    }}
                  >
                    <option value="">-- Choose a product from inventory --</option>
                    {inventory.map((item) => (
                      <option key={item._id} value={item.sku}>
                        {item.productName} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {forecastLoading && <LoadingState message="Generating AI Demand Forecast..." />}
              {forecastError && <ErrorAlert message={forecastError} />}

              {forecast?.status === "insufficient_data" && !forecastLoading && (
                <div className="alert alert-warning" style={{ marginTop: "24px" }}>
                  <AlertTriangle size={22} style={{ flexShrink: 0 }} />
                  <div>
                    <p className="font-bold">Not enough sales history yet.</p>
                    <p className="text-sm">Continue recording sales to improve the forecast.</p>
                  </div>
                </div>
              )}

              {/* FORECAST RESULTS */}
              {forecast && forecast.status !== "insufficient_data" && !forecastLoading && (
                <div style={{ marginTop: "24px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <StatCard title="Product" value={forecast.productName} subtitle={`SKU: ${forecast.sku}`} variant="primary" />
                    <StatCard title="Model" value={forecast.model || "Moving Average"} subtitle="Prediction Engine" variant="info" />
                    <StatCard title="Avg Daily Demand" value={`${forecast.averageDailyDemand} units`} variant="success" />
                    <StatCard title="Historical Demand" value={`${forecast.totalHistoricalDemand} units`} variant="primary" />
                  </div>

                  {/* PREDICTED 7 DAYS */}
                  <h4 style={{ marginBottom: "12px" }}>Predicted Demand Schedule (Next 7 Days)</h4>
                  <div className="overflow-x-auto" style={{ marginBottom: "24px" }}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Date</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Predicted Demand</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.forecast.map((day) => (
                          <tr key={day.date}>
                            <td className="px-6 py-4">{day.date}</td>
                            <td className="font-bold text-primary">{day.predictedDemand} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* AI RECOMMENDATION */}
                  <div
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6"
                    style={{
                      border: "2px solid var(--primary-500)",
                      background: "linear-gradient(180deg, rgba(238, 242, 255, 0.5) 0%, white 100%)",
                    }}
                  >
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Sparkles size={20} className="text-primary-600" />
                        <h3 style={{ margin: 0 }}>AI Supplier Recommendation</h3>
                      </div>
                    </div>
                    <div className="p-6">
                      {supplierRecommendationLoading && <LoadingState message="Analyzing suppliers..." />}
                      {supplierRecommendationError && <ErrorAlert message={supplierRecommendationError} />}

                      {supplierRecommendation && !supplierRecommendationLoading && (
                        <div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                              gap: "12px",
                              marginBottom: "20px",
                              padding: "16px",
                              background: "white",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--slate-200)",
                            }}
                          >
                            <div>
                              <p className="text-xs text-muted" style={{ margin: 0 }}>Current Stock</p>
                              <p className="font-bold" style={{ margin: "4px 0 0" }}>{supplierRecommendation.currentStock} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted" style={{ margin: 0 }}>Forecast Demand</p>
                              <p className="font-bold" style={{ margin: "4px 0 0" }}>{supplierRecommendation.forecastDemand} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted" style={{ margin: 0 }}>Safety Stock</p>
                              <p className="font-bold" style={{ margin: "4px 0 0" }}>{supplierRecommendation.safetyStock} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted" style={{ margin: 0 }}>Required Quantity</p>
                              <p className="font-bold text-primary" style={{ margin: "4px 0 0", fontSize: "1.1rem" }}>
                                {supplierRecommendation.requiredQuantity} units
                              </p>
                            </div>
                          </div>

                          {!supplierRecommendation.orderRequired ? (
                            <SuccessAlert message="✓ Current inventory is sufficient. No supplier reorder is required." />
                          ) : supplierRecommendation.recommendedSupplier ? (
                            <div
                              style={{
                                padding: "20px",
                                background: "white",
                                borderRadius: "var(--radius-lg)",
                                border: "1px solid var(--slate-200)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                                <div>
                                  <h3 className="m-0 text-primary-700">
                                    {supplierRecommendation.recommendedSupplier.supplierName}
                                  </h3>
                                  <p className="text-xs text-muted" style={{ marginTop: "2px" }}>
                                    Match Score: {supplierRecommendation.recommendedSupplier.score} | Unit Price: ₹
                                    {supplierRecommendation.recommendedSupplier.recommendedProduct?.unitPrice}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors"
                                  onClick={() => {
                                    const recId = supplierRecommendation.recommendedSupplier._id;
                                    const exists = suppliers.some((s) => String(s._id) === String(recId));
                                    if (exists) {
                                      setSelectedSupplierId(String(recId));
                                      setActiveTab("orders");
                                    } else {
                                      setSupplierError("Recommended supplier is not available in the current supplier list.");
                                    }
                                  }}
                                >
                                  Use Recommended Supplier
                                </button>
                              </div>

                              {supplierRecommendation.recommendedSupplier.reasons?.length > 0 && (
                                <div style={{ marginTop: "16px" }}>
                                  <p className="text-xs font-bold text-muted">WHY THIS SUPPLIER:</p>
                                  <ul style={{ paddingLeft: "20px", marginTop: "6px", fontSize: "0.875rem" }}>
                                    {supplierRecommendation.recommendedSupplier.reasons.map((r, idx) => (
                                      <li key={idx}>{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted">No suitable supplier matching criteria found.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ORDERS & PAYMENTS TAB */}
      {activeTab === "orders" && (
        <div>
          {/* CREATE PO SECTION */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6" style={{ marginBottom: "24px" }}>
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 style={{ margin: 0 }}>Create B2B Purchase Order</h3>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  Order products directly from active verified suppliers
                </p>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={openRetailerProfileForm}><Edit size={14} /> Profile & Delivery Address</button>
            </div>
            <div className="p-6">
              {supplierLoading ? (
                <LoadingState message="Loading active suppliers..." />
              ) : supplierError ? (
                <ErrorAlert message={supplierError} />
              ) : suppliers.length === 0 ? (
                <p className="text-sm text-muted">No active suppliers found in system.</p>
              ) : (
                <div>
                  <div className="mb-4" style={{ maxWidth: "400px" }}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Supplier</label>
                    <select
                      className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow cursor-pointer"
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                    >
                      <option value="">-- Choose a supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.businessName || s.supplierName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSupplierId && (
                    <PurchaseOrderPanel
                      supplier={suppliers.find((s) => String(s._id) === String(selectedSupplierId))}
                      getToken={getToken}
                      onPurchaseOrderCreated={loadPurchaseOrders}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PO HISTORY & RAZORPAY PAYMENT TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 style={{ margin: 0 }}>Purchase Order History & Payments</h3>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  Track order status and make online Razorpay payments
                </p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">{purchaseOrders.length} Orders</span>
            </div>

            <div className="p-6" style={{ padding: 0 }}>
              {purchaseOrdersLoading ? (
                <LoadingState message="Loading purchase order history..." />
              ) : purchaseOrdersError ? (
                <ErrorAlert message={purchaseOrdersError} />
              ) : purchaseOrders.length === 0 ? (
                <EmptyState title="No purchase orders created yet" description="Orders you submit will appear here with payment actions." />
              ) : (
                <div className="overflow-x-auto" style={{ border: "none", borderRadius: 0 }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">PO Number</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Supplier</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Items</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Total Amount</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Order Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Payment Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Created Date</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Details</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Payment Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.map((po) => (
                        <tr key={po._id}>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-primary-600">
                            {po.poNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                            {po.supplierName || po.supplierId?.supplierName || "-"}
                          </td>
                          <td className="px-6 py-4">{po.items?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{formatCurrency(po.totalAmount)}</td>
                          <td className="px-6 py-4">
                            <StatusBadge value={po.orderStatus} />
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge value={po.paymentStatus} />
                          </td>
                          <td className="text-xs text-muted">{formatDateForDisplay(po.createdAt)}</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                              onClick={() => setSelectedPurchaseOrder(po)}
                            >
                              <Eye size={14} /> View
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            {po.paymentStatus === "paid" ? (
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                <StatusBadge value="paid" />
                                {po.orderStatus === "confirmed" || po.orderStatus === "shipped" ? (
                                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleMarkDelivered(po)}>
                                    Mark Delivered
                                  </button>
                                ) : null}
                                {po.orderStatus === "delivered" ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                      setFeedbackError("");
                                      setFeedbackRating("5");
                                      setFeedbackOrder(po);
                                    }}
                                  >
                                    Rate Supplier
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-gradient"
                                onClick={() => handlePayment(po)}
                                disabled={paymentLoadingId === po._id}
                              >
                                {paymentLoadingId === po._id ? (
                                  <>
                                    <span className="spinner" />
                                    <span>Opening...</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard size={14} />
                                    <span>Pay Now</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(saleItem)}
        onClose={closeSaleForm}
        title={saleItem ? `Record Sale: ${saleItem.productName}` : "Record Sale"}
      >
        {saleItem && (
          <form onSubmit={handleSaleSubmit}>
            <p className="text-sm text-muted" style={{ marginBottom: "16px" }}>
              Current stock: <strong>{saleItem.quantity}</strong> {saleItem.unit || "piece"}
            </p>
            {saleError && <ErrorAlert message={saleError} />}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="sale-quantity">
                Quantity sold
              </label>
              <input
                id="sale-quantity"
                type="number"
                min="1"
                max={saleItem.quantity}
                step="1"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                value={saleQuantity}
                onChange={(event) => setSaleQuantity(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                onClick={closeSaleForm}
                disabled={saleSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors"
                disabled={saleSubmitting || saleItem.quantity === 0}
              >
                {saleSubmitting ? "Recording..." : "Confirm Sale"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(feedbackOrder)}
        onClose={() => setFeedbackOrder(null)}
        title="Rate Supplier"
      >
        {feedbackOrder && (
          <form onSubmit={handleSubmitFeedback}>
            <p className="text-sm text-muted" style={{ marginBottom: "16px" }}>
              Rate {feedbackOrder.supplierName || "this supplier"} for {feedbackOrder.poNumber}.
            </p>
            {feedbackError && <ErrorAlert message={feedbackError} />}
            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="supplier-rating">
              Quality rating
            </label>
            <select
              id="supplier-rating"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm"
              value={feedbackRating}
              onChange={(event) => setFeedbackRating(event.target.value)}
            >
              <option value="5">5 / 5</option>
              <option value="4">4 / 5</option>
              <option value="3">3 / 5</option>
              <option value="2">2 / 5</option>
              <option value="1">1 / 5</option>
            </select>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setFeedbackOrder(null)} disabled={feedbackSubmitting}>Cancel</button>
              <button type="submit" className="btn btn-sm btn-gradient" disabled={feedbackSubmitting}>
                {feedbackSubmitting ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title="Edit Product Details"
        footer={
          <>
            <button type="button" className="px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors" onClick={resetForm} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" form="product-form" className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 transition-colors" disabled={submitting}>
              {submitting ? "Saving..." : "Update Product"}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name *</label>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="productName"
                value={formData.productName}
                onChange={handleInputChange}
                placeholder="e.g. Aashirvaad Atta"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">SKU *</label>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder="e.g. ATTA-5KG"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Barcode</label>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                placeholder="e.g. 8901234567890"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Brand</label>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="e.g. Aashirvaad"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="e.g. Groceries"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit</label>
              <select className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow cursor-pointer" name="unit" value={formData.unit} onChange={handleInputChange}>
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

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch Number</label>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleInputChange}
                placeholder="e.g. BTH-2026-091"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Manufacturing Date</label>
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expiry Date</label>
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stock Quantity *</label>
              <input
                type="number"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 50"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Purchase Price (₹)</label>
              <input
                type="number"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="e.g. 220"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Selling Price (₹)</label>
              <input
                type="number"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="e.g. 250"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reorder Level *</label>
              <input
                type="number"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleInputChange}
                min="0"
                placeholder="e.g. 10"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier Name</label>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                name="supplierName"
                value={formData.supplierName}
                onChange={handleInputChange}
                placeholder="e.g. Metro Distributors"
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showProfileForm} onClose={() => setShowProfileForm(false)} title="Retailer Profile & Delivery Address">
        <form onSubmit={saveRetailerProfile} className="space-y-4">
          {profileFormError && <ErrorAlert message={profileFormError} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[["businessName", "Business / Shop Name"], ["contactPerson", "Contact Person"], ["email", "Email"], ["phone", "Phone"]].map(([field, label]) => (
              <label key={field} className="text-sm font-semibold text-slate-700">{label} *<input type={field === "email" ? "email" : "text"} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={profileForm[field]} onChange={(event) => setProfileForm((previous) => ({ ...previous, [field]: event.target.value }))} required /></label>
            ))}
            {["addressLine1", "addressLine2", "city", "state", "pincode", "country"].map((field) => (
              <label key={field} className="text-sm font-semibold text-slate-700">{field === "addressLine1" ? "Delivery Address Line 1" : field === "addressLine2" ? "Delivery Address Line 2" : field[0].toUpperCase() + field.slice(1)}{field !== "addressLine2" ? " *" : ""}<input className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={profileForm.address[field]} onChange={(event) => setProfileForm((previous) => ({ ...previous, address: { ...previous.address, [field]: event.target.value } }))} required={field !== "addressLine2"} /></label>
            ))}
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowProfileForm(false)}>Cancel</button><button type="submit" className="btn btn-gradient">Save Profile</button></div>
        </form>
      </Modal>

      {/* PURCHASE ORDER DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedPurchaseOrder)}
        onClose={() => setSelectedPurchaseOrder(null)}
        title={`Purchase Order Details - ${selectedPurchaseOrder?.poNumber || ""}`}
        footer={
          <>
            {selectedPurchaseOrder?.paymentStatus !== "paid" && (
              <button
                type="button"
                className="btn btn-gradient"
                onClick={() => handlePayment(selectedPurchaseOrder)}
                disabled={paymentLoadingId === selectedPurchaseOrder?._id}
              >
                {paymentLoadingId === selectedPurchaseOrder?._id ? "Opening Razorpay..." : "Pay Now"}
              </button>
            )}
            <button type="button" className="px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors" onClick={() => setSelectedPurchaseOrder(null)}>
              Close
            </button>
          </>
        }
      >
        {selectedPurchaseOrder && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
                padding: "16px",
                background: "var(--slate-50)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Supplier Name</p>
                <p className="font-semibold" style={{ margin: "2px 0 0" }}>
                  {selectedPurchaseOrder.supplierName || selectedPurchaseOrder.supplierId?.supplierName || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Created Date</p>
                <p className="font-semibold" style={{ margin: "2px 0 0" }}>
                  {formatDateForDisplay(selectedPurchaseOrder.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Order Status</p>
                <StatusBadge value={selectedPurchaseOrder.orderStatus} />
              </div>
              <div>
                <p className="text-xs text-muted" style={{ margin: 0 }}>Payment Status</p>
                <StatusBadge value={selectedPurchaseOrder.paymentStatus} />
              </div>
            </div>

            <h4 style={{ marginBottom: "12px" }}>Order Line Items</h4>
            <div className="overflow-x-auto" style={{ marginBottom: "20px" }}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Product</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">SKU</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Qty</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Unit Price</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchaseOrder.items?.map((item, index) => (
                    <tr key={`${item.sku}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{item.productName}</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">{item.sku}</span></td>
                      <td className="px-6 py-4">{item.quantity}</td>
                      <td className="px-6 py-4">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">₹{Number(item.totalPrice || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-right p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-muted" style={{ margin: 0 }}>Total Order Value</p>
              <h2 className="m-0 text-primary-700">{formatCurrency(selectedPurchaseOrder.totalAmount)}</h2>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export default RetailerDashboard;