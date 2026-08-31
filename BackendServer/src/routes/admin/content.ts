import { Router } from "express";
import {
  adminDeleteComment,
  adminDeleteCommunityPost,
  adminDeleteLongform,
  adminDeleteShort,
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
 * 업로드된 원본 파일(`/uploads`)은 지우지 않는다 — 이 저장소에는 아직 파일
 * 수명주기를 관리하는 코드가 없다. DB 레코드만 사라지고 파일은 남는다.
 */

/** DELETE /api/admin/content/shorts/:id */
router.delete("/shorts/:id", (req, res) => {
  requireAdmin(req);
  if (!adminDeleteShort(req.params.id)) {
    throw new HttpError(404, "쇼츠를 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: req.params.id } });
});

/** DELETE /api/admin/content/longform/:id */
router.delete("/longform/:id", (req, res) => {
  requireAdmin(req);
  const id = numericId(req.params.id);
  if (!adminDeleteLongform(id)) {
    throw new HttpError(404, "롱폼 영상을 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: id } });
});

/** DELETE /api/admin/content/community/:id */
router.delete("/community/:id", (req, res) => {
  requireAdmin(req);
  const id = numericId(req.params.id);
  if (!adminDeleteCommunityPost(id)) {
    throw new HttpError(404, "게시글을 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: id } });
});

/** DELETE /api/admin/content/comments/:id */
router.delete("/comments/:id", (req, res) => {
  requireAdmin(req);
  if (!adminDeleteComment(req.params.id)) {
    throw new HttpError(404, "댓글을 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { deleted: req.params.id } });
});

export default router;
