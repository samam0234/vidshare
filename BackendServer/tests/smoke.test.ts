import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createTestApp, DEMO, loginAs } from "./helpers";

let app: Express;
let cleanup: () => void;

before(async () => {
  ({ app, cleanup } = await createTestApp());
});

after(() => cleanup());

describe("health", () => {
  it("서비스 상태를 돌려준다", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});

describe("인증", () => {
  it("데모 계정으로 로그인한다", async () => {
    const res = await request(app).post("/api/auth/login").send(DEMO);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.handle, "demo");
    assert.ok(res.headers["set-cookie"]);
  });

  it("잘못된 비밀번호는 거부한다", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ handle: "demo", password: "wrong-password" });
    assert.ok(res.status >= 400);
    assert.equal(res.body.success, false);
  });

  it("비로그인 /api/auth/me 는 401", async () => {
    const res = await request(app).get("/api/auth/me");
    assert.equal(res.status, 401);
  });

  it("로그인 후 /api/auth/me 는 본인을 돌려준다", async () => {
    const jar = await loginAs(app, DEMO.handle, DEMO.password);
    const res = await request(app).get("/api/auth/me").set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.handle, "demo");
  });
});

describe("쇼츠", () => {
  it("목록을 돌려준다", async () => {
    const res = await request(app).get("/api/shorts");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });

  it("없는 id 는 404", async () => {
    const res = await request(app).get("/api/shorts/does-not-exist");
    assert.equal(res.status, 404);
  });

  it("비로그인 생성은 401", async () => {
    const res = await request(app).post("/api/shorts").send({ title: "무단" });
    assert.equal(res.status, 401);
  });
});
