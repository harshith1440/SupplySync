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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <section className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:w-[52%] lg:flex-col lg:justify-between xl:px-16">
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-900/40">
              S
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">SupplySync AI</p>
              <p className="text-[11px] font-medium text-slate-400">AI Procurement Platform</p>
            </div>
          </div>

          <div className="relative z-10 max-w-xl py-12">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
              Procurement intelligence
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Smarter Procurement. Better Supply.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
              Real-time supplier visibility and AI-powered procurement intelligence for modern retailers.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Real-Time Inventory Visibility",
                "AI Demand Forecasting",
                "Smart Supplier Recommendations",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-xs text-blue-300 ring-1 ring-inset ring-blue-400/30">
                    ✓
                  </span>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px w-8 bg-slate-700" />
            Built for confident retail operations
          </div>

          <div className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full border border-blue-400/10">
            <div className="absolute inset-12 rounded-full border border-blue-400/10" />
            <div className="absolute inset-24 rounded-full border border-blue-400/10" />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400 shadow-[0_0_45px_12px_rgba(96,165,250,0.35)]" />
            <div className="absolute left-16 top-20 h-2 w-2 rounded-full bg-blue-300" />
            <div className="absolute bottom-24 right-12 h-2 w-2 rounded-full bg-slate-400" />
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 lg:w-[48%] lg:px-12">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/20">
              S
            </div>
            <p className="text-lg font-bold tracking-tight text-slate-900">SupplySync AI</p>
          </div>

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                Welcome back
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Sign in to SupplySync AI
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Access your inventory and procurement workspace.
              </p>
            </div>

            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl="/auth-redirect"
            />
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Secure access for SupplySync AI workspaces
          </p>
        </section>
      </div>
    </main>
  );
}

export default SignInPage;