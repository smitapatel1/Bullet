"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { LayoutDashboard, FolderKanban, CirclePlay as PlayCircle, Network, Store, Settings, Users, ChartBar as BarChart3, File as FileJson, Key, Bell, Plus, Zap, Workflow, File } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { label: "New Project", icon: FolderKanban, href: "/projects/new" },
  { label: "New Task", icon: Plus, href: "/tasks/new" },
  { label: "New Workflow", icon: Network, href: "/workflows/new" },
  { label: "New API Key", icon: Key, href: "/api-keys/new" },
  { label: "Invite Team Member", icon: Users, href: "/team/invite" },
];

const pages = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Projects", icon: FolderKanban, href: "/projects" },
  { label: "Jobs", icon: PlayCircle, href: "/jobs" },
  { label: "Workflows", icon: Network, href: "/workflows" },
  { label: "Marketplace", icon: Store, href: "/marketplace" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Data Stores", icon: FileJson, href: "/data" },
  { label: "Team", icon: Users, href: "/team" },
  { label: "API Keys", icon: Key, href: "/api-keys" },
  { label: "Settings", icon: Settings, href: "/settings" },
  { label: "Notifications", icon: Bell, href: "/notifications" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const runCommand = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.href}
              onSelect={() => runCommand(action.href)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.href}
              onSelect={() => runCommand(page.href)}
            >
              <page.icon className="mr-2 h-4 w-4" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
