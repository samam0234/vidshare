import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createTestApp } from "./helpers";

let app: Express;
let cleanup: () => void;

before(async () => {
  ({ app, cleanup } = await createTestApp());
});

after(() => cleanup());

async function search(q: string) {
  const res = await request(app).get("/api/search").query({ q });
  assert.equal(res.status, 200);
  return res.body.data;
}

describe("통합 검색", () => {
  it("q 가 없으면 빈 결과를 돌려준다", async () => {
    const res = await request(app).get("/api/search");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data.shorts, []);
    assert.deepEqual(res.body.data.users, []);
  });

  it("빈 문자열도 빈 결과", async () => {
    const data = await search("");
    assert.equal(data.shorts.length, 0);
    assert.equal(data.longform.length, 0);
  });

  it("네 개 도메인 키를 항상 포함한다", async () => {
    const data = await search("아무거나없는검색어zzz");
    for (const key of ["shorts", "longform", "community", "users"]) {
      assert.ok(Array.isArray(data[key]), `${key} 가 배열이어야 한다`);
    }
  });

  it("핸들로 유저를 찾는다", async () => {
    const users = (await request(app).get("/api/users")).body.data;
    const target = users[0];
    const data = await search(target.handle);
    const found = data.users.some((u: { id: string }) => u.id === target.id);
    assert.ok(found, `${target.handle} 이 검색돼야 한다`);
  });

  it("쇼츠 제목으로 찾는다", async () => {
    const shorts = (await request(app).get("/api/shorts")).body.data;
    const word = shorts[0].title.slice(0, 2);
    const data = await search(word);
    assert.ok(data.shorts.length > 0, `"${word}" 로 쇼츠가 나와야 한다`);
  });

  it("대소문자를 구분하지 않는다", async () => {
    const lower = await search("a");
    const upper = await search("A");
    assert.equal(lower.longform.length, upper.longform.length);
    assert.equal(lower.users.length, upper.users.length);
  });
});
