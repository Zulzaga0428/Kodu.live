import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { useGetStats, useListProjects, useCreateProject, getListProjectsQueryKey, getGetStatsQueryKey, ProjectStatus } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { PlusIcon, TerminalSquareIcon, CheckCircle2Icon, ArchiveIcon, MessageSquareIcon, LayoutListIcon, Loader2Icon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const createProjectSchema = z.object({
  name: z.string().min(1, "Нэр оруулна уу (Name required)"),
  description: z.string().optional(),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

function getStatusBadgeVariant(status: ProjectStatus) {
  switch (status) {
    case ProjectStatus.active:
      return "default";
    case ProjectStatus.completed:
      return "secondary";
    case ProjectStatus.archived:
      return "outline";
    default:
      return "default";
  }
}

function getStatusLabel(status: ProjectStatus) {
  switch (status) {
    case ProjectStatus.active:
      return "Идэвхтэй";
    case ProjectStatus.completed:
      return "Дууссан";
    case ProjectStatus.archived:
      return "Архивласан";
    default:
      return status;
  }
}

export default function Dashboard() {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | ProjectStatus>("all");

  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: projects, isLoading: projectsLoading } = useListProjects();
  const createProject = useCreateProject();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: CreateProjectForm) => {
    createProject.mutate(
      { data },
      {
        onSuccess: (newProject) => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          setIsCreateOpen(false);
          form.reset();
          setLocation(`/projects/${newProject.id}`);
        },
        onError: () => {
          toast({
            title: "Алдаа гарлаа",
            description: "Төсөл үүсгэх үед алдаа гарлаа. (Failed to create project)",
            variant: "destructive",
          });
        },
      }
    );
  };

  const filteredProjects = projects?.filter((p) => filter === "all" || p.status === filter) || [];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <TerminalSquareIcon className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg font-mono tracking-tight">kode.live</span>
            </Link>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-mono">
                <PlusIcon className="w-4 h-4 mr-2" />
                Шинэ төсөл (New)
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] font-sans border-border/50 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-mono text-xl">Шинэ төсөл үүсгэх</DialogTitle>
                <DialogDescription>
                  Шинэ кодчиллын орчноо эхлүүлнэ үү. (Initialize a new coding environment)
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Төслийн нэр (Project Name)</FormLabel>
                        <FormControl>
                          <Input placeholder="Жишээ нь: API Gateway" {...field} className="font-mono bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Тайлбар (Description)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Төслийн зорилго..." {...field} className="font-mono min-h-[100px] resize-none bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={createProject.isPending} className="w-full font-mono">
                      {createProject.isPending && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
                      ҮҮСГЭХ (CREATE)
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl flex flex-col gap-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Нийт" value={stats?.totalProjects ?? 0} subtitle="Total Projects" loading={statsLoading} />
          <StatCard title="Идэвхтэй" value={stats?.activeProjects ?? 0} subtitle="Active" loading={statsLoading} icon={<TerminalSquareIcon className="w-4 h-4 text-primary" />} />
          <StatCard title="Дууссан" value={stats?.completedProjects ?? 0} subtitle="Completed" loading={statsLoading} icon={<CheckCircle2Icon className="w-4 h-4 text-emerald-500" />} />
          <StatCard title="Зурвас" value={stats?.totalMessages ?? 0} subtitle="Total Messages" loading={statsLoading} icon={<MessageSquareIcon className="w-4 h-4 text-muted-foreground" />} />
          <StatCard title="Даалгавар" value={stats?.totalTasks ?? 0} subtitle="Total Tasks" loading={statsLoading} icon={<LayoutListIcon className="w-4 h-4 text-muted-foreground" />} />
        </div>

        {/* Project List Area */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-mono">Төслүүд (Projects)</h2>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full max-w-[400px] md:w-auto">
              <TabsList className="grid w-full grid-cols-4 bg-card border border-border/50">
                <TabsTrigger value="all" className="font-mono text-xs">Бүгд</TabsTrigger>
                <TabsTrigger value={ProjectStatus.active} className="font-mono text-xs">Идэвхтэй</TabsTrigger>
                <TabsTrigger value={ProjectStatus.completed} className="font-mono text-xs">Дууссан</TabsTrigger>
                <TabsTrigger value={ProjectStatus.archived} className="font-mono text-xs">Архив</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {projectsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl bg-card/20">
              <TerminalSquareIcon className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">Төсөл олдсонгүй (No projects found)</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Шинэ төсөл үүсгэж, AI туслахтай хамт код бичиж эхлээрэй.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="font-mono">
                <PlusIcon className="w-4 h-4 mr-2" /> ЭХЛЭХ (START)
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer group bg-card/50 h-full flex flex-col border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={getStatusBadgeVariant(project.status)} className="font-mono text-[10px] uppercase">
                          {getStatusLabel(project.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(project.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <CardTitle className="font-mono text-xl group-hover:text-primary transition-colors">{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2 mt-2 font-sans">{project.description}</CardDescription>
                      )}
                    </CardHeader>
                    <div className="flex-1" />
                    <CardFooter className="pt-4 border-t border-border/20 flex gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <MessageSquareIcon className="w-3.5 h-3.5" />
                        {project.messageCount ?? 0}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <LayoutListIcon className="w-3.5 h-3.5" />
                        {project.taskCount ?? 0}
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, subtitle, loading, icon }: { title: string, value: number, subtitle: string, loading: boolean, icon?: React.ReactNode }) {
  return (
    <Card className="bg-card/30 border-border/50 backdrop-blur">
      <CardContent className="p-4 flex flex-col items-start">
        <div className="flex items-center justify-between w-full mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          {icon}
        </div>
        <div className="flex items-baseline gap-2">
          {loading ? (
             <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <h4 className="text-3xl font-bold font-mono">{value}</h4>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
