import { Router } from "express";
import {
  deleteActivityNotification,
  deleteAllActivityNotifications,
  listActivityNotifications,
  markAllActivityNotificationsRead,
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

/** PATCH /api/notifications/read-all — 본인 알림 전체 읽음. /:id 보다 앞에 둔다. */
router.patch("/read-all", (req, res) => {
  const user = requireRequestUser(req);
  const count = markAllActivityNotificationsRead(user.id);
  res.json({ success: true, data: { count } });
});

/** DELETE /api/notifications — 본인 알림 전체 삭제. /:id 보다 앞에 둔다. */
router.delete("/", (req, res) => {
  const user = requireRequestUser(req);
  const count = deleteAllActivityNotifications(user.id);
  res.json({ success: true, data: { count } });
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
