import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, messagesTable } from "@workspace/db";
import {
  CreateMessageBody,
  CreateMessageParams,
  ListMessagesParams,
  ListMessagesResponse,
  CreateMessageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /projects/:id/messages
router.get("/projects/:id/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.projectId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(ListMessagesResponse.parse(messages));
});

// POST /projects/:id/messages
router.post("/projects/:id/messages", async (req, res): Promise<void> => {
  const params = CreateMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({ projectId: params.data.id, role: parsed.data.role, content: parsed.data.content })
    .returning();

  res.status(201).json(CreateMessageResponse.parse(message));
});

export default router;
