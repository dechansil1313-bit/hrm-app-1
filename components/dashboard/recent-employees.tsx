"use client";
import React, { useState, useMemo } from "react";
import { Search, Download, Pencil, Trash2, X, Check, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

export interface EmployeeSummary {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  status: string;
  joinDate: string;
}

interface RecentEmployeesProps {
  employees: EmployeeSummary[];
  onRefresh?: () => void;
}

export function RecentEmployees({ employees, onRefresh }: RecentEmployeesProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Edit modal state
  const [editEmployee, setEditEmployee] = useState<EmployeeSummary | null>(null);
  const [editForm, setEditForm] = useState({ name: "", department: "", position: "", status: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Process live search parsing filters safely
  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query) ||
      emp.employeeId.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));

  // Clamp current page when total pages decrease (render-time state update is safe)
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  const paginatedEmployees = useMemo(
    () => filteredEmployees.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredEmployees, safePage, pageSize],
  );

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Client-side CSV generator function
  const exportToCSV = () => {
    if (employees.length === 0) return;

    const headers = ["Employee ID", "Full Name", "Department", "Position", "Status", "Join Date"];
    const csvRows = filteredEmployees.map((emp) => [
      `"${emp.employeeId}"`,
      `"${emp.name.replace(/"/g, '""')}"`,
      `"${emp.department}"`,
      `"${emp.position}"`,
      `"${emp.status}"`,
      `"${new Date(emp.joinDate).toLocaleDateString()}"`
    ]);

    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HR_Recent_Employees_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open edit modal
  const openEdit = (emp: EmployeeSummary) => {
    setEditEmployee(emp);
    setEditForm({
      name: emp.name,
      department: emp.department,
      position: emp.position,
      status: emp.status,
    });
    setEditError(null);
  };

  // Submit edit
  const submitEdit = async () => {
    if (!editEmployee) return;
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/employees/${editEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update employee");
      }

      setEditEmployee(null);
      showSuccess("Employee updated successfully!");
      onRefresh?.();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update employee");
    } finally {
      setEditLoading(false);
    }
  };

  // Submit delete
  const submitDelete = async () => {
    if (!deleteEmployee) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/employees/${deleteEmployee.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete employee");
      }

      setDeleteEmployee(null);
      showSuccess("Employee deleted successfully!");
      onRefresh?.();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete employee");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Success Toast */}
      {successMsg && (
        <div className="mx-6 mt-4 flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-600">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Table Action Controls Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recent Employee Additions</h2>
          <p className="text-xs text-slate-500">A snapshot listing of the latest talent onboarded into the framework.</p>
        </div>
        
        {/* Search Bar Input Block */}
        <div className="relative w-full sm:w-100 flex flex-row">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search records..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button
            onClick={exportToCSV}
            disabled={filteredEmployees.length === 0}
            className="w-full sm:w-72 inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>          
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500 tracking-wider">
              <th className="p-4 pl-6">ID</th>
              <th className="p-4">Employee Name</th>
              <th className="p-4">Department</th>
              <th className="p-4">Position</th>
              <th className="p-4">Status</th>
              <th className="p-4 pr-6 text-right">Join Date</th>
              <th className="p-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {            paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No matching employee records found.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 pl-6 font-mono text-xs text-slate-500">{emp.employeeId}</td>
                  <td className="p-4 font-medium text-slate-900">{emp.name}</td>
                  <td className="p-4 text-slate-600">{emp.department}</td>
                  <td className="p-4 text-slate-600">{emp.position}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/10"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-4 pr-6 text-right text-slate-500">
                    {new Date(emp.joinDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="inline-flex items-center space-x-1">
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Edit employee"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteEmployee(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          {filteredEmployees.length > 0 && (
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {Math.min(filteredEmployees.length, (currentPage - 1) * pageSize + 1)}
              </span>{" "}
              to{" "}
              <span className="font-medium text-slate-700">
                {Math.min(currentPage * pageSize, filteredEmployees.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700">{filteredEmployees.length}</span>{" "}
              results
            </p>
          )}

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
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {(() => {
              const pages: (number | "ellipsis")[] = [];
              const startPage = Math.max(1, currentPage - 1);
              const endPage = Math.min(totalPages, currentPage + 1);

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
                    page === currentPage
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Edit Employee</h2>
                <p className="text-xs text-slate-500">
                  Updating record for <span className="font-medium">{editEmployee.name}</span>
                </p>
              </div>
              <button
                onClick={() => setEditEmployee(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editError && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => setEditEmployee(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={editLoading}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {editLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>{editLoading ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Delete Employee</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-slate-700">{deleteEmployee.name}</span>?
                  This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-left">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => setDeleteEmployee(null)}
                disabled={deleteLoading}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitDelete}
                disabled={deleteLoading}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {deleteLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>{deleteLoading ? "Deleting..." : "Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
