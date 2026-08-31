import { Router } from "express";
import { createReport, isReportTargetType } from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

const REASON_MAX = 500;

/** POST /api/reports  body: { targetType, targetId, reason } */
router.post("/", (req, res) => {
  const user = requireRequestUser(req);
  const { targetType, targetId, reason } = req.body ?? {};

  if (!isReportTargetType(targetType)) {
    throw new HttpError(
      400,
      "targetType은 short/comment/community/user 중 하나여야 합니다."
    );
  }
  if (!targetId || typeof targetId !== "string") {
    throw new HttpError(400, "targetId가 필요합니다.");
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    throw new HttpError(400, "신고 사유를 입력해 주세요.");
  }
  if (reason.length > REASON_MAX) {
    throw new HttpError(400, `사유는 ${REASON_MAX}자 이하여야 합니다.`);
  }

  const report = createReport({
    reporterId: user.id,
    targetType,
    targetId,
    reason: reason.trim(),
  });
  res.status(201).json({ success: true, data: report });
});

export default router;
