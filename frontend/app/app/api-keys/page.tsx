"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Plus, Copy, Eye, EyeOff, Trash2, Shield, Clock, Calendar, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore, api } from "@/lib/store";
import { formatRelativeTime, formatDate } from "@/lib/utils";

interface ApiKeyData {
  id: string;
  name: string;
  key_prefix: string;
  key?: string;
  workspace_id: string | null;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

const defaultScopes = [
  { id: "read:jobs", label: "Read Jobs" },
  { id: "write:jobs", label: "Create/Cancel Jobs" },
  { id: "read:tasks", label: "Read Tasks" },
  { id: "write:tasks", label: "Manage Tasks" },
  { id: "read:data", label: "Read Data Stores" },
  { id: "write:data", label: "Manage Data Stores" },
  { id: "read:projects", label: "Read Projects" },
  { id: "write:projects", label: "Manage Projects" },
];

export default function ApiKeysPage() {
  const { currentWorkspace, user } = useAppStore();
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: "",
    expires: "",
    scopes: [] as string[],
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const data = await api.apiKeys.list(currentWorkspace?.id);
        setApiKeys(data);
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApiKeys();
  }, [currentWorkspace?.id]);

  const handleCreateKey = async () => {
    try {
      const key = await api.apiKeys.create({
        name: newKeyData.name,
        workspace_id: currentWorkspace?.id,
        scopes: newKeyData.scopes,
        expires_at: newKeyData.expires || undefined,
      });
      setApiKeys([key, ...apiKeys]);
      setCreatedKey(key.key || null);
      setCreateDialogOpen(false);
      setNewKeyData({ name: "", expires: "", scopes: [] });
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await api.apiKeys.revoke(keyId);
      setApiKeys(apiKeys.filter((k) => k.id !== keyId));
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const handleCopyKey = (keyId: string) => {
    const key = apiKeys.find((k) => k.id === keyId);
    if (key?.key_prefix) {
      navigator.clipboard.writeText(key.key_prefix);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  const toggleScope = (scopeId: string) => {
    setNewKeyData({
      ...newKeyData,
      scopes: newKeyData.scopes.includes(scopeId)
        ? newKeyData.scopes.filter((s) => s !== scopeId)
        : [...newKeyData.scopes, scopeId],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-info" />
            <CardTitle className="text-lg">Security Notice</CardTitle>
          </div>
          <CardDescription>
            API keys provide full access to your account. Keep them secure and never share them publicly.
          </CardDescription>
        </CardHeader>
      </Card>

      {createdKey && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-success/10 border border-success/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium">API Key Created!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Copy your new API key now. You won't be able to see it again.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-success/10 px-3 py-2 rounded font-mono text-sm border border-success/20">
                  {createdKey}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(createdKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => setCreatedKey(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        <AnimatePresence>
          {apiKeys.map((key, index) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  key.revoked_at
                    ? "bg-muted/50 border-muted opacity-60"
                    : "bg-card/50 border-border hover:border-border/80"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      key.revoked_at
                        ? "bg-muted"
                        : "bg-primary/10"
                    }`}
                  >
                    <Key
                      className={`h-5 w-5 ${
                        key.revoked_at ? "text-muted-foreground" : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {key.revoked_at && (
                        <Badge variant="destructive">Revoked</Badge>
                      )}
                      {key.workspace_id && (
                        <Badge variant="outline" className="text-xs">
                          Workspace
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <code className="font-mono">{key.key_prefix}...</code>
                      <span>•</span>
                      <span>{formatRelativeTime(key.created_at)}</span>
                      {key.last_used_at && (
                        <>
                          <span>•</span>
                          <span>
                            Last used {formatRelativeTime(key.last_used_at)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!key.revoked_at && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyKey(key.id)}
                      >
                        {copiedKeyId === key.id ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Revoke API Key?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The API key will
                              stop working immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevokeKey(key.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {apiKeys.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Key className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No API keys</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create an API key to access the platform programmatically
            </p>
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="My API Key"
                value={newKeyData.name}
                onChange={(e) =>
                  setNewKeyData({ ...newKeyData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Expiration Date (optional)
              </label>
              <Input
                type="datetime-local"
                value={newKeyData.expires}
                onChange={(e) =>
                  setNewKeyData({ ...newKeyData, expires: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scopes</label>
              <div className="grid grid-cols-2 gap-2">
                {defaultScopes.map((scope) => (
                  <label
                    key={scope.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      newKeyData.scopes.includes(scope.id)
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card border-border hover:border-border/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={newKeyData.scopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={!newKeyData.name || newKeyData.scopes.length === 0}
            >
              Create API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
