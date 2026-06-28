"use client";

import React, { useState, useCallback, use, useMemo, Suspense, startTransition } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Redirect } from "@/components/redirect";
import { LogIn, Mail, Lock, UserPlus, Users, UserCheck, UserMinus, UserCog, Building2, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DepartmentChart } from "@/components/dashboard/department-chart";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { RecentEmployees, type EmployeeSummary } from "@/components/dashboard/recent-employees";
import { QuickAddDialog } from "@/components/dashboard/quick-add-dialog";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

interface DashboardData {
  stats: {
    totalHeadcount: number;
    activeStaff: number;
    exitedStaff: number;
    departmentsCount: number;
  };
  departments: { name: string; count: number }[];
  growth: { month: string; employees: number }[];
  recentEmployees: EmployeeSummary[];
}

type DashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; error: string };

async function fetchDashboardResult(): Promise<DashboardResult> {
  try {
    const response = await fetch("/api/dashboard");
    if (!response.ok) throw new Error("Failed to pull analytical records");
    const data = await response.json();
    return { ok: true, data };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

function SignInScreen() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [credentialLoading, setCredentialLoading] = useState(false);

  const handleCredentialSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialError(null);
    setCredentialLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setCredentialError("Invalid email or password.");
    }
    setCredentialLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialError(null);
    setCredentialLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCredentialError(data.error || "Registration failed.");
        return;
      }

      // Auto sign-in after successful registration
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch {
      setCredentialError("An unexpected error occurred.");
    } finally {
      setCredentialLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">HR Dashboard</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {mode === "signin"
                ? "Sign in to access your workspace analytics."
                : "Create an account to get started."}
            </p>
          </div>

          {/* GitHub OAuth */}
          <button
            onClick={() => signIn("github")}
            className="w-full inline-flex items-center justify-center space-x-3 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            <LogIn className="h-5 w-5" />
            <span>Sign in with GitHub</span>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
              </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">or continue with email</span>
            </div>
          </div>

          {/* Credential Form */}
          <form
            onSubmit={mode === "signin" ? handleCredentialSignIn : handleRegister}
            className="space-y-4 text-left"
          >
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {credentialError && (
              <p className="text-sm text-red-600">{credentialError}</p>
            )}

            <button
              type="submit"
              disabled={credentialLoading}
              className="w-full inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium shadow-md hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {credentialLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span>
                {credentialLoading
                  ? "Please wait..."
                  : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
              </span>
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-sm text-slate-500">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setCredentialError(null);
                  }}
                  className="font-medium text-violet-600 hover:text-violet-700"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setCredentialError(null);
                  }}
                  className="font-medium text-violet-600 hover:text-violet-700"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({
  resultPromise,
  onRefresh,
}: {
  resultPromise: Promise<DashboardResult>;
  onRefresh: () => void;
}) {
  const result = use(resultPromise);

  if (!result.ok) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        ⚠️ <strong>Data Refresh Mismatch:</strong> {result.error}
      </div>
    );
  }

  const { data } = result;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Headcount" value={data.stats.totalHeadcount} icon={Users} iconColorClass="bg-violet-50 text-violet-600" />
        <StatCard title="Active Staff" value={data.stats.activeStaff} icon={UserCheck} iconColorClass="bg-emerald-50 text-emerald-600" />
        <StatCard title="Exited / Inactive" value={data.stats.exitedStaff} icon={UserMinus} iconColorClass="bg-amber-50 text-amber-600" />
        <StatCard title="Total Departments" value={data.stats.departmentsCount} icon={Building2} iconColorClass="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DepartmentChart data={data.departments} fillColor="#8b5cf6" />
        <GrowthChart data={data.growth} strokeColor="#ec4899" />
      </div>

      <RecentEmployees employees={data.recentEmployees} onRefresh={onRefresh} />
    </>
  );
}

export default function HRDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      setRefreshKey((k) => k + 1);
    });
  }, []);

  const resultPromise = useMemo(
    () => fetchDashboardResult(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  );

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "unauthenticated") {
    return <SignInScreen />;
  }

  // Redirect USER-role users to their employee profile after sign-in
  if (session?.user?.role === "USER") {
    return <Redirect to={`/dashboard/employees/${session.user.employeeId}`} />;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Analytics Dashboard</h1>
          <p className="text-slate-500">Welcome back, {session?.user?.name || "HR Manager"}.</p>
        </div>
        <div className="flex items-center space-x-3">
          {session?.user?.role === "ADMIN" && (
            <button
              onClick={() => router.push("/dashboard/admin")}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-violet-200 bg-white text-sm font-medium text-violet-600 shadow-sm hover:bg-violet-50 active:scale-95 transition-all"
            >
              <UserCog className="h-4 w-4" />
              <span>Admin</span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Refresh</span>
          </button>
          <QuickAddDialog onSuccess={handleRefresh} />
          <SignOutButton className="px-4 py-2 rounded-lg bg-white shadow-sm active:scale-95" />
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent resultPromise={resultPromise} onRefresh={handleRefresh} />
      </Suspense>
    </div>
  );
}
