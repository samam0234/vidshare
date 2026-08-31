import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createTestApp, DEMO, loginAs } from "./helpers";

let app: Express;
let cleanup: () => void;
let jar: string;
let meId: string;
let otherId: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  jar = await loginAs(app, DEMO.handle, DEMO.password);
  const me = await request(app).get("/api/auth/me").set("Cookie", jar);
  meId = me.body.data.id;
  // 쇼츠를 실제로 가진 유저여야 "쇼츠 목록에서 제외" 테스트가 의미 있다.
  const shorts = (await request(app).get("/api/shorts")).body.data;
  otherId = shorts
    .map((s: { author: { id: string } }) => s.author.id)
    .find((id: string) => id !== meId);
});

after(() => cleanup());

describe("차단", () => {
  it("초기에는 차단 상태가 아니다", async () => {
    const res = await request(app)
      .get(`/api/blocks/${otherId}/status`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.blocked, false);
  });

  it("차단하면 목록에 나타난다", async () => {
    const res = await request(app)
      .post(`/api/blocks/${otherId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.blocked, true);

    const list = await request(app).get("/api/blocks").set("Cookie", jar);
    assert.ok(list.body.data.some((u: { id: string }) => u.id === otherId));
  });

  it("차단한 유저의 쇼츠는 목록에서 제외된다", async () => {
    const before = await request(app).get("/api/shorts").set("Cookie", jar);
    const hasBlocked = before.body.data.some(
      (s: { author: { id: string } }) => s.author.id === otherId
    );
    assert.equal(hasBlocked, false);

    // 비로그인/타인에게는 여전히 보인다
    const anon = await request(app).get("/api/shorts");
    const anonHas = anon.body.data.some(
      (s: { author: { id: string } }) => s.author.id === otherId
    );
    assert.equal(anonHas, true);
  });

  it("차단하면 팔로우 관계가 끊긴다", async () => {
    await request(app)
      .delete(`/api/blocks/${otherId}`)
      .set("Cookie", jar);
    await request(app).post(`/api/follows/${otherId}`).set("Cookie", jar);

    let status = await request(app)
      .get(`/api/follows/${otherId}`)
      .set("Cookie", jar);
    assert.equal(status.body.data.isFollowing, true);

    await request(app).post(`/api/blocks/${otherId}`).set("Cookie", jar);

    status = await request(app)
      .get(`/api/follows/${otherId}`)
      .set("Cookie", jar);
    assert.equal(status.body.data.isFollowing, false);
  });

  it("차단 관계에서는 팔로우가 403", async () => {
    const res = await request(app)
      .post(`/api/follows/${otherId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 403);
  });

  it("차단 해제 후에는 다시 팔로우할 수 있다", async () => {
    await request(app).delete(`/api/blocks/${otherId}`).set("Cookie", jar);
    const res = await request(app)
      .post(`/api/follows/${otherId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    await request(app).delete(`/api/follows/${otherId}`).set("Cookie", jar);
  });

  it("자기 자신은 차단할 수 없다", async () => {
    const res = await request(app)
      .post(`/api/blocks/${meId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 400);
  });

  it("비로그인 차단은 401", async () => {
    const res = await request(app).post(`/api/blocks/${otherId}`);
    assert.equal(res.status, 401);
  });

  it("없는 유저 차단은 404", async () => {
    const res = await request(app)
      .post("/api/blocks/no-such-user")
      .set("Cookie", jar);
    assert.equal(res.status, 404);
  });
});

describe("신고", () => {
  it("정상 신고는 201", async () => {
    const res = await request(app)
      .post("/api/reports")
      .set("Cookie", jar)
      .send({ targetType: "short", targetId: "s1", reason: "스팸입니다" });
    assert.equal(res.status, 201);
    assert.equal(typeof res.body.data.id, "number");
  });

  it("잘못된 targetType은 400", async () => {
    const res = await request(app)
      .post("/api/reports")
      .set("Cookie", jar)
      .send({ targetType: "video", targetId: "s1", reason: "x" });
    assert.equal(res.status, 400);
  });

  it("사유가 비면 400", async () => {
    const res = await request(app)
      .post("/api/reports")
      .set("Cookie", jar)
      .send({ targetType: "short", targetId: "s1", reason: "  " });
    assert.equal(res.status, 400);
  });

  it("비로그인 신고는 401", async () => {
    const res = await request(app)
      .post("/api/reports")
      .send({ targetType: "short", targetId: "s1", reason: "x" });
    assert.equal(res.status, 401);
  });
});
