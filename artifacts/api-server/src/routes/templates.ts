import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, projectsTable, usersTable } from "@workspace/db";
import fs from "fs/promises";
import path from "path";

const router: IRouter = Router();
const PROJECT_BASE = "/tmp/kodu-projects";

// ── GET /api/templates — public template gallery ──────────────────────────────
router.get("/templates", async (_req, res): Promise<void> => {
  const templates = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      description: projectsTable.description,
      thumbnailUrl: projectsTable.thumbnailUrl,
      templateCategory: projectsTable.templateCategory,
      templateAuthor: projectsTable.templateAuthor,
      forkCount: projectsTable.forkCount,
      createdAt: projectsTable.createdAt,
    })
    .from(projectsTable)
    .where(eq(projectsTable.isTemplate, true))
    .orderBy(desc(projectsTable.forkCount), desc(projectsTable.createdAt))
    .limit(50);

  res.json({ templates });
});

// ── POST /api/projects/:id/template — toggle template status ──────────────────
router.post("/projects/:id/template", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }

  const { id } = req.params;
  const { publish, category, thumbnailUrl } = req.body;

  const [project] = await db.select().from(projectsTable)
    .where(eq(projectsTable.id, id)).limit(1);

  if (!project) { res.status(404).json({ error: "Төсөл олдсонгүй" }); return; }
  if (project.userId !== (req.user as any).id) {
    res.status(403).json({ error: "Зөвхөн өөрийн төслийг template болгож болно" });
    return;
  }

  const authorName = (req.user as any).name ?? "Unknown";

  await db.update(projectsTable)
    .set({
      isTemplate: publish !== false,
      templateCategory: category ?? project.templateCategory ?? "general",
      thumbnailUrl: thumbnailUrl ?? project.thumbnailUrl,
      templateAuthor: authorName,
    })
    .where(eq(projectsTable.id, id));

  res.json({ ok: true, isTemplate: publish !== false });
});

// ── POST /api/templates/:id/fork — clone template as new project ──────────────
router.post("/templates/:id/fork", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }

  const { id } = req.params;
  const userId = (req.user as any).id;

  const [template] = await db.select().from(projectsTable)
    .where(eq(projectsTable.id, id)).limit(1);

  if (!template || !template.isTemplate) {
    res.status(404).json({ error: "Template олдсонгүй" }); return;
  }

  // Create new project for the user
  const [newProject] = await db.insert(projectsTable).values({
    userId,
    name: `${template.name} (copy)`,
    description: template.description,
    status: "active",
    isTemplate: false,
  }).returning();

  // Increment fork count on original
  await db.update(projectsTable)
    .set({ forkCount: sql`${projectsTable.forkCount} + 1` })
    .where(eq(projectsTable.id, id));

  // Copy files from template project to new project
  const srcDir = path.join(PROJECT_BASE, id);
  const dstDir = path.join(PROJECT_BASE, newProject.id);

  try {
    await fs.cp(srcDir, dstDir, { recursive: true });
  } catch {
    // Template may not have files yet — that's ok
  }

  res.json({ project: newProject });
});

export default router;
