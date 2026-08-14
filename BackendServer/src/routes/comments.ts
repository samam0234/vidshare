import { Router } from "express";
import { v4 as uuid } from "uuid";
import { store } from "../data/store";
import { HttpError } from "../middleware/errorHandler";

const router = Router({ mergeParams: true });

/** GET /api/shorts/:shortId/comments  OR  /api/comments?shortId= */
router.get("/", (req, res) => {
  const shortId = (req.params as { shortId?: string }).shortId ?? req.query.shortId;
  if (!shortId || typeof shortId !== "string") {
    throw new HttpError(400, "shortId is required");
  }
  const list = store.comments.filter((c) => c.shortId === shortId);
  res.json({ success: true, data: list });
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

  const short = store.shorts.find((s) => s.id === shortId);
  if (!short) throw new HttpError(404, "Short not found");

  const comment = {
    id: `c-${uuid().slice(0, 8)}`,
    shortId,
    author: typeof author === "string" && author.trim() ? author : "사용자",
    text: text.trim(),
    time: "방금 전",
  };

  store.comments.push(comment);
  short.comments += 1;

  res.status(201).json({ success: true, data: comment });
});

export default router;
