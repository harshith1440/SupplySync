import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Users,
  Store,
  Building2,
  Activity,
  ArrowRight,
  LayoutDashboard,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Clock,
  ExternalLink,
  Info,
  ShieldAlert,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Sparkles,
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
import {
  getAdminUsers,
  getAdminSuppliers,
  updateSupplierApproval,
  getAdminRetailers,
  updateRetailerApproval,
  getAdminTransactions,
  getAdminSystemHealth,
} from "../api/adminApi";

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function RoleBadge({ role }) {
  if (role === "org:admin" || role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <ShieldCheck size={13} />
        Admin
      </span>
    );
  }
  if (role === "org:retailer_admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <ShieldCheck size={13} />
        Retailer Admin
      </span>
    );
  }
  if (role === "org:retailer" || role === "retailer") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Store size={13} />
        Retailer
      </span>
    );
  }
  if (role === "org:supplier" || role === "supplier") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <Building2 size={13} />
        Supplier
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
      <Clock size={13} />
      Pending Role
    </span>
  );
}

function ApprovalStatusBadge({ status }) {
  const normalized = String(status || "PENDING").toUpperCase();
  if (normalized === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={13} />
        Approved
      </span>
    );
  }
  if (normalized === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle size={13} />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
      <Clock size={13} />
      Pending Review
    </span>
  );
}

