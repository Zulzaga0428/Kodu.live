import { useState, useRef, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  ArrowLeftIcon, SendIcon, CheckCircle2Icon, CircleIcon, ClockIcon,
  Trash2Icon, Loader2Icon, SettingsIcon, PlusIcon, MessageSquareIcon,
  FolderIcon, FileIcon, FileTextIcon, ChevronRightIcon, ChevronDownIcon,
  PlayIcon, MonitorIcon, TerminalIcon, CodeIcon, BotIcon, ListTodoIcon,
  FileCodeIcon, RefreshCwIcon, MoreHorizontalIcon, ZapIcon
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import {
  useGetProject,
  useUpdateProject,
  useDeleteProject,
  useListMessages,
  useCreateMessage,
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getGetProjectQueryKey,
  getListMessagesQueryKey,
  getListTasksQueryKey,
  ProjectStatus,
  TaskStatus,
  MessageRole,
} from "@workspace/api-client-react";

// ── Types ────────────────────────────────────────────────────────────────────

type AgentTab = "agent" | "planner";
type WorkspaceTab = "code" | "preview" | "terminal";

// Simulated file tree
const FILE_TREE = [
  { id: "1", name: "src", type: "folder" as const, depth: 0, open: true },
  { id: "2", name: "app", type: "folder" as const, depth: 1, open: true },
  { id: "3", name: "page.tsx", type: "file" as const, depth: 2, ext: "tsx" },
  { id: "4", name: "layout.tsx", type: "file" as const, depth: 2, ext: "tsx" },
  { id: "5", name: "globals.css", type: "file" as const, depth: 2, ext: "css" },
  { id: "6", name: "components", type: "folder" as const, depth: 1, open: true },
  { id: "7", name: "ui", type: "folder" as const, depth: 2, open: false },
  { id: "8", name: "Header.tsx", type: "file" as const, depth: 2, ext: "tsx" },
  { id: "9", name: "Footer.tsx", type: "file" as const, depth: 2, ext: "tsx" },
  { id: "10", name: "lib", type: "folder" as const, depth: 1, open: false },
  { id: "11", name: "public", type: "folder" as const, depth: 0, open: false },
  { id: "12", name: "package.json", type: "file" as const, depth: 0, ext: "json" },
  { id: "13", name: "next.config.ts", type: "file" as const, depth: 0, ext: "ts" },
  { id: "14", name: "kodu.md", type: "file" as const, depth: 0, ext: "md" },
];

const STARTER_CODE = `import { NextRequest, NextResponse } from "next/server";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col 
      items-center justify-center p-24">
      <h1 className="text-4xl font-bold">
        Сайн уу, kodu.live! 👋
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Таны Next.js апп бэлэн боллоо.
      </p>
    </main>
  );
}`;

const TERMINAL_LINES = [
  { text: "$ pnpm install", type: "cmd" as const },
  { text: "Packages: +342", type: "info" as const },
  { text: "Done in 4.2s", type: "success" as const },
  { text: "$ pnpm run dev", type: "cmd" as const },
  { text: "  ▲ Next.js 15.0.0", type: "info" as const },
  { text: "  - Local:  http://localhost:3000", type: "info" as const },
  { text: "  ✓ Ready in 892ms", type: "success" as const },
  { text: "$ _", type: "cursor" as const },
];

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: "Идэвхтэй",
  completed: "Дууссан",
  archived: "Архивласан",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  completed: "secondary",
  archived: "outline",
};

