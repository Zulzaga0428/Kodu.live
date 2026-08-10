import { Router, type IRouter } from "express";
import { eq, count, sum, desc } from "drizzle-orm";
import { db, usersTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

// ── Admin middleware ───────────────────────────────────────────────────────────
function requireAdmin(req: any, res: any, next: any) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  if (!req.user || req.user.email !== adminEmail) {
    res.status(403).json({ error: "Admin эрх байхгүй" });
    return;
  }
  next();
}

// ── GET /api/admin/stats ───────────────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [projectCount] = await db.select({ count: count() }).from(projectsTable);

  // Total credits consumed = sum of (50 - current credits) for all users
  // We approximate: newUserDefault - current = spent
  const [creditData] = await db.select({ totalCredits: sum(usersTable.credits) }).from(usersTable);

  const totalUsers = userCount?.count ?? 0;
  const totalProjects = projectCount?.count ?? 0;
  const totalCreditsHeld = Number(creditData?.totalCredits ?? 0);
  // Approx credits used = (users × 50) - current held
  const creditsUsed = Math.max(0, totalUsers * 50 - totalCreditsHeld);

  res.json({
    totalUsers,
    totalProjects,
    liveSites: 0,        // Placeholder — SAND API integration needed
    creditsUsed,
    totalRevenue: 0,     // Placeholder — QPay ledger needed
    monthRevenue: 0,
    paidUsers: 0,
    freeUsers: totalUsers,
    mrr: 0,              // KoDu Hosting placeholder
    hostingPaid: 1,
    hostingExpiringSoon: 3,
  });
});

// ── GET /api/admin/users ───────────────────────────────────────────────────────
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const paidOnly = req.query.paid === "true";

  const [totalRow] = await db.select({ count: count() }).from(usersTable);
  const total = totalRow?.count ?? 0;

  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    credits: usersTable.credits,
    provider: usersTable.provider,
    createdAt: usersTable.createdAt,
  })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// ── POST /api/admin/users/:id/gift ────────────────────────────────────────────
router.post("/admin/users/:id/gift", requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || typeof amount !== "number" || amount <= 0 || amount > 10000) {
    res.status(400).json({ error: "Буруу тоо (1-10000)" });
    return;
  }

  const [user] = await db.select({ credits: usersTable.credits, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Хэрэглэгч олдсонгүй" }); return; }

  await db.update(usersTable)
    .set({ credits: user.credits + amount })
    .where(eq(usersTable.id, id));

  res.json({ ok: true, newCredits: user.credits + amount, name: user.name });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  // Don't allow admin to delete themselves
  if (req.user?.id === id) {
    res.status(400).json({ error: "Өөрийгөө устгах боломжгүй" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

export default router;
