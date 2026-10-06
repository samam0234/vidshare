import { Router } from "../../middleware/asyncRouter";
import {
  adminDeleteComment,
  adminDeleteCommunityPost,
  adminDeleteLongform,
  adminDeleteShort,
  adminListShorts,
} from "../../data/store";
import { requireAdmin } from "../../auth/requireAdmin";
import { HttpError } from "../../middleware/errorHandler";

const router = Router();

function numericId(raw: string): number {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  return id;
}

/**
 * 쇼츠를 지우면 다른 곳이 쓰지 않는 업로드 파일(`/uploads`)도 함께 정리한다(107).
 * 롱폼·커뮤니티는 아직 DB 레코드만 지우고 파일은 남는다.
 */

/** GET /api/admin/content/shorts — 비공개 포함 전체 (공개 `/api/shorts` 는 비공개를 숨긴다) */
router.get("/shorts", async (req, res) => {
  await requireAdmin(req);
  res.json({ success: true, data: await adminListShorts() });
});

/** DELETE /api/admin/content/shorts/:id */
router.delete("/shorts/:id", async (req, res) => {
  await requireAdmin(req);
  if (!(await adminDeleteShort(req.params.id))) {
    throw new HttpError(404, "쇼츠를 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: req.params.id } });
});

/** DELETE /api/admin/content/longform/:id */
router.delete("/longform/:id", async (req, res) => {
  await requireAdmin(req);
  const id = numericId(req.params.id);
  if (!(await adminDeleteLongform(id))) {
    throw new HttpError(404, "롱폼 영상을 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: id } });
});

/** DELETE /api/admin/content/community/:id */
router.delete("/community/:id", async (req, res) => {
  await requireAdmin(req);
  const id = numericId(req.params.id);
  if (!(await adminDeleteCommunityPost(id))) {
    throw new HttpError(404, "게시글을 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: id } });
});

/** DELETE /api/admin/content/comments/:id */
router.delete("/comments/:id", async (req, res) => {
  await requireAdmin(req);
  if (!(await adminDeleteComment(req.params.id))) {
    throw new HttpError(404, "댓글을 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: req.params.id } });
});

export default router;
