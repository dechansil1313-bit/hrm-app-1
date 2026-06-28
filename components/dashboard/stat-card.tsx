import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColorClass: string; // e.g., "bg-blue-50 text-blue-600"
}

export function StatCard({ title, value, icon: Icon, iconColorClass }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-row items-center justify-between space-y-0">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500 tracking-wide">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${iconColorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
