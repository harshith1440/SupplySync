import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@clerk/react";

import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ChooseRolePage from "./pages/ChooseRolePage";

import AdminDashboard from "./pages/AdminDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import SupplierDashboard from "./pages/SupplierDashboard";

function Home() {
  const { isLoaded, isSignedIn, orgRole } = useAuth();

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  // Not signed in → authentication page
  if (!isSignedIn) {
    return (
      <div>
        <h1>SupplySync AI</h1>
        <p>Retail Inventory & Procurement Assistant</p>

        <button onClick={() => (window.location.href = "/sign-in")}>
          Sign In
        </button>

        <button onClick={() => (window.location.href = "/sign-up")}>
          Sign Up
        </button>
      </div>
    );
  }

  // Already signed in → go directly to dashboard
  if (orgRole === "org:admin") {
    return <Navigate to="/admin" replace />;
  }

  if (orgRole === "org:retailer") {
    return <Navigate to="/retailer" replace />;
  }

  if (orgRole === "org:supplier") {
    return <Navigate to="/supplier" replace />;
  }

  // No role yet.
  // We DO NOT automatically send existing signed-in users here.
  return (
    <div>
      <h1>Welcome to SupplySync AI</h1>
      <p>Your account is authenticated.</p>
      <p>Your role has not been assigned yet.</p>
      <p>Please contact the administrator.</p>
    </div>
  );
}

function ProtectedRoute({ allowedRole, children }) {
  const { isLoaded, isSignedIn, orgRole } = useAuth();

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (orgRole !== allowedRole) {
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
          <ProtectedRoute allowedRole="org:retailer">
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