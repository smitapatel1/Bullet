"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/lib/store";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div
          className="transition-all duration-300"
          style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}
        >
          <Header />
          <main className="min-h-[calc(100vh-4rem)] p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
