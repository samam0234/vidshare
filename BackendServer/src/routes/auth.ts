import bcrypt from "bcrypt";
import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";
import {
  createAccount,
  findAccount,
  normalizeHandle,
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

const HANDLE_RE = /^[a-z0-9._]{3,20}$/;
const NAME_MAX = 30;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

const FIELD_REQUIRED: Record<string, string> = {
  handle: "핸들을 입력해 주세요.",
  name: "이름을 입력해 주세요.",
  password: "비밀번호를 입력해 주세요.",
};

function requireFields(body: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = body[key];
    if (typeof v !== "string" || !v.trim()) {
      throw new HttpError(400, FIELD_REQUIRED[key] ?? `${key}을 입력해 주세요.`);
    }
  }
}

/** POST /api/auth/register */
router.post("/register", (req, res) => {
  if (getRequestPublicUser(req)) {
    throw new HttpError(400, "이미 로그인되어 있습니다. 로그아웃 후 가입해 주세요.");
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  requireFields(body, ["handle", "name", "password"]);
  const handle = normalizeHandle(String(body.handle));
  const name = String(body.name).trim();
  const password = String(body.password);

  if (!HANDLE_RE.test(handle)) {
    throw new HttpError(400, "핸들은 영문·숫자·._ 3~20자로 입력해 주세요.");
  }
  if (name.length > NAME_MAX) {
    throw new HttpError(400, `이름은 ${NAME_MAX}자 이하여야 합니다.`);
  }
  if (password.length < PASSWORD_MIN) {
    throw new HttpError(400, `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`);
  }
  if (password.length > PASSWORD_MAX) {
    throw new HttpError(400, `비밀번호는 ${PASSWORD_MAX}자 이하여야 합니다.`);
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
  const handle = normalizeHandle(String(body.handle));
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
