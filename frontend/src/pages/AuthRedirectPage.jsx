import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { LoadingState } from "../components/UIComponents";
import { Zap } from "lucide-react";

function AuthRedirectPage() {
  const { isLoaded, isSignedIn, orgRole } = useAuth();

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingState message="Verifying authentication..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (orgRole === "org:admin") {
    return <Navigate to="/admin" replace />;
  }

  if (orgRole === "org:retailer") {
    return <Navigate to="/retailer" replace />;
  }

  if (orgRole === "org:supplier") {
    return <Navigate to="/supplier" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--slate-50)",
        padding: "24px",
      }}
    >
      <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "32px", textAlign: "center" }}>
        <div className="brand-logo-icon" style={{ width: "52px", height: "52px", margin: "0 auto 16px" }}>
          <Zap size={26} />
        </div>
        <h2>Welcome to SupplySync AI</h2>
        <p className="text-sm text-muted" style={{ marginTop: "8px", marginBottom: "24px" }}>
          Your account is authenticated successfully. Please complete your role assignment.
        </p>
        <Navigate to="/choose-role" replace />
      </div>
    </div>
  );
}

export default AuthRedirectPage;