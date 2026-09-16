import React from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useAuth } from "@clerk/react";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  PackageCheck,
} from "lucide-react";

import AuthRedirectPage from "./pages/AuthRedirectPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ChooseRolePage from "./pages/ChooseRolePage";

import MainDashboard from "./pages/MainDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";
import { LoadingState } from "./components/UIComponents";

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-primary-500/30 selection:text-white flex flex-col">
      {/* Navigation */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/20">
            <Zap size={22} fill="currentColor" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">SupplySync AI</h2>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/sign-in" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link to="/sign-up">
            <button className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-primary-600/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer">
              Get Started Free <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary-500/10 text-primary-300 border border-primary-500/20 mb-8 backdrop-blur-sm">
          <Zap size={16} className="text-primary-400" /> AI-Powered B2B Supply Chain Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
          Smart Retail Inventory & <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">
            Automated Procurement
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          SupplySync AI bridges retailers and suppliers with 7-day predictive demand forecasting, automated reorder matching, and seamless B2B Razorpay payments.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link to="/sign-up" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white text-lg font-bold rounded-xl shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer">
              Create Free Account <ArrowRight size={20} />
            </button>
          </Link>
          <Link to="/sign-in" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-lg font-bold rounded-xl border border-white/10 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer">
              Sign In to Portal
            </button>
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="px-6 pb-24 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center mb-6 border border-primary-500/30">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">AI Demand Forecasting</h3>
          <p className="text-slate-400 leading-relaxed">
            Analyze historical sales trends to predict next 7 days product demand and proactively prevent costly stockouts.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 border border-emerald-500/30">
            <PackageCheck size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Supplier Matching</h3>
          <p className="text-slate-400 leading-relaxed">
            Auto-calculate safety stock & match optimal suppliers based on competitive pricing, fast lead time & reliability.
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-6 border border-sky-500/30">
            <ShieldCheck size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Integrated Payments</h3>
          <p className="text-slate-400 leading-relaxed">
            Secure online Razorpay payments for purchase orders with automated vendor payout ledger tracking.
          </p>
        </div>
      </section>
    </div>
  );
}

function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Initializing SupplySync AI platform..." />
      </div>
    );
  }

  // User is NOT signed in -> Landing Page
  if (!isSignedIn) {
    return <LandingPage />;
  }

  // User IS signed in -> Main Dashboard
  return <MainDashboard />;
}

function ProtectedRoute({ allowedRole, children }) {
  const { isLoaded, isSignedIn, orgRole } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState message="Authenticating role..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  if (!allowedRoles.includes(orgRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/choose-role" element={<ChooseRolePage />} />
      <Route path="/auth-redirect" element={<AuthRedirectPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="org:admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/retailer"
        element={
          <ProtectedRoute allowedRole={["org:retailer", "org:retailer_admin"]}>
            <RetailerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/supplier"
        element={
          <ProtectedRoute allowedRole="org:supplier">
            <SupplierDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;