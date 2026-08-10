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
  if (!req.user) return next();
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
  const [user] = await db.select({ credits: usersTable.credits })
    .from(usersTable).where(eq(usersTable.id, (req.user as any).id));
  res.json({ credits: user?.credits ?? 0 });
});

// ── POST /api/credits/add — admin/dev only ────────────────────────────────────
router.post("/credits/add", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }
  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ error: "amount шаардлагатай" }); return; }
  await db.update(usersTable)
    .set({ credits: sql`${usersTable.credits} + ${amount}` })
    .where(eq(usersTable.id, (req.user as any).id));
  const [user] = await db.select({ credits: usersTable.credits })
    .from(usersTable).where(eq(usersTable.id, (req.user as any).id));
  res.json({ credits: user?.credits ?? 0 });
});

// ── QPay packages ─────────────────────────────────────────────────────────────
const PACKAGES = [
  { id: "standard", name: "Standard", credits: 50,  price: 50000 },
  { id: "pro",      name: "Pro",      credits: 100, price: 80000, popular: true },
  { id: "premium",  name: "Premium",  credits: 180, price: 120000 },
];

router.get("/credits/packages", (_req, res): void => {
  res.json({ packages: PACKAGES });
});

// ── QPay helpers ──────────────────────────────────────────────────────────────
const QPAY_URL = () => process.env.QPAY_URL ?? "https://merchant.qpay.mn/v2";

async function getQPayToken(): Promise<string> {
  const res = await fetch(`${QPAY_URL()}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`
      ).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`QPay auth failed: ${res.status}`);
  const data = await res.json() as any;
  return data.access_token;
}

// ── Idempotency store (invoice_id → true) — resets on restart ────────────────
// For production: move to DB. Covers restarts via QPay retry window (~24h).
const processedInvoices = new Set<string>();

