import { Router } from "../middleware/asyncRouter";
import {
  createActivityNotification,
  createCommunity,
  getCommunityById,
  listCommunity,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/community */
router.get("/", async (_req, res) => {
  res.json({ success: true, data: await listCommunity() });
});

/** GET /api/community/:id */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) throw new HttpError(400, "invalid id");
  const item = await getCommunityById(id);
  if (!item) throw new HttpError(404, "Community post not found");
  res.json({ success: true, data: item });
});

/** POST /api/community  body: { title, body } */
router.post("/", async (req, res) => {
  const user = await requireRequestUser(req);
  const { title, body } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new HttpError(400, "title is required");
  }
  if (!body || typeof body !== "string" || !body.trim()) {
    throw new HttpError(400, "body is required");
  }

  const item = await createCommunity({
    title: title.trim(),
    body: body.trim(),
    authorId: user.id,
  });
  await createActivityNotification(user.id, {
    category: "system",
    message: `커뮤니티 글 #${String(item.id).padStart(3, "0")} 이 작성되었습니다.`,
    href: `/community/${item.id}`,
  });
  res.status(201).json({ success: true, data: item });
});

export default router;
