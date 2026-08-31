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
import { notificationBus } from "../realtime/notificationBus";
import type { AppNotification } from "../types";

const router = Router();

/**
 * GET /api/notifications/stream — SSE. /:id 보다 앞에 둔다.
 * 연결 유지 중 새 알림이 생기면 즉시 이벤트로 흘려보낸다(폴링 대체).
 */
router.get("/stream", (req, res) => {
  const user = requireRequestUser(req);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  const onNotification = (notification: AppNotification) => {
    res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
  };
  notificationBus.on(user.id, onNotification);

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);
  keepAlive.unref();

  req.on("close", () => {
    clearInterval(keepAlive);
    notificationBus.off(user.id, onNotification);
  });
});

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
