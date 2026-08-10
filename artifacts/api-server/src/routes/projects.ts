import { Router, type IRouter } from "express";
import { eq, count, inArray } from "drizzle-orm";
import { db, projectsTable, messagesTable, tasksTable } from "@workspace/db";
import fs from "fs/promises";
import path from "path";
import { TEMPLATES, type TemplateId } from "../templates";
import {
  CreateProjectBody,
  UpdateProjectBody,
  UpdateProjectParams,
  GetProjectParams,
  DeleteProjectParams,
  ListProjectsResponse,
  CreateProjectResponse,
  GetProjectResponse,
  UpdateProjectResponse,
  GetStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PROJECT_BASE = "/tmp/kodu-projects";

// GET /projects
router.get("/projects", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.passport?.user?.id ?? null;
  // If logged in, show only own projects; otherwise show all (dev/demo mode)
  const projects = userId
    ? await db.select().from(projectsTable)
        .where(eq(projectsTable.userId, userId))
        .orderBy(projectsTable.updatedAt)
    : await db.select().from(projectsTable).orderBy(projectsTable.updatedAt);

  const projectIds = projects.map((p) => p.id);

  const messageCounts =
    projectIds.length > 0
      ? await db
          .select({ projectId: messagesTable.projectId, cnt: count() })
          .from(messagesTable)
          .where(inArray(messagesTable.projectId, projectIds))
          .groupBy(messagesTable.projectId)
      : [];

  const taskCounts =
    projectIds.length > 0
      ? await db
          .select({ projectId: tasksTable.projectId, cnt: count() })
          .from(tasksTable)
          .where(inArray(tasksTable.projectId, projectIds))
          .groupBy(tasksTable.projectId)
      : [];

  const msgMap = Object.fromEntries(messageCounts.map((r) => [r.projectId, Number(r.cnt)]));
  const taskMap = Object.fromEntries(taskCounts.map((r) => [r.projectId, Number(r.cnt)]));

  const enriched = projects.map((p) => ({
    ...p,
    messageCount: msgMap[p.id] ?? 0,
    taskCount: taskMap[p.id] ?? 0,
  }));

  res.json(ListProjectsResponse.parse(enriched));
});

// POST /projects
router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req.session as any)?.passport?.user?.id ?? null;
  const templateId = (req.body.template ?? "blank") as TemplateId;

  const [project] = await db
    .insert(projectsTable)
    .values({ name: parsed.data.name, description: parsed.data.description, userId })
    .returning();

  // Write template files to temp dir
  const templateFiles = TEMPLATES[templateId] ?? TEMPLATES.blank;
  const projectDir = path.join(PROJECT_BASE, project.id);
  await fs.mkdir(projectDir, { recursive: true });
  for (const file of templateFiles) {
    const dest = path.join(projectDir, file.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file.content, "utf8");
  }

  res.status(201).json(CreateProjectResponse.parse({ ...project, messageCount: 0, taskCount: 0 }));
});

// GET /projects/:id
router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [msgCount] = await db.select({ cnt: count() }).from(messagesTable).where(eq(messagesTable.projectId, project.id));
  const [taskCount] = await db.select({ cnt: count() }).from(tasksTable).where(eq(tasksTable.projectId, project.id));

  res.json(GetProjectResponse.parse({ ...project, messageCount: Number(msgCount.cnt), taskCount: Number(taskCount.cnt) }));
});

// PATCH /projects/:id
router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .update(projectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [msgCount] = await db.select({ cnt: count() }).from(messagesTable).where(eq(messagesTable.projectId, project.id));
  const [taskCount] = await db.select({ cnt: count() }).from(tasksTable).where(eq(tasksTable.projectId, project.id));

  res.json(UpdateProjectResponse.parse({ ...project, messageCount: Number(msgCount.cnt), taskCount: Number(taskCount.cnt) }));
});

// DELETE /projects/:id
router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.projectId, params.data.id));
  await db.delete(tasksTable).where(eq(tasksTable.projectId, params.data.id));
  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));

  res.sendStatus(204);
});

// GET /stats
router.get("/stats", async (_req, res): Promise<void> => {
  const [totalProjects] = await db.select({ cnt: count() }).from(projectsTable);
  const [activeProjects] = await db.select({ cnt: count() }).from(projectsTable).where(eq(projectsTable.status, "active"));
  const [completedProjects] = await db.select({ cnt: count() }).from(projectsTable).where(eq(projectsTable.status, "completed"));
  const [totalMessages] = await db.select({ cnt: count() }).from(messagesTable);
  const [totalTasks] = await db.select({ cnt: count() }).from(tasksTable);

  res.json(
    GetStatsResponse.parse({
      totalProjects: Number(totalProjects.cnt),
      activeProjects: Number(activeProjects.cnt),
      completedProjects: Number(completedProjects.cnt),
      totalMessages: Number(totalMessages.cnt),
      totalTasks: Number(totalTasks.cnt),
    })
  );
});

// ── DELETE /api/projects/all — delete all projects ───────────────────────────
router.delete("/projects/all", async (req, res): Promise<void> => {
  const projects = await db.select({ id: projectsTable.id }).from(projectsTable);
  for (const p of projects) {
    await db.delete(messagesTable).where(eq(messagesTable.projectId, p.id));
    await db.delete(tasksTable).where(eq(tasksTable.projectId, p.id));
    // Remove temp dir
    const dir = path.join("/tmp/kodu-projects", p.id);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  await db.delete(projectsTable);
  res.json({ ok: true });
});

// ── GET /api/export — export all data as JSON ─────────────────────────────────
router.get("/export", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable);
  const messages = await db.select().from(messagesTable);
  const tasks = await db.select().from(tasksTable);
  res.setHeader("Content-Type", "application/json");
  res.json({ exportedAt: new Date().toISOString(), projects, messages, tasks });
});

export default router;
