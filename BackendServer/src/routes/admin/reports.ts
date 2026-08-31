import { Router } from "express";
import { isReportStatus, listAllReports, setReportStatus } from "../../data/store";
import { requireAdmin } from "../../auth/requireAdmin";
import { HttpError } from "../../middleware/errorHandler";

const router = Router();

/** GET /api/admin/reports?status=open|resolved|dismissed */
router.get("/", (req, res) => {
  requireAdmin(req);
  const raw = req.query.status;
  if (raw !== undefined && !isReportStatus(raw)) {
    throw new HttpError(400, "status는 open/resolved/dismissed 중 하나여야 합니다.");
  }
  res.json({ success: true, data: listAllReports(raw) });
});

/** PATCH /api/admin/reports/:id  body: { status } */
router.patch("/:id", (req, res) => {
  requireAdmin(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");

  const { status } = req.body ?? {};
  if (!isReportStatus(status)) {
    throw new HttpError(400, "status는 open/resolved/dismissed 중 하나여야 합니다.");
  }
  if (!setReportStatus(id, status)) {
    throw new HttpError(404, "신고를 찾을 수 없습니다.");
  }
  res.json({ success: true, data: { id, status } });
});

export default router;
