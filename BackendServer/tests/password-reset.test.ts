import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import type { Express } from "express";
import { createAdminAndLogin, createTestApp } from "./helpers";

describe("관리자 찾기 · 비밀번호 재설정", () => {
  let app: Express;
  let cleanup: () => Promise<void>;
  let adminJar: string;
  let adminId: string;

  before(async () => {
    ({ app, cleanup } = await createTestApp());
    ({ jar: adminJar, id: adminId } = await createAdminAndLogin(app, "keeper", "oldpass123"));
  });
  after(() => cleanup());

  it("관리자 목록에 나온다", async () => {
    const { listAdminAccounts } = await import("../src/auth/accounts.js");
    const admins = await listAdminAccounts();
    assert.ok(admins.some((a) => a.handle === "keeper" && a.id === adminId && !a.suspended));
    // 일반 시드 계정은 섞이지 않는다
    assert.ok(!admins.some((a) => a.handle === "demo"));
  });

  it("재설정하면 옛 세션이 끊기고 새 비밀번호로만 로그인된다", async () => {
    const before = await request(app).get("/api/admin/auth/me").set("Cookie", adminJar);
    assert.equal(before.status, 200);

    const { setAccountPassword } = await import("../src/auth/accounts.js");
    const result = await setAccountPassword(adminId, "newpass456");
    assert.ok(result && result.revokedSessions >= 1);

    const after = await request(app).get("/api/admin/auth/me").set("Cookie", adminJar);
    assert.equal(after.status, 401, "옛 세션은 끊겨야 한다");

    const oldLogin = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: "keeper", password: "oldpass123" });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: "keeper", password: "newpass456" });
    assert.equal(newLogin.status, 200);
  });

  it("없는 계정이면 null", async () => {
    const { setAccountPassword } = await import("../src/auth/accounts.js");
    assert.equal(await setAccountPassword("u-nope", "whatever123"), null);
  });
});
