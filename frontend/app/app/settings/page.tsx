"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Database,
  CreditCard,
  FileText,
  Code,
  ChevronRight,
  Monitor,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const settingsSections = [
  {
    id: "profile",
    icon: User,
    title: "Profile",
    description: "Manage your personal information",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    description: "Configure how you receive alerts",
  },
  {
    id: "appearance",
    icon: Palette,
    title: "Appearance",
    description: "Customize the look and feel",
  },
  {
    id: "security",
    icon: Shield,
    title: "Security",
    description: "Two-factor authentication and sessions",
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Billing",
    description: "Manage your subscription and payments",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["3 Projects", "100 Jobs/month", "1 User", "1GB Storage"],
    current: false,
  },
  {
    name: "Pro",
    price: "$99",
    features: ["Unlimited Projects", "10,000 Jobs/month", "20 Users", "100GB Storage", "Priority Support"],
    current: true,
  },
  {
    name: "Enterprise",
    price: "$299",
    features: ["Unlimited Everything", "50 Concurrent Jobs", "Unlimited Users", "1TB Storage", "Dedicated Support"],
    current: false,
  },
];

export default function SettingsPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    jobComplete: true,
    jobFailure: true,
    weeklyDigest: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-64 shrink-0">
            <TabsList className="flex flex-col h-auto gap-1 bg-transparent p-0">
              {settingsSections.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="w-full justify-between px-4 py-3 data-[state=active]:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="h-4 w-4" />
                    <div className="text-left">
                      <span className="block font-medium">{section.title}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 space-y-6">
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <Input placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input type="email" placeholder="john@example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Avatar URL</label>
                    <Input placeholder="https://example.com/avatar.jpg" />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: "email", label: "Email notifications", desc: "Receive alerts via email" },
                    { key: "push", label: "Push notifications", desc: "Browser push notifications" },
                    { key: "jobComplete", label: "Job completed", desc: "When a job finishes successfully" },
                    { key: "jobFailure", label: "Job failed", desc: "When a job encounters an error" },
                    { key: "weeklyDigest", label: "Weekly digest", desc: "Summary of your activity" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={(v) =>
                          setNotifications({ ...notifications, [item.key]: v })
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Customize your visual experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["dark", "light", "system"].map((t) => (
                        <Button
                          key={t}
                          variant={theme === t ? "default" : "outline"}
                          className="justify-start gap-2"
                          onClick={() => setTheme(t as "dark" | "light")}
                        >
                          {t === "dark" && <Moon className="h-4 w-4" />}
                          {t === "light" && <Sun className="h-4 w-4" />}
                          {t === "system" && <Monitor className="h-4 w-4" />}
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security
                      </p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">Active Sessions</p>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Current Session</p>
                          <p className="text-sm text-muted-foreground">Chrome on macOS</p>
                        </div>
                        <Badge variant="success">Current</Badge>
                      </div>
                    </div>
                  </div>

                  <Button variant="destructive">Sign out all other sessions</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    Manage your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.name}
                        className={`p-4 rounded-lg border ${
                          plan.current
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{plan.name}</h3>
                          {plan.current && (
                            <Badge variant="default">Current</Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold mb-4">
                          {plan.price}
                          <span className="text-sm font-normal text-muted-foreground">
                            /month
                          </span>
                        </p>
                        <ul className="space-y-2 mb-4">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-success" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant={plan.current ? "outline" : "default"}
                          className="w-full"
                          disabled={plan.current}
                        >
                          {plan.current ? "Current" : "Upgrade"}
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">Usage this month</p>
                      <p className="text-sm text-muted-foreground">
                        2,453 / 10,000 jobs
                      </p>
                    </div>
                    <Button variant="outline">View Usage</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
