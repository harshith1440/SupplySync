import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth, useOrganizationList } from "@clerk/react";

function ChooseRolePage() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const { isLoaded, isSignedIn, getToken } = useAuth();

  const { setActive } = useOrganizationList();

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  const handleContinue = async () => {
    if (!role) {
      setMessage("Please select a role.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      // Get Clerk session token
      const token = await getToken();

      // Send selected role to backend
      const response = await fetch(
        "http://localhost:5000/api/users/role",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to assign role");
      }

      // Make SupplySync AI the active organization
      if (data.organizationId && setActive) {
        await setActive({
          organization: data.organizationId,
        });
      }

      // Go to correct dashboard
      if (role === "retailer") {
        navigate("/retailer", { replace: true });
      } else {
        navigate("/supplier", { replace: true });
      }
    } catch (error) {
      console.error("Role assignment failed:", error);
      setMessage(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Choose your role</h1>

      <label>
        <input
          type="radio"
          name="role"
          value="retailer"
          checked={role === "retailer"}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
        />
        Retailer
      </label>

      <br />

      <label>
        <input
          type="radio"
          name="role"
          value="supplier"
          checked={role === "supplier"}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
        />
        Supplier
      </label>

      <br />

      <button onClick={handleContinue} disabled={loading}>
        {loading ? "Assigning..." : "Continue"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default ChooseRolePage;