export default function AdminDashboard() {
  const { getToken } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState("overview");

  // Data States
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);

  // Loading & Error States
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingRetailers, setLoadingRetailers] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    type: "supplier", // "supplier" | "retailer"
    id: null,
    name: "",
    reason: "",
  });

  // Search & Filter States
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState("all");

  const [retailerSearchTerm, setRetailerSearchTerm] = useState("");
  const [retailerStatusFilter, setRetailerStatusFilter] = useState("all");

  const [txSearchTerm, setTxSearchTerm] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");

  // Load Transactions
  async function loadTransactions() {
    try {
      setLoadingTransactions(true);
      const data = await getAdminTransactions(getToken);
      setSummary(data.summary || null);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Load transactions error:", err);
      setErrorMessage((cur) => cur || err.message || "Failed to load transactions.");
    } finally {
      setLoadingTransactions(false);
    }
  }

  // Load Users
  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const data = await getAdminUsers(getToken);
      setUsers(data.users || []);
    } catch (err) {
      console.error("Load users error:", err);
      setErrorMessage((cur) => cur || err.message || "Failed to load platform users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  // Load Suppliers
  async function loadSuppliers() {
    try {
      setLoadingSuppliers(true);
      const data = await getAdminSuppliers(getToken);
      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error("Load suppliers error:", err);
      setErrorMessage((cur) => cur || err.message || "Failed to load suppliers.");
    } finally {
      setLoadingSuppliers(false);
    }
  }

  // Load Retailers
  async function loadRetailers() {
    try {
      setLoadingRetailers(true);
      const data = await getAdminRetailers(getToken);
      setRetailers(data.retailers || []);
    } catch (err) {
      console.error("Load retailers error:", err);
      setErrorMessage((cur) => cur || err.message || "Failed to load retailers.");
    } finally {
      setLoadingRetailers(false);
    }
  }

  // Load System Health
  async function loadSystemHealth() {
    try {
      setLoadingHealth(true);
      const data = await getAdminSystemHealth(getToken);
      setSystemHealth(data);
    } catch (err) {
      console.error("Load system health error:", err);
      setErrorMessage((cur) => cur || err.message || "Failed to load system health diagnostics.");
    } finally {
      setLoadingHealth(false);
    }
  }

  // Refresh All Data
  async function refreshAll() {
    setErrorMessage("");
    setSuccessMessage("");
    await Promise.all([
      loadTransactions(),
      loadUsers(),
      loadSuppliers(),
      loadRetailers(),
      loadSystemHealth(),
    ]);
  }

  useEffect(() => {
    refreshAll();
  }, [getToken]);

  // Handle Supplier Approval / Rejection
  async function handleSupplierApproval(supplierId, status, reason = "") {
    try {
      setActioningId(supplierId);
      setErrorMessage("");
      await updateSupplierApproval(supplierId, status, reason, getToken);
      setSuccessMessage(`Supplier ${status === "APPROVED" ? "approved" : "rejected"} successfully.`);
      await Promise.all([loadSuppliers(), loadUsers()]);
    } catch (err) {
      console.error("Supplier approval error:", err);
      setErrorMessage(err.message || "Failed to update supplier approval.");
    } finally {
      setActioningId(null);
    }
  }

  // Handle Retailer Approval / Rejection
  async function handleRetailerApproval(retailerId, status, reason = "") {
    try {
      setActioningId(retailerId);
      setErrorMessage("");
      await updateRetailerApproval(retailerId, status, reason, getToken);
      setSuccessMessage(`Retailer ${status === "APPROVED" ? "approved" : "rejected"} successfully.`);
      await Promise.all([loadRetailers(), loadUsers()]);
    } catch (err) {
      console.error("Retailer approval error:", err);
      setErrorMessage(err.message || "Failed to update retailer approval.");
    } finally {
      setActioningId(null);
    }
  }

  function openRejectModal(type, item) {
    const name = type === "supplier" ? item.businessName || item.supplierName : item.businessName || item.name;
    setRejectModal({
      isOpen: true,
      type,
      id: item.id || item._id,
      name,
      reason: `${name} did not meet platform approval verification requirements.`,
    });
  }

  async function confirmReject() {
    if (!rejectModal.id) return;
    const { type, id, reason } = rejectModal;
    setRejectModal((prev) => ({ ...prev, isOpen: false }));
    if (type === "supplier") {
      await handleSupplierApproval(id, "REJECTED", reason);
    } else {
      await handleRetailerApproval(id, "REJECTED", reason);
    }
  }

  // Navigation Items
  const navItems = [
    { id: "overview", label: "Dashboard / Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "suppliers", label: "Suppliers", icon: ShieldCheck },
    { id: "retailers", label: "Retailers", icon: Store },
    { id: "transactions", label: "Transactions", icon: CreditCard },
    { id: "health", label: "System Health", icon: Activity },
  ];

  // Calculated Counts
  const pendingSuppliersCount = suppliers.filter((s) => s.approvalStatus === "PENDING").length;
  const pendingRetailersCount = retailers.filter((r) => r.approvalStatus === "PENDING").length;
  const totalPendingApprovals = pendingSuppliersCount + pendingRetailersCount;

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const search = userSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search) ||
      u.userId?.toLowerCase().includes(search);

    const matchesRole =
      userRoleFilter === "all" ||
      (userRoleFilter === "admin" && (u.role === "org:admin" || u.role === "admin")) ||
      (userRoleFilter === "retailer" && (u.role === "org:retailer" || u.role === "org:retailer_admin" || u.role === "retailer")) ||
      (userRoleFilter === "supplier" && (u.role === "org:supplier" || u.role === "supplier")) ||
      (userRoleFilter === "unassigned" && u.role === "unassigned");

    const matchesStatus =
      userStatusFilter === "all" ||
      u.approvalStatus?.toLowerCase() === userStatusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const search = supplierSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !search ||
      s.businessName?.toLowerCase().includes(search) ||
      s.supplierName?.toLowerCase().includes(search) ||
      s.contactPerson?.toLowerCase().includes(search) ||
      s.email?.toLowerCase().includes(search) ||
      s.city?.toLowerCase().includes(search);

    const matchesStatus =
      supplierStatusFilter === "all" ||
      (s.approvalStatus || "PENDING").toLowerCase() === supplierStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Filtered Retailers
  const filteredRetailers = retailers.filter((r) => {
    const search = retailerSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !search ||
      r.businessName?.toLowerCase().includes(search) ||
      r.name?.toLowerCase().includes(search) ||
      r.contactPerson?.toLowerCase().includes(search) ||
      r.email?.toLowerCase().includes(search) ||
      r.city?.toLowerCase().includes(search);

    const matchesStatus =
      retailerStatusFilter === "all" ||
      (r.approvalStatus || "PENDING").toLowerCase() === retailerStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    const search = txSearchTerm.toLowerCase().trim();
    const matchesSearch =
      !search ||
      t.poNumber?.toLowerCase().includes(search) ||
      t.retailerName?.toLowerCase().includes(search) ||
      t.retailerEmail?.toLowerCase().includes(search) ||
      t.supplierName?.toLowerCase().includes(search) ||
      t.razorpayPaymentId?.toLowerCase().includes(search) ||
      String(t.paymentTransactionId || "").toLowerCase().includes(search);

    const matchesStatus =
      txStatusFilter === "all" ||
      t.paymentStatus?.toLowerCase() === txStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const isRefreshing =
    loadingTransactions || loadingUsers || loadingSuppliers || loadingRetailers || loadingHealth;

  return (
    <DashboardLayout
      role="admin"
      title="Admin Control Center"
      subtitle="Unified governance for platform users, supplier/retailer approvals, transactions, and system health"
      navItems={navItems}
      activeNav={activeTab}
      onNavSelect={setActiveTab}
      onRefresh={refreshAll}
      refreshing={isRefreshing}
    >
      {/* Alerts */}
      {errorMessage && (
        <div className="mb-6">
          <ErrorAlert message={errorMessage} onRetry={refreshAll} />
        </div>
      )}
      {successMessage && (
        <div className="mb-6">
          <SuccessAlert message={successMessage} />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW                                          */}
      {/* ======================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Pending Approvals Urgent Banner */}
          {totalPendingApprovals > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500 text-white rounded-xl shrink-0 shadow-md">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Action Required: {totalPendingApprovals} New Account Applications Pending
                  </h4>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {pendingSuppliersCount} supplier{pendingSuppliersCount !== 1 ? "s" : ""} and{" "}
                    {pendingRetailersCount} retailer{pendingRetailersCount !== 1 ? "s" : ""} are waiting for Admin approval before they can operate.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pendingSuppliersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("suppliers")}
                    className="px-4 py-2 bg-white text-slate-800 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Review Suppliers ({pendingSuppliersCount})
                  </button>
                )}
                {pendingRetailersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("retailers")}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Review Retailers ({pendingRetailersCount})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              title="Total Registered Users"
              value={users.length || 0}
              icon={Users}
              variant="primary"
              subtitle={`${users.filter((u) => u.role?.includes("admin")).length} Admin · ${users.filter((u) => u.role?.includes("retailer")).length} Retailers · ${users.filter((u) => u.role?.includes("supplier")).length} Suppliers`}
            />
            <StatCard
              title="Total Payment Volume"
              value={formatCurrency(summary?.totalPaymentValue || 0)}
              icon={DollarSign}
              variant="primary"
              subtitle={`${summary?.totalTransactions || 0} total transactions processed`}
            />
            <StatCard
              title="Settled Payment Value"
              value={formatCurrency(summary?.successfulPaymentValue || 0)}
              icon={TrendingUp}
              variant="success"
              subtitle={`${summary?.paidPayments || 0} successfully settled payments`}
            />
            <StatCard
              title="Pending Approvals"
              value={totalPendingApprovals}
              icon={ShieldCheck}
              variant={totalPendingApprovals > 0 ? "warning" : "success"}
              subtitle={`${pendingSuppliersCount} suppliers · ${pendingRetailersCount} retailers`}
            />
          </div>

          {/* Quick System Diagnostics Summary */}
          {systemHealth && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Activity size={20} className="text-primary-600" />
                  <h3 className="font-bold text-slate-900 text-base">Live Platform Infrastructure Status</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("health")}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  View Full Diagnostics <ArrowRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Backend Server</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">{systemHealth.api?.uptimeFormatted || "Online"}</div>
                  <div className="text-xs text-slate-400 mt-1">Node {systemHealth.api?.nodeVersion} · {systemHealth.api?.memoryUsage?.heapUsedMb} MB Heap</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>MongoDB Atlas</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Connected
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">{systemHealth.database?.pingLatencyMs} ms Latency</div>
                  <div className="text-xs text-slate-400 mt-1">{systemHealth.database?.collections?.purchaseOrders || 0} Orders · {systemHealth.database?.collections?.paymentTransactions || 0} Payments</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Razorpay Gateway</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">{systemHealth.payment?.latencyMs || 0} ms Ping</div>
                  <div className="text-xs text-slate-400 mt-1">{systemHealth.payment?.keyId} ({systemHealth.payment?.mode})</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Payment Pipeline</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Healthy
                    </span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">{systemHealth.transactions?.successRatePercentage}% Success</div>
                  <div className="text-xs text-slate-400 mt-1">{systemHealth.transactions?.paidTransactions} Paid · {systemHealth.transactions?.failedTransactions} Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Breakdown & Ledger Status */}
          {summary && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Settlement Ledger & Exception Tracking</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time balances across vendor payouts and transaction statuses</p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-rose-50/70 rounded-xl p-4 border border-rose-200/80">
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">Failed Payments</p>
                  <h4 className="text-2xl font-bold text-rose-800">{summary.failedPayments || 0}</h4>
                  <p className="text-xs text-rose-600 mt-1">Requires retailer intervention</p>
                </div>
                <div className="bg-sky-50/70 rounded-xl p-4 border border-sky-200/80">
                  <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-1">Refunded Transactions</p>
                  <h4 className="text-2xl font-bold text-sky-800">{summary.refundedPayments || 0}</h4>
                  <p className="text-xs text-sky-600 mt-1">Reversed to customer account</p>
                </div>
                <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200/80">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Pending Payout Balance</p>
                  <h4 className="text-2xl font-bold text-amber-800">{formatCurrency(summary.pendingPayoutValue)}</h4>
                  <p className="text-xs text-amber-600 mt-1">Awaiting bank reconciliation</p>
                </div>
                <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200/80">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Completed Payouts</p>
                  <h4 className="text-2xl font-bold text-emerald-800">{formatCurrency(summary.completedPayoutValue)}</h4>
                  <p className="text-xs text-emerald-600 mt-1">Disbursed to vendor accounts</p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions Snippet */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Transactions (Retailer → Supplier)</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live order payments linking purchasing retailer to fulfilling supplier</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("transactions")}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 cursor-pointer"
              >
                View All ({transactions.length}) <ArrowRight size={14} />
              </button>
            </div>
            <div className="overflow-x-auto">
              {loadingTransactions ? (
                <LoadingState message="Fetching live transaction records..." />
              ) : transactions.length === 0 ? (
                <EmptyState icon={CreditCard} title="No transaction records" description="Transactions will appear here once retailers pay for purchase orders." />
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Retailer → Supplier</th>
                      <th className="px-6 py-3">Order ID</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {transactions.slice(0, 5).map((tx) => (
                      <tr key={tx.paymentTransactionId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900">{tx.retailerName}</span>
                            <ArrowRight size={14} className="text-primary-500 shrink-0" />
                            <span className="font-semibold text-indigo-700">{tx.supplierName}</span>
                          </div>
                          {tx.retailerEmail && <div className="text-xs text-slate-400 mt-0.5">{tx.retailerEmail}</div>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs font-semibold text-primary-600">
                          {tx.poNumber}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap font-bold text-slate-900">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <StatusBadge value={tx.paymentStatus} />
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-xs text-slate-500">
                          {formatDate(tx.createdAt)}
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

      {/* ======================================================== */}
      {/* TAB 2: USERS                                             */}
      {/* ======================================================== */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header & Controls */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="text-primary-600" size={22} />
                <h3 className="text-lg font-bold text-slate-900">Platform Users Directory</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Displaying all registered platform users with Name, Email, Role, Status, and Registration Date.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  className="w-full sm:w-60 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative flex items-center">
                <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={15} />
                <select
                  className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="retailer">Retailer</option>
                  <option value="supplier">Supplier</option>
                  <option value="unassigned">Pending Role</option>
                </select>
              </div>

              <div className="relative flex items-center">
                <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={15} />
                <select
                  className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Metrics Summary Chips */}
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200/60 flex items-center gap-4 flex-wrap text-xs font-semibold text-slate-600">
            <span>Total Registered: <strong className="text-slate-900">{users.length}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Admins: <strong className="text-purple-700">{users.filter((u) => u.role?.includes("admin")).length}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Retailers: <strong className="text-emerald-700">{users.filter((u) => u.role?.includes("retailer")).length}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Suppliers: <strong className="text-blue-700">{users.filter((u) => u.role?.includes("supplier")).length}</strong></span>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            {loadingUsers ? (
              <LoadingState message="Loading registered platform users..." />
            ) : filteredUsers.length === 0 ? (
              <EmptyState icon={Users} title="No users matched" description="Try adjusting your search query or filters." />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Approval Status</th>
                    <th className="px-6 py-4">Operational</th>
                    <th className="px-6 py-4">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.map((user) => (
                    <tr key={user.userId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shrink-0 border border-primary-200">
                            {String(user.name || "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{user.name}</div>
                            <div className="font-mono text-[11px] text-slate-400">{user.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail size={14} className="text-slate-400" />
                          <span>{user.email || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ApprovalStatusBadge status={user.approvalStatus} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SUPPLIERS                                         */}
      {/* ======================================================== */}
      {activeTab === "suppliers" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header & Controls */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary-600" size={22} />
                <h3 className="text-lg font-bold text-slate-900">Suppliers Governance</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Review all registered suppliers. Only <strong>APPROVED</strong> suppliers can operate, list products, and receive purchase orders.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search supplier, contact, city..."
                  className="w-full sm:w-60 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  value={supplierSearchTerm}
                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative flex items-center">
                <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={15} />
                <select
                  className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                  value={supplierStatusFilter}
                  onChange={(e) => setSupplierStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Approval ({pendingSuppliersCount})</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Supplier Metrics Chips */}
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200/60 flex items-center gap-4 flex-wrap text-xs font-semibold text-slate-600">
            <span>Total Suppliers: <strong className="text-slate-900">{suppliers.length}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Pending Review: <strong className="text-amber-600">{pendingSuppliersCount}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Approved: <strong className="text-emerald-700">{suppliers.filter((s) => s.approvalStatus === "APPROVED").length}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Rejected: <strong className="text-rose-700">{suppliers.filter((s) => s.approvalStatus === "REJECTED").length}</strong></span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loadingSuppliers ? (
              <LoadingState message="Loading supplier records..." />
            ) : filteredSuppliers.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="No suppliers found" description="No supplier records match your criteria." />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Supplier / Business</th>
                    <th className="px-6 py-4">Contact Person</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Performance</th>
                    <th className="px-6 py-4">Approval Status</th>
                    <th className="px-6 py-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredSuppliers.map((s) => {
                    const isActioning = actioningId === (s.id || s._id);
                    const isPending = (s.approvalStatus || "PENDING") === "PENDING";
                    const isApproved = s.approvalStatus === "APPROVED";
                    const isRejected = s.approvalStatus === "REJECTED";

                    return (
                      <tr key={s.id || s._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{s.businessName || s.supplierName}</div>
                          {s.businessName && s.supplierName && s.businessName !== s.supplierName && (
                            <div className="text-xs text-slate-500">{s.supplierName}</div>
                          )}
                          <div className="text-xs text-slate-400 mt-0.5">{s.email || "-"}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div>{s.contactPerson || "-"}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{s.phone || "-"}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            <span>{[s.city, s.state].filter(Boolean).join(", ") || "India"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <div>Score: <strong className="text-slate-900">{s.reliabilityScore || 0}%</strong></div>
                          <div>Rating: <strong className="text-amber-600">{s.rating || 0} ★</strong></div>
                          <div>Lead time: <strong>{s.leadTimeDays || 0}d</strong></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ApprovalStatusBadge status={s.approvalStatus} />
                          {s.approvalReason && (
                            <div className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={s.approvalReason}>
                              {s.approvalReason}
                            </div>
                          )}
                          {s.approvedAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Approved: {formatDateOnly(s.approvedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleSupplierApproval(s.id || s._id, "APPROVED")}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <CheckCircle2 size={14} />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => openRejectModal("supplier", s)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => openRejectModal("supplier", s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Revoke Approval
                              </button>
                            )}

                            {isRejected && (
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => handleSupplierApproval(s.id || s._id, "APPROVED")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Re-approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: RETAILERS                                         */}
      {/* ======================================================== */}
      {activeTab === "retailers" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header & Controls */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Store className="text-primary-600" size={22} />
                <h3 className="text-lg font-bold text-slate-900">Retailers Governance</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Review all registered retailers. Only <strong>APPROVED</strong> retailers can generate purchase orders, place payments, and trade.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search retailer, contact, city..."
                  className="w-full sm:w-60 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  value={retailerSearchTerm}
                  onChange={(e) => setRetailerSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative flex items-center">
                <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={15} />
                <select
                  className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                  value={retailerStatusFilter}
                  onChange={(e) => setRetailerStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Approval ({pendingRetailersCount})</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Retailer Metrics Chips */}
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200/60 flex items-center gap-4 flex-wrap text-xs font-semibold text-slate-600">
            <span>Total Retailers: <strong className="text-slate-900">{retailers.length}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Pending Review: <strong className="text-amber-600">{pendingRetailersCount}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Approved: <strong className="text-emerald-700">{retailers.filter((r) => r.approvalStatus === "APPROVED").length}</strong></span>
            <span className="text-slate-300">|</span>
            <span>Rejected: <strong className="text-rose-700">{retailers.filter((r) => r.approvalStatus === "REJECTED").length}</strong></span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loadingRetailers ? (
              <LoadingState message="Loading retailer records..." />
            ) : filteredRetailers.length === 0 ? (
              <EmptyState icon={Store} title="No retailers found" description="No retailer records match your criteria." />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Retailer Store</th>
                    <th className="px-6 py-4">Contact Details</th>
                    <th className="px-6 py-4">Delivery Address</th>
                    <th className="px-6 py-4">Approval Status</th>
                    <th className="px-6 py-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredRetailers.map((r) => {
                    const isActioning = actioningId === (r.id || r._id);
                    const isPending = (r.approvalStatus || "PENDING") === "PENDING";
                    const isApproved = r.approvalStatus === "APPROVED";
                    const isRejected = r.approvalStatus === "REJECTED";

                    return (
                      <tr key={r.id || r._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{r.businessName || r.name}</div>
                          {r.businessName && r.name && r.businessName !== r.name && (
                            <div className="text-xs text-slate-500">{r.name}</div>
                          )}
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">{r.clerkUserId}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div>{r.contactPerson || "-"}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{r.email || "-"}</div>
                          <div className="text-xs text-slate-400">{r.phone || "-"}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            <span>{[r.city, r.state].filter(Boolean).join(", ") || r.address?.city || "India"}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                            {r.address?.addressLine1 || r.addressLine1 || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <ApprovalStatusBadge status={r.approvalStatus} />
                          {r.approvalReason && (
                            <div className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={r.approvalReason}>
                              {r.approvalReason}
                            </div>
                          )}
                          {r.approvedAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Approved: {formatDateOnly(r.approvedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => handleRetailerApproval(r.id || r._id, "APPROVED")}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <CheckCircle2 size={14} />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={isActioning}
                                  onClick={() => openRejectModal("retailer", r)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => openRejectModal("retailer", r)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Revoke Approval
                              </button>
                            )}

                            {isRejected && (
                              <button
                                type="button"
                                disabled={isActioning}
                                onClick={() => handleRetailerApproval(r.id || r._id, "APPROVED")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Re-approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: TRANSACTIONS                                      */}
      {/* ======================================================== */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header & Controls */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="text-primary-600" size={22} />
                <h3 className="text-lg font-bold text-slate-900">B2B Transaction Monitoring</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Real-time audit log: <strong>Retailer → Supplier</strong>. Identifies which retailer paid which supplier for every purchase order.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search retailer, supplier, PO or Tx ID..."
                  className="w-full sm:w-72 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  value={txSearchTerm}
                  onChange={(e) => setTxSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative flex items-center">
                <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={15} />
                <select
                  className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary Banner */}
          {summary && (
            <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200/60 flex items-center gap-4 flex-wrap text-xs font-semibold text-slate-600">
              <span>Total Transactions: <strong className="text-slate-900">{summary.totalTransactions}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Paid Value: <strong className="text-emerald-700">{formatCurrency(summary.successfulPaymentValue)}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Pending Balance: <strong className="text-amber-700">{formatCurrency(summary.pendingPayoutValue)}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Settled Balance: <strong className="text-blue-700">{formatCurrency(summary.completedPayoutValue)}</strong></span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loadingTransactions ? (
              <LoadingState message="Fetching system transactions..." />
            ) : filteredTransactions.length === 0 ? (
              <EmptyState icon={FileSpreadsheet} title="No transaction records" description="Transactions will appear here once retailers process payments." />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Retailer → Supplier Relationship</th>
                    <th className="px-6 py-4">Order / PO</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment Status</th>
                    <th className="px-6 py-4">Date / Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.paymentTransactionId || tx._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{tx.retailerName}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-xs font-bold border border-primary-100">
                            PAID TO <ArrowRight size={12} className="ml-1" />
                          </span>
                          <span className="font-bold text-indigo-700">{tx.supplierName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>Retailer Email: {tx.retailerEmail || "-"}</span>
                          <span>·</span>
                          <span>PO Status: <strong className="text-slate-600 uppercase">{tx.orderStatus}</strong></span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-primary-700 bg-primary-50/80 px-2.5 py-1 rounded-md text-xs border border-primary-200">
                          {tx.poNumber}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 text-base">
                          {formatCurrency(tx.amount)}
                        </div>
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider">{tx.currency || "INR"}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge value={tx.paymentStatus} />
                        {tx.transferStatus && (
                          <div className="text-[11px] text-slate-400 mt-1">
                            Transfer: {tx.transferStatus}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <div className="font-medium text-slate-700">{formatDate(tx.createdAt)}</div>
                        <div className="font-mono text-[11px] text-slate-400 mt-1 bg-slate-100 px-2 py-0.5 rounded w-fit border border-slate-200">
                          {tx.razorpayPaymentId || tx.paymentTransactionId || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SYSTEM HEALTH                                     */}
      {/* ======================================================== */}
      {activeTab === "health" && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="text-primary-600" size={24} />
                <h3 className="text-xl font-bold text-slate-900">System Health & Live Infrastructure Diagnostics</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Real-time operational monitoring for Backend API, MongoDB Database, Razorpay Gateway, and Transaction Ledger.
              </p>
            </div>

            <button
              type="button"
              disabled={loadingHealth}
              onClick={loadSystemHealth}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-md shadow-primary-600/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={16} className={loadingHealth ? "animate-spin" : ""} />
              {loadingHealth ? "Running Diagnostics..." : "Refresh Diagnostics"}
            </button>
          </div>

          {loadingHealth && !systemHealth ? (
            <LoadingState message="Conducting real-time system ping and status verification..." />
          ) : !systemHealth ? (
            <EmptyState
              icon={Activity}
              title="Health data unavailable"
              description="Unable to load diagnostics. Click refresh to retry."
              action={
                <button
                  type="button"
                  onClick={loadSystemHealth}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold cursor-pointer"
                >
                  Run Diagnostics
                </button>
              }
            />
          ) : (
            <>
              {/* 4 Cards Diagnostic Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. API Server */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Server size={22} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Operational
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Backend Express API</h4>
                    <p className="text-xs text-slate-500 mt-1">Platform microservice running smoothly</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Process Uptime:</span>
                      <strong className="text-slate-900">{systemHealth.api?.uptimeFormatted}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Memory Heap:</span>
                      <strong className="text-slate-900">{systemHealth.api?.memoryUsage?.heapUsedMb} MB</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Node Runtime:</span>
                      <strong className="text-slate-900">{systemHealth.api?.nodeVersion}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Environment:</span>
                      <strong className="text-slate-900 uppercase">{systemHealth.api?.environment}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. MongoDB Database */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Database size={22} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">MongoDB Database</h4>
                    <p className="text-xs text-slate-500 mt-1">Live connection & index health verified</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Roundtrip Latency:</span>
                      <strong className="text-emerald-700 font-bold">{systemHealth.database?.pingLatencyMs} ms</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Database Name:</span>
                      <strong className="text-slate-900">{systemHealth.database?.databaseName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Host:</span>
                      <strong className="text-slate-900 max-w-[140px] truncate" title={systemHealth.database?.host}>
                        {systemHealth.database?.host}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Collections:</span>
                      <strong className="text-slate-900">8 Collections</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Razorpay Payments */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <CreditCard size={22} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Razorpay Payment Gateway</h4>
                    <p className="text-xs text-slate-500 mt-1">Orders API and vendor transfers active</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gateway Ping:</span>
                      <strong className="text-blue-700 font-bold">{systemHealth.payment?.latencyMs} ms</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mode:</span>
                      <strong className="text-slate-900 uppercase">{systemHealth.payment?.mode} MODE</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">API Key:</span>
                      <strong className="font-mono text-slate-900">{systemHealth.payment?.keyId}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payout Ledger:</span>
                      <strong className="text-slate-900">Synced</strong>
                    </div>
                  </div>
                </div>

                {/* 4. Transactions System */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                        <TrendingUp size={22} />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Healthy
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Transaction Pipeline</h4>
                    <p className="text-xs text-slate-500 mt-1">Retailer → Supplier order payment health</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Success Rate:</span>
                      <strong className="text-emerald-700 font-bold">{systemHealth.transactions?.successRatePercentage}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Paid / Total:</span>
                      <strong className="text-slate-900">
                        {systemHealth.transactions?.paidTransactions} / {systemHealth.transactions?.totalTransactions}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pending:</span>
                      <strong className="text-amber-700">{systemHealth.transactions?.pendingTransactions}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Failed / Exception:</span>
                      <strong className="text-rose-700">{systemHealth.transactions?.failedTransactions}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Database Collections Real Statistics Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Live Database Collections Volume</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Real document metrics queried directly from MongoDB Atlas</p>
                  </div>
                  <span className="text-xs text-slate-400">Checked: {formatDate(systemHealth.timestamp)}</span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Clerk Platform Users</p>
                      <h5 className="text-2xl font-extrabold text-slate-900 mt-1">{systemHealth.database?.collections?.registeredUsers || 0}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Suppliers</p>
                      <h5 className="text-2xl font-extrabold text-blue-700 mt-1">{systemHealth.database?.collections?.suppliers || 0}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Retailers</p>
                      <h5 className="text-2xl font-extrabold text-emerald-700 mt-1">{systemHealth.database?.collections?.retailers || 0}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Purchase Orders</p>
                      <h5 className="text-2xl font-extrabold text-primary-700 mt-1">{systemHealth.database?.collections?.purchaseOrders || 0}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Payment Transactions</p>
                      <h5 className="text-2xl font-extrabold text-indigo-700 mt-1">{systemHealth.database?.collections?.paymentTransactions || 0}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Inventory SKUs</p>
                      <h5 className="text-2xl font-extrabold text-slate-900 mt-1">{systemHealth.database?.collections?.inventoryItems || 0}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Historical Sales</p>
                      <h5 className="text-2xl font-extrabold text-slate-900 mt-1">{systemHealth.database?.collections?.salesRecords || 0}</h5>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Supplier Payouts</p>
                      <h5 className="text-2xl font-extrabold text-amber-700 mt-1">{systemHealth.database?.collections?.supplierPayouts || 0}</h5>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
        title={`Reject ${rejectModal.type === "supplier" ? "Supplier" : "Retailer"} Application`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are rejecting the registration application for <strong className="text-slate-900">{rejectModal.name}</strong>.
            Please provide the reason that will be displayed to the user:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rejection Reason / Verification Feedback:
            </label>
            <textarea
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              placeholder="e.g. Incomplete business address or KYC documentation..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
              onClick={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-sm cursor-pointer"
              onClick={confirmReject}
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}