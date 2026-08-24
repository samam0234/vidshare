import { Router } from "express";
import {
  createActivityNotification,
  createLongform,
  getLongformById,
  listLongform,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/longform */
router.get("/", (_req, res) => {
  res.json({ success: true, data: listLongform() });
});

/** GET /api/longform/:id */
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const item = getLongformById(id);
  if (!item) throw new HttpError(404, "Longform not found");
  res.json({ success: true, data: item });
});

/** POST /api/longform  body: { title, description?, videoUrl?, thumb?, gradient? } */
router.post("/", (req, res) => {
  const user = requireRequestUser(req);
  const { title, description, videoUrl, thumb, gradient } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new HttpError(400, "title is required");
  }

  const item = createLongform({
    title: title.trim(),
    description: typeof description === "string" ? description : "",
    videoUrl: typeof videoUrl === "string" ? videoUrl : "",
    thumb: typeof thumb === "string" ? thumb : undefined,
    gradient: typeof gradient === "string" ? gradient : undefined,
    authorId: user.id,
  });
  createActivityNotification(user.id, {
    category: "system",
    message: `롱폼 #${String(item.id).padStart(3, "0")} 이 등록되었습니다.`,
    href: `/longform/${item.id}`,
  });
  res.status(201).json({ success: true, data: item });
});

export default router;
