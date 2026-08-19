import { Router } from "express";
import { addComment, listComments } from "../data/store";
import { HttpError } from "../middleware/errorHandler";

const router = Router({ mergeParams: true });

/** GET /api/shorts/:shortId/comments  OR  /api/comments?shortId= */
router.get("/", (req, res) => {
  const shortId = (req.params as { shortId?: string }).shortId ?? req.query.shortId;
  if (!shortId || typeof shortId !== "string") {
    throw new HttpError(400, "shortId is required");
  }
  res.json({ success: true, data: listComments(shortId) });
});

/** POST body: { shortId?, text, author? } */
router.post("/", (req, res) => {
  const shortId =
    (req.params as { shortId?: string }).shortId ?? req.body?.shortId;
  const { text, author } = req.body ?? {};

  if (!shortId || typeof shortId !== "string") {
    throw new HttpError(400, "shortId is required");
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new HttpError(400, "text is required");
  }

  const comment = addComment({
    shortId,
    text: text.trim(),
    author: typeof author === "string" && author.trim() ? author : "사용자",
  });
  if (!comment) throw new HttpError(404, "Short not found");

  res.status(201).json({ success: true, data: comment });
});

export default router;
