"use client";

import { useSidebar } from "@/context/SidebarContext";
import { AuthGuard } from "@/lib/AuthGuard";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import AdminBreadcrumb from "@/layout/AdminBreadcrumb";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <AuthGuard>
      <div className="min-h-screen min-w-0 overflow-x-clip xl:flex">
        <AppSidebar />
        <Backdrop />
        <div
          className={`min-w-0 flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          <AppHeader />
          <div className="mx-auto w-full min-w-0 max-w-(--breakpoint-2xl) px-3 py-4 sm:px-4 md:p-6"><AdminBreadcrumb />{children}</div>
        </div>
      </div>
    </AuthGuard>
  );
}
