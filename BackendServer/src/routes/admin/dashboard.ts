import { Router } from "../../middleware/asyncRouter";
import { adminStats } from "../../data/store";
import { requireAdmin } from "../../auth/requireAdmin";

const router = Router();

/** GET /api/admin/dashboard/stats */
router.get("/stats", async (req, res) => {
  await requireAdmin(req);
  res.json({ success: true, data: await adminStats() });
});

export default router;
