"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  FileJson,
  Users,
  Workspace,
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore, api } from "@/lib/store";
import { formatRelativeTime, formatDuration, formatNumber } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
}

function StatCard({ title, value, change, icon: Icon, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-medium">{title}</CardDescription>
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {change !== undefined && (
              <span
                className={`text-xs font-medium ${
                  change >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {change}%
              </span>
            )}
          </div>
        </CardContent>
        <div
          className="absolute inset-x-0 bottom-0 h-1 opacity-20"
          style={{ background: `linear-gradient(to right, transparent, var(--${color.replace("bg-", "").replace("/10", "").replace("/20", "")}), transparent)` }}
        />
      </Card>
    </motion.div>
  );
}

interface JobActivity {
  id: string;
  task_name: string;
  status: string;
  created_at: string;
  duration_ms: number | null;
  items_extracted: number;
}

export default function DashboardPage() {
  const { currentWorkspace, currentProject } = useAppStore();
  const [stats, setStats] = useState({
    total_jobs: 0,
    active_jobs: 0,
    queued_jobs: 0,
    completed_jobs_24h: 0,
    failed_jobs_24h: 0,
    total_items_extracted: 0,
    avg_job_duration_ms: 0,
    success_rate: 0,
  });
  const [recentJobs, setRecentJobs] = useState<JobActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.jobs.stats(currentWorkspace?.id);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [currentWorkspace?.id]);

  const statCards = [
    {
      title: "Active Jobs",
      value: stats.active_jobs,
      icon: PlayCircle,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Completed (24h)",
      value: stats.completed_jobs_24h,
      icon: CheckCircle2,
      color: "bg-success/10 text-success",
    },
    {
      title: "Failed (24h)",
      value: stats.failed_jobs_24h,
      icon: XCircle,
      color: "bg-destructive/10 text-destructive",
    },
    {
      title: "Items Extracted",
      value: formatNumber(stats.total_items_extracted),
      icon: FileJson,
      color: "bg-info/10 text-info",
    },
    {
      title: "Avg Duration",
      value: formatDuration(stats.avg_job_duration_ms || 0),
      icon: Clock,
      color: "bg-warning/10 text-warning",
    },
    {
      title: "Success Rate",
      value: `${stats.success_rate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "bg-success/10 text-success",
    },
  ];

  const chartOptions = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(17, 24, 39, 0.95)",
      borderColor: "rgba(59, 130, 246, 0.3)",
      textStyle: { color: "#e5e7eb" },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: { color: "#9ca3af" },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: { color: "#9ca3af" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    series: [
      {
        name: "Jobs",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        data: [120, 132, 101, 134, 190, 230, 210],
        lineStyle: { color: "#3b82f6", width: 3 },
        itemStyle: { color: "#3b82f6" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59,130,246,0.3)" },
              { offset: 1, color: "rgba(59,130,246,0.05)" },
            ],
          },
        },
      },
    ],
  };

  const pieChartOptions = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(17, 24, 39, 0.95)",
      borderColor: "rgba(59, 130, 246, 0.3)",
      textStyle: { color: "#e5e7eb" },
    },
    series: [
      {
        type: "pie",
        radius: ["50%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "transparent",
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold", color: "#e5e7eb" },
        },
        data: [
          { value: stats.completed_jobs_24h, name: "Completed", itemStyle: { color: "#22c55e" } },
          { value: stats.failed_jobs_24h, name: "Failed", itemStyle: { color: "#ef4444" } },
          { value: stats.active_jobs, name: "Running", itemStyle: { color: "#3b82f6" } },
          { value: stats.queued_jobs, name: "Queued", itemStyle: { color: "#f59e0b" } },
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your workspace.
          </p>
        </div>
        <Button className="gap-2">
          <Zap className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat, index) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job Activity</CardTitle>
            <CardDescription>Jobs executed over the last week</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactECharts
              option={chartOptions}
              style={{ height: 300 }}
              opts={{ renderer: "svg" }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Status Distribution</CardTitle>
            <CardDescription>Current status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ReactECharts
              option={pieChartOptions}
              style={{ height: 300 }}
              opts={{ renderer: "svg" }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest job executions</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed jobs={recentJobs} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2">
              <PlayCircle className="h-4 w-4" />
              Run a Task
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileJson className="h-4 w-4" />
              View Data Stores
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Users className="h-4 w-4" />
              Team Overview
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Zap className="h-4 w-4" />
              API Quick Start
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityFeed({ jobs }: { jobs: JobActivity[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-success";
      case "running":
        return "text-primary";
      case "pending":
        return "text-warning";
      case "failed":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-4 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-accent"
        >
          <div className={`rounded-full p-2 ${getStatusColor(i % 2 === 0 ? "completed" : "running").replace("text-", "bg-")}/10`}>
            <Activity className={`h-4 w-4 ${getStatusColor(i % 2 === 0 ? "completed" : "running")}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              Task #{i + 1} - Web Scraper
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(new Date(Date.now() - i * 600000))}
            </p>
          </div>
          <Badge variant={i % 2 === 0 ? "success" : "default"}>
            {i % 2 === 0 ? "Completed" : "Running"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {Math.floor(Math.random() * 100 + 50)} items
          </span>
        </motion.div>
      ))}
    </div>
  );
}
