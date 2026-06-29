import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { EmployeePhotoUpload } from "@/components/dashboard/employee-photo-upload";
import { ChangePasswordButton } from "@/components/dashboard/change-password-button";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  // Protect route from unauthenticated users
  const session = await auth();
  if (!session) {
    redirect("/dashboard");
  }

  // Fetch the individual record from NeonDB using your exact schema fields
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { user: true } // Joins Next-Auth user table relation parameters
  });

  if (!employee) {
    notFound();
  }
  
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Back to Dashboard */}
      <Link
        href="/"
        className="inline-flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Home</span>
      </Link>

      {/* Sign Out Button */}

      <div className="inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <SignOutButton/>
     </div>

      {/* Main Profile Header Block Card Layout */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <EmployeePhotoUpload
              employeeId={employee.id}
              initialPhoto={employee.photo}
              employeeName={employee.name}
            />
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              employee.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10" : "bg-amber-50 text-amber-700"
            }`}>
              {employee.status}
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-500 font-mono mt-2">{employee.employeeId}</p>
      </div>

      {/* Profile Metrics Split Column Block Grid Panels */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Column Left Side: General Profile Core Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b border-slate-100 pb-2">Employment Information</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-lg">
                <Building className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Department</p>
                  <p className="text-sm font-medium text-slate-800">{employee.department}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-lg">
                <Briefcase className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Job Position</p>
                  <p className="text-sm font-medium text-slate-800">{employee.position}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-lg">
                <ShieldAlert className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">System Security Access Role</p>
                  <p className="text-sm font-medium text-slate-800">{employee.role}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-lg">
                <Calendar className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Official Join Date</p>
                  <p className="text-sm font-medium text-slate-800">{new Date(employee.joinDate).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column Right Side: Primary Contact Coordinates Channels */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b border-slate-100 pb-2">Contact Details</h2>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-600 truncate">{employee.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-600">{employee.phone || "No phone number added"}</span>
              </div>
            </div>
          </div>

          {/* Account Linking Status Node mapping NextAuth Identity parameters */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Portal Security Sync</h3>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <UserCheck className={`h-4 w-4 ${employee.userId ? "text-emerald-500" : "text-amber-500"}`} />
              <span>{employee.userId ? "Connected to Next-Auth Login Profile" : "No portal profile credentials attached"}</span>
            </div>
            {/* Only render the change-password affordance when the viewer is
                looking at their own profile. The check runs server-side so
                unauthenticated viewers / admins browsing someone else's
                profile never see the button. */}
            {employee.userId && employee.userId === session.user.id && (
              <div className="pt-2">
                <ChangePasswordButton />
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}