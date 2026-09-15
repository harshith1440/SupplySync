import React, { useState } from "react";
import { UserButton, useClerk } from "@clerk/react";
import { 
  Zap, 
  LayoutDashboard, 
  Menu, 
  LogOut,
  RefreshCw
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function DashboardLayout({
  role,
  title,
  subtitle,
  navItems = [],
  activeNav,
  onNavSelect,
  onRefresh,
  refreshing = false,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return { label: "Admin Console", classes: "bg-primary-500/20 text-primary-200 border-primary-500/30" };
      case "retailer":
        return { label: "Retailer Portal", classes: "bg-sky-500/20 text-sky-200 border-sky-500/30" };
      case "supplier":
        return { label: "Supplier Hub", classes: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" };
      default:
        return { label: "Dashboard", classes: "bg-slate-700 text-slate-300 border-slate-600" };
    }
  };

  const roleInfo = getRoleBadge();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/20">
              <Zap size={22} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">SupplySync AI</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border mt-1 ${roleInfo.classes}`}>
                {roleInfo.label}
              </span>
            </div>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Navigation</div>
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon || LayoutDashboard;
              const isActive = activeNav === item.id;
              
              let badgeColor = "bg-slate-800 text-slate-300";
              if (item.badgeClass?.includes("warning") || item.badgeClass?.includes("danger")) {
                badgeColor = "bg-rose-500/20 text-rose-300 border border-rose-500/30";
              } else if (item.badgeClass?.includes("success") || item.badgeClass?.includes("primary")) {
                badgeColor = "bg-primary-500/20 text-primary-300 border border-primary-500/30";
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary-600/10 text-primary-400 font-semibold shadow-inner"
                      : "hover:bg-slate-800/50 hover:text-slate-100"
                  }`}
                  onClick={() => {
                    if (onNavSelect) onNavSelect(item.id);
                    setMobileOpen(false);
                  }}
                >
                  <Icon size={20} className={isActive ? "text-primary-500" : "opacity-70"} />
                  <span className="text-sm text-left leading-5">{item.label}</span>
                  {item.badge != null && (
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <UserButton />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">Account</p>
                <p className="text-xs text-slate-500 truncate">Manage Profile</p>
              </div>
            </div>
            <button
              onClick={() => signOut(() => navigate("/"))}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between shadow-[0_4px_20px_rgba(18,35,51,0.04)]">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm font-medium text-slate-500 hidden sm:block mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onRefresh && (
              <button
                type="button"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin text-primary-500" : ""} />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            )}
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <div className="hidden sm:block">
              <UserButton />
            </div>
          </div>
        </header>

        {/* Page Body Wrapper */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
