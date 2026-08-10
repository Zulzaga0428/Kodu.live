import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db, messagesTable, projectsTable } from "@workspace/db";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const router: IRouter = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const execAsync = promisify(exec);

const PROJECT_BASE = "/tmp/kodu-projects";

// ── Filesystem helpers ────────────────────────────────────────────────────────

function projectDir(id: string) {
  return path.join(PROJECT_BASE, id);
}

function safePath(id: string, filePath: string): string {
  const base = projectDir(id);
  const resolved = path.resolve(base, filePath.replace(/^\/+/, ""));
  if (!resolved.startsWith(base)) throw new Error("Path traversal denied");
  return resolved;
}

async function initProjectDir(id: string, name: string) {
  const dir = projectDir(id);
  try { await fs.access(dir); return; } catch {}
  await fs.mkdir(dir, { recursive: true });

  const pkgName = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const files: Record<string, string> = {
    "README.md": `# ${name}\n\nKodu Agent-аар үүсгэсэн төсөл.\n`,
    "package.json": JSON.stringify({
      name: pkgName || "kodu-project",
      version: "0.1.0",
      private: true,
      scripts: { dev: "next dev", build: "next build", start: "next start" },
      dependencies: { next: "^15", react: "^19", "react-dom": "^19" },
      devDependencies: { typescript: "^5", "@types/node": "^20", "@types/react": "^19" },
    }, null, 2),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2017", lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true, skipLibCheck: true, strict: true, noEmit: true,
        esModuleInterop: true, module: "esnext", moduleResolution: "bundler",
        resolveJsonModule: true, isolatedModules: true, jsx: "preserve",
        incremental: true, paths: { "@/*": ["./src/*"] },
      },
      include: ["**/*.ts", "**/*.tsx"], exclude: ["node_modules"],
    }, null, 2),
    "src/app/layout.tsx": `import type { Metadata } from "next";\n\nexport const metadata: Metadata = { title: "${name}" };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="mn">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
    "src/app/page.tsx": `export default function Home() {\n  return (\n    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>\n      <h1>Сайн уу, ${name}! 👋</h1>\n      <p>Kodu Agent-тай хамт энд бичнэ үү.</p>\n    </main>\n  );\n}\n`,
    "src/app/globals.css": `* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: -apple-system, sans-serif; background: #fff; color: #111; }\n`,
  };

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
  }
}

async function walkDir(dir: string, base = ""): Promise<{ path: string; type: "file" | "dir" }[]> {
  const result: { path: string; type: "file" | "dir" }[] = [];
  const SKIP = new Set(["node_modules", ".next", ".git", ".turbo", "dist"]);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      result.push({ path: rel, type: "dir" });
      result.push(...await walkDir(path.join(dir, e.name), rel));
    } else {
      result.push({ path: rel, type: "file" });
    }
  }
  return result;
}

// ── Tools ─────────────────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_files",
    description: "Төслийн файлуудын жагсаалтыг харуулна.",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string", description: "Directory path (optional)" } },
    },
  },
  {
    name: "read_file",
    description: "Файлын агуулгыг уншина.",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string", description: "File path" } },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Файл үүсгэх эсвэл бүрэн агуулгаар бичих.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "delete_file",
    description: "Файл устгана.",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string", description: "File path" } },
      required: ["path"],
    },
  },
  {
    name: "run_command",
    description: "Терминал команд ажиллуулна (ls, cat, echo, node, pnpm install гэх мэт).",
    input_schema: {
      type: "object" as const,
      properties: { command: { type: "string", description: "Shell command to run" } },
      required: ["command"],
    },
  },
];

