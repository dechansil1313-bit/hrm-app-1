"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useCallback, use, useEffect, useRef, Suspense, startTransition } from "react";
import { Redirect } from "@/components/redirect";
import { PromiseErrorBoundary } from "@/components/promise-error-boundary";
import {
  ArrowLeft,
  ShieldCheck,
  Shield,
  Mail,
  User as UserIcon,
  Building,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  AlertTriangle,
  RefreshCw,
  ArrowLeftRight,
  Link2,
  Unlink,
  X,
  UserPlus,
  Eye,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

interface EmployeeInfo {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  position: string;
}

interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
  employees: EmployeeInfo[];
}

interface UnlinkedEmployee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  position: string;
}

type UsersResult =
  | { ok: true; data: UserRecord[] }
  | { ok: false; error: string };

async function fetchUsersResult(signal?: AbortSignal): Promise<UsersResult> {
  try {
    const res = await fetch("/api/users", { signal });
    if (!res.ok) throw new Error("Failed to load users");
    return { ok: true, data: await res.json() };
  } catch (err: unknown) {
    // Aborts are expected on Refresh / unmount / Strict Mode double-invoke.
    // Returning a pending Promise (instead of throwing) keeps `use()` calmly
    // suspended on the stale fetch while always rendering the latest promise
    // from state. This avoids an `unhandledrejection` once the PromiseErrorBoundary
    // is gone (e.g. after the page is unmounted).
    //
    // Also routes mid-stream aborts here: some browsers throw `TypeError` (not
    // `AbortError`) when the body is interrupted by an abort, so we fall back
    // to a `signal.aborted` check.
    if (err instanceof Error && err.name === "AbortError") {
      return new Promise<UsersResult>(() => {});
    }
    if (signal?.aborted) {
      return new Promise<UsersResult>(() => {});
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load users",
    };
  }
}

