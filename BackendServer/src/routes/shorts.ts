import { Router } from "express";
import {
  createShort,
  findAuthor,
  getShort,
  likeShort,
  listShorts,
  listShortsByAuthor,
} from "../data/store";
import { getRequestPublicUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/shorts?q= */
router.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  res.json({ success: true, data: listShorts(q) });
});

/** GET /api/shorts/:id */
router.get("/:id", (req, res) => {
  const item = getShort(req.params.id);
  if (!item) throw new HttpError(404, "Short not found");
  res.json({ success: true, data: item });
});

/** POST /api/shorts  body: { title, description?, gradient?, videoUrl? } */
router.post("/", (req, res) => {
  const { title, description, gradient, videoUrl } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new HttpError(400, "title is required");
  }

  const sessionUser = getRequestPublicUser(req);
  const authorId = sessionUser?.id ?? "u-me";
  if (!findAuthor(authorId)) {
    throw new HttpError(400, "작성자 계정이 없습니다.");
  }

  const short = createShort({
    title: title.trim(),
    description: typeof description === "string" ? description : "",
    gradient: typeof gradient === "string" ? gradient : undefined,
    videoUrl: typeof videoUrl === "string" ? videoUrl : undefined,
    authorId,
  });
  res.status(201).json({ success: true, data: short });
});

/** POST /api/shorts/:id/like */
router.post("/:id/like", (req, res) => {
  const { action } = req.body ?? {};
  const data = likeShort(req.params.id, action === "unlike");
  if (!data) throw new HttpError(404, "Short not found");
  res.json({ success: true, data });
});

export function getShortsByAuthor(authorId: string) {
  const author = findAuthor(authorId);
  if (!author) return [];
  return listShortsByAuthor(author.id);
}

export function resolveAuthor(id: string) {
  return findAuthor(id);
}

export default router;
