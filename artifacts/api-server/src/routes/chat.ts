import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db, messagesTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Та бол kodu.live-ийн AI кодчиллын туслах — Kodu Agent.

Монгол болон Англи хэл дээр ажиллана. Хэрэглэгч Монголоор бичвэл Монголоор хариулна, Англиар бичвэл Англиар хариулна.

Чиний үүрэг:
- Кодчиллын асуултанд хариулах
- Код бичих, тайлбарлах, дебаг хийх
- React, TypeScript, Next.js, Node.js, SQL зэрэг технологид туслах
- Кодыг Markdown code block дотор харуулах

Хэлбэр:
- Товч, тодорхой хариулт өг
- Кодыг үргэлж \`\`\`language блок\`\`\` дотор бич
- Монгол хэлний нэр томьёог хэрэглэнэ, шаардлагатай бол Англи нэрийг хаалтанд нэмнэ`;

// POST /api/projects/:id/chat — SSE streaming
router.post("/projects/:id/chat", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content?.trim()) {
    res.status(400).json({ error: "content шаардлагатай" });
    return;
  }

  // Verify project exists
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Төсөл олдсонгүй" });
    return;
  }

  // Save user message
  await db.insert(messagesTable).values({
    projectId: id,
    role: "user",
    content: content.trim(),
  });

  // Load conversation history (last 30 messages)
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.projectId, id))
    .orderBy(asc(messagesTable.createdAt))
    .limit(30);

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let fullText = "";

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        const text = chunk.delta.text;
        fullText += text;
        res.write(`data: ${JSON.stringify({ type: "delta", text })}\n\n`);
      }
    }

    // Save assistant response to DB
    await db.insert(messagesTable).values({
      projectId: id,
      role: "assistant",
      content: fullText,
    });

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err: any) {
    res.write(
      `data: ${JSON.stringify({ type: "error", message: err.message ?? "Claude алдаа гарлаа" })}\n\n`
    );
  } finally {
    res.end();
  }
});

export default router;
