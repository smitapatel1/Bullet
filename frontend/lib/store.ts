import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  member_count: number;
  project_count: number;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  tags: string[];
  task_count: number;
  active_jobs: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  projects: Project[];
  currentProject: Project | null;
  notifications: Notification[];
  unreadCount: number;
  theme: "dark" | "light";
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleTheme: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      workspaces: [],
      currentWorkspace: null,
      projects: [],
      currentProject: null,
      notifications: [],
      unreadCount: 0,
      theme: "dark",
      commandPaletteOpen: false,
      sidebarCollapsed: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => set({ currentProject: project }),
      setNotifications: (notifications) => set({ notifications }),
      setUnreadCount: (count) => set({ unreadCount: count }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            read_at: n.read_at || new Date().toISOString(),
          })),
          unreadCount: 0,
        })),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      logout: () =>
        set({
          user: null,
          token: null,
          currentWorkspace: null,
          currentProject: null,
          notifications: [],
          unreadCount: 0,
        }),
    }),
    {
      name: "dataforge-storage",
      partialize: (state) => ({
        token: state.token,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = useAppStore.getState().token;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (data: { email: string; password: string; full_name?: string }) =>
      fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    oauth: (provider: string, code: string, redirect_uri: string) =>
      fetchApi(`/auth/oauth/${provider}`, {
        method: "POST",
        body: JSON.stringify({ provider, code, redirect_uri }),
      }),
    refresh: (token: string) =>
      fetchApi("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: token }),
      }),
  },

  workspaces: {
    list: () => fetchApi("/workspaces"),
    get: (id: string) => fetchApi(`/workspaces/${id}`),
    create: (data: { name: string; slug?: string; description?: string }) =>
      fetchApi("/workspaces", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      fetchApi(`/workspaces/${id}`, { method: "DELETE" }),
    members: {
      list: (workspaceId: string) => fetchApi(`/workspaces/${workspaceId}/members`),
      add: (workspaceId: string, data: { user_id: string; role: string }) =>
        fetchApi(`/workspaces/${workspaceId}/members`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      update: (workspaceId: string, memberId: string, data: Record<string, unknown>) =>
        fetchApi(`/workspaces/${workspaceId}/members/${memberId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      remove: (workspaceId: string, memberId: string) =>
        fetchApi(`/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE" }),
    },
  },

  projects: {
    list: (workspaceId: string) => fetchApi(`/projects/workspace/${workspaceId}`),
    get: (id: string) => fetchApi(`/projects/${id}`),
    create: (data: {
      workspace_id: string;
      name: string;
      slug?: string;
      description?: string;
      tags?: string[];
    }) => fetchApi("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/projects/${id}`, { method: "DELETE" }),
    tasks: {
      list: (projectId: string) => fetchApi(`/projects/${projectId}/tasks`),
      create: (projectId: string, data: Record<string, unknown>) =>
        fetchApi(`/projects/${projectId}/tasks`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    jobs: {
      list: (projectId: string, params?: Record<string, string>) => {
        const query = params ? `?${new URLSearchParams(params)}` : "";
        return fetchApi(`/projects/${projectId}/jobs${query}`);
      },
      create: (projectId: string, data: { task_id: string }) =>
        fetchApi(`/projects/${projectId}/jobs`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
  },

  jobs: {
    get: (id: string) => fetchApi(`/jobs/${id}`),
    cancel: (id: string) => fetchApi(`/jobs/${id}/cancel`, { method: "POST" }),
    retry: (id: string) => fetchApi(`/jobs/${id}/retry`, { method: "POST" }),
    logs: (id: string) => fetchApi(`/jobs/${id}/logs`),
    stats: (workspaceId?: string) =>
      fetchApi(`/jobs/dashboard/stats${workspaceId ? `?workspace_id=${workspaceId}` : ""}`),
  },

  workflows: {
    list: (projectId: string) => fetchApi(`/workflows/project/${projectId}`),
    get: (id: string) => fetchApi(`/workflows/${id}`),
    create: (data: Record<string, unknown>) =>
      fetchApi("/workflows", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      fetchApi(`/workflows/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`/workflows/${id}`, { method: "DELETE" }),
    versions: (id: string) => fetchApi(`/workflows/${id}/versions`),
    restore: (id: string, version: number) =>
      fetchApi(`/workflows/${id}/restore/${version}`, { method: "POST" }),
  },

  marketplace: {
    list: (params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : "";
      return fetchApi(`/marketplace${query}`);
    },
    categories: () => fetchApi("/marketplace/categories"),
    get: (id: string) => fetchApi(`/marketplace/${id}`),
    use: (id: string, projectId: string) =>
      fetchApi(`/marketplace/${id}/use?project_id=${projectId}`, { method: "POST" }),
  },

  dataStores: {
    get: (id: string) => fetchApi(`/data/${id}`),
    items: (id: string, page = 1, pageSize = 100) =>
      fetchApi(`/data/${id}/items?page=${page}&page_size=${pageSize}`),
    export: (data: { data_store_id: string; format: string; fields?: string[] }) =>
      fetchApi("/data/export", { method: "POST", body: JSON.stringify(data) }),
  },

  apiKeys: {
    list: (workspaceId?: string) =>
      fetchApi(`/api-keys${workspaceId ? `?workspace_id=${workspaceId}` : ""}`),
    create: (data: { name: string; workspace_id?: string; scopes?: string[] }) =>
      fetchApi("/api-keys", { method: "POST", body: JSON.stringify(data) }),
    revoke: (id: string) => fetchApi(`/api-keys/${id}`, { method: "DELETE" }),
  },

  notifications: {
    list: (unreadOnly = false) =>
      fetchApi(`/notifications?unread_only=${unreadOnly}`),
    count: () => fetchApi("/notifications/count"),
    markRead: (id: string) => fetchApi(`/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => fetchApi("/notifications/read-all", { method: "POST" }),
  },

  audit: {
    list: (workspaceId: string, params?: Record<string, string>) => {
      const query = params ? `?${new URLSearchParams(params)}` : "";
      return fetchApi(`/audit/workspace/${workspaceId}${query}`);
    },
  },
};
