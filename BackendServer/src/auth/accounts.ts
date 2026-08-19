import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { authors } from "../data/store";
import type { Author } from "../types";

export type AuthAccount = Author & { passwordHash: string };

export const accounts: AuthAccount[] = [
  {
    id: "u-demo",
    handle: "demo",
    name: "Demo User",
    bio: "테스트 계정 (비밀번호 demo1234)",
    passwordHash: bcrypt.hashSync("demo1234", 10),
  },
  {
    id: "u-me",
    handle: "usernumber02345",
    name: "Usernumber 02345",
    bio: "VidShare 크리에이터",
    passwordHash: bcrypt.hashSync("demo1234", 10),
  },
];

export function toPublicUser(account: AuthAccount): Author {
  const { passwordHash: _hidden, ...pub } = account;
  return pub;
}

export function findAccount(handleOrId: string) {
  const key = handleOrId.replace(/^@/, "").trim().toLowerCase();
  return accounts.find(
    (a) => a.handle.toLowerCase() === key || a.id === handleOrId
  );
}

for (const a of accounts) {
  if (!authors.some((x) => x.id === a.id)) {
    authors.push(toPublicUser(a));
  }
}

export function normalizeHandle(raw: string) {
  return raw.replace(/^@/, "").trim().toLowerCase();
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
  accounts.push(account);
  authors.push(toPublicUser(account));
  return account;
}
