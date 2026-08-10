import { useState, useRef, useEffect } from "react";
import { useRoute, Link, useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowLeftIcon, TerminalSquareIcon, SendIcon, CheckCircle2Icon, CircleIcon, ClockIcon, MoreVerticalIcon, Trash2Icon, Loader2Icon, SettingsIcon, PlusIcon, MessageSquareIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  MessageRole
} from "@workspace/api-client-react";

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading, error: projectError } = useGetProject(id, { 
    query: { enabled: !!id, queryKey: getGetProjectQueryKey(id) } 
  });
  
  const deleteProject = useDeleteProject();

  const handleDeleteProject = () => {
    if (confirm("Төслийг устгахдаа итгэлтэй байна уу? (Are you sure you want to delete this project?)")) {
      deleteProject.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Төсөл устгагдлаа" });
          setLocation("/dashboard");
        }
      });
    }
  };

  if (projectError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <h2 className="text-xl font-mono mb-4 text-destructive">Алдаа гарлаа (Error)</h2>
        <Button onClick={() => setLocation("/dashboard")} variant="outline">БУЦАХ (RETURN)</Button>
      </div>
    );
  }

  if (projectLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <TerminalSquareIcon className="w-4 h-4 text-primary" />
            <span className="font-mono font-bold">{project.name}</span>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-[10px] ml-2 uppercase font-mono py-0 h-5">
              {project.status === 'active' ? 'Идэвхтэй' : project.status === 'completed' ? 'Дууссан' : 'Архивласан'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProjectSettings project={project} onDelete={handleDeleteProject} />
        </div>
      </header>

      {/* Main Workspace Panels */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left Panel: Chat */}
          <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col h-full bg-background relative">
            <ChatPanel projectId={id} />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/50 transition-colors" />

          {/* Middle Panel: Tasks */}
          <ResizablePanel defaultSize={25} minSize={20} className="flex flex-col h-full bg-card/30 border-l border-border/50">
            <TasksPanel projectId={id} />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/50 transition-colors" />

          {/* Right Panel: Brain/Context */}
          <ResizablePanel defaultSize={25} minSize={20} className="flex flex-col h-full bg-card/10 border-l border-border/50">
            <ContextPanel project={project} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function ProjectSettings({ project, onDelete }: { project: any, onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();

  const handleStatusChange = (status: ProjectStatus) => {
    updateProject.mutate({ id: project.id, data: { status } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetProjectQueryKey(project.id), data);
        toast({ title: "Төлөв шинэчлэгдлээ", description: `Status changed to ${status}` });
      }
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 font-mono text-sm border-border/50 bg-card">
        <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.active)}>
           Төлөв: Идэвхтэй (Active)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.completed)}>
           Төлөв: Дууссан (Completed)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange(ProjectStatus.archived)}>
           Төлөв: Архивласан (Archived)
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
           <Trash2Icon className="w-4 h-4 mr-2" /> Устгах (Delete)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChatPanel({ projectId }: { projectId: string }) {
  const { data: messages, isLoading } = useListMessages(projectId, {
    query: { enabled: !!projectId, queryKey: getListMessagesQueryKey(projectId) }
  });
  const createMessage = useCreateMessage();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || createMessage.isPending) return;
    
    const content = input;
    setInput("");
    
    createMessage.mutate({ id: projectId, data: { role: MessageRole.user, content } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) });
        // Simulate assistant response for UI completeness since backend might just store it without generating an AI response
        // In a real app, the backend would trigger an AI generation here
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(projectId) });
        }, 1000);
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-10 border-b border-border/50 flex items-center px-4 shrink-0 bg-background/50">
        <span className="font-mono text-xs text-muted-foreground font-semibold">TERMINAL / CHAT</span>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 pb-4">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : messages?.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-border/50 rounded-lg text-muted-foreground mt-10 mx-auto max-w-sm">
              <MessageSquareIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-mono">Систем бэлэн. Туслахтай харилцах... (System ready. Awaiting input...)</p>
            </div>
          ) : (
            messages?.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{msg.role === 'user' ? 'USER' : 'ASSISTANT'}</span>
                </div>
                <div className={`max-w-[85%] rounded-md px-4 py-3 text-sm font-mono leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card border border-border text-card-foreground'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {createMessage.isPending && (
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] rounded-md px-4 py-3 text-sm font-mono bg-primary text-primary-foreground opacity-50">
                {input || "..."}
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 bg-background shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Код бичих заавар оруулах (Type a command...)" 
            className="min-h-[44px] h-[44px] max-h-[200px] resize-none font-mono py-3 bg-card border-border focus-visible:ring-primary focus-visible:border-primary"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || createMessage.isPending} className="h-[44px] w-[44px] shrink-0">
            <SendIcon className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

const taskSchema = z.object({
  title: z.string().min(1),
});

function TasksPanel({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = useListTasks(projectId, {
    query: { enabled: !!projectId, queryKey: getListTasksQueryKey(projectId) }
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();

  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTask.mutate({ id: projectId, data: { title: newTaskTitle, order: tasks ? tasks.length : 0 } }, {
      onSuccess: () => {
        setNewTaskTitle("");
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
      }
    });
  };

  const toggleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus = currentStatus === TaskStatus.pending ? TaskStatus.in_progress 
                     : currentStatus === TaskStatus.in_progress ? TaskStatus.done 
                     : TaskStatus.pending;
    
    // Optimistic local update
    queryClient.setQueryData(getListTasksQueryKey(projectId), (old: any) => {
      if (!old) return old;
      return old.map((t: any) => t.id === taskId ? { ...t, status: nextStatus } : t);
    });

    updateTask.mutate({ id: projectId, taskId, data: { status: nextStatus } });
  };

  const removeTask = (taskId: string) => {
    deleteTask.mutate({ id: projectId, taskId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) })
    });
  };

  const sortedTasks = tasks ? [...tasks].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-10 border-b border-border/50 flex items-center justify-between px-4 shrink-0 bg-card/50">
        <span className="font-mono text-xs text-muted-foreground font-semibold">PLANNER / ТӨЛӨВЛӨГӨӨ</span>
        <Badge variant="outline" className="text-[10px] font-mono h-5 py-0 px-1.5 bg-background">
          {sortedTasks.filter(t => t.status === 'done').length} / {sortedTasks.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-2">
          {isLoading ? (
             <div className="flex justify-center p-4"><Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center p-4 text-xs font-mono text-muted-foreground">
              Даалгавар байхгүй байна.
            </div>
          ) : (
            sortedTasks.map((task) => (
              <div key={task.id} className="group flex items-start gap-2 p-2 rounded-md hover:bg-accent/5 transition-colors border border-transparent hover:border-border/50">
                <button 
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className="mt-0.5 shrink-0 transition-colors focus:outline-none"
                >
                  {task.status === 'done' ? (
                    <CheckCircle2Icon className="w-4 h-4 text-primary" />
                  ) : task.status === 'in_progress' ? (
                    <ClockIcon className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <CircleIcon className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  )}
                </button>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className={`text-sm font-sans ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </span>
                </div>
                <button 
                  onClick={() => removeTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-opacity focus:opacity-100"
                >
                  <Trash2Icon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/50 bg-card/50 shrink-0">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Шинэ даалгавар (Add task...)"
            className="h-8 text-sm font-mono bg-background border-border"
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!newTaskTitle.trim() || createTask.isPending}>
            <PlusIcon className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function ContextPanel({ project }: { project: any }) {
  const updateProject = useUpdateProject();
  const queryClient = useQueryClient();
  const [content, setContent] = useState(project.description || "");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update local state if server data changes entirely (e.g. initial load or full sync)
  const initializedForId = useRef(project.id);
  useEffect(() => {
    if (initializedForId.current !== project.id) {
      setContent(project.description || "");
      initializedForId.current = project.id;
    }
  }, [project.id, project.description]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      updateProject.mutate({ id: project.id, data: { description: val } }, {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetProjectQueryKey(project.id), (old: any) => 
            old ? { ...old, description: data.description } : old
          );
        }
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-10 border-b border-border/50 flex items-center justify-between px-4 shrink-0 bg-card/30">
        <span className="font-mono text-xs text-muted-foreground font-semibold">kodu.md / БААЗ</span>
        {updateProject.isPending && <Loader2Icon className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      
      <div className="flex-1 p-0 flex flex-col relative">
        <Textarea 
          value={content}
          onChange={handleChange}
          placeholder="# Төслийн тэмдэглэл&#10;&#10;Энд төслийн архитектур, бааз, дүрмүүдээ бичнэ үү..."
          className="flex-1 resize-none border-0 focus-visible:ring-0 rounded-none p-4 font-mono text-sm leading-relaxed bg-transparent text-muted-foreground placeholder:text-muted-foreground/30 h-full w-full"
        />
        <div className="absolute top-4 right-4 text-[10px] text-muted-foreground/30 font-mono pointer-events-none select-none">
          MARKDOWN
        </div>
      </div>
    </div>
  );
}
