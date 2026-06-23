"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Shield, Clock, Mail, MoveHorizontal as MoreHorizontal, CreditCard as Edit, Trash2, Crown, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const roles = [
  { id: "owner", label: "Owner", color: "text-warning", icon: Crown },
  { id: "admin", label: "Admin", color: "text-primary", icon: Shield },
  { id: "member", label: "Member", color: "text-muted-foreground", icon: UserCheck },
];

const sampleMembers = [
  {
    id: "1",
    user_id: "user1",
    role: "owner",
    user: {
      email: "owner@example.com",
      full_name: "John Owner",
      avatar_url: null,
    },
    joined_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    user_id: "user2",
    role: "admin",
    user: {
      email: "admin@example.com",
      full_name: "Jane Admin",
      avatar_url: null,
    },
    joined_at: "2024-02-20T14:30:00Z",
    invited_by: "user1",
  },
  {
    id: "3",
    user_id: "user3",
    role: "member",
    user: {
      email: "member@example.com",
      full_name: "Bob Member",
      avatar_url: null,
    },
    joined_at: "2024-03-25T09:15:00Z",
    invited_by: "user1",
  },
];

export default function TeamPage() {
  const [members, setMembers] = useState(sampleMembers);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const handleInvite = () => {
    console.log("Inviting:", inviteEmail, "as", inviteRole);
    setInviteDialogOpen(false);
    setInviteEmail("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage your workspace members and permissions
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Invite a new member to your workspace
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <div className="flex gap-2">
                  {["admin", "member"].map((role) => (
                    <Button
                      key={role}
                      variant={inviteRole === role ? "default" : "outline"}
                      onClick={() => setInviteRole(role)}
                      className="flex-1 capitalize"
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={!inviteEmail}>
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Members", value: members.length, icon: Users },
          { label: "Admins", value: members.filter((m) => m.role === "admin").length, icon: Shield },
          { label: "Pending Invites", value: 2, icon: Clock },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>All Members ({members.length})</CardTitle>
              <CardDescription>
                Members with access to this workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {members.map((member, index) => {
                  const roleConfig = roles.find((r) => r.id === member.role);
                  const RoleIcon = roleConfig?.icon || UserCheck;
                  const initials = member.user.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || member.user.email[0].toUpperCase();

                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={member.user.avatar_url} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {member.user.full_name || "User"}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {member.role}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                        {member.role !== "owner" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <Edit className="h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-destructive">
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                What each role can do in this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-medium">Permission</th>
                      <th className="text-center p-4 font-medium">Owner</th>
                      <th className="text-center p-4 font-medium">Admin</th>
                      <th className="text-center p-4 font-medium">Member</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { perm: "Manage workspace settings", owner: true, admin: true, member: false },
                      { perm: "Invite team members", owner: true, admin: true, member: false },
                      { perm: "Create/delete projects", owner: true, admin: true, member: true },
                      { perm: "Create/edit tasks", owner: true, admin: true, member: true },
                      { perm: "Run jobs", owner: true, admin: true, member: true },
                      { perm: "View analytics", owner: true, admin: true, member: true },
                      { perm: "Manage billing", owner: true, admin: false, member: false },
                      { perm: "Delete workspace", owner: true, admin: false, member: false },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-4">{row.perm}</td>
                        <td className="p-4 text-center">
                          {row.owner && <UserCheck className="h-4 w-4 text-success mx-auto" />}
                        </td>
                        <td className="p-4 text-center">
                          {row.admin && <UserCheck className="h-4 w-4 text-success mx-auto" />}
                        </td>
                        <td className="p-4 text-center">
                          {row.member && <UserCheck className="h-4 w-4 text-success mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations waiting for acceptance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { email: "pending1@example.com", role: "member", created: "2024-03-20" },
                { email: "pending2@example.com", role: "admin", created: "2024-03-19" },
              ].map((invite, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as {invite.role} • {invite.created}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