// ── POST /api/credits/qpay — create QPay invoice ─────────────────────────────
router.post("/credits/qpay", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }

  const { packageId } = req.body;
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) { res.status(400).json({ error: "Буруу package" }); return; }

  if (!process.env.QPAY_USERNAME || !process.env.QPAY_PASSWORD || !process.env.QPAY_INVOICE_CODE) {
    res.status(503).json({ error: "QPay тохируулагдаагүй байна" });
    return;
  }

  try {
    const access_token = await getQPayToken();
    const userId = (req.user as any).id;

    // sender_invoice_no: "kodu_{userId}_{packageId}_{timestamp}"
    // Use underscore separator so UUID dashes don't break parsing
    const senderNo = `kodu_${userId}_${packageId}_${Date.now()}`;

    const callbackBase = process.env.BASE_URL
      ?? process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : "https://kodu.live";

    const invoiceRes = await fetch(`${QPAY_URL()}/invoice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invoice_code:           process.env.QPAY_INVOICE_CODE,
        sender_invoice_no:      senderNo,
        invoice_receiver_code:  userId,
        invoice_description:    `Kodu ${pkg.name} — ${pkg.credits} кредит`,
        amount:                 pkg.price,
        callback_url:           `${callbackBase}/api/credits/qpay/callback`,
      }),
    });

    if (!invoiceRes.ok) {
      const err = await invoiceRes.text();
      throw new Error(`Invoice үүсгэхэд алдаа: ${err}`);
    }

    const invoice = await invoiceRes.json() as any;
    res.json({ invoice, package: pkg });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/credits/qpay/callback — QPay webhook ───────────────────────────
// QPay calls this after a successful payment.
// Payload shape (QPay v2):
//   { payment_id, qpay_payment_id, invoice_id, qpay_invoice_id, payment_status?, ... }
router.post("/credits/qpay/callback", async (req, res): Promise<void> => {
  const body = req.body ?? {};

  // Normalise field names — QPay uses both conventions
  const invoiceId: string = body.invoice_id ?? body.qpay_invoice_id ?? "";
  const paymentId: string = body.payment_id ?? body.qpay_payment_id ?? "";
  const idempotencyKey = invoiceId || paymentId;

  if (!idempotencyKey) {
    res.status(400).json({ error: "invoice_id эсвэл payment_id шаардлагатай" });
    return;
  }

  // Duplicate-payment guard
  if (processedInvoices.has(idempotencyKey)) {
    res.json({ ok: true, skipped: true, reason: "already_processed" });
    return;
  }

  if (!process.env.QPAY_USERNAME || !process.env.QPAY_PASSWORD) {
    res.status(503).json({ error: "QPay тохируулагдаагүй" });
    return;
  }

  try {
    // 1. Fresh token
    const access_token = await getQPayToken();

    // 2. Verify payment status
    const checkRes = await fetch(`${QPAY_URL()}/payment/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        check_datas: [{ payment_id: paymentId, invoice_id: invoiceId }],
      }),
    });

    const checkData = await checkRes.json() as any;

    // QPay returns { count: N, rows: [{payment_status, ...}] }
    const paid = Array.isArray(checkData?.rows)
      ? checkData.rows.some((r: any) =>
          (r.payment_status ?? r.status ?? "").toUpperCase() === "PAID"
        )
      : false;

    if (!paid) {
      // Not yet paid — QPay may call again; return 200 so QPay doesn't consider it failed
      res.json({ ok: false, reason: "payment_not_confirmed" });
      return;
    }

    // 3. Retrieve invoice to get sender_invoice_no → userId + packageId
    const invoiceRes = await fetch(`${QPAY_URL()}/invoice/${invoiceId}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const invoiceData = await invoiceRes.json() as any;

    // sender_invoice_no: "kodu_{userId}_{packageId}_{timestamp}"
    const senderNo: string = invoiceData?.sender_invoice_no ?? invoiceData?.invoice?.sender_invoice_no ?? "";

    // Format: kodu_{uuid}_{packageId}_{ts}
    // UUID contains hyphens but no underscores; split by underscore is safe
    const parts = senderNo.split("_"); // ["kodu", uuid, packageId, timestamp]
    // parts[0] = "kodu", parts[1] = userId, parts[2] = packageId, rest = timestamp
    const userId = parts[1] ?? "";
    const packageId = parts[2] ?? "";

    const pkg = PACKAGES.find((p) => p.id === packageId);

    if (!userId || !pkg) {
      // Log but still return 200 so QPay stops retrying
      console.error("[QPay callback] Cannot parse invoice metadata", { senderNo, invoiceId });
      res.status(400).json({ error: "Invoice metadata буруу", senderNo });
      return;
    }

    // 4. Add credits — mark idempotency key BEFORE DB write to prevent race
    processedInvoices.add(idempotencyKey);

    await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${pkg.credits}` })
      .where(eq(usersTable.id, userId));

    console.info(`[QPay] ✅ ${pkg.credits}кр нэмэгдлээ — user=${userId} pkg=${packageId} invoice=${invoiceId}`);
    res.json({ ok: true, credits_added: pkg.credits });
  } catch (err: any) {
    console.error("[QPay callback] Error:", err.message);
    // Return 500 so QPay retries — but only if we haven't committed yet
    if (!processedInvoices.has(idempotencyKey)) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ ok: true });
    }
  }
});

// ── GET /api/credits/qpay/status/:invoiceId — poll payment status ─────────────
// Frontend polls this after showing QR code; resolves when paid
router.get("/credits/qpay/status/:invoiceId", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Нэвтрэх шаардлагатай" }); return; }

  const { invoiceId } = req.params;

  // Already processed in this server lifetime
  if (processedInvoices.has(invoiceId)) {
    res.json({ paid: true });
    return;
  }

  try {
    const access_token = await getQPayToken();

    const checkRes = await fetch(`${QPAY_URL()}/payment/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ check_datas: [{ invoice_id: invoiceId }] }),
    });

    const checkData = await checkRes.json() as any;
    const paid = Array.isArray(checkData?.rows)
      ? checkData.rows.some((r: any) =>
          (r.payment_status ?? r.status ?? "").toUpperCase() === "PAID"
        )
      : false;

    res.json({ paid, rows: checkData?.rows ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message, paid: false });
  }
});

export default router;
