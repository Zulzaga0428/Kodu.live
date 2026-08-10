import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { useSettings } from "@/hooks/use-settings";
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
  DownloadIcon, FolderPlusIcon, FilePlusIcon, ExternalLinkIcon,
  SparklesIcon, CornerDownLeftIcon, StopCircleIcon, ImageIcon, XCircleIcon, CoinsIcon,
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
  const [credits, setCredits] = useState<number | null>(null);

  // Fetch credits on mount
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/credits`).then(r => r.json()).then(d => {
      if (typeof d.credits === "number") setCredits(d.credits);
    }).catch(() => {});
  }, []);

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

  const [fileWriteCount, setFileWriteCount] = useState(0);
  const [agentHasBuilt, setAgentHasBuilt] = useState(false);

  // Called by ChatPanel when agent writes/deletes a file
  const handleFileChanged = useCallback((path: string, content: string) => {
    if (activeFile === path) setActiveContent(content);
    setFileWriteCount((n) => n + 1);
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

        <div className="flex items-center gap-1.5">
          {/* Credits badge */}
          {credits !== null && (
            <Link href="/pricing">
              <button className={`flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[10px] font-semibold transition-all ${
                credits < 10
                  ? "border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                  : "border-border/50 bg-card text-muted-foreground hover:text-foreground hover:border-border"
              }`}>
                <CoinsIcon className="w-2.5 h-2.5" />
                {credits}кр
              </button>
            </Link>
          )}
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
              onCreditsUsed={(cost) => setCredits((c) => (c !== null ? Math.max(0, c - cost) : null))}
              onBuildComplete={() => setAgentHasBuilt(true)}
            />
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors w-[3px]" />
          <ResizablePanel defaultSize={47} minSize={30} className="flex flex-col">
            <WorkspacePanel
              projectId={id}
              activeFile={activeFile}
              activeContent={activeContent}
              onContentChange={setActiveContent}
              terminalLines={terminalLines}
              fileWriteCount={fileWriteCount}
              agentHasBuilt={agentHasBuilt}
            />
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors w-[3px]" />
          <ResizablePanel defaultSize={25} minSize={16} className="flex flex-col">
            <FilesPanel
              project={project}
              fileTree={fileTree}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
              onFileTreeChange={handleFileTree}
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
  onCreditsUsed?: (cost: number) => void;
  onBuildComplete?: () => void;
};

function AgentPanel({ projectId, project, onFileChanged, onFileTree, onTerminalLine, onCreditsUsed, onBuildComplete }: AgentPanelProps) {
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
            onCreditsUsed={onCreditsUsed}
            onBuildComplete={onBuildComplete}
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
  projectId: string;
  activeFile: string | null;
  activeContent: string;
  onContentChange: (c: string) => void;
  terminalLines: TerminalLine[];
  fileWriteCount: number;
  agentHasBuilt: boolean;
};

// Monaco editor wrapped with settings
function MonacoEditorWithSettings({
  activeFile, activeContent, onContentChange,
}: { activeFile: string; activeContent: string; onContentChange: (v: string) => void }) {
  const { settings } = useSettings();
  return (
    <MonacoEditor
      height="100%"
      path={activeFile}
      language={monacoLang(activeFile)}
      value={activeContent}
      onChange={(v) => onContentChange(v ?? "")}
      theme={settings.theme === "light" ? "vs" : "vs-dark"}
      options={{
        fontSize: Number(settings.fontSize) || 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        lineHeight: 22,
        tabSize: Number(settings.tabSize) || 2,
        minimap: { enabled: settings.minimap },
        scrollBeyondLastLine: false,
        wordWrap: settings.wordWrap ? "on" : "off",
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
  );
}

type PreviewStatus = "idle" | "creating" | "ready" | "error" | "compile_error" | "busy";

interface PreviewState {
  status: PreviewStatus;
  previewId?: string;
  url?: string;
  error?: string;
  buildLogs?: string;
}

function WorkspacePanel({ projectId, activeFile, activeContent, onContentChange, terminalLines, fileWriteCount, agentHasBuilt }: WorkspacePanelProps) {
  const [tab, setTab] = useState<WorkspaceTab>("code");
  const terminalRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const didAutoPreview = useRef(false);

  // ── Auto-switch to preview tab when agent finishes first build ────────────
  useEffect(() => {
    if (!agentHasBuilt || didAutoPreview.current) return;
    didAutoPreview.current = true;
    setTab("preview");
    // Small delay so file writes settle before container spins up
    setTimeout(() => {
      setPreview((p) => {
        if (p.status === "idle") { createPreview(); }
        return p;
      });
    }, 800);
  }, [agentHasBuilt]);

  // ── Auto hot-reload preview when agent writes files ────────────────────────
  useEffect(() => {
    if (fileWriteCount === 0 || preview.status !== "ready") return;
    const hotReload = async () => {
      const res = await fetch(`${BASE}/api/projects/${projectId}/preview/files`, { method: "PUT" });
      if (res.status === 404) {
        // Preview expired — reset so user can re-create
        setPreview({ status: "idle" });
      }
    };
    // Debounce: wait 1.5s after last write before reloading
    const t = setTimeout(hotReload, 1500);
    return () => clearTimeout(t);
  }, [fileWriteCount]);

  // ── Create preview ────────────────────────────────────────────────────────
  const createPreview = async () => {
    setPreview({ status: "creating" });
    try {
      const res = await fetch(`${BASE}/api/projects/${projectId}/preview`, { method: "POST" });
      if (res.status === 503) { setPreview({ status: "busy", error: "Сервер дүүрэн байна. 30 секундын дараа дахин оролдоно уу." }); return; }
      if (!res.ok) { setPreview({ status: "error", error: `Алдаа: ${res.status}` }); return; }
      const data = await res.json();
      if (data.ready === false && data.reason === "compile_error") {
        setPreview({ status: "compile_error", previewId: data.previewId, url: data.url, buildLogs: data.logs });
        return;
      }
      if (data.ready === false) {
        setPreview({ status: "error", error: "Preview ачааллахад хэтэрхий удлаа. Дахин оролдоно уу." });
        return;
      }
      setPreview({ status: "ready", previewId: data.previewId, url: data.url });
      startHeartbeat(data.previewId);
    } catch (e: any) {
      setPreview({ status: "error", error: e.message ?? "Холболтын алдаа" });
    }
  };

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  const startHeartbeat = (pid: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    const beat = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch(`${BASE}/api/projects/${projectId}/preview/keepalive`, { method: "POST" });
      if (res.status === 404) {
        setPreview({ status: "idle" });
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      }
    };
    beat();
    heartbeatRef.current = setInterval(beat, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", beat);
  };

  // ── Stop preview on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (preview.previewId) {
        fetch(`${BASE}/api/projects/${projectId}/preview`, { method: "DELETE" }).catch(() => {});
      }
    };
  }, [preview.previewId]);

  // ── Auto-create when switching to preview tab ─────────────────────────────
  const handleTabChange = (t: WorkspaceTab) => {
    setTab(t);
    // Only start the preview container if the agent has actually built something
    if (t === "preview" && preview.status === "idle" && agentHasBuilt) createPreview();
  };

  useEffect(() => {
    if (tab === "terminal" && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines, tab]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center border-b border-border shrink-0 bg-card/40">
        <TabBtn active={tab === "code"} onClick={() => handleTabChange("code")} icon={<CodeIcon className="w-3 h-3" />} label="Код" />
        <TabBtn active={tab === "preview"} onClick={() => handleTabChange("preview")} icon={<MonitorIcon className="w-3 h-3" />} label="Preview" />
        <TabBtn active={tab === "terminal"} onClick={() => handleTabChange("terminal")} icon={<TerminalIcon className="w-3 h-3" />} label="Terminal" />
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
                <MonacoEditorWithSettings
                  activeFile={activeFile}
                  activeContent={activeContent}
                  onContentChange={onContentChange}
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
          <div className="h-full flex flex-col bg-[#0a0a0a]">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-1.5 px-3 h-9 bg-zinc-900 border-b border-zinc-800 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-2 flex items-center bg-zinc-800 rounded-md px-3 h-5">
                <span className="text-[10px] font-mono text-zinc-400 truncate">
                  {preview.url ?? "kodu sandbox"}
                </span>
              </div>
              {/* Refresh / open buttons */}
              {preview.status === "ready" && (
                <div className="flex gap-1 ml-1">
                  <button
                    onClick={() => { setPreview({ status: "idle" }); setTimeout(createPreview, 50); }}
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title="Шинэчлэх"
                  >
                    <RefreshCwIcon className="w-3 h-3" />
                  </button>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title="Шинэ цонхонд нээх"
                  >
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Preview content */}
            <div className="flex-1 relative overflow-hidden">
              {/* LOADING */}
              {preview.status === "creating" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-zinc-200">Preview ачаалж байна...</p>
                    <p className="text-xs text-zinc-500">Container бэлтгэж байна. 5–30 секунд хүлээнэ үү.</p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-48 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-[progress_20s_ease-in-out_forwards]" style={{ width: "100%" }} />
                  </div>
                </div>
              )}

              {/* READY — iframe */}
              {preview.status === "ready" && preview.url && (
                <iframe
                  src={preview.url}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  title="Live Preview"
                />
              )}

              {/* COMPILE ERROR */}
              {preview.status === "compile_error" && (
                <div className="absolute inset-0 flex flex-col bg-zinc-950 p-4 gap-3 overflow-auto">
                  <div className="flex items-center gap-2 text-red-400">
                    <span className="text-sm font-semibold">⚠ Build алдаа</span>
                  </div>
                  <pre className="flex-1 text-[11px] font-mono text-red-300 bg-zinc-900 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
                    {preview.buildLogs}
                  </pre>
                  <p className="text-xs text-zinc-500">Агентад "build алдааг засаарай" гэж хэлнэ үү.</p>
                </div>
              )}

              {/* BUSY */}
              {preview.status === "busy" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                  <span className="text-2xl">⏳</span>
                  <p className="text-sm text-zinc-300">{preview.error}</p>
                  <button
                    onClick={createPreview}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
                  >
                    Дахин оролдох
                  </button>
                </div>
              )}

              {/* GENERIC ERROR */}
              {preview.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                  <span className="text-2xl">❌</span>
                  <p className="text-sm text-zinc-300">{preview.error}</p>
                  <button
                    onClick={createPreview}
                    className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition"
                  >
                    Дахин оролдох
                  </button>
                </div>
              )}

              {/* IDLE */}
              {preview.status === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950">
                  {!agentHasBuilt ? (
                    <>
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-primary/40 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <SparklesIcon className="w-5 h-5 text-primary/50" />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-zinc-300">Агент код бичиж байна...</p>
                        <p className="text-xs text-zinc-600">Дуусангуут preview автоматаар нээгдэнэ.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <MonitorIcon className="w-10 h-10 text-zinc-700" />
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-zinc-300">Live Preview</p>
                        <p className="text-xs text-zinc-600">Төслийн кодыг бодит хэлбэрт харуулна.</p>
                      </div>
                      <button
                        onClick={createPreview}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition flex items-center gap-2"
                      >
                        <PlayIcon className="w-3.5 h-3.5" />
                        Preview эхлүүлэх
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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
  onFileTreeChange: (files: FileEntry[]) => void;
};

function FilesPanel({ project, fileTree, activeFile, onSelectFile, onFileTreeChange }: FilesPanelProps) {
  const [closedDirs, setClosedDirs] = useState<Set<string>>(new Set());
  const [showKodu, setShowKodu] = useState(false);
  const [koduContent, setKoduContent] = useState(project.description || "");
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const updateProject = useUpdateProject();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

  const isHidden = (path: string) => {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join("/");
      if (closedDirs.has(parent)) return true;
    }
    return false;
  };

  // Focus input when create mode opens
  useEffect(() => {
    if (creating) setTimeout(() => createInputRef.current?.focus(), 50);
  }, [creating]);

  useEffect(() => {
    if (renamingPath) setTimeout(() => renameInputRef.current?.select(), 50);
  }, [renamingPath]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(null); setNewName(""); return; }
    const isDir = creating === "folder";
    try {
      const res = await fetch(`${BASE}/api/projects/${project.id}/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: name, isDir }),
      });
      const data = await res.json();
      if (data.files) onFileTreeChange(data.files);
      if (!isDir) onSelectFile(name);
    } catch {}
    setCreating(null); setNewName("");
  };

  const handleDelete = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${filePath.split("/").pop()}" устгах уу?`)) return;
    setDeletingPath(filePath);
    try {
      const res = await fetch(`${BASE}/api/projects/${project.id}/file?path=${encodeURIComponent(filePath)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.files) onFileTreeChange(data.files);
    } catch {}
    setDeletingPath(null);
  };

  const handleRenameStart = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingPath(filePath);
    setRenameName(filePath.split("/").pop() ?? "");
  };

  const handleRenameCommit = async () => {
    if (!renamingPath || !renameName.trim()) { setRenamingPath(null); return; }
    const parts = renamingPath.split("/");
    parts[parts.length - 1] = renameName.trim();
    const newPath = parts.join("/");
    if (newPath === renamingPath) { setRenamingPath(null); return; }
    try {
      const res = await fetch(`${BASE}/api/projects/${project.id}/file`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath: renamingPath, newPath }),
      });
      const data = await res.json();
      if (data.files) onFileTreeChange(data.files);
    } catch {}
    setRenamingPath(null);
  };

  const handleDownload = () => {
    window.open(`${BASE}/api/projects/${project.id}/download`, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(240_10%_4%)] border-l border-border">
      {/* Header */}
      <div className="h-9 border-b border-border flex items-center justify-between px-2 shrink-0 gap-1">
        <span className="text-[10px] font-mono text-muted-foreground font-semibold uppercase tracking-wider flex-1 pl-1">
          Файлууд {fileTree.filter(f => f.type === "file").length > 0 && `(${fileTree.filter(f => f.type === "file").length})`}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setCreating("file"); setNewName(""); }}
            title="Шинэ файл"
            className="p-1 rounded hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FilePlusIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setCreating("folder"); setNewName(""); }}
            title="Шинэ хавтас"
            className="p-1 rounded hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderPlusIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownload}
            title="ZIP татах"
            className="p-1 rounded hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowKodu(!showKodu)}
            title="kodu.md"
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              showKodu ? "border-primary text-primary bg-primary/10" : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            .md
          </button>
        </div>
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
            {/* Inline create input */}
            {creating && (
              <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/40 bg-primary/5">
                {creating === "folder"
                  ? <FolderIcon className="w-3.5 h-3.5 text-yellow-400/80 shrink-0" />
                  : <FileCodeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                <input
                  ref={createInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setCreating(null); setNewName(""); }
                  }}
                  placeholder={creating === "folder" ? "хавтасны нэр" : "файлын нэр"}
                  className="flex-1 bg-transparent text-[12px] font-mono text-foreground outline-none placeholder:text-muted-foreground/40"
                />
                <button onClick={handleCreate} className="text-primary hover:text-primary/80">
                  <CheckIcon className="w-3 h-3" />
                </button>
                <button onClick={() => { setCreating(null); setNewName(""); }} className="text-muted-foreground hover:text-foreground">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            )}

            {fileTree.length === 0 && !creating ? (
              <div className="px-4 py-6 text-center text-[11px] font-mono text-muted-foreground/40">
                Агент файл үүсгэхэд энд харагдана
              </div>
            ) : (
              fileTree.map((item) => {
                if (isHidden(item.path)) return null;
                const depth = item.path.split("/").length - 1;
                const name = item.path.split("/").pop() ?? item.path;
                const isDeleting = deletingPath === item.path;

                if (item.type === "dir") {
                  const isOpen = !closedDirs.has(item.path);
                  return (
                    <div
                      key={item.path}
                      className="group flex items-center gap-1 py-[3px] hover:bg-accent/10 transition-colors"
                      style={{ paddingLeft: `${8 + depth * 12}px` }}
                    >
                      <button
                        onClick={() => toggleDir(item.path)}
                        className="flex items-center gap-1 flex-1 text-left min-w-0"
                      >
                        {isOpen ? <ChevronDownIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                                 : <ChevronRightIcon className="w-3 h-3 text-muted-foreground shrink-0" />}
                        <FolderIcon className="w-3.5 h-3.5 text-yellow-400/80 shrink-0" />
                        <span className="text-[12px] font-mono text-muted-foreground group-hover:text-foreground transition-colors truncate">
                          {name}
                        </span>
                      </button>
                      <button
                        onClick={(e) => handleDelete(item.path, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 text-muted-foreground/50 shrink-0"
                      >
                        {isDeleting ? <Loader2Icon className="w-3 h-3 animate-spin" /> : <XIcon className="w-3 h-3" />}
                      </button>
                    </div>
                  );
                }

                const isActive = activeFile === item.path;
                return (
                  <div
                    key={item.path}
                    className={`group flex items-center gap-1.5 py-[3px] hover:bg-accent/10 transition-colors ${
                      isActive ? "bg-primary/10 border-l-2 border-primary" : ""
                    }`}
                    style={{ paddingLeft: `${8 + depth * 12}px` }}
                  >
                    {renamingPath === item.path ? (
                      <>
                        <FileCodeIcon className={`w-3.5 h-3.5 shrink-0 ${extColor(name)}`} />
                        <input
                          ref={renameInputRef}
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCommit();
                            if (e.key === "Escape") setRenamingPath(null);
                          }}
                          onBlur={handleRenameCommit}
                          className="flex-1 bg-primary/10 text-[12px] font-mono text-foreground outline-none border-b border-primary px-0.5 min-w-0"
                        />
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onSelectFile(item.path)}
                          onDoubleClick={(e) => handleRenameStart(item.path, e)}
                          className="flex items-center gap-1.5 flex-1 text-left min-w-0"
                        >
                          <FileCodeIcon className={`w-3.5 h-3.5 shrink-0 ${extColor(name)}`} />
                          <span className={`text-[12px] font-mono transition-colors truncate ${
                            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                          }`}>
                            {name}
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.path, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 text-muted-foreground/50 shrink-0"
                        >
                          {isDeleting ? <Loader2Icon className="w-3 h-3 animate-spin" /> : <XIcon className="w-3 h-3" />}
                        </button>
                      </>
                    )}
                  </div>
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
  onCreditsUsed?: (cost: number) => void;
  onBuildComplete?: () => void;
};

function ChatPanel({ projectId, onFileChanged, onFileTree, onTerminalLine, onCreditsUsed, onBuildComplete }: ChatPanelProps) {
  const { data: messages, isLoading, refetch } = useListMessages(projectId, {
    query: { enabled: !!projectId, queryKey: getListMessagesQueryKey(projectId) },
  });
  const { settings: agentSettings, setSettings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [clarifyMode, setClarifyMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const toolCallIdRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImages, setAttachedImages] = useState<{ name: string; dataUrl: string; mediaType: string }[]>([]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImages((prev) => [
          ...prev,
          { name: file.name, dataUrl: reader.result as string, mediaType: file.type },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (idx: number) =>
    setAttachedImages((prev) => prev.filter((_, i) => i !== idx));

  // Auto-resize textarea as user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

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
    setClarifyMode(false);
    setStatusMsg("Kodu бодож байна...");

    // Encode attached images → strip data URI prefix, keep base64 only
    const imagePayload = attachedImages.map((img) => ({
      mediaType: img.mediaType,
      data: img.dataUrl.split(",")[1] ?? "",
    }));
    setAttachedImages([]);

    abortRef.current = new AbortController();
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

    try {
      const res = await fetch(`${BASE}/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          model: agentSettings.model,
          maxTokens: agentSettings.maxTokens,
          images: imagePayload.length > 0 ? imagePayload : undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 402) {
        const data = await res.json();
        toast({ title: "💰 Кредит хүрэлцэхгүй", description: `${data.available ?? 0}кр байна, ${data.required ?? 0}кр хэрэгтэй. Кредит нэмнэ үү.`, variant: "destructive" });
        setStreaming(false); setStatusMsg(""); return;
      }
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

            if (ev.type === "clarify_mode") {
              setClarifyMode(true);
              setStatusMsg("Kodu таны санааг ойлгож байна...");
            }

            if (ev.type === "delta") {
              setStreamText((t) => t + ev.text);
              setStatusMsg("");
            }

            if (ev.type === "tool_call") {
              const localId = String(++toolCallIdRef.current);
              toolIdMap[ev.tool + localId] = localId;
              setStatusMsg(`${TOOL_META[ev.tool]?.label ?? ev.tool}...`);
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

            if (ev.type === "credits_used") {
              onCreditsUsed?.(ev.cost);
            }

            if (ev.type === "done") {
              await refetch();
              setStreamText("");
              setStatusMsg("");
              // Notify parent that a real build (not clarify) finished
              if (!clarifyMode) {
                onBuildComplete?.();
              }
            }

            if (ev.type === "error") {
              if (ev.message?.includes("INSUFFICIENT_CREDITS") || ev.message?.includes("Кредит")) {
                toast({ title: "💰 Кредит хүрэлцэхгүй", description: "Кредит нэмэхийн тулд /pricing руу орно уу", variant: "destructive" });
              } else {
                toast({ title: "Claude алдаа", description: ev.message, variant: "destructive" });
              }
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
            <div className="flex flex-col items-center justify-center gap-4 text-center mt-6 px-2">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                  <SparklesIcon className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Kodu Agent бэлэн</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Юу хийхийг хэлэхэд Kodu хэд хэдэн асуулт асуугаад build эхлүүлнэ</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {[
                  { icon: "🌐", text: "Landing page хий" },
                  { icon: "🔐", text: "Login form нэм" },
                  { icon: "🌙", text: "Dark mode нэм" },
                  { icon: "⚡", text: "REST API хий" },
                  { icon: "📊", text: "Dashboard хий" },
                  { icon: "🃏", text: "Todo апп хий" },
                ].map(({ icon, text }) => (
                  <button key={text} onClick={() => setInput(text)}
                    className="text-[11px] font-mono text-left px-2.5 py-2 rounded-lg border border-border/40 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all text-muted-foreground group flex items-center gap-2">
                    <span className="text-base leading-none">{icon}</span>
                    <span className="leading-snug">{text}</span>
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
                  {clarifyMode ? (
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[9px] font-mono text-amber-400/80 uppercase">Kodu</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-medium text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Тодруулж байна
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono text-muted-foreground/60 uppercase px-1">Kodu</span>
                  )}
                  <div className={`max-w-[95%] rounded-lg rounded-bl-sm px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap break-words border text-foreground ${
                    clarifyMode
                      ? "bg-amber-500/5 border-amber-500/20 font-sans"
                      : "bg-card border-border font-mono"
                  }`}>
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

      {/* ── Premium Chat Input ─────────────────────────────── */}
      <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">

        {/* Status pill */}
        {statusMsg && (
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <p className="text-[10px] font-mono text-primary/80">{statusMsg}</p>
          </div>
        )}

        {/* Input box */}
        <div className={`relative rounded-xl border transition-all duration-200 ${
          streaming
            ? "border-primary/70 bg-primary/[0.03] shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
            : "border-border/60 bg-card focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.06)]"
        }`}>

          {/* Image thumbnails */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {attachedImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="h-14 w-14 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircleIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={streaming ? "Kodu ажиллаж байна..." : "Зааварч... (жишээ нь: Landing page хий)"}
            disabled={streaming}
            rows={1}
            className="w-full resize-none border-0 bg-transparent outline-none px-3.5 pt-3 pb-2 text-[12.5px] font-mono leading-relaxed placeholder:text-muted-foreground/40 disabled:opacity-40 min-h-[44px] max-h-[160px]"
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-2 pb-2 gap-2">

            {/* Left: model speed dropdown + image upload */}
            <div className="flex items-center gap-1">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImagePick}
              />

              {/* Image attach button */}
              <button
                type="button"
                disabled={streaming}
                onClick={() => fileInputRef.current?.click()}
                title="Зураг хавсаргах"
                className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/8 disabled:opacity-30 transition-all"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>

              {/* Fast / Smart / Deep dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={streaming}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/8 border border-primary/15 text-primary/80 hover:bg-primary/15 disabled:opacity-40 transition-all"
                  >
                    <span className="text-[9px] font-mono font-semibold">
                      {agentSettings.model.includes("haiku") ? "⚡ Fast" : agentSettings.model.includes("opus") ? "🔬 Deep" : "🧠 Smart"}
                    </span>
                    <ChevronDownIcon className="w-2.5 h-2.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px] font-mono text-xs">
                  <DropdownMenuItem
                    onClick={() => setSettings({ model: "claude-haiku-4-5" })}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-base">⚡</span>
                    <div>
                      <p className="font-semibold text-[11px]">Fast</p>
                      <p className="text-[9px] text-muted-foreground">Хурдан, хялбар даалгавар</p>
                    </div>
                    {agentSettings.model.includes("haiku") && <CheckIcon className="w-3 h-3 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSettings({ model: "claude-sonnet-4-5" })}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-base">🧠</span>
                    <div>
                      <p className="font-semibold text-[11px]">Smart</p>
                      <p className="text-[9px] text-muted-foreground">Тэнцвэртэй, ерөнхий зорилго</p>
                    </div>
                    {agentSettings.model.includes("sonnet") && <CheckIcon className="w-3 h-3 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSettings({ model: "claude-opus-4-5" })}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-base">🔬</span>
                    <div>
                      <p className="font-semibold text-[11px]">Deep</p>
                      <p className="text-[9px] text-muted-foreground">Хамгийн ухаалаг, нарийн</p>
                    </div>
                    {agentSettings.model.includes("opus") && <CheckIcon className="w-3 h-3 ml-auto text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: keyboard hint + send/stop */}
            <div className="flex items-center gap-2">
              {!streaming && (
                <span className="text-[9px] font-mono text-muted-foreground/30 hidden sm:flex items-center gap-0.5">
                  <CornerDownLeftIcon className="w-2.5 h-2.5" /> илгээх
                </span>
              )}
              {streaming ? (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive transition-all text-[10px] font-mono font-medium"
                >
                  <span className="w-2 h-2 rounded-sm bg-destructive animate-pulse" />
                  Зогсоох
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && attachedImages.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed text-primary-foreground transition-all text-[10px] font-mono font-medium shadow-sm"
                >
                  <SendIcon className="w-2.5 h-2.5" />
                  Илгээх
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  // Detect clarify messages: assistant messages that contain numbered questions
  const isClarify = !isUser && /^\s*1[.)]/m.test(content) && content.includes("?");
  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">
          {isUser ? "Та" : "Kodu"}
        </span>
        {isClarify && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-medium text-amber-400">
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            Тодруулалт
          </span>
        )}
      </div>
      <div className={`max-w-[95%] rounded-lg px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap break-words ${
        isUser
          ? "bg-primary text-primary-foreground rounded-br-sm font-mono"
          : isClarify
            ? "bg-amber-500/5 border border-amber-500/20 text-foreground rounded-bl-sm font-sans"
            : "bg-card border border-border text-foreground rounded-bl-sm font-mono"
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
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 h-9 text-[11px] font-mono border-b-2 transition-colors min-w-0 ${
        active
          ? "border-primary text-foreground bg-card/30"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/5"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
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
