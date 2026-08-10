import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

// ── Credit costs per model ────────────────────────────────────────────────────
export const MODEL_COST: Record<string, number> = {
  "claude-haiku-4-5": 4,   // ⚡ Fast
  "claude-sonnet-4-5": 7,  // 🧠 Smart
  "claude-opus-4-5": 25,   // 🔬 Deep
};

export function creditCost(model: string): number {
  return MODEL_COST[model] ?? 7;
}

// ── Middleware: require enough credits ────────────────────────────────────────
export async function requireCredits(req: any, res: any, next: any) {
  if (!req.user) return next(); // unauthenticated — let chat route handle it
  const model = req.body?.model ?? "claude-sonnet-4-5";
  const cost = creditCost(model);
  const [user] = await db.select({ credits: usersTable.credits })
    .from(usersTable).where(eq(usersTable.id, req.user.id));
  if (!user || user.credits < cost) {
    res.status(402).json({
      error: "Кредит хүрэлцэхгүй байна",
      code: "INSUFFICIENT_CREDITS",
      required: cost,
      available: user?.credits ?? 0,
    });
    return;
  }
  next();
}

// ── Deduct credits after successful chat ──────────────────────────────────────
export async function deductCredits(userId: string, model: string) {
  const cost = creditCost(model);
  await db.update(usersTable)
    .set({ credits: sql`${usersTable.credits} - ${cost}` })
    .where(eq(usersTable.id, userId));
}

// ── GET /api/credits ──────────────────────────────────────────────────────────
router.get("/credits", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }
  const userId = (req.user as any).id;
  const [user] = await db.select({ credits: usersTable.credits })
    .from(usersTable).where(eq(usersTable.id, userId));
  res.json({ credits: user?.credits ?? 0 });
});

// ── POST /api/credits/add — admin/dev only ────────────────────────────────────
router.post("/credits/add", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }
  const userId = (req.user as any).id;
  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ error: "amount шаардлагатай" }); return; }
  await db.update(usersTable)
    .set({ credits: sql`${usersTable.credits} + ${amount}` })
    .where(eq(usersTable.id, userId));
  const [user] = await db.select({ credits: usersTable.credits })
    .from(usersTable).where(eq(usersTable.id, userId));
  res.json({ credits: user?.credits ?? 0 });
});

// ── QPay packages ─────────────────────────────────────────────────────────────
const PACKAGES = [
  { id: "standard", name: "Standard", credits: 50, price: 50000 },
  { id: "pro",      name: "Pro",      credits: 100, price: 80000, popular: true },
  { id: "premium",  name: "Premium",  credits: 180, price: 120000 },
];

router.get("/credits/packages", (_req, res): void => {
  res.json({ packages: PACKAGES });
});

// ── POST /api/credits/qpay — create QPay invoice ─────────────────────────────
router.post("/credits/qpay", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }
  const { packageId } = req.body;
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) { res.status(400).json({ error: "Буруу package" }); return; }

  const QPAY_URL = process.env.QPAY_URL ?? "https://merchant.qpay.mn/v2";
  const QPAY_USERNAME = process.env.QPAY_USERNAME;
  const QPAY_PASSWORD = process.env.QPAY_PASSWORD;
  const QPAY_INVOICE_CODE = process.env.QPAY_INVOICE_CODE;

  if (!QPAY_USERNAME || !QPAY_PASSWORD || !QPAY_INVOICE_CODE) {
    res.status(503).json({ error: "QPay тохируулагдаагүй байна" });
    return;
  }

  try {
    // 1. Get QPay token
    const tokenRes = await fetch(`${QPAY_URL}/auth/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${QPAY_USERNAME}:${QPAY_PASSWORD}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });
    const { access_token } = await tokenRes.json() as any;

    // 2. Create invoice
    const userId = (req.user as any).id;
    const invoiceRes = await fetch(`${QPAY_URL}/invoice`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invoice_code: QPAY_INVOICE_CODE,
        sender_invoice_no: `${userId}-${packageId}-${Date.now()}`,
        invoice_receiver_code: userId,
        invoice_description: `Kodu ${pkg.name} — ${pkg.credits} кредит`,
        amount: pkg.price,
        callback_url: `${process.env.BASE_URL ?? ""}/api/credits/qpay/callback`,
      }),
    });
    const invoice = await invoiceRes.json() as any;
    res.json({ invoice, package: pkg });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/credits/qpay/callback — QPay webhook ───────────────────────────
router.post("/credits/qpay/callback", async (req, res): Promise<void> => {
  // QPay sends payment confirmation here
  // In production: verify the payment with QPay then add credits
  const { payment_id, invoice_id } = req.body ?? {};
  if (!payment_id || !invoice_id) { res.status(400).json({ error: "bad payload" }); return; }
  // TODO: verify payment with QPay, extract userId+package from invoice metadata, add credits
  res.json({ ok: true });
});

export default router;
