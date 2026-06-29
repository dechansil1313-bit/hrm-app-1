"use client";
import React, { useState } from "react";
import { X, Plus } from "lucide-react";

interface QuickAddDialogProps {
  onSuccess: () => void;
}

export function QuickAddDialog({ onSuccess }: QuickAddDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    email: "",
    role: "Developer", // Default matching model enum string values
    department: "Engineering",
    position: "Junior Developer",
    phone: "",
  });
  const [successInfo, setSuccessInfo] = useState<{
    name: string;
    defaultPassword: string | null;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to create employee record.");
      }

      // Surface the freshly-minted default password (if any) so the admin can
      // communicate the temporary credential to the new employee. Prefer the
      // server's normalized employee.name over the form input to avoid showing
      // whitespace / casing that the API may have trimmed.
      const createdName =
        data?.employee && typeof data.employee.name === "string"
          ? data.employee.name
          : formData.name;
      const defaultPassword =
        typeof data.defaultPassword === "string" ? data.defaultPassword : null;
      setSuccessInfo({ name: createdName, defaultPassword });

      // Reset Form (modal stays open to show the success card).
      setFormData({
        employeeId: "",
        name: "",
        email: "",
        role: "Developer",
        department: "Engineering",
        position: "Junior Developer",
        phone: "",
      });
      onSuccess(); // Re-trigger dashboard analytics refresh fetch loop
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setSuccessInfo(null);
    setError(null);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
      >
        <Plus className="h-4 w-4" />
        <span>Add Employee</span>
      </button>

      {/* Modal Dialog Backdrop Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add New Employee</h2>
                <p className="text-xs text-slate-500">Create a clean database profile instance across core teams.</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {successInfo ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 space-y-2">
                  <p className="font-semibold">✅ {successInfo.name} was added successfully.</p>
                  {successInfo.defaultPassword ? (
                    <>
                      <p>
                        A login account was created with the temporary password:
                      </p>
                      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm">
                        <span>{successInfo.defaultPassword}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== "undefined" && navigator.clipboard) {
                              navigator.clipboard.writeText(successInfo.defaultPassword ?? "").catch(() => {});
                            }
                          }}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-emerald-700/80">
                        Share this with the employee. They can change it from
                        their profile page using the &ldquo;Change Password&rdquo; button.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-emerald-700/80">
                      Linked to an existing user account — their original password is unchanged.
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                  ❌ {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., HRM-2026-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+123456789"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide">Department *</label>
                  <input
                    type="text"
                    required
                    placeholder="Engineering"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide">Position *</label>
                  <input
                    type="text"
                    required
                    placeholder="Senior Developer"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 tracking-wide">System Role *</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="Admin">Admin</option>
                    <option value="HR">HR</option>
                    <option value="Developer">Developer</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              </div>

              {/* Form Actions Footer Panel */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Record"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}