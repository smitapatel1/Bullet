"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Download,
  Trash2,
  Eye,
  Search,
  Filter,
  MoreHorizontal,
  FileJson,
  FileSpreadsheet,
  Table,
  Calendar,
  Folder,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import { useAppStore, api } from "@/lib/store";
import { formatDate, formatBytes, formatNumber } from "@/lib/utils";

interface DataStoreItem {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface DataStoreData {
  id: string;
  name: string;
  format: string;
  row_count: number;
  size_bytes: number;
  created_at: string;
  project_id: string;
}

export default function DataStoresPage() {
  const { currentWorkspace } = useAppStore();
  const [dataStores, setDataStores] = useState<DataStoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState<DataStoreData | null>(null);
  const [items, setItems] = useState<DataStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [searchColumn, setSearchColumn] = useState("");
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Stores</h1>
          <p className="text-muted-foreground">
            Browse and export your extracted data
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Stores", value: "12", icon: Database },
          { label: "Total Records", value: "45.2k", icon: Table },
          { label: "Storage Used", value: "1.2 GB", icon: Folder },
          { label: "Exports Today", value: "23", icon: Download },
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

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Database className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      Data Store {i + 1}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{Math.floor(Math.random() * 10000)} records</span>
                      <span>•</span>
                      <span>{formatBytes(Math.floor(Math.random() * 1000000))}</span>
                      <span>•</span>
                      <span>{formatDate(new Date(Date.now() - i * 86400000))}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">JSON</Badge>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    onClick={() => setExportDialogOpen(true)}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Eye className="h-4 w-4" />
                        View Data
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>
              Choose format and options for your export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {["json", "csv", "excel"].map((fmt) => (
                  <Button
                    key={fmt}
                    variant={exportFormat === fmt ? "default" : "outline"}
                    className="gap-2"
                    onClick={() => setExportFormat(fmt)}
                  >
                    {fmt === "json" && <FileJson className="h-4 w-4" />}
                    {fmt === "csv" && <FileSpreadsheet className="h-4 w-4" />}
                    {fmt === "excel" && <Table className="h-4 w-4" />}
                    {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Records (optional)</label>
              <Input type="number" placeholder="All records" />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
