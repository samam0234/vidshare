import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createTestApp, DEMO, loginAs } from "./helpers";

let app: Express;
let cleanup: () => void;
let shortId: string;
let jar: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  const shorts = (await request(app).get("/api/shorts")).body.data;
  shortId = shorts[0].id;
  jar = await loginAs(app, DEMO.handle, DEMO.password);
});

after(() => cleanup());

const post = (body: Record<string, unknown>, cookie = jar) =>
  request(app)
    .post(`/api/shorts/${shortId}/comments`)
    .set("Cookie", cookie)
    .send(body);

const list = async () => {
  const res = await request(app).get(`/api/shorts/${shortId}/comments`);
  return res.body.data as Array<{
    id: string;
    text: string;
    parentId?: string;
    authorId?: string;
  }>;
};

describe("댓글 작성은 로그인이 필요하다", () => {
  it("비로그인 작성은 401", async () => {
    const res = await request(app)
      .post(`/api/shorts/${shortId}/comments`)
      .send({ text: "몰래 작성" });
    assert.equal(res.status, 401);
  });

  it("author 는 세션 이름으로 고정된다 (body 값 무시)", async () => {
    const res = await post({ text: "정상 작성", author: "가짜이름" });
    assert.equal(res.status, 201);
    assert.notEqual(res.body.data.author, "가짜이름");
    assert.equal(typeof res.body.data.authorId, "string");
  });
});

describe("댓글 대댓글", () => {
  let rootId: string;

  it("최상위 댓글에는 parentId 가 없다", async () => {
    const res = await post({ text: "루트 댓글" });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.parentId, undefined);
    rootId = res.body.data.id;
  });

  it("답글에는 parentId 가 붙는다", async () => {
    const res = await post({ text: "답글", parentId: rootId });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.parentId, rootId);
  });

  it("대대댓글은 최상위 부모에 평탄화된다", async () => {
    const reply = await post({ text: "1단계", parentId: rootId });
    const nested = await post({
      text: "2단계 시도",
      parentId: reply.body.data.id,
    });
    assert.equal(nested.status, 201);
    assert.equal(
      nested.body.data.parentId,
      rootId,
      "2단계 답글도 루트에 붙어야 한다"
    );
  });

  it("목록에 부모와 답글이 함께 나온다", async () => {
    const items = await list();
    const roots = items.filter((c) => !c.parentId);
    const replies = items.filter((c) => c.parentId === rootId);
    assert.ok(roots.length >= 1);
    assert.ok(replies.length >= 3);
  });

  it("없는 부모에 답글을 달면 404", async () => {
    const res = await post({ text: "고아 답글", parentId: "c-nope" });
    assert.equal(res.status, 404);
  });

  it("parentId 타입이 잘못되면 400", async () => {
    const res = await post({ text: "x", parentId: 123 });
    assert.equal(res.status, 400);
  });

  it("다른 쇼츠의 댓글에는 답글을 달 수 없다", async () => {
    const shorts = (await request(app).get("/api/shorts")).body.data;
    const other = shorts.find((s: { id: string }) => s.id !== shortId);
    const otherComment = await request(app)
      .post(`/api/shorts/${other.id}/comments`)
      .set("Cookie", jar)
      .send({ text: "다른 쇼츠 댓글" });

    const res = await post({
      text: "교차 답글",
      parentId: otherComment.body.data.id,
    });
    assert.equal(res.status, 404);
  });

  it("빈 본문은 400", async () => {
    const res = await post({ text: "   " });
    assert.equal(res.status, 400);
  });
});

describe("댓글 수정·삭제", () => {
  let ownId: string;

  it("본인 댓글을 수정할 수 있다", async () => {
    const created = await post({ text: "원본" });
    ownId = created.body.data.id;

    const res = await request(app)
      .patch(`/api/comments/${ownId}`)
      .set("Cookie", jar)
      .send({ text: "수정됨" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.text, "수정됨");
  });

  it("비로그인 수정은 401", async () => {
    const res = await request(app)
      .patch(`/api/comments/${ownId}`)
      .send({ text: "몰래 수정" });
    assert.equal(res.status, 401);
  });

  it("본문이 비면 400", async () => {
    const res = await request(app)
      .patch(`/api/comments/${ownId}`)
      .set("Cookie", jar)
      .send({ text: "  " });
    assert.equal(res.status, 400);
  });

  it("다른 사람 댓글은 수정할 수 없다", async () => {
    const other = await request(app).post("/api/auth/register").send({
      handle: `other_${Date.now()}`,
      name: "다른유저",
      password: "password123",
    });
    const raw = other.headers["set-cookie"];
    const otherJar = (Array.isArray(raw) ? raw : [raw])
      .map((c) => c.split(";")[0])
      .join("; ");

    const res = await request(app)
      .patch(`/api/comments/${ownId}`)
      .set("Cookie", otherJar)
      .send({ text: "가로채기" });
    assert.equal(res.status, 404);
  });

  it("없는 댓글 수정은 404", async () => {
    const res = await request(app)
      .patch("/api/comments/c-nope")
      .set("Cookie", jar)
      .send({ text: "x" });
    assert.equal(res.status, 404);
  });

  it("본인 댓글을 삭제하면 목록에서 사라진다", async () => {
    const before = await list();
    const res = await request(app)
      .delete(`/api/comments/${ownId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 200);

    const after = await list();
    assert.equal(after.length, before.length - 1);
    assert.ok(!after.some((c) => c.id === ownId));
  });

  it("답글이 있는 댓글을 삭제하면 답글도 함께 사라진다", async () => {
    const root = await post({ text: "삭제될 루트" });
    const rootId = root.body.data.id;
    await post({ text: "삭제될 답글1", parentId: rootId });
    await post({ text: "삭제될 답글2", parentId: rootId });

    const before = await list();
    await request(app).delete(`/api/comments/${rootId}`).set("Cookie", jar);
    const after = await list();

    assert.equal(after.length, before.length - 3);
    assert.ok(!after.some((c) => c.id === rootId || c.parentId === rootId));
  });

  it("이미 삭제된 댓글을 다시 삭제하면 404", async () => {
    const res = await request(app)
      .delete(`/api/comments/${ownId}`)
      .set("Cookie", jar);
    assert.equal(res.status, 404);
  });
});

