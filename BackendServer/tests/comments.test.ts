import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "./helpers";

let app: Express;
let cleanup: () => void;
let shortId: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  const shorts = (await request(app).get("/api/shorts")).body.data;
  shortId = shorts[0].id;
});

after(() => cleanup());

const post = (body: Record<string, unknown>) =>
  request(app).post(`/api/shorts/${shortId}/comments`).send(body);

const list = async () => {
  const res = await request(app).get(`/api/shorts/${shortId}/comments`);
  return res.body.data as Array<{
    id: string;
    text: string;
    parentId?: string;
  }>;
};

describe("댓글 대댓글", () => {
  let rootId: string;

  it("최상위 댓글에는 parentId 가 없다", async () => {
    const res = await post({ text: "루트 댓글", author: "tester" });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.parentId, undefined);
    rootId = res.body.data.id;
  });

  it("답글에는 parentId 가 붙는다", async () => {
    const res = await post({ text: "답글", author: "tester", parentId: rootId });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.parentId, rootId);
  });

  it("대대댓글은 최상위 부모에 평탄화된다", async () => {
    const reply = await post({
      text: "1단계",
      author: "tester",
      parentId: rootId,
    });
    const nested = await post({
      text: "2단계 시도",
      author: "tester",
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
    const res = await post({
      text: "고아 답글",
      author: "tester",
      parentId: "c-nope",
    });
    assert.equal(res.status, 404);
  });

  it("parentId 타입이 잘못되면 400", async () => {
    const res = await post({ text: "x", author: "t", parentId: 123 });
    assert.equal(res.status, 400);
  });

  it("다른 쇼츠의 댓글에는 답글을 달 수 없다", async () => {
    const shorts = (await request(app).get("/api/shorts")).body.data;
    const other = shorts.find((s: { id: string }) => s.id !== shortId);
    const otherComment = await request(app)
      .post(`/api/shorts/${other.id}/comments`)
      .send({ text: "다른 쇼츠 댓글", author: "tester" });

    const res = await post({
      text: "교차 답글",
      author: "tester",
      parentId: otherComment.body.data.id,
    });
    assert.equal(res.status, 404);
  });

  it("빈 본문은 400", async () => {
    const res = await post({ text: "   ", author: "tester" });
    assert.equal(res.status, 400);
  });
});