// ── Root component ────────────────────────────────────────────────────────────

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: project, isLoading, error } = useGetProject(id, {
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) },
  });
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();

  const handleDelete = () => {
    if (!confirm("Төслийг устгахдаа итгэлтэй байна уу?")) return;
    deleteProject.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Төсөл устгагдлаа" });
        setLocation("/dashboard");
      },
    });
  };

  const handleStatusChange = (status: ProjectStatus) => {
    updateProject.mutate({ id, data: { status } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetProjectQueryKey(id), data);
        toast({ title: "Төлөв шинэчлэгдлээ" });
      },
    });
  };

  if (error) return <ErrorScreen onBack={() => setLocation("/dashboard")} />;
  if (isLoading || !project) return <LoadingScreen />;

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      {/* ── Top bar ── */}
      <header className="h-11 border-b border-border flex items-center justify-between px-3 shrink-0 bg-card z-10">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <ArrowLeftIcon className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ZapIcon className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-sm font-semibold">{project.name}</span>
            <Badge
              variant={STATUS_VARIANT[project.status] ?? "outline"}
              className="text-[9px] font-mono uppercase px-1.5 py-0 h-4 ml-1"
            >
              {STATUS_LABEL[project.status] ?? project.status}
            </Badge>
          </div>
        </div>

        {/* Center: action buttons */}
        <div className="flex items-center gap-1">
          <Button size="sm" className="h-7 gap-1.5 text-xs font-mono px-3">
            <PlayIcon className="w-3 h-3" />
            Ажиллуулах
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-mono px-3">
            <RefreshCwIcon className="w-3 h-3" />
            Шинэчлэх
          </Button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 font-mono text-xs">
              <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.active)}>
                Идэвхтэй болгох
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.completed)}>
                Дууссан болгох
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.archived)}>
                Архивлах
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2Icon className="w-3 h-3 mr-2" /> Устгах
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Three-panel workspace ── */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">

          {/* ── Panel 1: Agent ── */}
          <ResizablePanel defaultSize={28} minSize={20} className="flex flex-col">
            <AgentPanel projectId={id} project={project} />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors w-[3px]" />

          {/* ── Panel 2: Code / Preview / Terminal ── */}
          <ResizablePanel defaultSize={47} minSize={30} className="flex flex-col">
            <WorkspacePanel />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors w-[3px]" />

          {/* ── Panel 3: Files ── */}
          <ResizablePanel defaultSize={25} minSize={16} className="flex flex-col">
            <FilesPanel project={project} />
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
}

// ── Agent Panel (left) ────────────────────────────────────────────────────────

function AgentPanel({ projectId, project }: { projectId: string; project: any }) {
  const [tab, setTab] = useState<AgentTab>("agent");

  return (
    <div className="flex flex-col h-full bg-[hsl(240_10%_5%)]">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        <TabBtn active={tab === "agent"} onClick={() => setTab("agent")} icon={<BotIcon className="w-3 h-3" />} label="Kodu Agent" />
        <TabBtn active={tab === "planner"} onClick={() => setTab("planner")} icon={<ListTodoIcon className="w-3 h-3" />} label="Төлөвлөгөө" />
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "agent" ? (
          <ChatPanel projectId={projectId} />
        ) : (
          <PlannerPanel projectId={projectId} />
        )}
      </div>
    </div>
  );
}

// ── Workspace Panel (center) ──────────────────────────────────────────────────

