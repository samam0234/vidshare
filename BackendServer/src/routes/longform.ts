import { Router } from "express";
import {
  createActivityNotification,
  createLongform,
  getLongformById,
  listLongform,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";
import { checkMediaUrl } from "../upload/files";

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

function optionalMediaUrl(value: unknown, kind: "image" | "video") {
  const checked = checkMediaUrl(value, kind);
  if (checked.ok) return checked.url;
  if (checked.reason === "empty") return undefined;
  if (checked.reason === "data-url") {
    throw new HttpError(400, "data URL은 저장할 수 없습니다. 파일을 업로드하세요.");
  }
  throw new HttpError(
    400,
    kind === "image" ? "썸네일 경로가 올바르지 않습니다." : "영상 경로가 올바르지 않습니다."
  );
}

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
    videoUrl: optionalMediaUrl(videoUrl, "video") ?? "",
    thumb: optionalMediaUrl(thumb, "image"),
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
