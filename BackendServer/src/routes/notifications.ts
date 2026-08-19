import { Router } from "express";
import {
  deleteNotification,
  listNotifications,
  patchNotification,
} from "../data/store";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/notifications?category= */
router.get("/", (req, res) => {
  const category = req.query.category
    ? String(req.query.category)
    : "all";
  res.json({ success: true, data: listNotifications(category) });
});

/** DELETE /api/notifications/:id */
router.delete("/:id", (req, res) => {
  const removed = deleteNotification(req.params.id);
  if (!removed) throw new HttpError(404, "Notification not found");
  res.json({ success: true, data: removed });
});

/** PATCH /api/notifications/:id  body: { read?: boolean } */
router.patch("/:id", (req, res) => {
  const item = patchNotification(
    req.params.id,
    typeof req.body?.read === "boolean" ? req.body.read : undefined
  );
  if (!item) throw new HttpError(404, "Notification not found");
  res.json({ success: true, data: item });
});

export default router;
