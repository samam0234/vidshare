import { Router } from "express";
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
router.get("/feed", (req, res) => {
  const user = requireRequestUser(req);
  res.json({ success: true, data: listFollowingShorts(user.id) });
});

/** GET /api/follows/:id — 특정 유저의 팔로워/팔로잉 수와 내 팔로우 여부 */
router.get("/:id", (req, res) => {
  const target = findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  const me = getRequestPublicUser(req);
  res.json({
    success: true,
    data: {
      followers: countFollowers(target.id),
      following: countFollowing(target.id),
      isFollowing: me ? isFollowing(me.id, target.id) : false,
    },
  });
});

/** GET /api/follows/:id/followers */
router.get("/:id/followers", (req, res) => {
  const target = findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  res.json({ success: true, data: listFollowers(target.id) });
});

/** GET /api/follows/:id/following */
router.get("/:id/following", (req, res) => {
  const target = findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  res.json({ success: true, data: listFollowing(target.id) });
});

/** POST /api/follows/:id — 팔로우 */
router.post("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const target = findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  if (target.id === user.id) {
    throw new HttpError(400, "자기 자신은 팔로우할 수 없습니다.");
  }
  if (isBlockedEitherWay(user.id, target.id)) {
    throw new HttpError(403, "차단 관계에서는 팔로우할 수 없습니다.");
  }

  const already = isFollowing(user.id, target.id);
  followUser(user.id, target.id);

  // 알림은 새로 팔로우할 때만. 중복 요청으로 쌓이지 않게 한다.
  if (!already) {
    createActivityNotification(target.id, {
      category: "follower",
      message: `${user.name} 님이 회원님을 팔로우합니다.`,
      href: `/profile/${user.id}`,
    });
  }

  res.json({
    success: true,
    data: {
      followers: countFollowers(target.id),
      following: countFollowing(target.id),
      isFollowing: true,
    },
  });
});

/** DELETE /api/follows/:id — 언팔로우 */
router.delete("/:id", (req, res) => {
  const user = requireRequestUser(req);
  const target = findAuthor(req.params.id);
  if (!target) throw new HttpError(404, "User not found");
  unfollowUser(user.id, target.id);
  res.json({
    success: true,
    data: {
      followers: countFollowers(target.id),
      following: countFollowing(target.id),
      isFollowing: false,
    },
  });
});

export default router;
