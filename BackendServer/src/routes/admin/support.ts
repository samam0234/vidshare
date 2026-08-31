import { Router } from "express";
import {
  createActivityNotification,
  getInquiryByIdAdmin,
  listAllInquiries,
  replyToInquiry,
} from "../../data/store";
import { requireAdmin } from "../../auth/requireAdmin";
import { HttpError } from "../../middleware/errorHandler";

const router = Router();

const REPLY_MAX = 2000;

/** GET /api/admin/support/inquiries?unreplied=1 */
router.get("/inquiries", (req, res) => {
  requireAdmin(req);
  const unreplied = req.query.unreplied === "1" || req.query.unreplied === "true";
  res.json({ success: true, data: listAllInquiries(unreplied) });
});

/** GET /api/admin/support/inquiries/:id */
router.get("/inquiries/:id", (req, res) => {
  requireAdmin(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const item = getInquiryByIdAdmin(id);
  if (!item) throw new HttpError(404, "문의를 찾을 수 없습니다.");
  res.json({ success: true, data: item });
});

/** PATCH /api/admin/support/inquiries/:id/reply  body: { reply } */
router.patch("/inquiries/:id/reply", (req, res) => {
  requireAdmin(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");

  const { reply } = req.body ?? {};
  if (typeof reply !== "string" || !reply.trim()) {
    throw new HttpError(400, "답변 내용을 입력해 주세요.");
  }
  if (reply.length > REPLY_MAX) {
    throw new HttpError(400, `답변은 ${REPLY_MAX}자 이하여야 합니다.`);
  }

  const item = replyToInquiry(id, reply.trim());
  if (!item) throw new HttpError(404, "문의를 찾을 수 없습니다.");

  // 문의를 넣은 유저에게 알림 (기존 support.ts 의 알림 패턴과 동일한 href).
  createActivityNotification(item.ownerId, {
    category: "system",
    message: `고객센터 문의 #${String(item.id).padStart(3, "0")} 에 답변이 등록되었습니다.`,
    href: `/support/${item.id}`,
  });

  res.json({ success: true, data: item });
});

export default router;
