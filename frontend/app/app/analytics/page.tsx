"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  Database,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function AnalyticsPage() {
  const timeRange = "7d";

  const usageChartOptions = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: {
      data: ["Jobs", "Items Extracted", "API Calls"],
      textStyle: { color: "#9ca3af" },
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
        data: [120, 132, 101, 134, 190, 230, 210],
        smooth: true,
        lineStyle: { color: "#3b82f6", width: 3 },
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
      {
        name: "Items Extracted",
        type: "line",
        data: [2200, 2800, 1500, 3600, 4200, 5100, 4800],
        smooth: true,
        lineStyle: { color: "#22c55e" },
      },
      {
        name: "API Calls",
        type: "line",
        data: [450, 532, 401, 584, 790, 930, 810],
        smooth: true,
        lineStyle: { color: "#f59e0b" },
      },
    ],
  };

  const performanceChartOptions = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: { color: "#9ca3af" },
    },
    yAxis: {
      type: "value",
      name: "Duration (ms)",
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      axisLabel: { color: "#9ca3af" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    series: [
      {
        type: "bar",
        data: [2300, 2100, 1800, 2500, 2200, 1900, 2100],
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#1d4ed8" },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  const statusDonutOptions = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    series: [
      {
        type: "pie",
        radius: ["60%", "80%"],
        avoidLabelOverlap: false,
        label: { show: false },
        data: [
          { value: 1048, name: "Google Maps", itemStyle: { color: "#3b82f6" } },
          { value: 735, name: "LinkedIn", itemStyle: { color: "#8b5cf6" } },
          { value: 580, name: "Amazon", itemStyle: { color: "#22c55e" } },
          { value: 484, name: "Custom", itemStyle: { color: "#f59e0b" } },
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Monitor performance and usage metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Last 7 days
          </Button>
          <Button variant="outline" size="sm">
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Jobs",
            value: "12,045",
            change: "+12.5%",
            icon: Activity,
            color: "primary",
          },
          {
            label: "Success Rate",
            value: "98.2%",
            change: "+2.1%",
            icon: TrendingUp,
            color: "success",
          },
          {
            label: "Items Extracted",
            value: "2.4M",
            change: "+24.3%",
            icon: Database,
            color: "info",
          },
          {
            label: "Avg Duration",
            value: "1.2s",
            change: "-8.4%",
            icon: Clock,
            color: "warning",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">
                  {stat.label}
                </CardDescription>
                <div className={`rounded-lg p-2 bg-${stat.color}/10`}>
                  <stat.icon className={`h-4 w-4 text-${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span
                    className={`text-xs font-medium ${
                      stat.change.startsWith("+")
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Usage Over Time</CardTitle>
                <CardDescription>
                  Jobs, extracted items, and API calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReactECharts
                  option={usageChartOptions}
                  style={{ height: 300 }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tasks Distribution</CardTitle>
                <CardDescription>By scraper type</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ReactECharts
                  option={statusDonutOptions}
                  style={{ height: 300 }}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Tasks</CardTitle>
              <CardDescription>By items extracted</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Google Maps Business Scraper", items: 24532, rate: "99.2%" },
                { name: "LinkedIn Profile Extractor", items: 12421, rate: "98.7%" },
                { name: "Product Data Collector", items: 8932, rate: "97.9%" },
                { name: "News Article Scraper", items: 6542, rate: "96.5%" },
              ].map((task, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-muted-foreground">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.items.toLocaleString()} items extracted
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">{task.rate}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Duration Trend</CardTitle>
              <CardDescription>Average execution time</CardDescription>
            </CardHeader>
            <CardContent>
              <ReactECharts
                option={performanceChartOptions}
                style={{ height: 350 }}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {["CPU", "Memory", "Network"].map((resource) => (
              <Card key={resource}>
                <CardHeader>
                  <CardTitle>{resource} Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Current
                    </span>
                    <span className="text-lg font-bold">
                      {Math.floor(Math.random() * 60 + 20)}%
                    </span>
                  </div>
                  <Progress value={Math.floor(Math.random() * 60 + 20)} />
                  <p className="text-xs text-muted-foreground">
                    Peak: {Math.floor(Math.random() * 30 + 70)}% at{" "}
                    {Math.floor(Math.random() * 12 + 1)}:
                    {Math.floor(Math.random() * 60)
                      .toString()
                      .padStart(2, "0")}{" "}
                    AM
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
