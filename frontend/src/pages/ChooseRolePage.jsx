import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, useOrganizationList } from "@clerk/react";
import { Store, Building2, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { ErrorAlert, LoadingState } from "../components/UIComponents";

function ChooseRolePage() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    supplierName: "",
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
    },
  });

  const navigate = useNavigate();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { setActive } = useOrganizationList();

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingState message="Loading role setup..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  const handleContinue = async () => {
    if (!role) {
      setMessage("Please select a role to continue.");
      return;
    }

    try {
      const requiredValues = [
        role === "supplier" ? profile.supplierName : profile.businessName,
        profile.contactPerson,
        profile.email,
        profile.phone,
        profile.address.addressLine1,
        profile.address.city,
        profile.address.state,
        profile.address.pincode,
        profile.address.country,
      ];
      if (requiredValues.some((value) => !String(value || "").trim())) {
        setMessage("Complete all required profile and delivery details before continuing.");
        return;
      }

      setLoading(true);
      setMessage("");

      const token = await getToken();
      if (!token) {
        throw new Error("Clerk session token was not available. Please sign in again.");
      }

      const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      let response;
      try {
        response = await fetch(`${apiBaseUrl}/api/users/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, profile }),
        });
      } catch (networkError) {
        console.error("Role assignment network error", {
          endpoint: `${apiBaseUrl}/api/users/role`,
          method: "POST",
          cause: networkError,
        });
        throw new Error(`Unable to reach the SupplySync API at ${apiBaseUrl}. Start the backend and try again.`);
      }

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("Role assignment returned non-JSON response", {
          status: response.status,
          body: responseText,
          cause: parseError,
        });
        throw new Error(`Onboarding failed with HTTP ${response.status}: the API returned an invalid response.`);
      }

      if (!response.ok) {
        console.error("Role assignment API error", {
          status: response.status,
          statusText: response.statusText,
          body: data,
        });
        throw new Error(data.message || `Onboarding failed with HTTP ${response.status}.`);
      }

      if (data.organizationId && setActive) {
        await setActive({
          organization: data.organizationId,
        });
      }

      if (role === "retailer") {
        navigate("/retailer", { replace: true });
      } else {
        navigate("/supplier", { replace: true });
      }
    } catch (error) {
      console.error("Role assignment failed:", error);
      setMessage(error.message || "Something went wrong while setting role.");
    } finally {
      setLoading(false);
    }
  };

  function updateProfileField(field, value) {
    setProfile((previous) => ({ ...previous, [field]: value }));
  }

  function updateAddressField(field, value) {
    setProfile((previous) => ({
      ...previous,
      address: { ...previous.address, [field]: value },
    }));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--slate-900)",
        padding: "24px",
      }}
    >
      <div className="card" style={{ maxWidth: "640px", width: "100%", padding: "36px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            className="brand-logo-icon"
            style={{ width: "52px", height: "56px", margin: "0 auto 16px", borderRadius: "var(--radius-lg)" }}
          >
            <Zap size={28} />
          </div>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>Select Your Role</h2>
          <p className="text-sm text-muted">
            Choose how you will be using SupplySync AI to configure your workspace.
          </p>
        </div>

        {message && <ErrorAlert message={message} />}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          {/* RETAILER CARD */}
          <div
            onClick={() => !loading && setRole("retailer")}
            style={{
              padding: "24px",
              borderRadius: "var(--radius-xl)",
              border: role === "retailer" ? "2px solid var(--primary-600)" : "1px solid var(--slate-200)",
              backgroundColor: role === "retailer" ? "var(--primary-50)" : "white",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all var(--transition-fast)",
              position: "relative",
            }}
          >
            {role === "retailer" && (
              <CheckCircle2
                size={20}
                style={{ position: "absolute", top: "16px", right: "16px", color: "var(--primary-600)" }}
              />
            )}
            <div className="stat-icon-wrapper primary" style={{ marginBottom: "16px" }}>
              <Store size={24} />
            </div>
            <h3 style={{ marginBottom: "6px" }}>Retailer</h3>
            <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              Manage inventory stock, track expiration dates, forecast AI demand, and order from suppliers with Razorpay payments.
            </p>
          </div>

          {/* SUPPLIER CARD */}
          <div
            onClick={() => !loading && setRole("supplier")}
            style={{
              padding: "24px",
              borderRadius: "var(--radius-xl)",
              border: role === "supplier" ? "2px solid var(--primary-600)" : "1px solid var(--slate-200)",
              backgroundColor: role === "supplier" ? "var(--primary-50)" : "white",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all var(--transition-fast)",
              position: "relative",
            }}
          >
            {role === "supplier" && (
              <CheckCircle2
                size={20}
                style={{ position: "absolute", top: "16px", right: "16px", color: "var(--primary-600)" }}
              />
            )}
            <div className="stat-icon-wrapper success" style={{ marginBottom: "16px" }}>
              <Building2 size={24} />
            </div>
            <h3 style={{ marginBottom: "6px" }}>Supplier</h3>
            <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              List products & pricing, fulfill incoming purchase orders from retailers, and track internal payout ledgers.
            </p>
          </div>
        </div>

        {role && (
          <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              {role === "supplier" ? "Supplier Profile Setup" : "Retailer Profile Setup"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <label className="text-sm font-semibold text-slate-700">
                {role === "supplier" ? "Supplier / Shop Name *" : "Business / Shop Name *"}
                <input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={role === "supplier" ? profile.supplierName : profile.businessName} onChange={(event) => updateProfileField(role === "supplier" ? "supplierName" : "businessName", event.target.value)} required />
              </label>
              <label className="text-sm font-semibold text-slate-700">Contact Person *<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.contactPerson} onChange={(event) => updateProfileField("contactPerson", event.target.value)} required /></label>
              <label className="text-sm font-semibold text-slate-700">Email *<input type="email" className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.email} onChange={(event) => updateProfileField("email", event.target.value)} required /></label>
              <label className="text-sm font-semibold text-slate-700">Phone *<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.phone} onChange={(event) => updateProfileField("phone", event.target.value)} required /></label>
              <label className="text-sm font-semibold text-slate-700">Address Line 1 *<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.address.addressLine1} onChange={(event) => updateAddressField("addressLine1", event.target.value)} required /></label>
              <label className="text-sm font-semibold text-slate-700">Address Line 2<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.address.addressLine2} onChange={(event) => updateAddressField("addressLine2", event.target.value)} /></label>
              <label className="text-sm font-semibold text-slate-700">City *<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.address.city} onChange={(event) => updateAddressField("city", event.target.value)} required /></label>
              <label className="text-sm font-semibold text-slate-700">State *<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.address.state} onChange={(event) => updateAddressField("state", event.target.value)} required /></label>
              <label className="text-sm font-semibold text-slate-700">Pincode *<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.address.pincode} onChange={(event) => updateAddressField("pincode", event.target.value)} required /></label>
              <label className="text-sm font-semibold text-slate-700">Country *<input className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" value={profile.address.country} onChange={(event) => updateAddressField("country", event.target.value)} required /></label>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-gradient btn-lg"
          style={{ width: "100%" }}
          onClick={handleContinue}
          disabled={loading || !role}
        >
          {loading ? (
            <>
              <span className="spinner" />
              <span>Assigning Workspace...</span>
            </>
          ) : (
            <>
              <span>Continue to Workspace</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ChooseRolePage;