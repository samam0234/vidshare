import { Router } from "express";
import { v4 as uuid } from "uuid";
import { authors, currentUser, store } from "../data/store";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/shorts?q= */
router.get("/", (req, res) => {
  const q = String(req.query.q ?? "")
    .trim()
    .toLowerCase();
  let list = [...store.shorts];

  if (q) {
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.author.handle.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q)
    );
  }

  res.json({ success: true, data: list });
});

/** GET /api/shorts/:id */
router.get("/:id", (req, res) => {
  const item = store.shorts.find((s) => s.id === req.params.id);
  if (!item) throw new HttpError(404, "Short not found");
  res.json({ success: true, data: item });
});

/** POST /api/shorts  body: { title, description?, gradient?, videoUrl? } */
router.post("/", (req, res) => {
  const { title, description, gradient, videoUrl } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new HttpError(400, "title is required");
  }

  const short = {
    id: `s-${uuid().slice(0, 8)}`,
    title: title.trim(),
    description: typeof description === "string" ? description : "",
    author: currentUser,
    likes: 0,
    comments: 0,
    views: "0",
    gradient:
      typeof gradient === "string" && gradient
        ? gradient
        : "linear-gradient(160deg, #7c3aed, #3ea6ff)",
    createdAt: new Date().toISOString().slice(0, 10),
    videoUrl: typeof videoUrl === "string" ? videoUrl : undefined,
  };

  store.shorts.unshift(short);
  res.status(201).json({ success: true, data: short });
});

/** POST /api/shorts/:id/like */
router.post("/:id/like", (req, res) => {
  const item = store.shorts.find((s) => s.id === req.params.id);
  if (!item) throw new HttpError(404, "Short not found");
  const { action } = req.body ?? {};
  if (action === "unlike") {
    item.likes = Math.max(0, item.likes - 1);
  } else {
    item.likes += 1;
  }
  res.json({ success: true, data: { id: item.id, likes: item.likes } });
});

/** GET /api/shorts/author/:authorId — registered below carefully */
export function getShortsByAuthor(authorId: string) {
  return store.shorts.filter(
    (s) => s.author.id === authorId || s.author.handle === authorId
  );
}

export function resolveAuthor(id: string) {
  return authors.find((a) => a.id === id || a.handle === id);
}

export default router;
