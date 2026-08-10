import { Router, type IRouter } from "express";
import fs from "fs/promises";
import path from "path";

const router: IRouter = Router();

const SAND_URL = process.env.SAND_URL!;
const SAND_KEY = process.env.SAND_KEY!;
const PROJECT_BASE = "/tmp/kodu-projects";

// ── In-memory preview registry ────────────────────────────────────────────────
const previews = new Map<string, { id: string; url: string }>();

// ── SAND API helper ───────────────────────────────────────────────────────────
async function sand(method: string, endpoint: string, body?: unknown) {
  const res = await fetch(SAND_URL + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${SAND_KEY}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(100_000), // SAND internal wait is 90s
  });
  const data = res.ok ? await res.json().catch(() => null) : null;
  return { status: res.status, data };
}

// ── File helpers ──────────────────────────────────────────────────────────────
const SKIP = new Set(["node_modules", ".next", ".git", "dist", ".cache", "out", ".turbo"]);

async function collectFiles(dir: string, base: string): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (e.isDirectory()) {
      results.push(...(await collectFiles(full, base)));
    } else {
      try {
        const content = await fs.readFile(full, "utf8");
        results.push({ path: rel, content });
      } catch { /* skip binary */ }
    }
  }
  return results;
}

function detectMode(files: { path: string }[]): "app" | "static" | "expo" {
  if (files.some(f => f.path.startsWith("app/") || f.path === "app/page.tsx" || f.path === "app/layout.tsx")) return "app";
  if (files.some(f => f.path === "index.html")) return "static";
  return "app";
}

const DEFAULT_LAYOUT = `import type { Metadata } from "next";
export const metadata: Metadata = { title: "Kodu Preview" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}
`;

const DEFAULT_PAGE = `export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">Kodu Preview</h1>
        <p className="text-zinc-400">Агент кодыг бичиж эхлэхэд энд харагдана.</p>
      </div>
    </main>
  );
}
`;

const DEFAULT_CSS = `@import "tailwindcss";
`;

function ensureAppFiles(files: { path: string; content: string }[]): { path: string; content: string }[] {
  const paths = new Set(files.map(f => f.path));
  const extra: { path: string; content: string }[] = [];
  if (!paths.has("app/layout.tsx")) extra.push({ path: "app/layout.tsx", content: DEFAULT_LAYOUT });
  if (!paths.has("app/page.tsx")) extra.push({ path: "app/page.tsx", content: DEFAULT_PAGE });
  if (!paths.has("app/globals.css")) extra.push({ path: "app/globals.css", content: DEFAULT_CSS });
  return [...extra, ...files];
}

// ── POST /api/projects/:id/preview — create (or return cached) ────────────────
router.post("/projects/:id/preview", async (req, res): Promise<void> => {
  const { id } = req.params;
  const dir = path.join(PROJECT_BASE, id);

  let files = await collectFiles(dir, dir);
  const mode = detectMode(files);
  if (mode === "app") files = ensureAppFiles(files);

  // Check size
  const totalBytes = files.reduce((s, f) => s + f.content.length, 0);
  if (totalBytes > 5 * 1024 * 1024) {
    res.status(413).json({ error: "Payload too large (>5MB)" });
    return;
  }

  const { status, data } = await sand("POST", "/api/previews", {
    files,
    mode,
    ttlMin: 15,
  });

  if (status === 503) {
    res.status(503).json({ error: "Server busy. Try again in 30 seconds." });
    return;
  }
  if (status !== 200 || !data) {
    res.status(502).json({ error: `SAND error: ${status}` });
    return;
  }

  // Cache it
  previews.set(id, { id: data.id, url: data.url });

  if (data.ready === false) {
    if (data.reason === "compile_error") {
      // fetch logs
      const logs = await sand("GET", `/api/previews/${data.id}/logs?tail=100`);
      res.json({
        ready: false,
        reason: "compile_error",
        previewId: data.id,
        url: data.url,
        logs: logs.data ? logs.data.stdout + "\n" + logs.data.stderr : "",
      });
      return;
    }
    // oom/timeout — infra problem
    res.json({ ready: false, reason: data.reason, previewId: data.id, url: data.url });
    return;
  }

  res.json({ ready: true, previewId: data.id, url: data.url, warm: data.warm });
});

// ── PUT /api/projects/:id/preview/files — hot reload ─────────────────────────
router.put("/projects/:id/preview/files", async (req, res): Promise<void> => {
  const { id } = req.params;
  const cached = previews.get(id);
  if (!cached) { res.status(404).json({ error: "No active preview" }); return; }

  const dir = path.join(PROJECT_BASE, id);
  let files = await collectFiles(dir, dir);
  const mode = detectMode(files);
  if (mode === "app") files = ensureAppFiles(files);

  const { status } = await sand("PUT", `/api/previews/${cached.id}/files`, { files });

  if (status === 404) {
    // Expired — delete from cache, client should re-create
    previews.delete(id);
    res.status(404).json({ gone: true });
    return;
  }
  res.json({ ok: status === 200 });
});

// ── POST /api/projects/:id/preview/keepalive ──────────────────────────────────
router.post("/projects/:id/preview/keepalive", async (req, res): Promise<void> => {
  const { id } = req.params;
  const cached = previews.get(id);
  if (!cached) { res.status(404).json({ gone: true }); return; }

  const { status } = await sand("POST", `/api/previews/${cached.id}/keepalive`, {});
  if (status !== 200) {
    previews.delete(id);
    res.status(404).json({ gone: true });
    return;
  }
  res.json({ ok: true });
});

// ── DELETE /api/projects/:id/preview — stop ───────────────────────────────────
router.delete("/projects/:id/preview", async (req, res): Promise<void> => {
  const { id } = req.params;
  const cached = previews.get(id);
  if (cached) {
    await sand("DELETE", `/api/previews/${cached.id}`);
    previews.delete(id);
  }
  res.json({ ok: true });
});

// ── GET /api/projects/:id/preview/logs ───────────────────────────────────────
router.get("/projects/:id/preview/logs", async (req, res): Promise<void> => {
  const { id } = req.params;
  const cached = previews.get(id);
  if (!cached) { res.status(404).json({ error: "No active preview" }); return; }

  const { status, data } = await sand("GET", `/api/previews/${cached.id}/logs?tail=200`);
  if (status !== 200) { res.status(status).json({ error: "Failed to fetch logs" }); return; }
  res.json(data);
});

// ── GET /api/sand/health — proxy SAND health ──────────────────────────────────
router.get("/sand/health", async (_req, res): Promise<void> => {
  const { status, data } = await sand("GET", "/__health");
  res.status(status).json(data ?? {});
});

export default router;
