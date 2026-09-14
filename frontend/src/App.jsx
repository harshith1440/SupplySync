import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/react";

import AuthRedirectPage from "./pages/AuthRedirectPage";
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

  // User is NOT signed in
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

  // User IS signed in
  let dashboardPath = null;
  let dashboardName = null;

  if (orgRole === "org:admin") {
    dashboardPath = "/admin";
    dashboardName = "Admin Dashboard";
  }

  if (orgRole === "org:retailer") {
    dashboardPath = "/retailer";
    dashboardName = "Retailer Dashboard";
  }

  if (orgRole === "org:supplier") {
    dashboardPath = "/supplier";
    dashboardName = "Supplier Dashboard";
  }

  return (
    <div>
      <h1>Welcome to SupplySync AI</h1>

      <p>You are signed in.</p>

      {/* Clerk profile / account button */}
      <UserButton />

      {dashboardPath ? (
        <div>
          <p>Your role: {orgRole}</p>

          <Link to={dashboardPath}>
            <button>{`Go to ${dashboardName}`}</button>
          </Link>
        </div>
      ) : (
        <div>
          <p>Your account does not have a role yet.</p>

          <Link to="/choose-role">
            <button>Choose Role</button>
          </Link>
        </div>
      )}
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
      {/* Home */}
      <Route path="/" element={<Home />} />

      {/* Authentication */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/choose-role" element={<ChooseRolePage />} />

      {/* After login */}
      <Route path="/auth-redirect" element={<AuthRedirectPage />} />

      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="org:admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Retailer Dashboard */}
      <Route
        path="/retailer"
        element={
          <ProtectedRoute allowedRole="org:retailer">
            <RetailerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Supplier Dashboard */}
      <Route
        path="/supplier"
        element={
          <ProtectedRoute allowedRole="org:supplier">
            <SupplierDashboard />
          </ProtectedRoute>
        }
      />

      {/* Unknown URL */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;