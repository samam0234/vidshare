import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createAdminAndLogin, createTestApp, DEMO, loginAs } from "./helpers";

let app: Express;
let cleanup: () => void;
let adminJar: string;
let adminId: string;
let userJar: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  ({ jar: adminJar, id: adminId } = await createAdminAndLogin(app));
  userJar = await loginAs(app, DEMO.handle, DEMO.password);
});

after(() => cleanup());

describe("관리자 로그인", () => {
  it("관리자 계정으로 로그인하면 role=admin 인 유저를 돌려준다", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: "root", password: "admin1234" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, "admin");
    assert.equal(res.body.data.id, adminId);
  });

  it("응답에 비밀번호 해시나 정지 여부를 담지 않는다", async () => {
    const res = await request(app).get("/api/admin/auth/me").set("Cookie", adminJar);
    assert.equal(res.status, 200);
    assert.equal("passwordHash" in res.body.data, false);
    assert.equal("suspended" in res.body.data, false);
  });

  it("관리자 세션 쿠키는 일반 세션과 이름이 다르다", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: "root", password: "admin1234" });
    const raw = res.headers["set-cookie"];
    const list = Array.isArray(raw) ? raw : [raw];
    assert.ok(list.some((c) => c.startsWith("vidshare_admin_sid=")));
    assert.equal(
      list.some((c) => c.startsWith("vidshare_sid=")),
      false
    );
  });

  it("일반 유저 계정으로는 콘솔에 로그인할 수 없다", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: DEMO.handle, password: DEMO.password });
    assert.equal(res.status, 401);
  });

  it("비밀번호가 틀리면 401", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: "root", password: "wrong-password" });
    assert.equal(res.status, 401);
  });

  it("없는 핸들도 같은 401 메시지를 준다 (계정 존재 여부 노출 방지)", async () => {
    const missing = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: "nosuchadmin", password: "admin1234" });
    const wrongRole = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: DEMO.handle, password: DEMO.password });
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error, wrongRole.body.error);
  });

  it("핸들이나 비밀번호가 비면 400", async () => {
    const noHandle = await request(app)
      .post("/api/admin/auth/login")
      .send({ password: "admin1234" });
    const noPassword = await request(app)
      .post("/api/admin/auth/login")
      .send({ handle: "root" });
    assert.equal(noHandle.status, 400);
    assert.equal(noPassword.status, 400);
  });
});

describe("관리자 세션", () => {
  it("쿠키 없이 /me 는 401", async () => {
    const res = await request(app).get("/api/admin/auth/me");
    assert.equal(res.status, 401);
  });

  it("일반 사이트 세션 쿠키로는 /me 에 접근할 수 없다", async () => {
    const res = await request(app).get("/api/admin/auth/me").set("Cookie", userJar);
    assert.equal(res.status, 401);
  });

  it("로그아웃하면 해당 세션이 무효화된다", async () => {
    const { jar } = await createAdminAndLogin(app, "root2", "admin1234");
    assert.equal((await request(app).get("/api/admin/auth/me").set("Cookie", jar)).status, 200);

    await request(app).post("/api/admin/auth/logout").set("Cookie", jar);

    assert.equal((await request(app).get("/api/admin/auth/me").set("Cookie", jar)).status, 401);
    // 다른 관리자 세션은 그대로 살아 있다
    assert.equal(
      (await request(app).get("/api/admin/auth/me").set("Cookie", adminJar)).status,
      200
    );
  });
});

describe("역할 노출", () => {
  it("일반 유저의 /api/auth/me 에도 role 이 실린다", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", userJar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, "user");
  });

  it("쇼츠 작성자에도 role 이 실린다", async () => {
    const res = await request(app).get("/api/shorts");
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    for (const short of res.body.data) {
      assert.ok(["user", "admin"].includes(short.author.role));
    }
  });
});
