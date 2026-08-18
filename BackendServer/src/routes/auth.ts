import bcrypt from "bcrypt";
import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";
import {
  createAccount,
  findAccount,
  toPublicUser,
} from "../auth/accounts";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  setSessionCookie,
} from "../auth/sessions";
import { getRequestPublicUser, readSid } from "../auth/requestUser";

const router = Router();

function requireFields(body: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = body[key];
    if (typeof v !== "string" || !v.trim()) {
      throw new HttpError(400, `${key} 을(를) 입력해 주세요.`);
    }
  }
}

/** POST /api/auth/register */
router.post("/register", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  requireFields(body, ["handle", "name", "password"]);
  const handle = String(body.handle).replace(/^@/, "").trim();
  const name = String(body.name).trim();
  const password = String(body.password);

  if (!/^[a-zA-Z0-9._]{3,20}$/.test(handle)) {
    throw new HttpError(400, "핸들은 영문·숫자·._ 3~20자로 입력해 주세요.");
  }
  if (password.length < 6) {
    throw new HttpError(400, "비밀번호는 6자 이상이어야 합니다.");
  }
  if (findAccount(handle)) {
    throw new HttpError(409, "이미 사용 중인 핸들입니다.");
  }

  const account = createAccount({ handle, name, password });
  const sid = createSession(account.id);
  setSessionCookie(res, sid);
  res.status(201).json({ success: true, data: toPublicUser(account) });
});

/** POST /api/auth/login */
router.post("/login", (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  requireFields(body, ["handle", "password"]);
  const handle = String(body.handle).replace(/^@/, "").trim();
  const password = String(body.password);
  const account = findAccount(handle);
  if (!account || !bcrypt.compareSync(password, account.passwordHash)) {
    throw new HttpError(401, "핸들 또는 비밀번호가 올바르지 않습니다.");
  }
  const sid = createSession(account.id);
  setSessionCookie(res, sid);
  res.json({ success: true, data: toPublicUser(account) });
});

/** POST /api/auth/logout */
router.post("/logout", (req, res) => {
  destroySession(readSid(req));
  clearSessionCookie(res);
  res.json({ success: true, data: { ok: true } });
});

/** GET /api/auth/me */
router.get("/me", (req, res) => {
  const user = getRequestPublicUser(req);
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  res.json({ success: true, data: user });
});

export default router;
