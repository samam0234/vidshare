import { Router } from "express";
import { listAllUsersForAdmin, setUserSuspended } from "../../data/store";
import { findAccount } from "../../auth/accounts";
import { requireAdmin } from "../../auth/requireAdmin";
import { HttpError } from "../../middleware/errorHandler";

const router = Router();

/** GET /api/admin/users?q= */
router.get("/", (req, res) => {
  requireAdmin(req);
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  res.json({ success: true, data: listAllUsersForAdmin(q) });
});

/** PATCH /api/admin/users/:id/suspend  body: { suspended: boolean } */
router.patch("/:id/suspend", (req, res) => {
  const admin = requireAdmin(req);
  const targetId = req.params.id;
  const { suspended } = req.body ?? {};
  if (typeof suspended !== "boolean") {
    throw new HttpError(400, "suspended는 true/false 여야 합니다.");
  }

  const target = findAccount(targetId);
  if (!target) throw new HttpError(404, "유저를 찾을 수 없습니다.");

  // 관리자가 스스로(혹은 서로)를 잠가 콘솔에 못 들어오는 상황을 막는다.
  if (target.id === admin.id) {
    throw new HttpError(400, "자기 자신은 정지할 수 없습니다.");
  }
  if (target.role === "admin") {
    throw new HttpError(400, "관리자 계정은 정지할 수 없습니다.");
  }

  setUserSuspended(target.id, suspended);
  res.json({ success: true, data: { id: target.id, suspended } });
});

export default router;
