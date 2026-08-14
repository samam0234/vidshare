import { Router } from "express";
import { v4 as uuid } from "uuid";
import { store } from "../data/store";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

function nowTimeLabel(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 || 12;
  return `${period} ${hour12}:${m}`;
}

/** GET /api/messages/users */
router.get("/users", (_req, res) => {
  res.json({ success: true, data: store.chatUsers });
});

/** GET /api/messages/:userId */
router.get("/:userId", (req, res) => {
  const user = store.chatUsers.find((u) => u.id === req.params.userId);
  if (!user) throw new HttpError(404, "Chat user not found");
  const messages = store.messages[req.params.userId] ?? [];
  res.json({ success: true, data: { user, messages } });
});

/** POST /api/messages/:userId  body: { content, isImage? } */
router.post("/:userId", (req, res) => {
  const user = store.chatUsers.find((u) => u.id === req.params.userId);
  if (!user) throw new HttpError(404, "Chat user not found");

  const { content, isImage } = req.body ?? {};
  if (!content || typeof content !== "string") {
    throw new HttpError(400, "content is required");
  }

  const msg = {
    id: `m-${uuid().slice(0, 8)}`,
    userId: req.params.userId,
    type: "me" as const,
    content,
    isImage: Boolean(isImage),
    time: nowTimeLabel(),
  };

  if (!store.messages[req.params.userId]) {
    store.messages[req.params.userId] = [];
  }
  store.messages[req.params.userId].push(msg);
  user.lastMessage = isImage ? "(이미지)" : content;

  res.status(201).json({ success: true, data: msg });
});

export default router;
