import { Router } from "../middleware/asyncRouter";
import {
  createShort,
  deleteShort,
  dislikeShort,
  findAuthor,
  getShort,
  getShortAccess,
  likeShort,
  listShorts,
  listShortsByAuthor,
  undislikeShort,
  updateShort,
  type ShortPatch,
} from "../data/store";
import { getRequestPublicUser, requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";
import { checkMediaUrl } from "../upload/files";

const router = Router();

export const SHORT_TITLE_MAX = 100;
export const SHORT_DESCRIPTION_MAX = 2000;

/**
 * GET /api/shorts?q= — 추천 피드.
 * 로그인한 경우 내가 차단한 유저·내가 비추천한 영상은 빠지고, 비공개는 작성자 본인에게만 보인다.
 * 검색어(q)가 있으면 "찾으려는 의도"이므로 비추천은 적용하지 않는다.
 */
router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const viewer = await getRequestPublicUser(req);
  res.json({
    success: true,
    data: await listShorts(q, viewer?.id, { excludeDisliked: !q }),
  });
});

/** GET /api/shorts/:id — 남의 비공개 쇼츠는 404 */
router.get("/:id", async (req, res) => {
  const viewer = await getRequestPublicUser(req);
  const item = await getShort(req.params.id, viewer?.id);
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

function checkedTitle(value: unknown) {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "title is required");
  }
  const title = value.trim();
  if (title.length > SHORT_TITLE_MAX) {
    throw new HttpError(400, `제목은 ${SHORT_TITLE_MAX}자 이하여야 합니다.`);
  }
  return title;
}

function checkedDescription(value: unknown) {
  if (typeof value !== "string") throw new HttpError(400, "설명은 문자열이어야 합니다.");
  if (value.length > SHORT_DESCRIPTION_MAX) {
    throw new HttpError(400, `설명은 ${SHORT_DESCRIPTION_MAX}자 이하여야 합니다.`);
  }
  return value;
}

/** POST /api/shorts  body: { title, description?, gradient?, videoUrl?, thumb? } */
router.post("/", async (req, res) => {
  const user = await requireRequestUser(req);
  const { title, description, gradient, videoUrl, thumb } = req.body ?? {};
  const checkedTitleValue = checkedTitle(title);
  const checkedDescriptionValue =
    typeof description === "string" ? checkedDescription(description) : "";
  if (!(await findAuthor(user.id))) {
    throw new HttpError(400, "작성자 계정이 없습니다.");
  }

  const short = await createShort({
    title: checkedTitleValue,
    description: checkedDescriptionValue,
    gradient: typeof gradient === "string" ? gradient : undefined,
    videoUrl: optionalMediaUrl(videoUrl, "video"),
    thumb: optionalMediaUrl(thumb, "image"),
    authorId: user.id,
  });
  res.status(201).json({ success: true, data: short });
});

function parseShortPatch(body: unknown): ShortPatch {
  const input = (body ?? {}) as Record<string, unknown>;
  const patch: ShortPatch = {};

  if ("title" in input) patch.title = checkedTitle(input.title);
  if ("description" in input) patch.description = checkedDescription(input.description);
  if ("thumb" in input) {
    if (input.thumb === null) {
      patch.thumb = null;
    } else {
      const url = optionalMediaUrl(input.thumb, "image");
      if (!url) throw new HttpError(400, "썸네일 경로가 올바르지 않습니다.");
      patch.thumb = url;
    }
  }
  if ("visibility" in input) {
    if (input.visibility !== "public" && input.visibility !== "private") {
      throw new HttpError(400, "visibility 는 public 또는 private 이어야 합니다.");
    }
    patch.visibility = input.visibility;
  }
  if ("commentsEnabled" in input) {
    if (typeof input.commentsEnabled !== "boolean") {
      throw new HttpError(400, "commentsEnabled 는 true/false 여야 합니다.");
    }
    patch.commentsEnabled = input.commentsEnabled;
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, "바꿀 항목이 없습니다.");
  }
  return patch;
}

/**
 * PATCH /api/shorts/:id — 작성자 본인만.
 * body: { title?, description?, thumb?: string|null, visibility?: "public"|"private", commentsEnabled?: boolean }
 */
router.patch("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const patch = parseShortPatch(req.body);
  const result = await updateShort(req.params.id, user.id, patch);
  if (!result.ok) {
    throw new HttpError(
      result.reason === "forbidden" ? 403 : 404,
      result.reason === "forbidden" ? "내 영상만 수정할 수 있습니다." : "Short not found"
    );
  }
  res.json({ success: true, data: result.value });
});

/** DELETE /api/shorts/:id — 작성자 본인만. 댓글·재생목록 항목이 함께 지워지고 업로드 파일도 정리된다. */
router.delete("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const result = await deleteShort(req.params.id, user.id);
  if (!result.ok) {
    throw new HttpError(
      result.reason === "forbidden" ? 403 : 404,
      result.reason === "forbidden" ? "내 영상만 삭제할 수 있습니다." : "Short not found"
    );
  }
  res.json({ success: true, data: { id: req.params.id, deleted: true } });
});

/** 보이는 쇼츠인지 확인한다(남의 비공개는 없는 것처럼 404). 작성자 id 를 돌려준다. */
async function visibleShortAuthor(shortId: string, viewerId?: string) {
  const access = await getShortAccess(shortId);
  if (!access || (access.visibility === "private" && access.authorId !== viewerId)) {
    throw new HttpError(404, "Short not found");
  }
  return access.authorId;
}

/** POST /api/shorts/:id/like */
router.post("/:id/like", async (req, res) => {
  const viewer = await getRequestPublicUser(req);
  await visibleShortAuthor(req.params.id, viewer?.id);
  const { action } = req.body ?? {};
  const data = await likeShort(req.params.id, action === "unlike");
  if (!data) throw new HttpError(404, "Short not found");
  res.json({ success: true, data });
});

/** POST /api/shorts/:id/dislike — 비추천: 내 추천 피드에서 이 영상을 뺀다 (로그인 필요) */
router.post("/:id/dislike", async (req, res) => {
  const user = await requireRequestUser(req);
  const authorId = await visibleShortAuthor(req.params.id, user.id);
  if (authorId === user.id) {
    throw new HttpError(400, "내 영상은 비추천할 수 없습니다.");
  }
  await dislikeShort(user.id, req.params.id);
  res.json({ success: true, data: { id: req.params.id, disliked: true } });
});

/** DELETE /api/shorts/:id/dislike — 비추천 취소 */
router.delete("/:id/dislike", async (req, res) => {
  const user = await requireRequestUser(req);
  await undislikeShort(user.id, req.params.id);
  res.json({ success: true, data: { id: req.params.id, disliked: false } });
});

export async function getShortsByAuthor(authorId: string, viewerId?: string) {
  const author = await findAuthor(authorId);
  if (!author) return [];
  return listShortsByAuthor(author.id, viewerId);
}

export async function resolveAuthor(id: string) {
  return findAuthor(id);
}

export default router;
