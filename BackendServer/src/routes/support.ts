import { Router } from "express";
import { listFaqs } from "../data/store";

const router = Router();

/** GET /api/support/faq */
router.get("/faq", (_req, res) => {
  res.json({ success: true, data: listFaqs() });
});

export default router;
