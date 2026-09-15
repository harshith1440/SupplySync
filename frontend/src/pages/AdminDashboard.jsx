import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import {
  StatCard,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorAlert,
} from "../components/UIComponents";
import { getAdminTransactions } from "../api/adminTransactionApi";

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

function AdminDashboard() {
  const { getToken } = useAuth();

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminTransactions(getToken);
      setSummary(data.summary || null);
      setTransactions(data.transactions || []);
    } catch (requestError) {
      console.error("Admin transaction error:", requestError);
      setError(requestError.message || "Failed to load admin transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [getToken]);

  const navItems = [
    { id: "overview", label: "Transactions & Payments", icon: CreditCard },
  ];

  const filteredTransactions = transactions.filter((t) => {
    const search = searchTerm.toLowerCase().trim();
    const matchesSearch =
      (t.poNumber && t.poNumber.toLowerCase().includes(search)) ||
      (t.retailerName && t.retailerName.toLowerCase().includes(search)) ||
      (t.retailerEmail && t.retailerEmail.toLowerCase().includes(search)) ||
      (t.supplierName && t.supplierName.toLowerCase().includes(search)) ||
      (t.razorpayPaymentId && t.razorpayPaymentId.toLowerCase().includes(search));

    const matchesStatus =
      statusFilter === "all" ||
      (t.paymentStatus && t.paymentStatus.toLowerCase() === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout
      role="admin"
      title="Admin Dashboard"
      subtitle="Financial Transactions, Razorpay Payments & Payout Ledgers"
      navItems={navItems}
      activeNav="overview"
      onRefresh={loadTransactions}
      refreshing={loading}
    >
      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={loadTransactions} /></div>}

      {/* KPI SUMMARY CARDS GRID */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard
            title="Total Transactions"
            value={summary.totalTransactions || 0}
            icon={CreditCard}
            variant="primary"
          />
          <StatCard
            title="Total Payment Value"
            value={formatCurrency(summary.totalPaymentValue)}
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="Successful Value"
            value={formatCurrency(summary.successfulPaymentValue)}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="Pending Payout"
            value={formatCurrency(summary.pendingPayoutValue)}
            icon={AlertTriangle}
            variant="warning"
          />
        </div>
      )}

      {/* MONITORING METRICS ROW */}
      {summary && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">Payout & Exception Status</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
              <p className="text-sm font-medium text-rose-600 mb-1">Failed Payments</p>
              <h4 className="text-2xl font-bold text-rose-700">{summary.failedPayments || 0}</h4>
            </div>
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
              <p className="text-sm font-medium text-sky-600 mb-1">Refunded Payments</p>
              <h4 className="text-2xl font-bold text-sky-700">{summary.refundedPayments || 0}</h4>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-sm font-medium text-amber-600 mb-1">Pending Payout Balance</p>
              <h4 className="text-2xl font-bold text-amber-700">{formatCurrency(summary.pendingPayoutValue)}</h4>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-sm font-medium text-emerald-600 mb-1">Settled Payout Balance</p>
              <h4 className="text-2xl font-bold text-emerald-700">{formatCurrency(summary.completedPayoutValue)}</h4>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS SECTION */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Payment Transactions</h3>
            <p className="text-sm text-slate-500 mt-1">
              Showing {filteredTransactions.length} of {transactions.length} recorded payments
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
                placeholder="Search PO, Retailer, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative flex items-center">
              <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
              <select
                className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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

        <div className="overflow-x-auto">
          {loading ? (
            <LoadingState message="Fetching system transactions..." />
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No transactions found"
              description={
                searchTerm || statusFilter !== "all"
                  ? "No records match your search query or filter."
                  : "There are no payment transactions recorded in the platform."
              }
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transfer / Payout</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.paymentTransactionId || t._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-md text-sm border border-primary-100">
                        {t.poNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{t.retailerName}</div>
                      {t.retailerEmail && <div className="text-xs text-slate-500 mt-0.5">{t.retailerEmail}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{t.supplierName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 items-start">
                        <StatusBadge value={t.paymentStatus} />
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">{t.razorpayPaymentId || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2 items-start">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 w-16">Transfer:</span>
                          <StatusBadge value={t.transferStatus} />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 w-16">Payout:</span>
                          {t.payout ? (
                            <StatusBadge value={t.payout.status} />
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;