import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import "./index.css";
import App from "./App.jsx";

function Root() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
    routerPush={(to) => navigate(to)}
    routerReplace={(to) => navigate(to, { replace: true })}
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
    signInFallbackRedirectUrl="/"
    signUpFallbackRedirectUrl="/choose-role"
    signUpForceRedirectUrl="/choose-role"
  >
    <App />
  </ClerkProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
);