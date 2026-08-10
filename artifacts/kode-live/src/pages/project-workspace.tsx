import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
const MonacoEditor = lazy(() => import("@monaco-editor/react"));
import { Link, useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  ArrowLeftIcon, SendIcon, CheckCircle2Icon, CircleIcon, ClockIcon,
  Trash2Icon, Loader2Icon, SettingsIcon, PlusIcon, MessageSquareIcon,
  FolderIcon, FileTextIcon, ChevronRightIcon, ChevronDownIcon,
  PlayIcon, MonitorIcon, TerminalIcon, CodeIcon, BotIcon, ListTodoIcon,
  FileCodeIcon, RefreshCwIcon, ZapIcon, WrenchIcon, CheckIcon, XIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SettingsModal } from "@/components/settings-modal";

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
type FileEntry = { path: string; type: "file" | "dir" };
type TerminalLine = { text: string; type: "cmd" | "output" | "success" | "error" | "info" };

// ── File ext helpers ──────────────────────────────────────────────────────────

const EXT_COLOR: Record<string, string> = {
  tsx: "text-blue-400", ts: "text-blue-500", jsx: "text-blue-300",
  js: "text-yellow-400", css: "text-pink-400", scss: "text-pink-300",
  json: "text-yellow-300", md: "text-green-400", html: "text-orange-400",
  py: "text-emerald-400", env: "text-muted-foreground",
};

function extColor(name: string): string {
  const ext = name.split(".").pop() ?? "";
  return EXT_COLOR[ext] ?? "text-muted-foreground";
}

