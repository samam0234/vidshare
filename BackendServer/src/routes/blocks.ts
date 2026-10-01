import { Router } from "../middleware/asyncRouter";
import {
  blockUser,
  findAuthor,
  isBlocked,
  listBlockedUsers,
  unblockUser,
} from "../data/store";
import { requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/blocks — 내가 차단한 유저 목록 */
router.get("/", async (req, res) => {
  const user = await requireRequestUser(req);
  res.json({ success: true, data: await listBlockedUsers(user.id) });
});

/** POST /api/blocks/:id — 차단 (서로의 팔로우 관계도 함께 끊는다) */
router.post("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  if (target.id === user.id) {
    throw new HttpError(400, "자기 자신은 차단할 수 없습니다.");
  }
  await blockUser(user.id, target.id);
  res.json({ success: true, data: { blocked: true } });
});

/** DELETE /api/blocks/:id — 차단 해제 */
router.delete("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  await unblockUser(user.id, target.id);
  res.json({ success: true, data: { blocked: false } });
});

/** GET /api/blocks/:id/status — 내가 이 유저를 차단했는지 */
router.get("/:id/status", async (req, res) => {
  const user = await requireRequestUser(req);
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  res.json({ success: true, data: { blocked: await isBlocked(user.id, target.id) } });
});

export default router;