function UserList({
  resultPromise,
  session,
  onToggleRole,
  onOpenLinkModal,
  onUnlink,
  updatingId,
  searchQuery,
}: {
  resultPromise: Promise<UsersResult>;
  session: { user?: { id?: string } };
  onToggleRole: (userId: string, currentRole: string) => void;
  onOpenLinkModal: (userId: string) => void;
  onUnlink: (employeeId: string) => void;
  updatingId: string | null;
  searchQuery: string;
}) {
  // `use()` must NOT be wrapped in try/catch - React relies on thrown values
  // (a Promise for Suspense, an Error for the surrounding error boundary).
  // Rejected promises are caught by the PromiseErrorBoundary below.
  const result = use(resultPromise);

  // Pagination for the admin user list. Default 10/page so users stay scannable
  // even as the org grows; reset to page 1 whenever the search query changes
  // so a stale page index doesn't strand the user on an empty slice.
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!result.ok) {
    return (
      <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{result.error}</span>
      </div>
    );
  }

  const filteredUsers = result.data.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.employees.some((e) => e.role.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  // Clamp current page when total pages decrease (render-time state update is safe)
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">
          {searchQuery ? "No users match your search" : "No users found"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {paginatedUsers.map((user) => {
          const isCurrentUser = user.id === session?.user?.id;
          const linkedEmployee = user.employees.length > 0 ? user.employees[0] : null;
          return (
            <div
              key={user.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Avatar */}
              <div className="shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || ""}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-violet-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-violet-600">
                      {(user.name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium truncate">
                    {user.name || "Unnamed"}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-500 mt-0.5">
                  <span className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span>{user.email || "—"}</span>
                  </span>
                </div>

                {/* Employee Linking Status */}
                <div className="mt-2">
                  {linkedEmployee ? (
                    <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <Link2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">
                    <Link
                      href={`/dashboard/employees/${linkedEmployee.id}`}
                      className="hover:underline hover:text-emerald-900 transition-colors"
                    >
                      {linkedEmployee.name}
                    </Link>{" · "}{linkedEmployee.position} · {linkedEmployee.department}
                  </span>
                      {!isCurrentUser && (
                        <button
                          onClick={() => onUnlink(linkedEmployee.id)}
                          disabled={updatingId === linkedEmployee.id}
                          className="ml-1 p-0.5 rounded hover:bg-emerald-100 transition-colors"
                          title="Unlink employee"
                        >
                          {updatingId === linkedEmployee.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                          ) : (
                            <Unlink className="h-3 w-3 text-emerald-600" />
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenLinkModal(user.id)}
                      disabled={isCurrentUser}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isCurrentUser ? "Cannot link yourself" : "Link to employee record"}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Link Employee Record</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Role Badge + Toggle */}
              <div className="flex items-center space-x-3 shrink-0">
                <span
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    user.role === "ADMIN"
                      ? "bg-violet-50 text-violet-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {user.role === "ADMIN" ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <Shield className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {user.role === "ADMIN" ? "Admin" : "User"}
                  </span>
                </span>

                <button
                  onClick={() => onToggleRole(user.id, user.role)}
                  disabled={updatingId === user.id || isCurrentUser}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    isCurrentUser
                      ? "You cannot change your own role"
                      : `Change to ${user.role === "ADMIN" ? "USER" : "ADMIN"}`
                  }
                >
                  {updatingId === user.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {updatingId === user.id
                      ? "Updating..."
                      : isCurrentUser
                        ? "—"
                        : user.role === "ADMIN"
                          ? "Demote"
                          : "Promote"}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-medium text-slate-700">
              {Math.min(filteredUsers.length, (safePage - 1) * pageSize + 1)}
            </span>{" "}
            to{" "}
            <span className="font-medium text-slate-700">
              {Math.min(safePage * pageSize, filteredUsers.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-slate-700">{filteredUsers.length}</span>{" "}
            users
          </p>

          {/* Page size selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {(() => {
              const pages: (number | "ellipsis")[] = [];
              const startPage = Math.max(1, safePage - 1);
              const endPage = Math.min(totalPages, safePage + 1);

              if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push("ellipsis");
              }

              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }

              if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push("ellipsis");
                pages.push(totalPages);
              }

              return pages;
            })().map((page, idx) =>
              page === "ellipsis" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-sm text-slate-400">
                  &hellip;
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`min-w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    page === safePage
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function UserListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-white rounded-xl border border-slate-200 p-5 flex items-center space-x-4"
        >
          <div className="h-10 w-10 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-56 rounded bg-slate-200" />
          </div>
          <div className="h-8 w-24 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Employee linking state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [linkingEmployeeId, setLinkingEmployeeId] = useState<string | null>(null);
  const [searchEmployee, setSearchEmployee] = useState("");

  // Modal pagination for the "Link Employee Record" picker. Reset to page 1
  // whenever the search input changes so a stale page index doesn't strand the
  // user on an empty slice. Default size 5 keeps the modal list visually airy.
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalPageSize, setModalPageSize] = useState(5);

  useEffect(() => {
    setModalCurrentPage(1);
  }, [searchEmployee]);

  // Track the in-flight request so rapid refresh clicks cancel the previous fetch
  // instead of stacking concurrent GET requests.
  const abortControllerRef = useRef<AbortController | null>(null);
  // Store the active user-list Promise in state so its reference is stable across
  // Suspense retries (a useMemo here would lose its cached value mid-suspend and
  // re-run fetchUsersResult, generating new Promises on every retry).
  const [usersPromise, setUsersPromise] = useState(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return fetchUsersResult(controller.signal);
  });

  const handleRefresh = useCallback(() => {
    // Capture the previous controller BEFORE creating the new one
    // so the old fetch can be aborted after React has committed the new state.
    const prevController = abortControllerRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    startTransition(() => {
      setUsersPromise(fetchUsersResult(controller.signal));
    });

    // Defer aborting the previous request until after React has scheduled the
    // new state update. The aborted promise is caught inside `fetchUsersResult`
    // and converted to a pending Promise (`new Promise(() => {})`) so React's
    // `use()` ignores it once the boundary switches to the next promise. No
    // AbortError ever escapes into the PromiseErrorBoundary or window.
    queueMicrotask(() => prevController?.abort());
  }, []);

  // No unmount cleanup: in React 19 + Strict Mode the cleanup runs once
  // mid-mount, which would abort the controller created in `useState`'s
  // lazy initializer and surface AbortError through a now-removed boundary
  // (`unhandledrejection`). On genuine unmount the same problem occurs. The
  // browser reclaims the abandoned request on navigation.

  const toggleRole = async (userId: string, currentRole: string) => {
    setUpdatingId(userId);
    setError(null);
    setSuccessMsg(null);

    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      setSuccessMsg(`User role updated to ${newRole === "ADMIN" ? "Administrator" : "USER"}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingId(null);
      handleRefresh();
    }
  };

  const fetchUnlinkedEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch("/api/employees/unlinked");
      if (res.ok) {
        setUnlinkedEmployees(await res.json());
      }
    } catch {
      // Silently ignore errors
    } finally {
      setLoadingEmployees(false);
    }
  };

  const openLinkModal = (userId: string) => {
    setLinkingUserId(userId);
    setLinkModalOpen(true);
    setSearchEmployee("");
    setLoadingEmployees(true);
    fetchUnlinkedEmployees();
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setLinkingUserId(null);
    setLinkingEmployeeId(null);
    setSearchEmployee("");
  };

  const linkEmployee = async (employeeId: string) => {
    if (!linkingUserId) return;

    setLinkingEmployeeId(employeeId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: linkingUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to link employee");
      }

      handleRefresh();
      setSuccessMsg("Employee linked to user successfully!");
      closeLinkModal();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to link employee");
    } finally {
      setLinkingEmployeeId(null);
    }
  };

  const unlinkEmployee = async (employeeId: string) => {
    setUpdatingId(employeeId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/employees/${employeeId}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unlink employee");
      }

      handleRefresh();
      setSuccessMsg("Employee unlinked from user successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unlink employee");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUnlinkedEmployees = unlinkedEmployees.filter((e) => {
    const q = searchEmployee.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  });

  const modalTotalPages = Math.max(1, Math.ceil(filteredUnlinkedEmployees.length / modalPageSize));

  // Clamp current page when total pages decrease (render-time state update is safe)
  const modalSafePage = Math.min(modalCurrentPage, modalTotalPages);
  if (modalSafePage !== modalCurrentPage) {
    setModalCurrentPage(modalSafePage);
  }

  const modalPaginatedEmployees = filteredUnlinkedEmployees.slice(
    (modalSafePage - 1) * modalPageSize,
    modalSafePage * modalPageSize,
  );

  const modalGoToPage = (page: number) => {
    setModalCurrentPage(Math.max(1, Math.min(page, modalTotalPages)));
  };

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "unauthenticated") {
    return <Redirect to="/dashboard" />;
  }

  if (session?.user?.role !== "ADMIN") {
    return <Redirect to={`/dashboard/employees/${session?.user?.employeeId}`} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back to Dashboard */}
        <a
          href="/dashboard"
          className="inline-flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </a>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-slate-500">Manage user roles, permissions, and employee linkings.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center space-x-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-600">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, or role..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        {/* User List */}
        <PromiseErrorBoundary
          fallback={(error, reset) => (
            <div className="flex items-center justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <div className="flex items-center space-x-2 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="truncate">{error.message}</span>
              </div>
              <button
                onClick={() => {
                  reset();
                  handleRefresh();
                }}
                type="button"
                className="shrink-0 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-600 hover:bg-red-100 active:scale-95 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}
        >
          <Suspense fallback={<UserListSkeleton />}>
            <UserList
              resultPromise={usersPromise}
              session={session}
              onToggleRole={toggleRole}
              onOpenLinkModal={openLinkModal}
              onUnlink={unlinkEmployee}
              updatingId={updatingId}
              searchQuery={searchQuery}
            />
          </Suspense>
        </PromiseErrorBoundary>
      </div>

      {/* Link Employee Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Link Employee Record</h2>
                <p className="text-xs text-slate-500">
                  Select an unlinked employee record to assign to this user.
                </p>
              </div>
              <button
                onClick={closeLinkModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Search Employee */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  placeholder="Search by name, ID, or department..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Employee List */}
              {loadingEmployees ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse bg-slate-50 rounded-lg p-4 flex items-center space-x-3"
                    >
                      <div className="h-10 w-10 rounded-lg bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 rounded bg-slate-200" />
                        <div className="h-3 w-48 rounded bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUnlinkedEmployees.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Building className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">
                    {searchEmployee ? "No employees match your search" : "No unlinked employees available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {modalPaginatedEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="bg-slate-50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-violet-600">
                            {employee.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{employee.name}</p>
                          <p className="text-xs text-slate-500">
                            {employee.employeeId} · {employee.position} · {employee.department}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => linkEmployee(employee.id)}
                        disabled={linkingEmployeeId === employee.id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {linkingEmployeeId === employee.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                        <span>{linkingEmployeeId === employee.id ? "Linking..." : "Link"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Controls for the link modal's employee picker */}
              {!loadingEmployees && filteredUnlinkedEmployees.length > 0 && (
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <p className="text-xs text-slate-500">
                      Showing{" "}
                      <span className="font-medium text-slate-700">
                        {Math.min(filteredUnlinkedEmployees.length, (modalSafePage - 1) * modalPageSize + 1)}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium text-slate-700">
                        {Math.min(modalSafePage * modalPageSize, filteredUnlinkedEmployees.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-slate-700">{filteredUnlinkedEmployees.length}</span>{" "}
                      employees
                    </p>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">Show</span>
                      <select
                        value={modalPageSize}
                        onChange={(e) => {
                          setModalPageSize(Number(e.target.value));
                          setModalCurrentPage(1);
                        }}
                        className="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                      </select>
                    </div>
                  </div>

                  {modalTotalPages > 1 && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => modalGoToPage(modalSafePage - 1)}
                        disabled={modalSafePage === 1}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                        title="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {(() => {
                        const pages: (number | "ellipsis")[] = [];
                        const startPage = Math.max(1, modalSafePage - 1);
                        const endPage = Math.min(modalTotalPages, modalSafePage + 1);

                        if (startPage > 1) {
                          pages.push(1);
                          if (startPage > 2) pages.push("ellipsis");
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(i);
                        }

                        if (endPage < modalTotalPages) {
                          if (endPage < modalTotalPages - 1) pages.push("ellipsis");
                          pages.push(modalTotalPages);
                        }

                        return pages;
                      })().map((page, idx) =>
                        page === "ellipsis" ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-sm text-slate-400">
                            &hellip;
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => modalGoToPage(page)}
                            className={`min-w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                              page === modalSafePage
                                ? "bg-violet-600 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </button>
                        ),
                      )}

                      <button
                        onClick={() => modalGoToPage(modalSafePage + 1)}
                        disabled={modalSafePage === modalTotalPages}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                        title="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={closeLinkModal}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
