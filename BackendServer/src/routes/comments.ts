import { Router } from "../middleware/asyncRouter";
import {
  addComment,
  deleteComment,
  listComments,
  updateComment,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router({ mergeParams: true });

/** GET /api/shorts/:shortId/comments  OR  /api/comments?shortId= */
router.get("/", async (req, res) => {
  const shortId = (req.params as { shortId?: string }).shortId ?? req.query.shortId;
  if (!shortId || typeof shortId !== "string") {
    throw new HttpError(400, "shortId is required");
  }
  res.json({ success: true, data: await listComments(shortId) });
});

/** POST body: { shortId?, text, parentId? } — 로그인 필요, 작성자는 세션 기준 */
router.post("/", async (req, res) => {
  const user = await requireRequestUser(req);
  const shortId =
    (req.params as { shortId?: string }).shortId ?? req.body?.shortId;
  const { text, parentId } = req.body ?? {};

  if (!shortId || typeof shortId !== "string") {
    throw new HttpError(400, "shortId is required");
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new HttpError(400, "text is required");
  }
  if (parentId !== undefined && typeof parentId !== "string") {
    throw new HttpError(400, "parentId는 문자열이어야 합니다.");
  }

  const comment = await addComment({
    shortId,
    text: text.trim(),
    author: user.name,
    authorId: user.id,
    ...(parentId ? { parentId } : {}),
  });
  if (!comment) {
    throw new HttpError(404, parentId ? "Parent comment not found" : "Short not found");
  }

  res.status(201).json({ success: true, data: comment });
});

/** PATCH /:id  body: { text } — 본인 댓글만 */
router.patch("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new HttpError(400, "text is required");
  }
  const updated = await updateComment(req.params.id, user.id, text.trim());
  if (!updated) throw new HttpError(404, "Comment not found");
  res.json({ success: true, data: updated });
});

/** DELETE /:id — 본인 댓글만 (답글도 함께 삭제) */
router.delete("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const removed = await deleteComment(req.params.id, user.id);
  if (!removed) throw new HttpError(404, "Comment not found");
  res.json({ success: true, data: { id: req.params.id } });
});

export default router;
