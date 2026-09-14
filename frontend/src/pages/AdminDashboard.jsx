import { useState } from "react";
import { useAuth } from "@clerk/react";
import LogoutButton from "../components/LogoutButton";

function AdminDashboard() {
  const { getToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function createLinkedAccount() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const token = await getToken();

      const response = await fetch(
        "http://localhost:5000/api/payments/suppliers/6aa80f29d681e7d1b1a1de0a/linked-account",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: "supplier.test@example.com",
            phone: "9876543210",
            legalBusinessName: "Sri Lakshmi Wholesale Pvt Ltd",
            customerFacingBusinessName: "Sri Lakshmi Wholesale",
            businessType: "partnership",
            profile: {
              category: "food",
              subcategory: "grocery",
              addresses: {
                registered: {
                  street1: "1 Main Road",
                  street2: "Hyderabad",
                  city: "Hyderabad",
                  state: "Telangana",
                  postal_code: "500001",
                  country: "IN",
                },
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create linked account");
      }

      console.log("Linked account response:", data);

      setMessage(
        `Linked Account created successfully: ${data.razorpayAccount?.id}`
      );
    } catch (error) {
      console.error("Linked account error:", error);
      setError(error.message || "Failed to create linked account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>

      <button
        type="button"
        onClick={createLinkedAccount}
        disabled={loading}
      >
        {loading
          ? "Creating Linked Account..."
          : "Create Razorpay Linked Account"}
      </button>

      {message && <p>{message}</p>}

      {error && <p>{error}</p>}

      <br />

      <LogoutButton />
    </div>
  );
}

export default AdminDashboard;