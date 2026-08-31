import { Router } from "express";
import {
  createShort,
  findAuthor,
  getShort,
  likeShort,
  listShorts,
  listShortsByAuthor,
} from "../data/store";
import { getRequestPublicUser, requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";
import { checkMediaUrl } from "../upload/files";

const router = Router();

/** GET /api/shorts?q= — 로그인한 경우 내가 차단한 유저의 영상은 제외된다 */
router.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const viewer = getRequestPublicUser(req);
  res.json({ success: true, data: listShorts(q, viewer?.id) });
});

/** GET /api/shorts/:id */
router.get("/:id", (req, res) => {
  const item = getShort(req.params.id);
  if (!item) throw new HttpError(404, "Short not found");
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

/** POST /api/shorts  body: { title, description?, gradient?, videoUrl?, thumb? } */
router.post("/", (req, res) => {
  const user = requireRequestUser(req);
  const { title, description, gradient, videoUrl, thumb } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new HttpError(400, "title is required");
  }
  if (!findAuthor(user.id)) {
    throw new HttpError(400, "작성자 계정이 없습니다.");
  }

  const short = createShort({
    title: title.trim(),
    description: typeof description === "string" ? description : "",
    gradient: typeof gradient === "string" ? gradient : undefined,
    videoUrl: optionalMediaUrl(videoUrl, "video"),
    thumb: optionalMediaUrl(thumb, "image"),
    authorId: user.id,
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
