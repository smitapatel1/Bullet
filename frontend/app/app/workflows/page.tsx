"use client";

import { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import {
  Workflow as WorkflowIcon,
  Plus,
  Save,
  Play,
  Undo,
  Redo,
  Share,
  Settings,
  Zap,
  Globe,
  Mouse,
  Keyboard,
  Clock,
  Database,
  FileJson,
  Mail,
  Send,
  Webhook,
  Filter,
  Code,
  AlertCircle,
} from "lucide-react";
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

const initialNodes: Node[] = [
  {
    id: "start",
    type: "input",
    position: { x: 100, y: 100 },
    data: {
      label: "Start",
      icon: Zap,
    },
    className: "!bg-primary !border-primary/50",
  },
  {
    id: "browser",
    position: { x: 300, y: 100 },
    data: {
      label: "Open Browser",
      icon: Globe,
    },
    className: "!bg-blue-600/20 !border-blue-500/50",
  },
  {
    id: "click",
    position: { x: 500, y: 100 },
    data: {
      label: "Click Element",
      icon: Mouse,
    },
    className: "!bg-purple-600/20 !border-purple-500/50",
  },
  {
    id: "wait",
    position: { x: 500, y: 250 },
    data: {
      label: "Wait for Selector",
      icon: Clock,
    },
    className: "!bg-yellow-600/20 !border-yellow-500/50",
  },
  {
    id: "extract",
    position: { x: 700, y: 175 },
    data: {
      label: "Extract Data",
      icon: FileJson,
    },
    className: "!bg-green-600/20 !border-green-500/50",
  },
  {
    id: "end",
    type: "output",
    position: { x: 900, y: 175 },
    data: {
      label: "End",
      icon: Database,
    },
    className: "!bg-success/20 !border-success/50",
  },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "start", target: "browser", animated: true },
  { id: "e2", source: "browser", target: "click", animated: true },
  { id: "e3", source: "click", target: "wait", animated: true },
  { id: "e4", source: "wait", target: "extract", animated: true },
  { id: "e5", source: "extract", target: "end", animated: true },
];

const nodeTypes = [
  { type: "browser", label: "Browser Action", icon: Globe, color: "#3b82f6" },
  { type: "click", label: "Click", icon: Mouse, color: "#8b5cf6" },
  { type: "type", label: "Type Text", icon: Keyboard, color: "#a855f7" },
  { type: "wait", label: "Wait", icon: Clock, color: "#eab308" },
  { type: "extract", label: "Extract Data", icon: FileJson, color: "#22c55e" },
  { type: "api", label: "API Request", icon: Webhook, color: "#f97316" },
  { type: "condition", label: "Condition", icon: Filter, color: "#ec4899" },
  { type: "code", label: "Run Code", icon: Code, color: "#14b8a6" },
  { type: "send", label: "Send Email", icon: Mail, color: "#6366f1" },
];

function CustomNode({ data }: { data: { label: string; icon: React.ElementType } }) {
  const Icon = data.icon;
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Icon className="h-4 w-4" />
      <span className="text-sm text-white">{data.label}</span>
    </div>
  );
}

const nodeTypesMap = {
  input: CustomNode,
  output: CustomNode,
  default: CustomNode,
};

export default function WorkflowBuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [saved, setSaved] = useState(false);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, type: "smoothstep" }, eds)
      ),
    []
  );

  const handleSave = () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges,
    };
    console.log("Saving workflow:", workflow);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRun = () => {
    console.log("Running workflow...");
  };

  const addNode = (type: string) => {
    const nodeConfig = nodeTypes.find((n) => n.type === type);
    if (!nodeConfig) return;

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        label: nodeConfig.label,
        icon: nodeConfig.icon,
      },
      className: `!bg-opacity-20`,
    };

    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-xl font-semibold border-transparent bg-transparent h-auto w-auto focus:border-border"
          />
          {saved && (
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-success"
            >
              Saved
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" className="gap-2">
            <Share className="h-4 w-4" />
            Share
          </Button>
          <Button onClick={handleRun} className="gap-2">
            <Play className="h-4 w-4" />
            Run
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-border overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypesMap}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255,255,255,0.1)"
          />
          <Controls className="!bg-card !border-border !rounded-lg overflow-hidden" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor="rgba(59,130,246,0.5)"
          />
          <Panel position="left" className="space-y-2">
            <Card className="w-56 p-3">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm">Add Node</CardTitle>
              </CardHeader>
              <CardContent className="p-0 grid grid-cols-2 gap-2">
                {nodeTypes.map((node) => (
                  <Button
                    key={node.type}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 text-xs"
                    onClick={() => addNode(node.type)}
                  >
                    <node.icon
                      className="h-3 w-3"
                      style={{ color: node.color }}
                    />
                    {node.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
