import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { getDb, withTx } from "../db/client";
import type { Author, UserRole } from "../types";

/**
 * 내부용 계정. 공개 `Author` 에 없는 `passwordHash`/`suspended` 를 함께 들고 다닌다.
 * 둘 다 `toPublicUser()` 에서 떨어져 나가므로 API 응답에는 실리지 않는다.
 */
export type AuthAccount = Author & {
  passwordHash: string;
  suspended: boolean;
};

type UserRow = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatar: string | null;
  password_hash: string | null;
  role: string;
  suspended: number;
};

const ACCOUNT_SELECT = `
  SELECT id, handle, name, bio, avatar, password_hash, role, suspended
  FROM users
`;

function toRole(raw: string): UserRole {
  return raw === "admin" ? "admin" : "user";
}

function toAccount(row: UserRow): AuthAccount {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    ...(row.avatar ? { avatar: row.avatar } : {}),
    role: toRole(row.role),
    suspended: Boolean(row.suspended),
    passwordHash: row.password_hash ?? "",
  };
}

export function toPublicUser(account: AuthAccount): Author {
  const { passwordHash: _hash, suspended: _suspended, ...pub } = account;
  return pub;
}

export function normalizeHandle(raw: string) {
  return raw.replace(/^@/, "").trim().toLowerCase();
}

export async function findAccount(handleOrId: string): Promise<AuthAccount | undefined> {
  const key = handleOrId.replace(/^@/, "").trim();
  const row = await getDb().get<UserRow>(
    `${ACCOUNT_SELECT} WHERE id = ? OR lower(handle) = lower(?)`,
    key,
    key
  );
  return row ? toAccount(row) : undefined;
}

export async function createAccount(input: {
  handle: string;
  name: string;
  password: string;
  role?: UserRole;
}): Promise<AuthAccount> {
  const handle = normalizeHandle(input.handle);
  const account: AuthAccount = {
    id: `u-${randomUUID().slice(0, 8)}`,
    handle,
    name: input.name.trim(),
    bio: "",
    role: input.role ?? "user",
    suspended: false,
    passwordHash: bcrypt.hashSync(input.password, 10),
  };

  await getDb().run(
    `INSERT INTO users (id, handle, name, bio, avatar, password_hash, role, created_at)
     VALUES (?, ?, ?, '', NULL, ?, ?, ?)`,
    account.id,
    account.handle,
    account.name,
    account.passwordHash,
    account.role,
    new Date().toISOString()
  );

  return account;
}

/** 관리자 승격/강등. CLI 스크립트에서 사용한다. */
export async function setAccountRole(userId: string, role: UserRole): Promise<boolean> {
  const info = await getDb().run("UPDATE users SET role = ? WHERE id = ?", role, userId);
  return info.changes > 0;
}

/**
 * 비밀번호 재설정. 같은 트랜잭션에서 그 계정의 세션을 전부 지워
 * 이미 로그인해 있던 브라우저(옛 비밀번호로 들어온 쪽 포함)를 즉시 끊는다.
 * 지운 세션 수를 돌려준다. 계정이 없으면 null.
 * bcrypt 해시는 단방향이라 원래 비밀번호를 "찾는" 방법은 없다 — 재설정만 가능하다.
 */
export async function setAccountPassword(
  userId: string,
  password: string
): Promise<{ revokedSessions: number } | null> {
  const hash = bcrypt.hashSync(password, 10);
  return withTx(async (tx) => {
    const info = await tx.run("UPDATE users SET password_hash = ? WHERE id = ?", hash, userId);
    if (info.changes === 0) return null;
    const revoked = await tx.run("DELETE FROM sessions WHERE user_id = ?", userId);
    return { revokedSessions: revoked.changes };
  });
}

export type AdminSummary = {
  id: string;
  handle: string;
  name: string;
  suspended: boolean;
  createdAt: string;
};

/** 관리자 계정 목록. 콘솔에 로그인할 계정을 잊었을 때 서버에서 확인하는 용도. */
export async function listAdminAccounts(): Promise<AdminSummary[]> {
  const rows = await getDb().all<{
    id: string;
    handle: string;
    name: string;
    suspended: number;
    created_at: string;
  }>(
    "SELECT id, handle, name, suspended, created_at FROM users WHERE role = 'admin' ORDER BY created_at, handle"
  );
  return rows.map((r) => ({
    id: r.id,
    handle: r.handle,
    name: r.name,
    suspended: Boolean(r.suspended),
    createdAt: r.created_at,
  }));
}
