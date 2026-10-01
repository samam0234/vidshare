import { Router } from "../middleware/asyncRouter";
import {
  countFollowers,
  countFollowing,
  createActivityNotification,
  findAuthor,
  followUser,
  isBlockedEitherWay,
  isFollowing,
  listFollowers,
  listFollowing,
  listFollowingShorts,
  unfollowUser,
} from "../data/store";
import { getRequestPublicUser, requireRequestUser } from "../auth/requestUser";
import { HttpError } from "../middleware/errorHandler";

const router = Router();

/** GET /api/follows/feed — 내가 팔로우한 사람들의 쇼츠 */
router.get("/feed", async (req, res) => {
  const user = await requireRequestUser(req);
  res.json({ success: true, data: await listFollowingShorts(user.id) });
});

/** GET /api/follows/:id — 특정 유저의 팔로워/팔로잉 수와 내 팔로우 여부 */
router.get("/:id", async (req, res) => {
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  const me = await getRequestPublicUser(req);
  res.json({
    success: true,
    data: {
      followers: await countFollowers(target.id),
      following: await countFollowing(target.id),
      isFollowing: me ? await isFollowing(me.id, target.id) : false,
    },
  });
});

/** GET /api/follows/:id/followers */
router.get("/:id/followers", async (req, res) => {
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  res.json({ success: true, data: await listFollowers(target.id) });
});

/** GET /api/follows/:id/following */
router.get("/:id/following", async (req, res) => {
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  res.json({ success: true, data: await listFollowing(target.id) });
});

/** POST /api/follows/:id — 팔로우 */
router.post("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  if (target.id === user.id) {
    throw new HttpError(400, "자기 자신은 팔로우할 수 없습니다.");
  }
  if (await isBlockedEitherWay(user.id, target.id)) {
    throw new HttpError(403, "차단 관계에서는 팔로우할 수 없습니다.");
  }

  const already = await isFollowing(user.id, target.id);
  await followUser(user.id, target.id);

  // 알림은 새로 팔로우할 때만. 중복 요청으로 쌓이지 않게 한다.
  if (!already) {
    await createActivityNotification(target.id, {
      category: "follower",
      message: `${user.name} 님이 회원님을 팔로우합니다.`,
      href: `/profile/${user.id}`,
    });
  }

  res.json({
    success: true,
    data: {
      followers: await countFollowers(target.id),
      following: await countFollowing(target.id),
      isFollowing: true,
    },
  });
});

/** DELETE /api/follows/:id — 언팔로우 */
router.delete("/:id", async (req, res) => {
  const user = await requireRequestUser(req);
  const target = await findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  await unfollowUser(user.id, target.id);
  res.json({
    success: true,
    data: {
      followers: await countFollowers(target.id),
      following: await countFollowing(target.id),
      isFollowing: false,
    },
  });
});

export default router;
