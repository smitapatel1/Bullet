"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CirclePlay as PlayCircle, Pause, RefreshCw, Clock, CircleCheck as CheckCircle2, Circle as XCircle, CircleAlert as AlertCircle, MoveHorizontal as MoreHorizontal, Eye, RotateCcw, Trash2, ListFilter as Filter, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, api } from "@/lib/store";
import {
  formatRelativeTime,
  formatDuration,
  formatNumber,
  statusColors,
  statusBgColors,
} from "@/lib/utils";

interface Job {
  id: string;
  task_id: string;
  task?: { name: string; type: string };
  status: string;
  priority: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  memory_used_mb: number | null;
  pages_extracted: number;
  items_extracted: number;
  retry_count: number;
  created_at: string;
}

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  queued: Clock,
  running: Activity,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: AlertCircle,
  timeout: XCircle,
};

export default function JobsPage() {
  const { currentWorkspace } = useAppStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!currentWorkspace) return;

      try {
        const projects = await api.projects.list(currentWorkspace.id);
        const allJobs: Job[] = [];

        for (const project of projects) {
          const projectJobs = await api.projects.jobs.list(project.id, {
            status: statusFilter || undefined,
          });
          allJobs.push(...projectJobs);
        }

        setJobs(allJobs.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [currentWorkspace, statusFilter]);

  const handleCancelJob = async (jobId: string) => {
    try {
      await api.jobs.cancel(jobId);
      setJobs(jobs.map((j) =>
        j.id === jobId ? { ...j, status: "cancelled" } : j
      ));
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const newJob = await api.jobs.retry(jobId);
      setJobs([newJob, ...jobs]);
    } catch (error) {
      console.error("Failed to retry job:", error);
    }
  };

  const groupedJobs = {
    running: jobs.filter((j) => j.status === "running" || j.status === "queued"),
    completed: jobs.filter((j) => j.status === "completed"),
    failed: jobs.filter((j) => j.status === "failed" || j.status === "timeout"),
    other: jobs.filter(
      (j) => !["running", "queued", "completed", "failed", "timeout"].includes(j.status)
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Monitor and manage your job executions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Last 24h
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(groupedJobs).map(([group, groupJobs]) => (
          <Card key={group} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{group}</span>
                <span className="text-2xl font-bold">{groupJobs.length}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="running">Running ({groupedJobs.running.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({groupedJobs.completed.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({groupedJobs.failed.length})</TabsTrigger>
        </TabsList>

        {["all", "running", "completed", "failed"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <JobList
              jobs={
                tab === "all"
                  ? jobs
                  : groupedJobs[tab as keyof typeof groupedJobs]
              }
              loading={loading}
              onCancel={handleCancelJob}
              onRetry={handleRetryJob}
              onSelect={setSelectedJob}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface JobListProps {
  jobs: Job[];
  loading: boolean;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onSelect: (job: Job) => void;
}

function JobList({ jobs, loading, onCancel, onRetry, onSelect }: JobListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-muted rounded" />
                  <div className="h-3 w-1/3 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PlayCircle className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No jobs found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Jobs will appear here when you run tasks
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {jobs.map((job, index) => {
          const StatusIcon = statusIcons[job.status] || Clock;
          const isRunning = job.status === "running";
          const isQueued = job.status === "queued";
          const isActive = isRunning || isQueued;

          return (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="group transition-all hover:shadow-md cursor-pointer"
                onClick={() => onSelect(job)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      statusBgColors[job.status as keyof typeof statusBgColors] ||
                      "bg-muted"
                    }`}
                  >
                    <StatusIcon
                      className={`h-5 w-5 ${
                        statusColors[job.status as keyof typeof statusColors] ||
                        "text-muted-foreground"
                      } ${isRunning ? "animate-pulse" : ""}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {job.task?.name || `Task ${job.task_id.slice(0, 8)}`}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{formatRelativeTime(job.created_at)}</span>
                      {job.duration_ms && (
                        <span>{formatDuration(job.duration_ms)}</span>
                      )}
                      <span>{formatNumber(job.items_extracted)} items</span>
                      <span>{formatNumber(job.pages_extracted)} pages</span>
                    </div>
                  </div>

                  {isRunning && (
                    <div className="w-32">
                      <Progress value={Math.random() * 100} />
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelect(job)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {isActive && (
                        <DropdownMenuItem
                          onClick={() => onCancel(job.id)}
                          className="text-destructive"
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      )}
                      {job.status === "failed" && (
                        <DropdownMenuItem onClick={() => onRetry(job.id)}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Retry
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
