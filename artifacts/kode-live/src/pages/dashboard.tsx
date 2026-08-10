import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import {
  useGetStats, useListProjects, useCreateProject,
  getListProjectsQueryKey, getGetStatsQueryKey, ProjectStatus,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import {
  PlusIcon, TerminalSquareIcon, CheckCircle2Icon, ArchiveIcon,
  MessageSquareIcon, LayoutListIcon, Loader2Icon, FolderIcon,
  ZapIcon, SettingsIcon, SearchIcon, GridIcon, ListIcon,
  ChevronRightIcon, ClockIcon, TrendingUpIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const createProjectSchema = z.object({
  name: z.string().min(1, "Нэр оруулна уу"),
  description: z.string().optional(),
});
type CreateProjectForm = z.infer<typeof createProjectSchema>;

function statusVariant(s: ProjectStatus): "default" | "secondary" | "outline" {
  return s === ProjectStatus.active ? "default" : s === ProjectStatus.completed ? "secondary" : "outline";
}
function statusLabel(s: ProjectStatus) {
  return s === ProjectStatus.active ? "Идэвхтэй" : s === ProjectStatus.completed ? "Дууссан" : "Архивласан";
}

// Language color dots based on project name keywords (cosmetic)
function projectAccent(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("api") || n.includes("backend")) return "bg-emerald-400";
  if (n.includes("dashboard") || n.includes("admin")) return "bg-blue-400";
  if (n.includes("blog") || n.includes("content")) return "bg-purple-400";
  if (n.includes("mobile") || n.includes("app")) return "bg-orange-400";
  return "bg-primary";
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | ProjectStatus>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const createProject = useCreateProject();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = (data: CreateProjectForm) => {
    createProject.mutate({ data }, {
      onSuccess: (newProject) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        setLocation(`/projects/${newProject.id}`);
      },
      onError: () => toast({ title: "Алдаа гарлаа", description: "Төсөл үүсгэхэд алдаа гарлаа.", variant: "destructive" }),
    });
  };

  const filtered = (projects ?? [])
    .filter((p) => filter === "all" || p.status === filter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const NAV_FILTERS = [
    { label: "Бүгд", value: "all" as const, count: stats?.totalProjects },
    { label: "Идэвхтэй", value: ProjectStatus.active, count: stats?.activeProjects },
    { label: "Дууссан", value: ProjectStatus.completed, count: stats?.completedProjects },
    { label: "Архив", value: ProjectStatus.archived, count: undefined },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-border/50 flex flex-col bg-card/20 hidden md:flex">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <TerminalSquareIcon className="w-5 h-5 text-primary" />
            <span className="font-bold font-mono text-base tracking-tight">kode<span className="text-primary">.live</span></span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">Навигаци</p>
          <NavItem icon={<ZapIcon className="w-3.5 h-3.5" />} label="Dashboard" active href="/dashboard" />
          <NavItem icon={<FolderIcon className="w-3.5 h-3.5" />} label="Төслүүд" href="/dashboard" />
          <NavItem icon={<SettingsIcon className="w-3.5 h-3.5" />} label="Тохиргоо" href="/dashboard" />

          <div className="mt-6">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest px-2 mb-2">Шүүлтүүр</p>
            {NAV_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  filter === f.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                }`}
              >
                <span>{f.label}</span>
                {f.count !== undefined && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0 ${
                    filter === f.value ? "bg-primary/20 text-primary" : "bg-border text-muted-foreground"
                  }`}>{f.count}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/10 cursor-pointer transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">МХ</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-semibold truncate">Хөгжүүлэгч</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">dev@kode.live</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top bar ── */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-6 shrink-0 bg-card/10 backdrop-blur">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <TerminalSquareIcon className="w-5 h-5 text-primary" />
            <span className="font-bold font-mono">kode.live</span>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-card border border-border/50 rounded-lg px-3 py-1.5 w-64 focus-within:border-primary/50 transition-colors">
            <SearchIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Төсөл хайх..."
              className="bg-transparent text-xs font-mono outline-none flex-1 placeholder:text-muted-foreground/50 text-foreground"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="hidden md:flex items-center border border-border/50 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <GridIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 border-l border-border/50 transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="font-mono text-xs h-8 gap-1.5">
                  <PlusIcon className="w-3.5 h-3.5" />
                  Шинэ төсөл
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] border-border/50">
                <DialogHeader>
                  <DialogTitle className="font-mono text-lg">Шинэ төсөл үүсгэх</DialogTitle>
                  <DialogDescription className="text-sm">AI агенттай хамт кодоо эхлүүлэх</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-mono">Төслийн нэр</FormLabel>
                        <FormControl>
                          <Input placeholder="Жишээ нь: SaaS Dashboard" {...field} className="font-mono bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-mono">Тайлбар (заавал биш)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Энэ төсөл юу хийдэг вэ?" {...field} className="font-mono min-h-[80px] resize-none bg-background text-sm" />
                        </FormControl>
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit" disabled={createProject.isPending} className="w-full font-mono">
                        {createProject.isPending && <Loader2Icon className="w-3.5 h-3.5 mr-2 animate-spin" />}
                        ҮҮСГЭХ
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* ── Page body ── */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">

            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Сайн уу 👋</h1>
              <p className="text-muted-foreground text-sm mt-1 font-mono">Өнөөдөр юу бүтээх вэ?</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Нийт төсөл"
                value={stats?.totalProjects ?? 0}
                sub="Total projects"
                loading={statsLoading}
                icon={<FolderIcon className="w-4 h-4 text-muted-foreground" />}
                accent="border-border/50"
              />
              <StatCard
                label="Идэвхтэй"
                value={stats?.activeProjects ?? 0}
                sub="Active"
                loading={statsLoading}
                icon={<ZapIcon className="w-4 h-4 text-primary" />}
                accent="border-primary/30"
              />
              <StatCard
                label="Зурвас"
                value={stats?.totalMessages ?? 0}
                sub="Messages sent"
                loading={statsLoading}
                icon={<MessageSquareIcon className="w-4 h-4 text-blue-400" />}
                accent="border-border/50"
              />
              <StatCard
                label="Даалгавар"
                value={stats?.totalTasks ?? 0}
                sub="Tasks tracked"
                loading={statsLoading}
                icon={<LayoutListIcon className="w-4 h-4 text-emerald-400" />}
                accent="border-border/50"
              />
            </div>

            {/* Projects section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-mono font-bold text-base">Төслүүд</h2>
                  {!projectsLoading && (
                    <span className="text-[11px] font-mono text-muted-foreground bg-card border border-border/50 rounded-full px-2 py-0.5">
                      {filtered.length}
                    </span>
                  )}
                </div>
                {/* Mobile filter tabs */}
                <div className="flex md:hidden gap-1">
                  {NAV_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                        filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {projectsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState onNew={() => setIsCreateOpen(true)} />
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filtered.map((p) => <ProjectRow key={p.id} project={p} />)}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavItem({ icon, label, active, href }: { icon: React.ReactNode; label: string; active?: boolean; href: string }) {
  return (
    <Link href={href}>
      <button className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-mono transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
      }`}>
        {icon}
        {label}
        {active && <ChevronRightIcon className="w-3 h-3 ml-auto" />}
      </button>
    </Link>
  );
}

function StatCard({ label, value, sub, loading, icon, accent }: {
  label: string; value: number; sub: string; loading: boolean; icon: React.ReactNode; accent: string;
}) {
  return (
    <div className={`rounded-xl border ${accent} bg-card/30 p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      {loading
        ? <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
        : <p className="text-2xl font-black font-mono">{value}</p>}
      <p className="text-[10px] font-mono text-muted-foreground/50 uppercase">{sub}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  const accent = projectAccent(project.name);
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group rounded-xl border border-border/50 bg-card/30 hover:border-border hover:bg-card/50 transition-all cursor-pointer h-full flex flex-col overflow-hidden">
        {/* Color accent strip */}
        <div className={`h-0.5 w-full ${accent}`} />
        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-mono font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-1">
              {project.name}
            </h3>
            <Badge
              variant={statusVariant(project.status)}
              className="text-[9px] font-mono uppercase px-1.5 h-4 shrink-0"
            >
              {statusLabel(project.status)}
            </Badge>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{project.description}</p>
          )}

          <div className="flex-1" />

          {/* Footer stats */}
          <div className="flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] font-mono">
                <MessageSquareIcon className="w-3 h-3" /> {project.messageCount ?? 0}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono">
                <LayoutListIcon className="w-3 h-3" /> {project.taskCount ?? 0}
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/50">
              {format(new Date(project.createdAt), "MMM d")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProjectRow({ project }: { project: any }) {
  const accent = projectAccent(project.name);
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group flex items-center gap-4 px-4 py-3 rounded-lg border border-transparent hover:border-border/50 hover:bg-card/30 transition-all cursor-pointer">
        <div className={`w-2 h-2 rounded-full ${accent} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className="font-mono font-semibold text-sm group-hover:text-primary transition-colors truncate">{project.name}</p>
          {project.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
          )}
        </div>
        <Badge variant={statusVariant(project.status)} className="text-[9px] font-mono uppercase px-1.5 h-4 shrink-0">
          {statusLabel(project.status)}
        </Badge>
        <div className="flex items-center gap-3 text-muted-foreground shrink-0">
          <span className="flex items-center gap-1 text-[11px] font-mono">
            <MessageSquareIcon className="w-3 h-3" /> {project.messageCount ?? 0}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono">
            <LayoutListIcon className="w-3 h-3" /> {project.taskCount ?? 0}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 hidden lg:block">
          {format(new Date(project.createdAt), "MMM d, yyyy")}
        </span>
        <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border/40 rounded-xl text-center">
      <div className="w-12 h-12 rounded-full bg-card border border-border/60 flex items-center justify-center mb-4">
        <FolderIcon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <h3 className="font-mono font-semibold text-sm mb-1">Төсөл олдсонгүй</h3>
      <p className="text-xs text-muted-foreground mb-6 max-w-xs">
        Шинэ төсөл үүсгэж AI агенттай хамт код бичиж эхлээрэй.
      </p>
      <Button onClick={onNew} variant="outline" size="sm" className="font-mono text-xs gap-1.5">
        <PlusIcon className="w-3.5 h-3.5" /> Шинэ төсөл
      </Button>
    </div>
  );
}
