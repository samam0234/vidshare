import { Router } from "express";
import {
  deleteActivityNotification,
  deleteAllActivityNotifications,
  getNotificationsEnabled,
  listActivityNotifications,
  markAllActivityNotificationsRead,
  patchActivityNotification,
  setNotificationsEnabled,
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

/** GET /api/notifications/settings — 수신 설정 조회. /:id 보다 앞에 둔다. */
router.get("/settings", (req, res) => {
  const user = requireRequestUser(req);
  res.json({
    success: true,
    data: { enabled: getNotificationsEnabled(user.id) },
  });
});

/** PATCH /api/notifications/settings  body: { enabled: boolean } */
router.patch("/settings", (req, res) => {
  const user = requireRequestUser(req);
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") {
    throw new HttpError(400, "enabled는 boolean이어야 합니다.");
  }
  setNotificationsEnabled(user.id, enabled);
  res.json({ success: true, data: { enabled } });
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
