import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { getDb } from "../db/client";
import type { Author } from "../types";

export type AuthAccount = Author & { passwordHash: string };

type UserRow = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatar: string | null;
  password_hash: string | null;
};

function toAccount(row: UserRow): AuthAccount {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    ...(row.avatar ? { avatar: row.avatar } : {}),
    passwordHash: row.password_hash ?? "",
  };
}

export function toPublicUser(account: AuthAccount): Author {
  const { passwordHash: _hidden, ...pub } = account;
  return pub;
}

export function normalizeHandle(raw: string) {
  return raw.replace(/^@/, "").trim().toLowerCase();
}

export function findAccount(handleOrId: string): AuthAccount | undefined {
  const key = handleOrId.replace(/^@/, "").trim();
  const row = getDb()
    .prepare(
      `SELECT id, handle, name, bio, avatar, password_hash
       FROM users
       WHERE id = ? OR lower(handle) = lower(?)`
    )
    .get(key, key) as UserRow | undefined;
  return row ? toAccount(row) : undefined;
}

export function createAccount(input: {
  handle: string;
  name: string;
  password: string;
}): AuthAccount {
  const handle = normalizeHandle(input.handle);
  const account: AuthAccount = {
    id: `u-${randomUUID().slice(0, 8)}`,
    handle,
    name: input.name.trim(),
    bio: "",
    passwordHash: bcrypt.hashSync(input.password, 10),
  };

  getDb()
    .prepare(
      `INSERT INTO users (id, handle, name, bio, avatar, password_hash, created_at)
       VALUES (?, ?, ?, '', NULL, ?, ?)`
    )
    .run(account.id, account.handle, account.name, account.passwordHash, new Date().toISOString());

  return account;
}
