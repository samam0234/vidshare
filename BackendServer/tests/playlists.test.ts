import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createTestApp, DEMO, loginAs } from "./helpers";

let app: Express;
let cleanup: () => void;
let jar: string;
let meId: string;
let myShortId: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  jar = await loginAs(app, DEMO.handle, DEMO.password);
  const me = await request(app).get("/api/auth/me").set("Cookie", jar);
  meId = me.body.data.id;

  const created = await request(app)
    .post("/api/shorts")
    .set("Cookie", jar)
    .send({ title: "재생목록 테스트용 영상" });
  myShortId = created.body.data.id;
});

after(() => cleanup());

describe("재생목록", () => {
  let playlistId: number;

  it("빈 목록에서 시작한다", async () => {
    const res = await request(app).get("/api/playlists").query({ ownerId: meId });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
  });

  it("비로그인 생성은 401", async () => {
    const res = await request(app).post("/api/playlists").send({ title: "x" });
    assert.equal(res.status, 401);
  });

  it("제목이 비면 400", async () => {
    const res = await request(app)
      .post("/api/playlists")
      .set("Cookie", jar)
      .send({ title: "  " });
    assert.equal(res.status, 400);
  });

  it("생성하면 itemCount 0으로 시작한다", async () => {
    const res = await request(app)
      .post("/api/playlists")
      .set("Cookie", jar)
      .send({ title: "웃긴 영상 모음" });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.itemCount, 0);
    playlistId = res.body.data.id;
  });

  it("소유자의 목록 조회에 나타난다", async () => {
    const res = await request(app).get("/api/playlists").query({ ownerId: meId });
    assert.ok(res.body.data.some((p: { id: number }) => p.id === playlistId));
  });

  it("영상을 추가하면 상세에 나타난다", async () => {
    const res = await request(app)
      .post(`/api/playlists/${playlistId}/items`)
      .set("Cookie", jar)
      .send({ shortId: myShortId });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.itemCount, 1);

    const detail = await request(app).get(`/api/playlists/${playlistId}`);
    assert.equal(detail.body.data.items.length, 1);
    assert.equal(detail.body.data.items[0].id, myShortId);
  });

  it("같은 영상을 두 번 추가해도 하나만 남는다(멱등)", async () => {
    const res = await request(app)
      .post(`/api/playlists/${playlistId}/items`)
      .set("Cookie", jar)
      .send({ shortId: myShortId });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.itemCount, 1);
  });

  it("없는 쇼츠를 추가하면 404", async () => {
    const res = await request(app)
      .post(`/api/playlists/${playlistId}/items`)
      .set("Cookie", jar)
      .send({ shortId: "no-such-short" });
    assert.equal(res.status, 404);
  });

  it("다른 사람은 내 재생목록에 추가할 수 없다", async () => {
    const other = await request(app).post("/api/auth/register").send({
      handle: `po${Date.now()}`,
      name: "다른유저",
      password: "password123",
    });
    const raw = other.headers["set-cookie"];
    const otherJar = (Array.isArray(raw) ? raw : [raw])
      .map((c) => c.split(";")[0])
      .join("; ");

    const res = await request(app)
      .post(`/api/playlists/${playlistId}/items`)
      .set("Cookie", otherJar)
      .send({ shortId: myShortId });
    assert.equal(res.status, 404);
  });

  it("영상을 빼면 상세에서 사라진다", async () => {
    const res = await request(app)
      .delete(`/api/playlists/${playlistId}/items/${myShortId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.itemCount, 0);
  });

  it("없는 재생목록 상세는 404", async () => {
    const res = await request(app).get("/api/playlists/999999");
    assert.equal(res.status, 404);
  });

  it("존재하지 않는 ownerId 는 404", async () => {
    const res = await request(app)
      .get("/api/playlists")
      .query({ ownerId: "no-such-user" });
    assert.equal(res.status, 404);
  });

  it("재생목록을 삭제하면 목록에서 사라진다", async () => {
    const res = await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);

    const list = await request(app).get("/api/playlists").query({ ownerId: meId });
    assert.ok(!list.body.data.some((p: { id: number }) => p.id === playlistId));
  });

  it("이미 삭제된 재생목록을 다시 삭제하면 404", async () => {
    const res = await request(app)
      .delete(`/api/playlists/${playlistId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 404);
  });
});
