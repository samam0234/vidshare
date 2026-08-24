import { Router } from "express";
import {
  addChatLine,
  createActivityNotification,
  createConversation,
  getConversationById,
  listChatLines,
  listConversations,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/conversations */
router.get("/", (req, res) => {
  const user = requireRequestUser(req);
  res.json({ success: true, data: listConversations(user.id) });
});

/** GET /api/conversations/:id */
router.get("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const conversation = getConversationById(id, user.id);
  if (!conversation) throw new HttpError(404, "Conversation not found");
  res.json({
    success: true,
    data: { conversation, lines: listChatLines(id) },
  });
});

/** POST /api/conversations  body: { targetName, targetHandle? } */
router.post("/", (req, res) => {
  const user = requireRequestUser(req);
  const { targetName, targetHandle } = req.body ?? {};
  if (!targetName || typeof targetName !== "string" || !targetName.trim()) {
    throw new HttpError(400, "targetName is required");
  }

  const item = createConversation(user.id, {
    targetName: targetName.trim(),
    targetHandle: typeof targetHandle === "string" ? targetHandle : undefined,
  });
  createActivityNotification(user.id, {
    category: "mention",
    message: `대화 상대 #${String(item.id).padStart(3, "0")} (${item.targetName}) 를 추가했습니다.`,
    href: `/messages/${item.id}`,
  });
  res.status(201).json({ success: true, data: item });
});

/** POST /api/conversations/:id/lines  body: { type, content, isImage? } */
router.post("/:id/lines", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const { type, content, isImage } = req.body ?? {};
  if (type !== "me" && type !== "other") {
    throw new HttpError(400, "type must be 'me' or 'other'");
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    throw new HttpError(400, "content is required");
  }

  const line = addChatLine(id, user.id, {
    type,
    content,
    isImage: Boolean(isImage),
  });
  if (!line) throw new HttpError(404, "Conversation not found");
  res.status(201).json({ success: true, data: line });
});

export default router;