async function executeTool(name: string, input: any, id: string): Promise<string> {
  const dir = projectDir(id);
  switch (name) {
    case "list_files": {
      const target = input.path ? safePath(id, input.path) : dir;
      const files = await walkDir(target);
      return files.length
        ? files.map((f) => `${f.type === "dir" ? "📁" : "📄"} ${f.path}`).join("\n")
        : "(хоосон)";
    }
    case "read_file": {
      const p = safePath(id, input.path);
      return await fs.readFile(p, "utf8");
    }
    case "write_file": {
      const p = safePath(id, input.path);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, input.content, "utf8");
      return `✓ ${input.path} хадгалагдлаа`;
    }
    case "delete_file": {
      const p = safePath(id, input.path);
      await fs.unlink(p);
      return `✓ ${input.path} устгагдлаа`;
    }
    case "run_command": {
      const BLOCKED = ["rm -rf /", ":(){ :|:& };:", "sudo rm", "mkfs"];
      if (BLOCKED.some((b) => input.command.includes(b)))
        return "❌ Энэ командыг ажиллуулахыг хориглолоо";
      try {
        const { stdout, stderr } = await execAsync(input.command, {
          cwd: dir, timeout: 30_000, maxBuffer: 200 * 1024,
        });
        return ((stdout || "") + (stderr || "")).trim() || "(гаралт байхгүй)";
      } catch (e: any) {
        return `Алдаа: ${(e.stderr || e.message || "").trim()}`;
      }
    }
    default:
      return "Тодорхойгүй tool";
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Та бол kodu.live-ийн AI кодчиллын агент — Kodu Agent. Бүрэн хэмжээний автоном кодчиллын туслах.

Монгол болон Англи хэл дээр ажиллана. Хэрэглэгч Монголоор бичвэл Монголоор хариулна.

Чиний үүрэг:
- Хэрэглэгчийн хүсэлтийг биелүүлэхийн тулд файл үүсгэх, засах, устгах
- Шаардлагатай бол команд ажиллуулах
- React, TypeScript, Next.js, Node.js, Tailwind, SQL дэмжих
- Алдаа гарвал read_file-аар шалгаад засах

Ажиллах дүрэм:
1. Эхлээд list_files ашиглаж одоогийн байдлыг ойлго
2. Шаардлагатай файлуудыг read_file-аар уншаад ойлго
3. write_file-аар файл үүсгэ эсвэл бүрэн агуулгаар бичих (заавал бүрэн)
4. Хийсэн зүйлээ Монголоор товч тайлбарла`;

// ── POST /api/projects/:id/chat ───────────────────────────────────────────────

router.post("/projects/:id/chat", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { content, model, maxTokens } = req.body;

  if (!content?.trim()) {
    res.status(400).json({ error: "content шаардлагатай" });
    return;
  }

  const [project] = await db.select().from(projectsTable)
    .where(eq(projectsTable.id, id)).limit(1);
  if (!project) { res.status(404).json({ error: "Төсөл олдсонгүй" }); return; }

  await initProjectDir(id, project.name);

  await db.insert(messagesTable).values({
    projectId: id, role: "user", content: content.trim(),
  });

  const history = await db.select().from(messagesTable)
    .where(eq(messagesTable.projectId, id))
    .orderBy(asc(messagesTable.createdAt))
    .limit(40);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let fullText = "";

  try {
    // ── Agentic loop ────────────────────────────────────────────────────────
    for (let loop = 0; loop < 20; loop++) {
      const response = await anthropic.messages.create({
        model: model ?? "claude-sonnet-4-5",
        max_tokens: maxTokens ? Number(maxTokens) : 8192,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      // Stream text blocks
      for (const block of response.content) {
        if (block.type === "text" && block.text) {
          fullText += block.text;
          send({ type: "delta", text: block.text });
        }
      }

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "end_turn") break;

      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== "tool_use") continue;

          send({ type: "tool_call", tool: block.name, input: block.input });

          let result = "";
          let isError = false;
          try {
            result = await executeTool(block.name, block.input as any, id);
          } catch (e: any) {
            result = `Алдаа: ${e.message}`;
            isError = true;
          }

          send({ type: "tool_result", tool: block.name, result: result.slice(0, 400), isError });

          if (block.name === "write_file" && !isError) {
            send({ type: "file_changed", path: (block.input as any).path, content: (block.input as any).content });
          }
          if (block.name === "delete_file" && !isError) {
            send({ type: "file_deleted", path: (block.input as any).path });
          }
          if (block.name === "list_files" || block.name === "write_file" || block.name === "delete_file") {
            // Send updated file tree
            const files = await walkDir(projectDir(id));
            send({ type: "file_tree", files });
          }

          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }

        messages.push({ role: "user", content: toolResults });
      }
    }

    if (fullText) {
      await db.insert(messagesTable).values({
        projectId: id, role: "assistant", content: fullText,
      });
    }

    send({ type: "done" });
  } catch (err: any) {
    send({ type: "error", message: err.message ?? "Claude алдаа гарлаа" });
  } finally {
    res.end();
  }
});

// ── GET /api/projects/:id/files — file tree ───────────────────────────────────

router.get("/projects/:id/files", async (req, res): Promise<void> => {
  const { id } = req.params;
  const dir = projectDir(id);
  try {
    await fs.access(dir);
    const files = await walkDir(dir);
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

// ── GET /api/projects/:id/file?path=... — read a single file ─────────────────

router.get("/projects/:id/file", async (req, res): Promise<void> => {
  const { id } = req.params;
  const filePath = (req.query.path as string) ?? "";
  if (!filePath) { res.status(400).json({ error: "path шаардлагатай" }); return; }
  try {
    const p = safePath(id, filePath);
    const content = await fs.readFile(p, "utf8");
    res.json({ content });
  } catch {
    res.status(404).json({ error: "Файл олдсонгүй" });
  }
});

// ── POST /api/projects/:id/file — create file or folder ──────────────────────

router.post("/projects/:id/file", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { path: filePath, content = "", isDir = false } = req.body ?? {};
  if (!filePath) { res.status(400).json({ error: "path шаардлагатай" }); return; }
  try {
    const p = safePath(id, filePath);
    if (isDir) {
      await fs.mkdir(p, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, content, "utf8");
    }
    const files = await walkDir(projectDir(id));
    res.json({ ok: true, files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/projects/:id/file?path=... — delete file or folder ───────────

router.delete("/projects/:id/file", async (req, res): Promise<void> => {
  const { id } = req.params;
  const filePath = (req.query.path as string) ?? "";
  if (!filePath) { res.status(400).json({ error: "path шаардлагатай" }); return; }
  try {
    const p = safePath(id, filePath);
    const stat = await fs.stat(p);
    if (stat.isDirectory()) {
      await fs.rm(p, { recursive: true, force: true });
    } else {
      await fs.unlink(p);
    }
    const files = await walkDir(projectDir(id));
    res.json({ ok: true, files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/projects/:id/file — rename/move file ─────────────────────────

router.patch("/projects/:id/file", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { oldPath, newPath } = req.body ?? {};
  if (!oldPath || !newPath) { res.status(400).json({ error: "oldPath, newPath шаардлагатай" }); return; }
  try {
    const src = safePath(id, oldPath);
    const dst = safePath(id, newPath);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.rename(src, dst);
    const files = await walkDir(projectDir(id));
    res.json({ ok: true, files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/projects/:id/download — ZIP the whole project ───────────────────

router.get("/projects/:id/download", async (req, res): Promise<void> => {
  const { id } = req.params;
  const dir = projectDir(id);
  try {
    await fs.access(dir);
  } catch {
    res.status(404).json({ error: "Төсөл олдсонгүй" }); return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
  const filename = (project?.name ?? "project").replace(/[^a-zA-Z0-9-_]/g, "_");

  const tmpZip = `/tmp/kodu-zip-${id}.zip`;
  try {
    // Use system zip; exclude heavy dirs
    await execAsync(
      `zip -r "${tmpZip}" . -x "node_modules/*" ".next/*" ".git/*" "dist/*"`,
      { cwd: dir }
    );
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.zip"`);
    const zipData = await fs.readFile(tmpZip);
    res.send(zipData);
  } finally {
    fs.unlink(tmpZip).catch(() => {});
  }
});

export default router;
