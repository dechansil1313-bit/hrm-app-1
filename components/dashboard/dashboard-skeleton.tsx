import React from "react";

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
      </div>

      {/* 4 Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-2 w-2/3">
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            </div>
            <div className="h-10 w-10 bg-slate-200 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* 2 Charts Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div className="h-75 w-full bg-slate-100 rounded-lg flex items-end p-4 justify-between space-x-2">
              <div className="w-full h-1/3 bg-slate-200 rounded-t"></div>
              <div className="w-full h-2/3 bg-slate-200 rounded-t"></div>
              <div className="w-full h-1/2 bg-slate-200 rounded-t"></div>
              <div className="w-full h-5/6 bg-slate-200 rounded-t"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}