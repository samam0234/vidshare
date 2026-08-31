import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { getDb } from "../db/client";
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

export function findAccount(handleOrId: string): AuthAccount | undefined {
  const key = handleOrId.replace(/^@/, "").trim();
  const row = getDb()
    .prepare(`${ACCOUNT_SELECT} WHERE id = ? OR lower(handle) = lower(?)`)
    .get(key, key) as UserRow | undefined;
  return row ? toAccount(row) : undefined;
}

export function createAccount(input: {
  handle: string;
  name: string;
  password: string;
  role?: UserRole;
}): AuthAccount {
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

  getDb()
    .prepare(
      `INSERT INTO users (id, handle, name, bio, avatar, password_hash, role, created_at)
       VALUES (?, ?, ?, '', NULL, ?, ?, ?)`
    )
    .run(
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
export function setAccountRole(userId: string, role: UserRole): boolean {
  const info = getDb()
    .prepare("UPDATE users SET role = ? WHERE id = ?")
    .run(role, userId);
  return info.changes > 0;
}
