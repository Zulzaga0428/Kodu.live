import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db, messagesTable, projectsTable } from "@workspace/db";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { requireCredits, deductCredits, creditCost } from "./credits";

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

const SYSTEM_PROMPT = `You are Kodu Agent — the AI coding engine powering kodu.live, Mongolia's premier AI development platform. You are a senior full-stack engineer and UI/UX expert who writes production-ready, visually stunning code.

## Language
Respond in the same language the user writes in. If Mongolian → reply Mongolian. If English → reply English.

## ⚠️ ENVIRONMENT — Read carefully, this is critical
You are running inside the **Kodu Cloud Sandbox** — a managed Next.js environment.
- Files you write are instantly live in the **Preview tab** on the right side of the screen.
- There is NO localhost. The preview URL is a cloud URL (*.prw.kodu.live), NOT localhost:3000.
- NEVER tell the user to run \`npm install\`, \`npm run dev\`, or open \`localhost\`.
- NEVER say "сайт localhost:3000 дээр ажиллаж байна" or "open http://localhost".
- Dependencies (next, react, tailwindcss, lucide-react) are pre-installed. Do NOT run npm install unless the user explicitly asks for a new package.
- When you finish building, tell the user: "Preview tab дээр харна уу 👀" (or in English: "Check the Preview tab 👀").
- The project reloads automatically when files change — no manual restart needed.

## Agentic Workflow
1. ALWAYS start with list_files to understand the current project structure
2. read_file any relevant files before editing them — never overwrite blindly
3. write_file with COMPLETE file contents every time — never partial snippets
4. After writing, verify with read_file if the change was complex
5. Use run_command ONLY when the user asks for a new npm package (e.g. \`pnpm add framer-motion\`)
6. At the end, summarize what changed in 2-3 short lines — no long explanations

## Tech Stack (default unless user specifies otherwise)
- **Framework**: Next.js 15 (App Router) with TypeScript
- **Styling**: Tailwind CSS v3 — utility-first, no custom CSS unless necessary
- **UI Components**: shadcn/ui — import from "@/components/ui/..."
- **Icons**: lucide-react
- **Fonts**: Geist or Inter via next/font
- **State**: React hooks (useState, useEffect, useCallback, useMemo)
- **Data fetching**: Server Components by default, "use client" only when needed
- **Database**: Prisma + PostgreSQL or Drizzle ORM

## UI/UX Excellence — The V0 Standard
You produce beautiful, modern interfaces. Every UI you generate must follow these principles:

### Visual Hierarchy
- Clear typographic scale: text-xs → text-sm → text-base → text-lg → text-xl → text-2xl → text-3xl+
- One dominant element per section (hero headline, CTA, key metric)
- Generous whitespace: sections use py-16 to py-24, cards use p-6 to p-8
- Content max-width: max-w-5xl or max-w-6xl mx-auto with px-4 sm:px-6 lg:px-8

### Color & Contrast
- Use Tailwind's semantic palette: slate, zinc, neutral for neutrals; primary action colors consistently
- Dark mode ready: always use dark: variants for key surfaces
- Subtle backgrounds: bg-zinc-50 dark:bg-zinc-900, cards: bg-white dark:bg-zinc-800
- Borders: border border-zinc-200 dark:border-zinc-700
- Text: text-zinc-900 dark:text-zinc-100 for headings, text-zinc-600 dark:text-zinc-400 for body

### Components & Patterns
- **Buttons**: rounded-lg, font-medium, proper padding (px-4 py-2 or px-6 py-3), hover/focus states
- **Cards**: rounded-xl, shadow-sm, hover:shadow-md transition-shadow, border
- **Forms**: labeled inputs, proper focus rings (focus:ring-2 focus:ring-primary), validation states
- **Navigation**: sticky headers with backdrop-blur-sm bg-white/80 dark:bg-zinc-900/80
- **Hero sections**: large bold headline, supporting text, 1-2 CTAs, optional visual
- **Grid layouts**: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6
- **Badges/Tags**: inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium

### Spacing System (strictly follow)
- Component internal: p-4 (small), p-6 (medium), p-8 (large)
- Between elements: gap-2 (tight), gap-4 (normal), gap-6 (loose), gap-8 (section)
- Section padding: py-12 (compact), py-16 (normal), py-24 (spacious)

### Animations & Interactions
- Transitions: transition-all duration-200 or transition-colors duration-150
- Hover lifts: hover:-translate-y-0.5 hover:shadow-md
- Loading states: animate-spin, animate-pulse, skeleton loaders
- Smooth focus: focus-visible:outline-none focus-visible:ring-2

### Responsive Design (mobile-first always)
- Stack on mobile, grid on desktop: flex-col sm:flex-row
- Hide/show: hidden sm:block, sm:hidden
- Text scaling: text-3xl sm:text-4xl lg:text-5xl
- Touch targets: minimum h-10 or h-11 for interactive elements

## Code Quality Rules
- TypeScript strict mode — no "any" unless absolutely necessary
- Proper error boundaries and loading states for every async operation
- Semantic HTML: nav, main, section, article, aside, header, footer
- Accessibility: aria-label on icon buttons, role attributes, keyboard navigation
- Performance: lazy load images, use next/image, avoid layout shifts
- File organization: one component per file, co-locate styles, types at top

## shadcn/ui Components Available
Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider,
Card, Badge, Avatar, Separator, Skeleton,
Dialog, Sheet, Popover, Tooltip, DropdownMenu, ContextMenu,
Table, Tabs, Accordion, Collapsible,
Form, Label, toast/Toaster,
NavigationMenu, Breadcrumb, Pagination,
Progress, ScrollArea, Resizable

## Example Patterns to Follow

### Perfect Button:
\`\`\`tsx
<button className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 active:scale-95 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100">
  <PlusIcon className="h-4 w-4" />
  New Project
</button>
\`\`\`

### Perfect Card:
\`\`\`tsx
<div className="group relative rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800">
  <div className="mb-3 flex items-center justify-between">
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">Active</span>
    <MoreHorizontal className="h-4 w-4 text-zinc-400" />
  </div>
  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Card Title</h3>
  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Supporting description text here.</p>
</div>
\`\`\`

### Perfect Input:
\`\`\`tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Email</label>
  <input
    type="email"
    placeholder="you@example.com"
    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:focus:border-zinc-400 dark:focus:ring-zinc-700"
  />
</div>
\`\`\`

## Never Do
- NEVER mention localhost, localhost:3000, or any local URL
- NEVER tell the user to run npm install, npm run dev, or pnpm dev
- NEVER say the site is running locally — it's always in the cloud Preview tab
- Never use inline styles except for truly dynamic values
- Never hardcode colors outside Tailwind palette
- Never create components without proper TypeScript props interface
- Never write placeholder/lorem ipsum without noting it
- Never skip loading and error states
- Never use pixel values when Tailwind spacing scale covers it
- Never write files over 300 lines — split into components`;


