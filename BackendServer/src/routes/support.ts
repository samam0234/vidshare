import { Router } from "express";
import { store } from "../data/store";

const router = Router();

/** GET /api/support/faq */
router.get("/faq", (_req, res) => {
  res.json({ success: true, data: store.faqs });
});

export default router;
