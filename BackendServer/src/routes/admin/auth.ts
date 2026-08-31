import bcrypt from "bcrypt";
import { Router } from "express";
import { HttpError } from "../../middleware/errorHandler";
import { findAccount, normalizeHandle, toPublicUser } from "../../auth/accounts";
import { createSession, destroySession } from "../../auth/sessions";
import {
  clearAdminSessionCookie,
  readAdminSid,
  setAdminSessionCookie,
} from "../../auth/adminSession";
import { requireAdmin } from "../../auth/requireAdmin";

const router = Router();

/** POST /api/admin/auth/login  body: { handle, password } */
router.post("/login", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const handleRaw = body.handle;
  const passwordRaw = body.password;
  if (typeof handleRaw !== "string" || !handleRaw.trim()) {
    throw new HttpError(400, "핸들을 입력해 주세요.");
  }
  if (typeof passwordRaw !== "string" || !passwordRaw) {
    throw new HttpError(400, "비밀번호를 입력해 주세요.");
  }

  const account = findAccount(normalizeHandle(handleRaw));
  // 계정 없음 / 비번 틀림 / 관리자 아님 / 정지됨 — 전부 같은 메시지.
  if (
    !account ||
    !account.passwordHash ||
    !bcrypt.compareSync(passwordRaw, account.passwordHash) ||
    account.role !== "admin" ||
    account.suspended
  ) {
    throw new HttpError(401, "관리자 계정이 아니거나 정보가 올바르지 않습니다.");
  }

  const sid = createSession(account.id);
  setAdminSessionCookie(res, sid);
  res.json({ success: true, data: toPublicUser(account) });
});

/** POST /api/admin/auth/logout */
router.post("/logout", (req, res) => {
  destroySession(readAdminSid(req));
  clearAdminSessionCookie(res);
  res.json({ success: true, data: { ok: true } });
});

/** GET /api/admin/auth/me */
router.get("/me", (req, res) => {
  const account = requireAdmin(req);
  res.json({ success: true, data: toPublicUser(account) });
});

export default router;
