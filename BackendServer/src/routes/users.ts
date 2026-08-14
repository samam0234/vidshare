import { Router } from "express";
import { authors, currentUser, store } from "../data/store";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/users/me */
router.get("/me", (_req, res) => {
  res.json({ success: true, data: currentUser });
});

/** GET /api/users */
router.get("/", (_req, res) => {
  res.json({ success: true, data: authors });
});

/** GET /api/users/:id */
router.get("/:id", (req, res) => {
  const user = authors.find(
    (a) => a.id === req.params.id || a.handle === req.params.id
  );
  if (!user) throw new HttpError(404, "User not found");
  res.json({ success: true, data: user });
});

/** GET /api/users/:id/shorts */
router.get("/:id/shorts", (req, res) => {
  const user = authors.find(
    (a) => a.id === req.params.id || a.handle === req.params.id
  );
  if (!user) throw new HttpError(404, "User not found");

  const list = store.shorts.filter((s) => s.author.id === user.id);
  res.json({ success: true, data: list });
});

export default router;
