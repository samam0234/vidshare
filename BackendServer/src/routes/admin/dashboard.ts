import { Router } from "express";
import { adminStats } from "../../data/store";
import { requireAdmin } from "../../auth/requireAdmin";

const router = Router();

/** GET /api/admin/dashboard/stats */
router.get("/stats", (req, res) => {
  requireAdmin(req);
  res.json({ success: true, data: adminStats() });
});

export default router;
