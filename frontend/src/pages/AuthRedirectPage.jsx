import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/react";

function AuthRedirectPage() {
  const { isLoaded, isSignedIn, orgRole } = useAuth();

  if (!isLoaded) {
    return <p>Loading...</p>;
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
    <div>
      <h1>Welcome to SupplySync AI</h1>
      <p>Your account is authenticated.</p>
      <p>Your role has not been assigned yet.</p>
    </div>
  );
}

export default AuthRedirectPage;