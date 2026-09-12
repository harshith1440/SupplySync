import { SignUp } from "@clerk/react";

function SignUpPage() {
  return (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      forceRedirectUrl="/choose-role"
    />
  );
}

export default SignUpPage;