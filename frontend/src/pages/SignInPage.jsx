import { Navigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/react";

function SignInPage() {
  const { isLoaded, isSignedIn, orgRole } = useAuth();

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  // Already signed in → never show login again
  if (isSignedIn) {
    if (orgRole === "org:admin") {
      return <Navigate to="/admin" replace />;
    }

    if (orgRole === "org:retailer") {
      return <Navigate to="/retailer" replace />;
    }

    if (orgRole === "org:supplier") {
      return <Navigate to="/supplier" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/"
    />
  );
}

export default SignInPage;