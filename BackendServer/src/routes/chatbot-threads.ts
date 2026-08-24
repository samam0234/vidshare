import { Router } from "express";
import {
  addChatbotThreadMessage,
  createChatbotThread,
  deleteChatbotThread,
  getChatbotThread,
  listChatbotMessages,
  listChatbotThreads,
  renameChatbotThread,
  setChatbotThreadModel,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";
import type { ChatbotThreadModel } from "../types";

const router = Router();

const MODELS: ChatbotThreadModel[] = ["locals", "vide", "shape"];

/** GET /api/chatbot/threads */
router.get("/", (req, res) => {
  const user = requireRequestUser(req);
  res.json({ success: true, data: listChatbotThreads(user.id) });
});

/** GET /api/chatbot/threads/:id */
router.get("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const thread = getChatbotThread(id, user.id);
  if (!thread) throw new HttpError(404, "Thread not found");
  res.json({
    success: true,
    data: { thread, messages: listChatbotMessages(id) },
  });
});

/** POST /api/chatbot/threads  body: { title?, model? } */
router.post("/", (req, res) => {
  const user = requireRequestUser(req);
  const { title, model } = req.body ?? {};
  const chosenModel =
    typeof model === "string" && MODELS.includes(model as ChatbotThreadModel)
      ? (model as ChatbotThreadModel)
      : undefined;
  const thread = createChatbotThread(user.id, {
    title: typeof title === "string" ? title : undefined,
    model: chosenModel,
  });
  res.status(201).json({ success: true, data: thread });
});

/** PATCH /api/chatbot/threads/:id  body: { title?, model? } */
router.patch("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const { title, model } = req.body ?? {};

  let thread = getChatbotThread(id, user.id);
  if (!thread) throw new HttpError(404, "Thread not found");

  if (typeof title === "string" && title.trim()) {
    thread = renameChatbotThread(id, user.id, title.trim().slice(0, 60));
  }
  if (typeof model === "string" && MODELS.includes(model as ChatbotThreadModel)) {
    thread = setChatbotThreadModel(id, user.id, model as ChatbotThreadModel);
  }
  res.json({ success: true, data: thread });
});

/** DELETE /api/chatbot/threads/:id */
router.delete("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const removed = deleteChatbotThread(id, user.id);
  if (!removed) throw new HttpError(404, "Thread not found");
  res.json({ success: true, data: { id } });
});

/** POST /api/chatbot/threads/:id/messages  body: { role, content, attachments? } */
router.post("/:id/messages", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const { role, content, attachments } = req.body ?? {};
  if (role !== "user" && role !== "bot") {
    throw new HttpError(400, "role must be 'user' or 'bot'");
  }
  if (typeof content !== "string" || !content.trim()) {
    throw new HttpError(400, "content is required");
  }

  const message = addChatbotThreadMessage(id, user.id, {
    role,
    content,
    attachments: Array.isArray(attachments) ? attachments : undefined,
  });
  if (!message) throw new HttpError(404, "Thread not found");
  res.status(201).json({ success: true, data: message });
});

export default router;
