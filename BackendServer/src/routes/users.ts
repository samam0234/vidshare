import { Router } from "../middleware/asyncRouter";
import { findAuthor, listAuthors, listShortsByAuthor } from "../data/store";
import { HttpError } from "../middleware/errorHandler";
import { getRequestPublicUser } from "../auth/requestUser";

const router = Router();

/** GET /api/users/me */
router.get("/me", async (req, res) => {
  const user = await getRequestPublicUser(req);
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  res.json({ success: true, data: user });
});

/** GET /api/users */
router.get("/", async (_req, res) => {
  res.json({ success: true, data: await listAuthors() });
});

/** GET /api/users/:id */
router.get("/:id", async (req, res) => {
  const user = await findAuthor(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  res.json({ success: true, data: user });
});

/** GET /api/users/:id/shorts */
router.get("/:id/shorts", async (req, res) => {
  const user = await findAuthor(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  res.json({ success: true, data: await listShortsByAuthor(user.id) });
});

export default router;
