import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  CreateTaskBody,
  CreateTaskParams,
  ListTasksParams,
  UpdateTaskBody,
  UpdateTaskParams,
  DeleteTaskParams,
  ListTasksResponse,
  CreateTaskResponse,
  UpdateTaskResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /projects/:id/tasks
router.get("/projects/:id/tasks", async (req, res): Promise<void> => {
  const params = ListTasksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.projectId, params.data.id))
    .orderBy(tasksTable.order, tasksTable.createdAt);

  res.json(ListTasksResponse.parse(tasks));
});

// POST /projects/:id/tasks
router.post("/projects/:id/tasks", async (req, res): Promise<void> => {
  const params = CreateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      projectId: params.data.id,
      title: parsed.data.title,
      description: parsed.data.description,
      order: parsed.data.order ?? 0,
    })
    .returning();

  res.status(201).json(CreateTaskResponse.parse(task));
});

// PATCH /projects/:id/tasks/:taskId
router.patch("/projects/:id/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set(parsed.data)
    .where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.projectId, params.data.id)))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(UpdateTaskResponse.parse(task));
});

// DELETE /projects/:id/tasks/:taskId
router.delete("/projects/:id/tasks/:taskId", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, params.data.taskId), eq(tasksTable.projectId, params.data.id)));

  res.sendStatus(204);
});

export default router;
