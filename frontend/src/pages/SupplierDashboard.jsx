import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  Building2,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  Star,
  Shield,
  CreditCard,
  Receipt
  ,Plus
  ,Edit
  ,Trash2
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  StatCard,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorAlert,
  statusLabel,
  Modal,
  SuccessAlert
} from "../components/UIComponents";
import { getSupplierDashboard } from "../api/supplierDashboardApi";
import {
  createSupplierProduct,
  updateSupplierProduct,
  deactivateSupplierProduct,
  updateSupplierProfile,
} from "../api/supplierApi";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SupplierDashboard() {
  const { getToken } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingSku, setEditingSku] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [profileForm, setProfileForm] = useState({
    supplierName: "", contactPerson: "", email: "", phone: "", leadTimeDays: "",
    address: { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "", country: "India" },
  });
  const [productForm, setProductForm] = useState({
    productName: "", sku: "", brand: "", category: "", unit: "piece",
    unitPrice: "", minimumOrderQuantity: "", availableQuantity: "", leadTimeDays: "", manufacturingDate: "", expiryDate: "", active: true,
  });

  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isRejectedApproval, setIsRejectedApproval] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");
      setIsPendingApproval(false);
      setIsRejectedApproval(false);
      const data = await getSupplierDashboard(getToken);
      setDashboard(data);
    } catch (requestError) {
      console.error("Supplier dashboard load error:", requestError);
      const msg = String(requestError.message || "");
      if (
        msg.toLowerCase().includes("pending admin approval") ||
        requestError.approvalStatus === "PENDING"
      ) {
        setIsPendingApproval(true);
      } else if (
        msg.toLowerCase().includes("rejected") ||
        requestError.approvalStatus === "REJECTED"
      ) {
        setIsRejectedApproval(true);
        setRejectionReason(msg);
      } else {
        setError(msg || "Failed to load supplier dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [getToken]);

  const supplier = dashboard?.supplier;
  const summary = dashboard?.summary;
  const purchaseOrders = dashboard?.purchaseOrders || [];
  const payments = dashboard?.payments || [];
  const payouts = dashboard?.payouts || [];
  const products = supplier?.products || [];

  function openProfileForm() {
    setProfileForm({
      supplierName: supplier?.supplierName || "",
      contactPerson: supplier?.contactPerson || "",
      email: supplier?.email || "",
      phone: supplier?.phone || "",
      leadTimeDays: supplier?.leadTimeDays ?? 0,
      address: {
        addressLine1: supplier?.address?.addressLine1 || "",
        addressLine2: supplier?.address?.addressLine2 || "",
        city: supplier?.address?.city || "",
        state: supplier?.address?.state || "",
        pincode: supplier?.address?.pincode || "",
        country: supplier?.address?.country || "India",
      },
    });
    setFormError("");
    setShowProfileForm(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      setFormError("");
      await updateSupplierProfile(profileForm, getToken);
      setFormSuccess("Supplier profile saved successfully.");
      setShowProfileForm(false);
      await loadDashboard();
    } catch (requestError) {
      setFormError(requestError.message || "Failed to save supplier profile.");
    }
  }

  function openProductForm(product = null) {
    setEditingSku(product?.sku || null);
    setProductForm({
      productName: product?.productName || "",
      sku: product?.sku || "",
      brand: product?.brand || "",
      category: product?.category || "",
      unit: product?.unit || "piece",
      unitPrice: product?.unitPrice ?? "",
      minimumOrderQuantity: product?.minimumOrderQuantity ?? "",
      availableQuantity: product?.availableQuantity ?? "",
      leadTimeDays: product?.leadTimeDays ?? supplier?.leadTimeDays ?? "",
      manufacturingDate: product?.manufacturingDate ? new Date(product.manufacturingDate).toISOString().split("T")[0] : "",
      expiryDate: product?.expiryDate ? new Date(product.expiryDate).toISOString().split("T")[0] : "",
      active: product?.active !== false,
    });
    setFormError("");
    setShowProductForm(true);
  }

  async function saveProduct(event) {
    event.preventDefault();
    try {
      setFormError("");
      const payload = {
        ...productForm,
        unitPrice: Number(productForm.unitPrice),
        minimumOrderQuantity: Number(productForm.minimumOrderQuantity),
        availableQuantity: Number(productForm.availableQuantity),
        leadTimeDays: Number(productForm.leadTimeDays || 0),
      };
      if (!payload.manufacturingDate || !payload.expiryDate || new Date(payload.manufacturingDate) > new Date(payload.expiryDate)) {
        setFormError("Manufacturing date must be on or before expiry date.");
        return;
      }
      if (editingSku) await updateSupplierProduct(editingSku, payload, getToken);
      else await createSupplierProduct(payload, getToken);
      setFormSuccess(`Product ${editingSku ? "updated" : "added"} successfully.`);
      setShowProductForm(false);
      await loadDashboard();
    } catch (requestError) {
      setFormError(requestError.message || "Failed to save supplier product.");
    }
  }

  async function deactivateProduct(product) {
    if (!window.confirm(`Deactivate ${product.productName}?`)) return;
    try {
      await deactivateSupplierProduct(product.sku, getToken);
      setFormSuccess("Product deactivated successfully.");
      await loadDashboard();
    } catch (requestError) {
      setFormError(requestError.message || "Failed to deactivate product.");
    }
  }

  const navItems = [
    { id: "overview", label: "Overview & Performance", icon: Building2 },
    { id: "products", label: "Products Catalog", icon: Package, badge: products.length, badgeClass: "badge-primary" },
    { id: "orders", label: "Incoming Orders", icon: ShoppingCart, badge: purchaseOrders.length, badgeClass: "badge-warning" },
    { id: "payments", label: "Payment History", icon: CreditCard },
    { id: "payouts", label: "Payout Ledger", icon: Receipt },
  ];

  return (
    <DashboardLayout
      role="supplier"
      title={supplier ? (supplier.businessName || supplier.supplierName) : "Supplier Hub"}
      subtitle={
        supplier
          ? `${supplier.contactPerson} • ${supplier.email} • ${supplier.phone}`
          : "Supplier Catalog & Orders"
      }
      navItems={navItems}
      activeNav={activeTab}
      onNavSelect={setActiveTab}
      onRefresh={loadDashboard}
      refreshing={loading}
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadDashboard} /></div>}
      {formError && <div className="mb-6"><ErrorAlert message={formError} /></div>}
      {formSuccess && <div className="mb-6"><SuccessAlert message={formSuccess} /></div>}

      {loading ? (
        <LoadingState message="Loading supplier workspace..." />
      ) : isPendingApproval ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Clock size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Supplier Account Under Admin Review</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Thank you for registering as a SupplySync supplier. Your application has been submitted to the platform administrator and is currently pending approval. Once approved, you will have full access to manage your catalog, receive retailer purchase orders, and receive payouts.
          </p>
          <button
            type="button"
            onClick={loadDashboard}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-600/20 transition-all cursor-pointer"
          >
            Check Approval Status
          </button>
        </div>
      ) : isRejectedApproval ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <XCircle size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Supplier Registration Not Approved</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            {rejectionReason || "Your supplier application did not meet the platform onboarding requirements. Please contact the administrator for more details."}
          </p>
          <button
            type="button"
            onClick={loadDashboard}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Check Status Again
          </button>
        </div>
      ) : !dashboard ? (
        <EmptyState title="No supplier data available" description="Unable to load supplier dashboard profile." />
      ) : (
        <>
          {/* PROFILE & RELIABILITY BANNER */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{supplier.businessName || supplier.supplierName} Profile</h3>
                  <p className="text-xs font-medium text-slate-500">
                    Verified B2B Supplier Partner
                  </p>
                </div>
              </div>
              <StatusBadge value={supplier.active ? "active" : "inactive"} />
              <button type="button" className="btn btn-sm btn-secondary" onClick={openProfileForm}><Edit size={14} /> Edit Profile</button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-sm text-slate-600">
                <div><strong>Contact:</strong> {supplier.contactPerson || "-"}</div>
                <div><strong>Email:</strong> {supplier.email || "-"}</div>
                <div><strong>Phone:</strong> {supplier.phone || "-"}</div>
                <div><strong>Address:</strong> {supplier.address?.addressLine1 || "-"}, {supplier.address?.city || "-"}, {supplier.address?.state || "-"} {supplier.address?.pincode || ""}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lead Time</p>
                  <h4 className="text-xl font-bold text-slate-900">{supplier.leadTimeDays} days</h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reliability Score</p>
                  <h4 className="text-xl font-bold text-primary-600">{supplier.reliabilityScore}%</h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Quality Rating</p>
                  <h4 className="text-xl font-bold text-amber-500 flex items-center gap-1.5">
                    <Star size={18} fill="currentColor" /> {supplier.ratingCount ? `${supplier.rating} / 5` : "No ratings yet"}
                  </h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Products</p>
                  <h4 className="text-xl font-bold text-emerald-600">{summary.totalProducts || 0} Listed</h4>
                </div>
              </div>
            </div>
          </div>

          {/* OVERVIEW TAB CONTENT */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Products" value={summary.totalProducts || 0} icon={Package} variant="primary" />
                <StatCard title="Total Orders" value={summary.totalOrders || 0} icon={ShoppingCart} variant="info" />
                <StatCard title="Retailers Served" value={summary.totalRetailers || 0} icon={Users} variant="success" />
                <StatCard title="Total Order Value" value={formatCurrency(summary.totalOrderValue)} icon={DollarSign} variant="primary" />
                <StatCard title="Total Paid Value" value={formatCurrency(summary.totalPaidValue)} icon={CheckCircle2} variant="success" />
                <StatCard title="Pending Payout" value={formatCurrency(summary.pendingPayoutValue)} icon={Clock} variant="warning" />
                <StatCard title="Settled Payout" value={formatCurrency(summary.completedPayoutValue)} icon={Shield} variant="info" />
              </div>

              {/* QUICK RECENT ORDERS PREVIEW */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Recent Incoming Orders</h3>
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                    onClick={() => setActiveTab("orders")}
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  {purchaseOrders.length === 0 ? (
                    <EmptyState title="No orders received yet" description="Orders placed by retailers will appear here." />
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Retailer</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                          <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purchaseOrders.slice(0, 5).map((order) => (
                          <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-md text-sm border border-primary-100">
                                {order.poNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">{order.retailerName || order.retailerUserId || "-"}</div>
                              {order.retailerEmail && <div className="text-xs text-slate-500 mt-0.5">{order.retailerEmail}</div>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                              {order.items?.length || 0} items
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge value={order.orderStatus} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge value={order.paymentStatus} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS CATALOG TAB */}
          {activeTab === "products" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Products Catalog</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Items available for retailer procurement</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">{products.length} Products</span>
                  <button type="button" className="btn btn-sm btn-gradient" onClick={() => openProductForm()}><Plus size={15} /> Add Product</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {products.length === 0 ? (
                  <EmptyState title="No products listed" description="Your catalog is currently empty." />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Brand</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">MOQ</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead Time</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Stock</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p) => (
                        <tr key={p.sku} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{p.productName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {p.sku}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{p.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{p.brand || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{formatCurrency(p.unitPrice)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{p.minimumOrderQuantity} units</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{p.leadTimeDays ?? supplier.leadTimeDays ?? 0} days</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${p.availableQuantity > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                              {p.availableQuantity} units
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap"><StatusBadge value={p.active === false ? "inactive" : "active"} /></td>
                          <td className="px-6 py-4 whitespace-nowrap"><div className="flex gap-2"><button type="button" className="btn btn-sm btn-secondary btn-icon" title="Edit product" onClick={() => openProductForm(p)}><Edit size={14} /></button><button type="button" className="btn btn-sm btn-ghost btn-icon text-rose-600" title="Deactivate product" onClick={() => deactivateProduct(p)}><Trash2 size={14} /></button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* INCOMING ORDERS TAB */}
          {activeTab === "orders" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Incoming Purchase Orders</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">All orders placed by retailers</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                  {purchaseOrders.length} Orders
                </span>
              </div>
              <div className="overflow-x-auto">
                {purchaseOrders.length === 0 ? (
                  <EmptyState title="No purchase orders" description="No orders have been submitted to your account yet." />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Retailer</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-md text-sm border border-primary-100">
                              {order.poNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{order.retailerName || order.retailerUserId || "-"}</div>
                            {order.retailerEmail && <div className="text-xs text-slate-500 mt-0.5">{order.retailerEmail}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600">{order.items?.length || 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{formatCurrency(order.totalAmount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><StatusBadge value={order.orderStatus} /></td>
                          <td className="px-6 py-4 whitespace-nowrap"><StatusBadge value={order.paymentStatus} /></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(order.createdAt)}</td>
                          <td className="px-6 py-4"><button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedOrder(order)}>View Details</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* PAYMENT HISTORY TAB */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Payment Transactions</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Incoming payment records from retailers</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                {payments.length === 0 ? (
                  <EmptyState title="No payment records" description="Payment transactions will be logged here once completed." />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfer Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Razorpay ID</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((pmt) => (
                        <tr key={pmt._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{pmt.poNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{formatCurrency(pmt.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><StatusBadge value={pmt.paymentStatus} /></td>
                          <td className="px-6 py-4 whitespace-nowrap"><StatusBadge value={pmt.transferStatus} /></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {pmt.razorpayPaymentId || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(pmt.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* PAYOUT LEDGER TAB */}
          {activeTab === "payouts" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Simulated Payout Ledger</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Internal disbursement and settlement records</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                {payouts.length === 0 ? (
                  <EmptyState title="No payouts processed" description="Payout disbursements will appear here." />
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payout Amount</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference ID</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Processed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payouts.map((po) => (
                        <tr key={po._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{po.poNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{formatCurrency(po.amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap"><StatusBadge value={po.payoutStatus} /></td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {statusLabel(po.payoutMethod)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                            {po.referenceId || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(po.processedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showProfileForm} onClose={() => setShowProfileForm(false)} title="Edit Supplier Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[["supplierName", "Supplier / Shop Name"], ["contactPerson", "Contact Person"], ["email", "Email"], ["phone", "Phone"]].map(([field, label]) => (
              <label key={field} className="text-sm font-semibold text-slate-700">{label} *<input className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={profileForm[field]} onChange={(event) => setProfileForm((previous) => ({ ...previous, [field]: event.target.value }))} required /></label>
            ))}
            {["addressLine1", "addressLine2", "city", "state", "pincode", "country"].map((field) => (
              <label key={field} className="text-sm font-semibold text-slate-700">{field === "addressLine1" ? "Address Line 1" : field === "addressLine2" ? "Address Line 2" : field[0].toUpperCase() + field.slice(1)}{field !== "addressLine2" ? " *" : ""}<input className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={profileForm.address[field]} onChange={(event) => setProfileForm((previous) => ({ ...previous, address: { ...previous.address, [field]: event.target.value } }))} required={field !== "addressLine2"} /></label>
            ))}
            <label className="text-sm font-semibold text-slate-700">Lead Time (days) *<input type="number" min="0" step="1" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={profileForm.leadTimeDays} onChange={(event) => setProfileForm((previous) => ({ ...previous, leadTimeDays: event.target.value }))} required /></label>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowProfileForm(false)}>Cancel</button><button type="submit" className="btn btn-gradient">Save Profile</button></div>
        </form>
      </Modal>

      <Modal isOpen={showProductForm} onClose={() => setShowProductForm(false)} title={editingSku ? "Edit Supplier Product" : "Add Supplier Product"}>
        <form onSubmit={saveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[["productName", "Product Name"], ["sku", "SKU"], ["brand", "Brand"], ["category", "Category"], ["unitPrice", "Wholesale Price"], ["minimumOrderQuantity", "MOQ"], ["availableQuantity", "Available Stock"], ["leadTimeDays", "Lead Time (days)"],].map(([field, label]) => (
              <label key={field} className="text-sm font-semibold text-slate-700">{label} *<input type={field === "unitPrice" || field === "minimumOrderQuantity" || field === "availableQuantity" || field === "leadTimeDays" ? "number" : "text"} min="0" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={productForm[field]} onChange={(event) => setProductForm((previous) => ({ ...previous, [field]: event.target.value }))} required /></label>
            ))}
            <label className="text-sm font-semibold text-slate-700">Unit *<select className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={productForm.unit} onChange={(event) => setProductForm((previous) => ({ ...previous, unit: event.target.value }))}><option>piece</option><option>packet</option><option>box</option><option>bottle</option><option>can</option><option>kg</option><option>litre</option></select></label>
            <label className="text-sm font-semibold text-slate-700">Manufacturing Date *<input type="date" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={productForm.manufacturingDate} onChange={(event) => setProductForm((previous) => ({ ...previous, manufacturingDate: event.target.value }))} required /></label>
            <label className="text-sm font-semibold text-slate-700">Expiry Date *<input type="date" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" value={productForm.expiryDate} onChange={(event) => setProductForm((previous) => ({ ...previous, expiryDate: event.target.value }))} required /></label>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mt-6"><input type="checkbox" checked={productForm.active} onChange={(event) => setProductForm((previous) => ({ ...previous, active: event.target.checked }))} /> Active / Available</label>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowProductForm(false)}>Cancel</button><button type="submit" className="btn btn-gradient">Save Product</button></div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(selectedOrder)} onClose={() => setSelectedOrder(null)} title={`Order Details - ${selectedOrder?.poNumber || ""}`}>
        {selectedOrder && <div className="space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl">
            <div><strong>Retailer:</strong> {selectedOrder.retailerName || "-"}</div>
            <div><strong>Email:</strong> {selectedOrder.retailerEmail || "-"}</div>
            <div><strong>Phone:</strong> {selectedOrder.deliveryAddress?.phone || selectedOrder.retailerPhone || "-"}</div>
            <div><strong>Order Date:</strong> {formatDate(selectedOrder.createdAt)}</div>
            <div><strong>Order Status:</strong> <StatusBadge value={selectedOrder.orderStatus} /></div>
            <div><strong>Payment Status:</strong> <StatusBadge value={selectedOrder.paymentStatus} /></div>
          </div>
          <div><h4 className="font-semibold text-slate-900 mb-2">Delivery Details</h4><p className="text-slate-600">{selectedOrder.deliveryAddress?.businessName || "-"}<br />Contact: {selectedOrder.deliveryAddress?.contactPerson || "-"}<br />{selectedOrder.deliveryAddress?.phone || "-"}<br />{selectedOrder.deliveryAddress?.addressLine1 || "-"}{selectedOrder.deliveryAddress?.addressLine2 ? `, ${selectedOrder.deliveryAddress.addressLine2}` : ""}<br />{selectedOrder.deliveryAddress?.city || "-"}, {selectedOrder.deliveryAddress?.state || "-"} {selectedOrder.deliveryAddress?.pincode || ""}<br />{selectedOrder.deliveryAddress?.country || "-"}</p></div>
          <div><h4 className="font-semibold text-slate-900 mb-2">Ordered Items</h4>{selectedOrder.items?.map((item) => <div key={item.sku} className="flex justify-between border-b border-slate-100 py-2"><span>{item.productName} ({item.sku}) x {item.quantity}</span><strong>{formatCurrency(item.totalPrice)}</strong></div>)}<div className="text-right font-bold pt-3">Total: {formatCurrency(selectedOrder.totalAmount)}</div></div>
        </div>}
      </Modal>
    </DashboardLayout>
  );
}

export default SupplierDashboard;