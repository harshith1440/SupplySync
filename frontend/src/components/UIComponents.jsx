import React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export function StatCard({ title, value, icon: Icon, variant = "primary", subtitle }) {
  const variantStyles = {
    primary: "bg-primary-50 text-primary-900 border-primary-100",
    success: "bg-emerald-50 text-emerald-900 border-emerald-100",
    warning: "bg-amber-50 text-amber-900 border-amber-100",
    danger: "bg-rose-50 text-rose-900 border-rose-100",
    info: "bg-sky-50 text-sky-900 border-sky-100",
  };
  
  const iconWrapperStyles = {
    primary: "bg-primary-100 text-primary-600",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    danger: "bg-rose-100 text-rose-600",
    info: "bg-sky-100 text-sky-600",
  };

  return (
    <div className={`p-5 rounded-2xl border ${variantStyles[variant] || variantStyles.primary} shadow-sm transition-transform hover:-translate-y-1 min-h-[128px]`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {subtitle && (
            <p className="text-xs opacity-70 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconWrapperStyles[variant] || iconWrapperStyles.primary}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}

export function statusLabel(status) {
  if (!status) return "-";
  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function StatusBadge({ value, customClass }) {
  if (!value) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">-</span>;

  const valLower = String(value).toLowerCase();

  let variantClass = "bg-slate-100 text-slate-700 border-slate-200";
  let dotClass = "bg-slate-400";
  
  if (["paid", "completed", "active", "delivered", "normal", "success", "approved"].includes(valLower)) {
    variantClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotClass = "bg-emerald-500";
  } else if (["pending", "expiring_soon", "transferred", "created", "processing"].includes(valLower)) {
    variantClass = "bg-amber-50 text-amber-700 border-amber-200";
    dotClass = "bg-amber-500";
  } else if (["failed", "expired", "cancelled", "low_stock", "out_of_stock", "inactive", "rejected"].includes(valLower)) {
    variantClass = "bg-rose-50 text-rose-700 border-rose-200";
    dotClass = "bg-rose-500";
  } else if (["refunded", "initiated"].includes(valLower)) {
    variantClass = "bg-sky-50 text-sky-700 border-sky-200";
    dotClass = "bg-sky-500";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${variantClass} ${customClass || ""}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {statusLabel(value)}
    </span>
  );
}

export function LoadingState({ message = "Loading data..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin mb-4" role="status" aria-label="Loading" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Info, title = "No data found", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 border-dashed rounded-xl">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-4">
        <Icon size={24} />
      </div>
      <h4 className="text-base font-semibold text-slate-900 mb-1">{title}</h4>
      {description && <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorAlert({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex gap-3 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-900">
      <AlertCircle size={20} className="shrink-0 mt-0.5 text-rose-600" />
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-rose-900">Action Failed</p>
        <p className="text-sm text-rose-700 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          className="px-3 py-1.5 h-fit text-xs font-medium bg-white border border-rose-200 text-rose-700 rounded-lg shadow-sm hover:bg-rose-50 transition-colors"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function SuccessAlert({ message }) {
  if (!message) return null;
  return (
    <div className="flex gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900">
      <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-emerald-900">Success</p>
        <p className="text-sm text-emerald-700 mt-1">{message}</p>
      </div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
