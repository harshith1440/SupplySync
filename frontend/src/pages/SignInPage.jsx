import React from "react";
import { Navigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/react";
import { Zap } from "lucide-react";
import { LoadingState } from "../components/UIComponents";

function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingState message="Checking session..." />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/auth-redirect" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--slate-900)",
        padding: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <div className="brand-logo-icon">
          <Zap size={22} />
        </div>
        <h2 className="brand-title" style={{ fontSize: "1.5rem" }}>SupplySync AI</h2>
      </div>

      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/auth-redirect"
      />
    </div>
  );
}

export default SignInPage;