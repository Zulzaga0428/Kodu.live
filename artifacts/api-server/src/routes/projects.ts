import { Router, type IRouter } from "express";
import { eq, count, inArray } from "drizzle-orm";
import { db, projectsTable, messagesTable, tasksTable } from "@workspace/db";
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

// GET /projects
router.get("/projects", async (req, res): Promise<void> => {
  const projects = await db.select().from(projectsTable).orderBy(projectsTable.updatedAt);

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

  const [project] = await db
    .insert(projectsTable)
    .values({ name: parsed.data.name, description: parsed.data.description })
    .returning();

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

export default router;
