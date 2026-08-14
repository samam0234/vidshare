import { Router } from "express";
import { store } from "../data/store";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/notifications?category= */
router.get("/", (req, res) => {
  const category = req.query.category
    ? String(req.query.category)
    : "all";

  let list = [...store.notifications];
  if (category !== "all") {
    list = list.filter((n) => n.category === category);
  }

  res.json({ success: true, data: list });
});

/** DELETE /api/notifications/:id */
router.delete("/:id", (req, res) => {
  const idx = store.notifications.findIndex((n) => n.id === req.params.id);
  if (idx === -1) throw new HttpError(404, "Notification not found");
  const [removed] = store.notifications.splice(idx, 1);
  res.json({ success: true, data: removed });
});

/** PATCH /api/notifications/:id  body: { read?: boolean } */
router.patch("/:id", (req, res) => {
  const item = store.notifications.find((n) => n.id === req.params.id);
  if (!item) throw new HttpError(404, "Notification not found");
  if (typeof req.body?.read === "boolean") {
    item.read = req.body.read;
  }
  res.json({ success: true, data: item });
});

export default router;