function WorkspacePanel() {
  const [tab, setTab] = useState<WorkspaceTab>("code");
  const [code, setCode] = useState(STARTER_CODE);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["1", "2", "6"]));

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border shrink-0 bg-card/40">
        <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={<CodeIcon className="w-3 h-3" />} label="Код" />
        <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={<MonitorIcon className="w-3 h-3" />} label="Preview" />
        <TabBtn active={tab === "terminal"} onClick={() => setTab("terminal")} icon={<TerminalIcon className="w-3 h-3" />} label="Terminal" />
        <div className="ml-auto flex items-center pr-2 gap-1">
          {tab === "preview" && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground border border-border rounded px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              localhost:3000
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "code" && (
          <div className="h-full flex">
            {/* Line numbers */}
            <div className="select-none w-10 text-right pr-3 pt-4 pb-4 text-[11px] font-mono text-muted-foreground/40 bg-card/20 border-r border-border/30 overflow-hidden">
              {code.split("\n").map((_, i) => (
                <div key={i} className="leading-[1.6rem]">{i + 1}</div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none bg-transparent text-[13px] font-mono leading-[1.6rem] p-4 pl-4 outline-none text-foreground caret-primary"
              style={{ tabSize: 2 }}
            />
          </div>
        )}

        {tab === "preview" && (
          <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
            <div className="w-full max-w-sm rounded-xl border border-border overflow-hidden shadow-2xl">
              <div className="bg-card h-8 flex items-center gap-1.5 px-3 border-b border-border">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="flex-1 text-center text-[10px] font-mono text-muted-foreground">localhost:3000</span>
              </div>
              <div className="h-64 bg-[#111] flex flex-col items-center justify-center text-center p-6">
                <h2 className="text-lg font-bold text-white mb-2">Сайн уу, kodu.live! 👋</h2>
                <p className="text-sm text-gray-400">Таны Next.js апп бэлэн боллоо.</p>
                <div className="mt-4 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-mono">
                  ✓ Compiled successfully
                </div>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">Preview — Ажиллуулахын дараа харагдана</p>
          </div>
        )}

        {tab === "terminal" && (
          <div className="h-full bg-[#0d0d0d] p-4 font-mono text-[12px] overflow-auto">
            <div className="flex flex-col gap-1">
              {TERMINAL_LINES.map((line, i) => (
                <div key={i} className={
                  line.type === "cmd" ? "text-primary" :
                  line.type === "success" ? "text-green-400" :
                  line.type === "cursor" ? "text-foreground animate-pulse" :
                  "text-muted-foreground"
                }>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Files Panel (right) ───────────────────────────────────────────────────────

function FilesPanel({ project }: { project: any }) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(["1", "2", "6"]));
  const [activeFile, setActiveFile] = useState<string>("3");
  const [showKodu, setShowKodu] = useState(false);
  const [koduContent, setKoduContent] = useState(project.description || "");

  const updateProject = useUpdateProject();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleKoduChange = (val: string) => {
    setKoduContent(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateProject.mutate({ id: project.id, data: { description: val } }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetProjectQueryKey(project.id), (old: any) =>
            old ? { ...old, description: data.description } : old
          );
        },
      });
    }, 800);
  };

  const extColor: Record<string, string> = {
    tsx: "text-blue-400",
    ts: "text-blue-500",
    css: "text-pink-400",
    json: "text-yellow-400",
    md: "text-green-400",
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(240_10%_4%)] border-l border-border">
      {/* Header */}
      <div className="h-9 border-b border-border flex items-center justify-between px-3 shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground font-semibold uppercase tracking-wider">Файлууд</span>
        <button
          onClick={() => setShowKodu(!showKodu)}
          className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
            showKodu ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          kodu.md
        </button>
      </div>

      {showKodu ? (
        /* kodu.md editor */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/20 shrink-0">
            <div className="flex items-center gap-1.5">
              <FileTextIcon className="w-3 h-3 text-green-400" />
              <span className="text-[11px] font-mono text-muted-foreground">kodu.md</span>
            </div>
            {updateProject.isPending && <Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
          <Textarea
            value={koduContent}
            onChange={(e) => handleKoduChange(e.target.value)}
            placeholder={"# Төслийн тэмдэглэл\n\nАрхитектур, дүрэм, контекстаа энд бичнэ үү..."}
            className="flex-1 resize-none border-0 rounded-none focus-visible:ring-0 p-3 font-mono text-[12px] leading-relaxed bg-transparent text-muted-foreground placeholder:text-muted-foreground/30"
          />
        </div>
      ) : (
        /* File tree */
        <ScrollArea className="flex-1">
          <div className="py-1">
            {FILE_TREE.map((item) => {
              if (item.type === "folder") {
                const isOpen = openFolders.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleFolder(item.id)}
                    className="w-full flex items-center gap-1 px-2 py-[3px] hover:bg-accent/10 transition-colors text-left group"
                    style={{ paddingLeft: `${8 + item.depth * 12}px` }}
                  >
                    {isOpen ? (
                      <ChevronDownIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRightIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                    <FolderIcon className="w-3.5 h-3.5 text-yellow-400/80 shrink-0" />
                    <span className="text-[12px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.name}
                    </span>
                  </button>
                );
              }

              // Check if parent folder is open
              const parentDepth = item.depth - 1;
              if (parentDepth >= 0) {
                const parent = FILE_TREE.find(
                  (f) => f.type === "folder" && f.depth === parentDepth &&
                  FILE_TREE.indexOf(f) < FILE_TREE.indexOf(item)
                );
                if (parent && !openFolders.has(parent.id)) return null;
              }

              const isActive = activeFile === item.id;
              const color = extColor[item.ext ?? ""] ?? "text-muted-foreground";
              const isKodu = item.name === "kodu.md";

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isKodu) { setShowKodu(true); return; }
                    setActiveFile(item.id);
                  }}
                  className={`w-full flex items-center gap-1.5 py-[3px] hover:bg-accent/10 transition-colors text-left ${
                    isActive ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                  style={{ paddingLeft: `${8 + item.depth * 12}px` }}
                >
                  <FileCodeIcon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                  <span className={`text-[12px] font-mono transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

function ChatPanel({ projectId }: { projectId: string }) {
  const { data: messages, isLoading } = useListMessages(projectId, {
    query: { enabled: !!projectId, queryKey: getListMessagesQueryKey(projectId) },
  });
  const createMessage = useCreateMessage();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || createMessage.isPending) return;
    const content = input;
    setInput("");
    createMessage.mutate({ id: projectId, data: { role: MessageRole.user, content } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) }),
    });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-3 pb-2">
          {isLoading ? (
            <div className="flex justify-center pt-8">
              <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center mt-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BotIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground">Kodu Agent бэлэн.</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Даалгавраа бичнэ үү...</p>
              </div>
            </div>
          ) : (
            messages?.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <span className="text-[9px] font-mono text-muted-foreground/60 uppercase px-1">
                  {msg.role === "user" ? "Та" : "Kodu"}
                </span>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {createMessage.isPending && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BotIcon className="w-3 h-3 text-primary" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border shrink-0">
        <div className="flex gap-2 bg-card border border-border rounded-lg overflow-hidden focus-within:border-primary/50 transition-colors">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Kodu-д зааварч..."
            className="min-h-[38px] h-[38px] max-h-[120px] resize-none border-0 rounded-none focus-visible:ring-0 py-2.5 px-3 text-[12px] font-mono bg-transparent"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || createMessage.isPending}
            size="icon"
            className="h-full rounded-none w-9 shrink-0"
          >
            <SendIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Planner Panel ─────────────────────────────────────────────────────────────

function PlannerPanel({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useListTasks(projectId, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey(projectId) },
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createTask.mutate({ id: projectId, data: { title: newTitle, order: tasks?.length ?? 0 } }, {
      onSuccess: () => {
        setNewTitle("");
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
      },
    });
  };

  const cycleStatus = (taskId: string, current: TaskStatus) => {
    const next = current === TaskStatus.pending ? TaskStatus.in_progress
               : current === TaskStatus.in_progress ? TaskStatus.done
               : TaskStatus.pending;
    queryClient.setQueryData(getListTasksQueryKey(projectId), (old: any) =>
      old?.map((t: any) => t.id === taskId ? { ...t, status: next } : t)
    );
    updateTask.mutate({ id: projectId, taskId, data: { status: next } });
  };

  const remove = (taskId: string) => {
    deleteTask.mutate({ id: projectId, taskId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) }),
    });
  };

  const sorted = tasks ? [...tasks].sort((a, b) => a.order - b.order) : [];
  const done = sorted.filter((t) => t.status === "done").length;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-muted-foreground">{done} / {sorted.length} дууссан</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {sorted.length > 0 ? Math.round((done / sorted.length) * 100) : 0}%
          </span>
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${sorted.length > 0 ? (done / sorted.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-col gap-1">
          {isLoading ? (
            <div className="flex justify-center pt-6"><Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-8 text-[11px] font-mono text-muted-foreground/50">
              Даалгавар байхгүй байна
            </div>
          ) : sorted.map((task) => (
            <div key={task.id}
              className="group flex items-start gap-2 p-2 rounded-md hover:bg-accent/5 border border-transparent hover:border-border/30 transition-all">
              <button onClick={() => cycleStatus(task.id, task.status)} className="mt-0.5 shrink-0">
                {task.status === "done" ? (
                  <CheckCircle2Icon className="w-3.5 h-3.5 text-primary" />
                ) : task.status === "in_progress" ? (
                  <ClockIcon className="w-3.5 h-3.5 text-yellow-500" />
                ) : (
                  <CircleIcon className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-primary transition-colors" />
                )}
              </button>
              <span className={`flex-1 text-[12px] font-mono leading-snug ${
                task.status === "done" ? "line-through text-muted-foreground/50" : "text-foreground"
              }`}>
                {task.title}
              </span>
              <button
                onClick={() => remove(task.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
              >
                <Trash2Icon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleCreate} className="p-2 border-t border-border shrink-0">
        <div className="flex gap-1.5">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Шинэ алхам нэмэх..."
            className="h-7 text-[12px] font-mono bg-card border-border"
          />
          <Button type="submit" size="icon" className="h-7 w-7 shrink-0" disabled={!newTitle.trim()}>
            <PlusIcon className="w-3 h-3" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── TabBtn ────────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 h-9 text-[11px] font-mono border-b-2 transition-colors ${
        active
          ? "border-primary text-foreground bg-card/30"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Utility screens ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="h-[100dvh] flex items-center justify-center bg-background">
      <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function ErrorScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 bg-background">
      <p className="font-mono text-sm text-destructive">Алдаа гарлаа</p>
      <Button variant="outline" size="sm" onClick={onBack}>Буцах</Button>
    </div>
  );
}
