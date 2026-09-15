import React from "react";
import { useAuth, UserButton } from "@clerk/react";
import { Link } from "react-router-dom";
import { 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Store, 
  Building2, 
  TrendingUp, 
  Package, 
  CreditCard,
  Clock
} from "lucide-react";
import { StatCard } from "../components/UIComponents";

export default function MainDashboard() {
  const { orgRole } = useAuth();
  
  let dashboardPath = null;
  let dashboardName = null;
  let RoleIcon = Store;
  
  if (orgRole === "org:admin") {
    dashboardPath = "/admin";
    dashboardName = "Admin Console";
    RoleIcon = ShieldCheck;
  } else if (orgRole === "org:retailer") {
    dashboardPath = "/retailer";
    dashboardName = "Retailer Portal";
    RoleIcon = Store;
  } else if (orgRole === "org:supplier") {
    dashboardPath = "/supplier";
    dashboardName = "Supplier Hub";
    RoleIcon = Building2;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/20">
            <Zap size={22} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SupplySync AI</h1>
            <p className="text-xs font-medium text-slate-500">Enterprise Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 mt-2 text-lg">Here is an overview of your SupplySync AI workspace.</p>
        </div>

        {/* Action Banner */}
        {dashboardPath ? (
          <div className="bg-gradient-to-r from-primary-900 to-indigo-900 rounded-3xl p-8 lg:p-10 text-white shadow-xl shadow-primary-900/20 mb-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute top-0 right-0 -mt-16 -mr-16 text-primary-800 opacity-50">
              <RoleIcon size={300} />
            </div>
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mb-4 backdrop-blur-md border border-white/10 uppercase tracking-widest">
                Active Role: {orgRole.replace("org:", "")}
              </span>
              <h3 className="text-3xl font-bold mb-3">Enter your {dashboardName}</h3>
              <p className="text-primary-100 text-lg mb-0 leading-relaxed">
                Access your operational tools, manage inventory, handle purchase orders, and monitor your business analytics.
              </p>
            </div>
            <div className="relative z-10 shrink-0 w-full md:w-auto">
              <Link to={dashboardPath}>
                <button className="w-full md:w-auto px-8 py-4 bg-white text-primary-900 hover:bg-slate-50 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer">
                  <RoleIcon size={24} />
                  Open Workspace
                  <ArrowRight size={20} />
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 lg:p-10 text-white shadow-xl shadow-amber-900/20 mb-10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="relative z-10 max-w-xl">
              <h3 className="text-3xl font-bold mb-3">Role Assignment Required</h3>
              <p className="text-amber-100 text-lg mb-0 leading-relaxed">
                You have not selected an organizational role yet. Please choose whether you are a Retailer or a Supplier to continue using SupplySync AI.
              </p>
            </div>
            <div className="relative z-10 shrink-0 w-full md:w-auto">
              <Link to="/choose-role">
                <button className="w-full md:w-auto px-8 py-4 bg-white text-amber-900 hover:bg-slate-50 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer">
                  Choose Role Now
                  <ArrowRight size={20} />
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Global Overview Section (Mocked Enterprise Data) */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Network Overview</h3>
          <span className="text-sm font-medium text-slate-500">Live Platform Stats</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard 
            title="Total Active Users" 
            value="12,492" 
            icon={Store} 
            variant="primary" 
            subtitle="+14% from last month"
          />
          <StatCard 
            title="Avg PO Fulfillment" 
            value="2.4 Days" 
            icon={Clock} 
            variant="success" 
            subtitle="Industry avg: 5.1 Days"
          />
          <StatCard 
            title="AI Forecast Accuracy" 
            value="94.2%" 
            icon={TrendingUp} 
            variant="info" 
            subtitle="Based on last 30 days"
          />
          <StatCard 
            title="Total Processing Volume" 
            value="₹42.8M" 
            icon={CreditCard} 
            variant="warning" 
            subtitle="Secure via Razorpay"
          />
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-start hover:border-primary-300 transition-colors">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Predictive Forecasting</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Leverage our advanced ML models to predict next 7-day inventory demand based on historical sales data.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-start hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Package size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Automated Procurement</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Intelligent supplier matching algorithm finds the best supplier based on price, delivery time, and reliability score.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-start hover:border-sky-300 transition-colors">
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Secure Payments</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Integrated Razorpay gateway for seamless B2B transactions with automated ledger tracking and transparent payouts.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