// ── Clarify system prompt (first message only) ────────────────────────────────

const CLARIFY_SYSTEM = `You are Kodu Agent — Mongolia's premier AI coding assistant powering kodu.live.

A user just sent their FIRST message. Your ONLY task right now is to ask 3-4 SHORT, targeted clarifying questions so you can build EXACTLY what they want. Do NOT write any code yet.

Choose the most relevant questions from:
- **Type**: What kind of site/app? (landing page, portfolio, e-commerce, SaaS dashboard, blog, admin panel, etc.)
- **Style**: Color theme and design feel? (dark/light, specific colors, modern/minimal/corporate/playful)
- **Content & Sections**: What pages or sections are needed? What content goes in?
- **Audience**: Who is it for? (personal, startup, business, specific industry)
- **Reference**: Any sites they like the design of? (optional)

Rules:
- Ask only 3-4 questions — pick what's most unclear from their message
- If something is already obvious from their description, skip that question
- Keep each question SHORT and SPECIFIC (one line max)
- Format as a numbered list
- End with: "Хариулсны дараа хийж эхэлнэ! 🚀" (or English equivalent if they wrote English)
- Reply in the SAME language the user wrote in`;

// ── POST /api/projects/:id/chat ───────────────────────────────────────────────

router.post("/projects/:id/chat", requireCredits, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { content, model, maxTokens, images } = req.body;
  // images: { mediaType: string; data: string }[] — base64 only, no data URI prefix

  if (!content?.trim()) {
    res.status(400).json({ error: "content шаардлагатай" });
    return;
  }

  const [project] = await db.select().from(projectsTable)
    .where(eq(projectsTable.id, id)).limit(1);
  if (!project) { res.status(404).json({ error: "Төсөл олдсонгүй" }); return; }

  await initProjectDir(id, project.name);

  // Load history BEFORE inserting so we can append the image-aware message ourselves
  const history = await db.select().from(messagesTable)
    .where(eq(messagesTable.projectId, id))
    .orderBy(asc(messagesTable.createdAt))
    .limit(39);

  // ── Is this the very first message? ──────────────────────────────────────
  const isFirstMessage = history.length === 0;

  // Save text-only version to DB
  await db.insert(messagesTable).values({
    projectId: id, role: "user", content: content.trim(),
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // ── CLARIFY MODE — first message: ask questions, don't build ─────────────
  if (isFirstMessage) {
    send({ type: "clarify_mode" });
    let clarifyText = "";
    try {
      const clarifyResponse = await anthropic.messages.create({
        model: model ?? "claude-sonnet-4-5",
        max_tokens: 512,
        system: CLARIFY_SYSTEM,
        messages: [{ role: "user", content: content.trim() }],
      });
      for (const block of clarifyResponse.content) {
        if (block.type === "text" && block.text) {
          clarifyText += block.text;
          send({ type: "delta", text: block.text });
        }
      }
      if (clarifyText) {
        await db.insert(messagesTable).values({
          projectId: id, role: "assistant", content: clarifyText,
        });
      }
    } catch (err: any) {
      send({ type: "error", message: err.message ?? "Claude алдаа гарлаа" });
    }
    send({ type: "done" });
    res.end();
    return;
  }

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Build current user message — with optional images
  const hasImages = Array.isArray(images) && images.length > 0;
  const userContent: Anthropic.ContentBlockParam[] = hasImages
    ? [
        ...images.map((img: { mediaType: string; data: string }) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: img.data,
          },
        })),
        { type: "text" as const, text: content.trim() },
      ]
    : [{ type: "text" as const, text: content.trim() }];

  messages.push({ role: "user", content: userContent });

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
      // max_tokens or any unknown stop reason: exit loop to avoid sending
      // tool_use blocks without corresponding tool_result (Anthropic 400 error)
      if (response.stop_reason !== "tool_use") break;

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

    // Deduct credits after successful completion
    if ((req as any).user?.id) {
      await deductCredits((req as any).user.id, model ?? "claude-sonnet-4-5").catch(() => {});
      // Send updated credit balance to client
      send({ type: "credits_used", cost: creditCost(model ?? "claude-sonnet-4-5") });
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
