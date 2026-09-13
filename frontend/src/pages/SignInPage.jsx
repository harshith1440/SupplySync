import { Navigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/react";

function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  // Already signed in → determine dashboard from role
  if (isSignedIn) {
    return <Navigate to="/auth-redirect" replace />;
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      forceRedirectUrl="/auth-redirect"
    />
  );
}

export default SignInPage;