function monacoLang(filename: string): string {
  const ext = filename.split(".").pop() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    css: "css", scss: "scss",
    json: "json", md: "markdown",
    html: "html", yaml: "yaml", yml: "yaml",
    py: "python", sh: "shell",
    toml: "toml", prisma: "prisma",
  };
  return map[ext] ?? "plaintext";
}

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const queryClient = useQueryClient();

  // ── Shared editor state ─────────────────────────────────────────────────────
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: "$ Kodu Agent бэлэн байна. Зааварчилгаагаа бичнэ үү.", type: "info" },
  ]);

  // Fetch file tree from API
  const fetchFileTree = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/files`);
      const data = await res.json();
      if (data.files) setFileTree(data.files);
    } catch {}
  }, [id]);

  useEffect(() => { fetchFileTree(); }, [fetchFileTree]);

  // Called by ChatPanel when agent writes/deletes a file
  const handleFileChanged = useCallback((path: string, content: string) => {
    if (activeFile === path) setActiveContent(content);
  }, [activeFile]);

  const handleFileTree = useCallback((files: FileEntry[]) => {
    setFileTree(files);
  }, []);

  const handleTerminalLine = useCallback((line: TerminalLine) => {
    setTerminalLines((prev) => [...prev.slice(-200), line]);
  }, []);

  // Load file content when user clicks a file
  const handleSelectFile = useCallback(async (path: string) => {
    setActiveFile(path);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${BASE}/api/projects/${id}/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content !== undefined) setActiveContent(data.content);
    } catch {
      setActiveContent("// Файл уншиж чадсангүй");
    }
  }, [id]);

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
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      {/* ── Top bar ── */}
      <header className="h-11 border-b border-border flex items-center justify-between px-3 shrink-0 bg-card z-10">
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

        <div className="flex items-center gap-1">
          <Button size="sm" className="h-7 gap-1.5 text-xs font-mono px-3">
            <PlayIcon className="w-3 h-3" />
            Ажиллуулах
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-mono px-3" onClick={fetchFileTree}>
            <RefreshCwIcon className="w-3 h-3" />
            Шинэчлэх
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <SettingsIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 font-mono text-xs">
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <SettingsIcon className="w-3 h-3 mr-2" /> Тохиргоо
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.active)}>Идэвхтэй болгох</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.completed)}>Дууссан болгох</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.archived)}>Архивлах</DropdownMenuItem>
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
          <ResizablePanel defaultSize={28} minSize={20} className="flex flex-col">
            <AgentPanel
              projectId={id}
              project={project}
              onFileChanged={handleFileChanged}
              onFileTree={handleFileTree}
              onTerminalLine={handleTerminalLine}
            />
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors w-[3px]" />
          <ResizablePanel defaultSize={47} minSize={30} className="flex flex-col">
            <WorkspacePanel
              activeFile={activeFile}
              activeContent={activeContent}
              onContentChange={setActiveContent}
              terminalLines={terminalLines}
            />
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors w-[3px]" />
          <ResizablePanel defaultSize={25} minSize={16} className="flex flex-col">
            <FilesPanel
              project={project}
              fileTree={fileTree}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

// ── Agent Panel (left) ────────────────────────────────────────────────────────

type AgentPanelProps = {
  projectId: string;
  project: any;
  onFileChanged: (path: string, content: string) => void;
  onFileTree: (files: FileEntry[]) => void;
  onTerminalLine: (line: TerminalLine) => void;
};

function AgentPanel({ projectId, project, onFileChanged, onFileTree, onTerminalLine }: AgentPanelProps) {
  const [tab, setTab] = useState<AgentTab>("agent");

  return (
    <div className="flex flex-col h-full bg-[hsl(240_10%_5%)]">
      <div className="flex border-b border-border shrink-0">
        <TabBtn active={tab === "agent"} onClick={() => setTab("agent")} icon={<BotIcon className="w-3 h-3" />} label="Kodu Agent" />
        <TabBtn active={tab === "planner"} onClick={() => setTab("planner")} icon={<ListTodoIcon className="w-3 h-3" />} label="Төлөвлөгөө" />
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "agent" ? (
          <ChatPanel
            projectId={projectId}
            onFileChanged={onFileChanged}
            onFileTree={onFileTree}
            onTerminalLine={onTerminalLine}
          />
        ) : (
          <PlannerPanel projectId={projectId} />
        )}
      </div>
    </div>
  );
}

// ── Workspace Panel (center) ──────────────────────────────────────────────────

type WorkspacePanelProps = {
  activeFile: string | null;
  activeContent: string;
  onContentChange: (c: string) => void;
  terminalLines: TerminalLine[];
};

function WorkspacePanel({ activeFile, activeContent, onContentChange, terminalLines }: WorkspacePanelProps) {
  const [tab, setTab] = useState<WorkspaceTab>("code");
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "terminal" && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines, tab]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center border-b border-border shrink-0 bg-card/40">
        <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={<CodeIcon className="w-3 h-3" />} label="Код" />
        <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={<MonitorIcon className="w-3 h-3" />} label="Preview" />
        <TabBtn active={tab === "terminal"} onClick={() => setTab("terminal")} icon={<TerminalIcon className="w-3 h-3" />} label="Terminal" />
        {activeFile && (
          <div className="ml-auto flex items-center pr-3 gap-1.5">
            <span className={`text-[10px] font-mono ${extColor(activeFile)}`}>
              {activeFile.split("/").pop()}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "code" && (
          <div className="h-full flex flex-col">
            {activeFile ? (
              <Suspense fallback={
                <div className="flex-1 flex items-center justify-center">
                  <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              }>
                <MonacoEditor
                  height="100%"
                  path={activeFile}
                  language={monacoLang(activeFile)}
                  value={activeContent}
                  onChange={(v) => onContentChange(v ?? "")}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    fontLigatures: true,
                    lineHeight: 22,
                    tabSize: 2,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    renderLineHighlight: "gutter",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    padding: { top: 12, bottom: 12 },
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                  }}
                />
              </Suspense>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[11px] font-mono text-muted-foreground/40">
                ← Зүүн талаас файл сонгох эсвэл агентад хэлнэ үү
              </div>
            )}
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
                <h2 className="text-lg font-bold text-white mb-2">Kodu Agent Preview</h2>
                <p className="text-sm text-gray-400">pnpm run dev дуусгасны дараа харагдана.</p>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">Агент "pnpm install && pnpm run dev" ажиллуулбал бэлэн болно</p>
          </div>
        )}

        {tab === "terminal" && (
          <div ref={terminalRef} className="h-full bg-[#0d0d0d] p-4 font-mono text-[12px] overflow-auto">
            <div className="flex flex-col gap-0.5">
              {terminalLines.map((line, i) => (
                <div key={i} className={
                  line.type === "cmd" ? "text-primary" :
                  line.type === "success" ? "text-green-400" :
                  line.type === "error" ? "text-red-400" :
                  "text-muted-foreground"
                }>
                  {line.text}
                </div>
              ))}
              <div className="text-foreground animate-pulse">▋</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Files Panel (right) ───────────────────────────────────────────────────────

type FilesPanelProps = {
  project: any;
  fileTree: FileEntry[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
};

function FilesPanel({ project, fileTree, activeFile, onSelectFile }: FilesPanelProps) {
  const [closedDirs, setClosedDirs] = useState<Set<string>>(new Set());
  const [showKodu, setShowKodu] = useState(false);
  const [koduContent, setKoduContent] = useState(project.description || "");
  const updateProject = useUpdateProject();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleDir = (path: string) => {
    setClosedDirs((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
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

  // Check if a path is inside a collapsed directory
  const isHidden = (path: string) => {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join("/");
      if (closedDirs.has(parent)) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(240_10%_4%)] border-l border-border">
      <div className="h-9 border-b border-border flex items-center justify-between px-3 shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground font-semibold uppercase tracking-wider">
          Файлууд {fileTree.filter(f => f.type === "file").length > 0 && `(${fileTree.filter(f => f.type === "file").length})`}
        </span>
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/20 shrink-0">
            <div className="flex items-center gap-1.5">
              <FileTextIcon className="w-3 h-3 text-green-400" />
              <span className="text-[11px] font-mono text-muted-foreground">kodu.md</span>
            </div>
            {updateProject.isPending && <Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
          <textarea
            value={koduContent}
            onChange={(e) => handleKoduChange(e.target.value)}
            placeholder={"# Төслийн тэмдэглэл\n\nАрхитектур, дүрэм, контекстаа энд бичнэ үү..."}
            className="flex-1 resize-none border-0 rounded-none p-3 font-mono text-[12px] leading-relaxed bg-transparent text-muted-foreground placeholder:text-muted-foreground/30 outline-none"
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="py-1">
            {fileTree.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11px] font-mono text-muted-foreground/40">
                Агент файл үүсгэхэд энд харагдана
              </div>
            ) : (
              fileTree.map((item) => {
                if (isHidden(item.path)) return null;
                const depth = item.path.split("/").length - 1;
                const name = item.path.split("/").pop() ?? item.path;

                if (item.type === "dir") {
                  const isOpen = !closedDirs.has(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => toggleDir(item.path)}
                      className="w-full flex items-center gap-1 py-[3px] hover:bg-accent/10 transition-colors text-left group"
                      style={{ paddingLeft: `${8 + depth * 12}px` }}
                    >
                      {isOpen ? <ChevronDownIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                               : <ChevronRightIcon className="w-3 h-3 text-muted-foreground shrink-0" />}
                      <FolderIcon className="w-3.5 h-3.5 text-yellow-400/80 shrink-0" />
                      <span className="text-[12px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                        {name}
                      </span>
                    </button>
                  );
                }

                const isActive = activeFile === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => onSelectFile(item.path)}
                    className={`w-full flex items-center gap-1.5 py-[3px] hover:bg-accent/10 transition-colors text-left ${
                      isActive ? "bg-primary/10 border-l-2 border-primary" : ""
                    }`}
                    style={{ paddingLeft: `${8 + depth * 12}px` }}
                  >
                    <FileCodeIcon className={`w-3.5 h-3.5 shrink-0 ${extColor(name)}`} />
                    <span className={`text-[12px] font-mono transition-colors truncate ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>
                      {name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ── Tool call card ────────────────────────────────────────────────────────────

type ToolCallEntry = {
  id: string;
  tool: string;
  input: any;
  result?: string;
  isError?: boolean;
  done: boolean;
};

// ── Tool metadata ─────────────────────────────────────────────────────────────

const TOOL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  list_files: {
    label: "Файлуудыг жагсааж байна",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round" />
      </svg>
    ),
  },
  read_file: {
    label: "Файл уншиж байна",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" strokeLinejoin="round" /><path d="M10 2v3h3M5 8h6M5 11h4" strokeLinecap="round" />
      </svg>
    ),
  },
  write_file: {
    label: "Файл бичиж байна",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.5 2.5l3 3-7 7H3.5v-3l7-7z" strokeLinejoin="round" /><path d="M8.5 4.5l3 3" strokeLinecap="round" />
      </svg>
    ),
  },
  delete_file: {
    label: "Файл устгаж байна",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 4h10M6 4V3h4v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  run_command: {
    label: "Команд ажиллуулж байна",
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5">
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><path d="M4 6l3 2.5L4 11M8.5 11h3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

function toolSubtitle(entry: ToolCallEntry): string {
  if (entry.tool === "run_command") return entry.input?.command ?? "";
  return entry.input?.path ?? "";
}

// ── Single expanded row ───────────────────────────────────────────────────────

function ToolRow({ entry }: { entry: ToolCallEntry }) {
  const [rowOpen, setRowOpen] = useState(false);
  const meta = TOOL_META[entry.tool];
  const sub = toolSubtitle(entry);

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => entry.done && entry.result && setRowOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent/5 transition-colors"
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
          !entry.done ? "text-primary" : entry.isError ? "text-red-400" : "text-muted-foreground"
        }`}>
          {!entry.done
            ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
            : meta?.icon ?? <WrenchIcon className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-mono text-foreground/80">{meta?.label ?? entry.tool}</span>
          {sub && (
            <span className="ml-2 text-[10px] font-mono text-muted-foreground/50 truncate">
              {sub.length > 30 ? "…" + sub.slice(-28) : sub}
            </span>
          )}
        </div>
        {entry.done && entry.result && (
          rowOpen
            ? <ChevronDownIcon className="w-3 h-3 text-muted-foreground shrink-0" />
            : <ChevronRightIcon className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {rowOpen && entry.result && (
        <div className="px-10 pb-2.5 text-[10px] font-mono text-muted-foreground/70 whitespace-pre-wrap max-h-28 overflow-auto leading-relaxed">
          {entry.result}
        </div>
      )}
    </div>
  );
}

// ── Action Group (Replit-style collapsed/expanded) ────────────────────────────

function ToolActionGroup({ entries, isStreaming }: { entries: ToolCallEntry[]; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = entries.filter((e) => e.done).length;
  const total = entries.length;
  const allDone = doneCount === total && !isStreaming;
  const hasError = entries.some((e) => e.isError);

  return (
    <div className="flex flex-col">
      {/* Collapsed pill row */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 group w-fit"
        >
          {/* Icon boxes */}
          <div className="flex items-center gap-1">
            {entries.map((e) => {
              const meta = TOOL_META[e.tool];
              return (
                <div
                  key={e.id}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                    !e.done
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : e.isError
                      ? "border-red-500/40 bg-red-950/30 text-red-400"
                      : "border-border bg-card/60 text-muted-foreground"
                  }`}
                >
                  {!e.done ? (
                    <Loader2Icon className="w-3 h-3 animate-spin" />
                  ) : (
                    meta?.icon ?? <WrenchIcon className="w-3 h-3" />
                  )}
                </div>
              );
            })}
          </div>

          {/* "N actions" badge */}
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
            hasError
              ? "border-red-500/30 text-red-400 bg-red-950/20"
              : allDone
              ? "border-border text-muted-foreground bg-card/40 group-hover:border-primary/30 group-hover:text-foreground"
              : "border-primary/40 text-primary bg-primary/10 animate-pulse"
          }`}>
            {allDone ? `${total} action${total !== 1 ? "s" : ""}` : `${doneCount}/${total} хийж байна...`}
          </span>
        </button>
      )}

      {/* Expanded list */}
      {expanded && (
        <div className="flex flex-col rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors text-left border-b border-border/50"
          >
            <ChevronDownIcon className="w-3 h-3" />
            Хаах
          </button>

          {/* Rows */}
          {entries.map((e) => <ToolRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

type ChatPanelProps = {
  projectId: string;
  onFileChanged: (path: string, content: string) => void;
  onFileTree: (files: FileEntry[]) => void;
  onTerminalLine: (line: TerminalLine) => void;
};

function ChatPanel({ projectId, onFileChanged, onFileTree, onTerminalLine }: ChatPanelProps) {
  const { data: messages, isLoading, refetch } = useListMessages(projectId, {
    query: { enabled: !!projectId, queryKey: getListMessagesQueryKey(projectId) },
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const toolCallIdRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText, toolCalls]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || streaming) return;
    setInput("");
    setStreaming(true);
    setStreamText("");
    setToolCalls([]);
    setStatusMsg("Kodu бодож байна...");

    abortRef.current = new AbortController();
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

    try {
      const res = await fetch(`${BASE}/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Сервертэй холбогдож чадсангүй");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // Map server-generated tool_use ids to local entry ids
      const toolIdMap: Record<string, string> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));

            if (ev.type === "delta") {
              setStreamText((t) => t + ev.text);
              setStatusMsg("");
            }

            if (ev.type === "tool_call") {
              const localId = String(++toolCallIdRef.current);
              toolIdMap[ev.tool + localId] = localId;
              setStatusMsg(`${TOOL_LABEL[ev.tool] ?? ev.tool}...`);
              setToolCalls((prev) => [
                ...prev,
                { id: localId, tool: ev.tool, input: ev.input, done: false },
              ]);
            }

            if (ev.type === "tool_result") {
              setToolCalls((prev) => {
                // Mark the last pending entry for this tool as done
                const idx = [...prev].reverse().findIndex(
                  (e) => e.tool === ev.tool && !e.done
                );
                if (idx === -1) return prev;
                const realIdx = prev.length - 1 - idx;
                const updated = [...prev];
                updated[realIdx] = {
                  ...updated[realIdx],
                  result: ev.result,
                  isError: ev.isError,
                  done: true,
                };
                return updated;
              });
              setStatusMsg("");
              // Mirror run_command output to terminal
              if (ev.tool === "run_command") {
                onTerminalLine({ text: `$ ${ev.result}`, type: ev.isError ? "error" : "output" });
              }
            }

            if (ev.type === "file_changed") {
              onFileChanged(ev.path, ev.content);
            }

            if (ev.type === "file_tree") {
              onFileTree(ev.files);
            }

            if (ev.type === "done") {
              await refetch();
              setStreamText("");
              setStatusMsg("");
            }

            if (ev.type === "error") {
              toast({ title: "Claude алдаа", description: ev.message, variant: "destructive" });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "Алдаа гарлаа", description: String(err.message), variant: "destructive" });
      }
    } finally {
      setStreaming(false);
      setStatusMsg("");
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamText("");
    setStatusMsg("");
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col gap-2.5 pb-2">
          {isLoading ? (
            <div className="flex justify-center pt-8">
              <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : messages?.length === 0 && !streamText && toolCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 gap-3 text-center mt-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BotIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-mono font-semibold text-foreground">Kodu Agent бэлэн</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Жишээ нь: "Todo апп хий React-аар"</p>
              </div>
              <div className="flex flex-col gap-1 w-full">
                {["Landing page хий", "Login form нэм", "Dark mode нэм"].map((ex) => (
                  <button key={ex} onClick={() => setInput(ex)}
                    className="text-[10px] font-mono text-left px-2.5 py-1.5 rounded border border-border/50 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-muted-foreground">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages?.map((msg) => (
                <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
              ))}

              {/* Live tool calls — Replit-style action group */}
              {toolCalls.length > 0 && (
                <ToolActionGroup entries={toolCalls} isStreaming={streaming} />
              )}

              {/* Live streaming text */}
              {streamText && (
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-[9px] font-mono text-muted-foreground/60 uppercase px-1">Kodu</span>
                  <div className="max-w-[95%] rounded-lg rounded-bl-sm px-3 py-2 text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-words bg-card border border-border text-foreground">
                    {streamText}
                    <span className="inline-block w-1.5 h-3.5 bg-primary/80 ml-0.5 animate-pulse align-middle" />
                  </div>
                </div>
              )}

              {/* Thinking dots */}
              {streaming && !streamText && toolCalls.length === 0 && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
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
            </>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border shrink-0">
        {statusMsg && (
          <p className="text-[10px] font-mono text-primary/70 mb-1 px-1 flex items-center gap-1.5">
            <WrenchIcon className="w-2.5 h-2.5 animate-pulse" />
            {statusMsg}
          </p>
        )}
        <div className={`flex gap-2 bg-card border rounded-lg overflow-hidden transition-colors ${
          streaming ? "border-primary/60" : "border-border focus-within:border-primary/50"
        }`}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={streaming ? "Kodu ажиллаж байна..." : "Kodu-д зааварч... (Enter илгээх)"}
            disabled={streaming}
            rows={1}
            className="min-h-[38px] max-h-[120px] resize-none border-0 rounded-none py-2.5 px-3 text-[12px] font-mono bg-transparent disabled:opacity-50 outline-none flex-1"
          />
          {streaming ? (
            <Button onClick={handleStop} size="icon" variant="ghost"
              className="h-full rounded-none w-9 shrink-0 text-destructive hover:text-destructive">
              <span className="w-3 h-3 rounded-sm bg-destructive" />
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={!input.trim()} size="icon"
              className="h-full rounded-none w-9 shrink-0">
              <SendIcon className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <span className="text-[9px] font-mono text-muted-foreground/60 uppercase px-1">
        {isUser ? "Та" : "Kodu"}
      </span>
      <div className={`max-w-[95%] rounded-lg px-3 py-2 text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-words ${
        isUser
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-card border border-border text-foreground rounded-bl-sm"
      }`}>
        {content}
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
