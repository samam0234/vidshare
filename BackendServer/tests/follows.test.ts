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
  const users = (await request(app).get("/api/users")).body.data;
  otherId = users.find((u: { id: string }) => u.id !== meId).id;
});

after(() => cleanup());

const status = () =>
  request(app).get(`/api/follows/${otherId}`).set("Cookie", jar);

describe("팔로우", () => {
  it("초기에는 팔로우하지 않은 상태", async () => {
    const res = await status();
    assert.equal(res.status, 200);
    assert.equal(res.body.data.isFollowing, false);
    assert.equal(res.body.data.followers, 0);
  });

  it("팔로우하면 카운트가 오른다", async () => {
    const res = await request(app)
      .post(`/api/follows/${otherId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.isFollowing, true);
    assert.equal(res.body.data.followers, 1);
  });

  it("중복 팔로우해도 카운트가 늘지 않는다(멱등)", async () => {
    const res = await request(app)
      .post(`/api/follows/${otherId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.followers, 1);
  });

  it("팔로워 목록에 내가 있다", async () => {
    const res = await request(app).get(`/api/follows/${otherId}/followers`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((u: { id: string }) => u.id === meId));
  });

  it("자기 자신은 팔로우할 수 없다", async () => {
    const res = await request(app)
      .post(`/api/follows/${meId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 400);
  });

  it("언팔로우하면 0으로 돌아간다", async () => {
    const res = await request(app)
      .delete(`/api/follows/${otherId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.isFollowing, false);
    assert.equal(res.body.data.followers, 0);
  });

  it("비로그인 팔로우는 401", async () => {
    const res = await request(app).post(`/api/follows/${otherId}`);
    assert.equal(res.status, 401);
  });

  it("없는 유저는 404", async () => {
    const res = await request(app)
      .get("/api/follows/no-such-user")
      .set("Cookie", jar);
    assert.equal(res.status, 404);
  });

  it("/feed 는 /:id 로 잡히지 않는다", async () => {
    const res = await request(app).get("/api/follows/feed").set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  it("팔로우한 사람의 쇼츠가 피드에 나온다", async () => {
    const shorts = (await request(app).get("/api/shorts")).body.data;
    const author = shorts
      .map((s: { author: { id: string } }) => s.author)
      .find((a: { id: string }) => a.id !== meId);
    const expected = shorts.filter(
      (s: { author: { id: string } }) => s.author.id === author.id
    ).length;

    await request(app).post(`/api/follows/${author.id}`).set("Cookie", jar);
    const feed = await request(app)
      .get("/api/follows/feed")
      .set("Cookie", jar);
    assert.equal(feed.body.data.length, expected);

    await request(app).delete(`/api/follows/${author.id}`).set("Cookie", jar);
    const after = await request(app)
      .get("/api/follows/feed")
      .set("Cookie", jar);
    assert.equal(after.body.data.length, 0);
  });
});
