import { Router } from "express";
import {
  getChatUser,
  listChatUsers,
  listMessages,
  sendMessage,
} from "../data/store";
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
  res.json({ success: true, data: listChatUsers() });
});

/** GET /api/messages/:userId */
router.get("/:userId", (req, res) => {
  const user = getChatUser(req.params.userId);
  if (!user) throw new HttpError(404, "Chat user not found");
  const messages = listMessages(req.params.userId);
  res.json({ success: true, data: { user, messages } });
});

/** POST /api/messages/:userId  body: { content, isImage? } */
router.post("/:userId", (req, res) => {
  const { content, isImage } = req.body ?? {};
  if (!content || typeof content !== "string") {
    throw new HttpError(400, "content is required");
  }

  const msg = sendMessage({
    peerId: req.params.userId,
    content,
    isImage: Boolean(isImage),
    time: nowTimeLabel(),
  });
  if (!msg) throw new HttpError(404, "Chat user not found");

  res.status(201).json({ success: true, data: msg });
});

export default router;
