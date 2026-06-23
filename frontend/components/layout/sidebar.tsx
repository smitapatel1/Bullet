"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  PlayCircle,
  Network,
  Store,
  Settings,
  Users,
  BarChart3,
  FileJson,
  Key,
  Bell,
  Zap,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/jobs", label: "Jobs", icon: PlayCircle },
  { href: "/workflows", label: "Workflows", icon: Network },
  { href: "/marketplace", label: "Marketplace", icon: Store },
];

const secondaryNavItems = [
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/data", label: "Data Stores", icon: FileJson },
  { href: "/team", label: "Team", icon: Users },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/integrations", label: "Integrations", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, currentWorkspace } = useAppStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card/50 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">DataForge</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info">
            <Zap className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {currentWorkspace && !sidebarCollapsed && (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Workspace</p>
          <p className="font-medium truncate">{currentWorkspace.name}</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Main
            </p>
          )}
          {mainNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        <div className="space-y-1 pt-4">
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Manage
            </p>
          )}
          {secondaryNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full justify-center"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
