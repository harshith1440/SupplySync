import React from "react";
import { SignUp } from "@clerk/react";
import { Zap } from "lucide-react";

function SignUpPage() {
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

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/choose-role"
      />
    </div>
  );
}

export default SignUpPage;