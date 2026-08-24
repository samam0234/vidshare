import { Router } from "express";
import {
  deleteActivityNotification,
  listActivityNotifications,
  patchActivityNotification,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/notifications?category= */
router.get("/", (req, res) => {
  const user = requireRequestUser(req);
  const category = req.query.category ? String(req.query.category) : "all";
  res.json({ success: true, data: listActivityNotifications(user.id, category) });
});

/** DELETE /api/notifications/:id */
router.delete("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const removed = deleteActivityNotification(id, user.id);
  if (!removed) throw new HttpError(404, "Notification not found");
  res.json({ success: true, data: removed });
});

/** PATCH /api/notifications/:id  body: { read?: boolean } */
router.patch("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const item = patchActivityNotification(
    id,
    user.id,
    typeof req.body?.read === "boolean" ? req.body.read : undefined
  );
  if (!item) throw new HttpError(404, "Notification not found");
  res.json({ success: true, data: item });
});

export default router;
