import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createAdminAndLogin, createTestApp, DEMO, loginAs } from "./helpers";

/**
 * 쇼츠 업로더 설정(수정·공개 범위·댓글 허용·삭제)과 시청자 비추천 (107).
 */

let app: Express;
let cleanup: () => Promise<void>;
let ownerJar: string;
let otherJar: string;
let ownerId: string;
let otherId: string;
let uploadsDir: string;

async function register(handle: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ handle, name: handle, password: "password123" });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const raw = res.headers["set-cookie"];
  const jar = (Array.isArray(raw) ? raw : [raw]).map((c) => c.split(";")[0]).join("; ");
  const me = await request(app).get("/api/auth/me").set("Cookie", jar);
  return { jar, id: me.body.data.id as string };
}

async function newShort(title: string, extra: Record<string, unknown> = {}) {
  const res = await request(app).post("/api/shorts").set("Cookie", ownerJar).send({ title, ...extra });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data as { id: string };
}

async function upload(kind: "image" | "video"): Promise<string> {
  const isImage = kind === "image";
  const res = await request(app)
    .post(`/api/uploads?kind=${kind}`)
    .set("Cookie", ownerJar)
    .attach("file", Buffer.from(`fake-${kind}-${Math.random()}`), {
      filename: isImage ? "t.png" : "v.mp4",
      contentType: isImage ? "image/png" : "video/mp4",
    });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.url as string;
}

function fileOf(url: string) {
  return path.join(uploadsDir, path.basename(url));
}

async function feedIds(jar?: string) {
  const req = request(app).get("/api/shorts");
  const res = jar ? await req.set("Cookie", jar) : await req;
  return (res.body.data as { id: string }[]).map((s) => s.id);
}

before(async () => {
  ({ app, cleanup } = await createTestApp());
  uploadsDir = process.env.UPLOADS_PATH as string;
  ownerJar = await loginAs(app, DEMO.handle, DEMO.password);
  ownerId = (await request(app).get("/api/auth/me").set("Cookie", ownerJar)).body.data.id;
  ({ jar: otherJar, id: otherId } = await register(`viewer${Date.now()}`));
});
after(() => cleanup());

describe("수정 (PATCH /api/shorts/:id)", () => {
  it("작성자는 제목·설명을 고칠 수 있다", async () => {
    const s = await newShort("원래 제목", { description: "원래 설명" });
    const res = await request(app)
      .patch(`/api/shorts/${s.id}`)
      .set("Cookie", ownerJar)
      .send({ title: "  고친 제목 ", description: "고친 설명" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.title, "고친 제목");
    assert.equal(res.body.data.description, "고친 설명");

    const got = await request(app).get(`/api/shorts/${s.id}`);
    assert.equal(got.body.data.title, "고친 제목");
  });

  it("새 쇼츠는 공개 · 댓글 허용이 기본이다", async () => {
    const s = await newShort("기본값");
    const got = await request(app).get(`/api/shorts/${s.id}`);
    assert.equal(got.body.data.visibility, "public");
    assert.equal(got.body.data.commentsEnabled, true);
  });

  it("다른 유저는 403, 비로그인은 401, 없는 영상은 404", async () => {
    const s = await newShort("남이 못 고침");
    const other = await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", otherJar).send({ title: "해킹" });
    assert.equal(other.status, 403);
    const guest = await request(app).patch(`/api/shorts/${s.id}`).send({ title: "해킹" });
    assert.equal(guest.status, 401);
    const missing = await request(app).patch("/api/shorts/s-nope").set("Cookie", ownerJar).send({ title: "x" });
    assert.equal(missing.status, 404);

    const got = await request(app).get(`/api/shorts/${s.id}`);
    assert.equal(got.body.data.title, "남이 못 고침");
  });

  it("잘못된 값은 400", async () => {
    const s = await newShort("검증용");
    const send = (body: unknown) =>
      request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send(body as object);
    assert.equal((await send({})).status, 400, "바꿀 항목이 없음");
    assert.equal((await send({ title: "   " })).status, 400, "빈 제목");
    assert.equal((await send({ title: "가".repeat(101) })).status, 400, "긴 제목");
    assert.equal((await send({ description: "가".repeat(2001) })).status, 400, "긴 설명");
    assert.equal((await send({ visibility: "friends" })).status, 400, "모르는 공개 범위");
    assert.equal((await send({ commentsEnabled: "yes" })).status, 400, "불리언이 아님");
    assert.equal((await send({ thumb: "data:image/png;base64,AAAA" })).status, 400, "data URL");
    assert.equal((await send({ thumb: "javascript:alert(1)" })).status, 400, "위험한 URL");
  });

  it("생성도 제목 100자 · 설명 2000자를 넘으면 400", async () => {
    const long = await request(app).post("/api/shorts").set("Cookie", ownerJar).send({ title: "가".repeat(101) });
    assert.equal(long.status, 400);
    const desc = await request(app)
      .post("/api/shorts")
      .set("Cookie", ownerJar)
      .send({ title: "ok", description: "가".repeat(2001) });
    assert.equal(desc.status, 400);
  });

  it("썸네일을 바꾸면 옛 파일이 지워지고, null 이면 썸네일이 사라진다", async () => {
    const oldThumb = await upload("image");
    const newThumb = await upload("image");
    const s = await newShort("썸네일 교체", { thumb: oldThumb });
    assert.ok(fs.existsSync(fileOf(oldThumb)));

    const swap = await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send({ thumb: newThumb });
    assert.equal(swap.status, 200);
    assert.equal(swap.body.data.thumb, newThumb);
    assert.ok(!fs.existsSync(fileOf(oldThumb)), "옛 썸네일 파일은 지워져야 한다");
    assert.ok(fs.existsSync(fileOf(newThumb)));

    const clear = await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send({ thumb: null });
    assert.equal(clear.status, 200);
    assert.equal(clear.body.data.thumb, undefined);
    assert.ok(!fs.existsSync(fileOf(newThumb)));
  });
});

describe("공개 범위 (비공개는 작성자만)", () => {
  let id: string;

  before(async () => {
    id = (await newShort("비공개 실험")).id;
    const res = await request(app).patch(`/api/shorts/${id}`).set("Cookie", ownerJar).send({ visibility: "private" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.visibility, "private");
  });

  it("작성자는 목록·상세에서 본다", async () => {
    assert.ok((await feedIds(ownerJar)).includes(id));
    const got = await request(app).get(`/api/shorts/${id}`).set("Cookie", ownerJar);
    assert.equal(got.status, 200);
  });

  it("비로그인·다른 유저에게는 목록·상세·프로필·검색에서 없다", async () => {
    for (const jar of [undefined, otherJar]) {
      assert.ok(!(await feedIds(jar)).includes(id), "피드");
      const req = request(app).get(`/api/shorts/${id}`);
      const got = jar ? await req.set("Cookie", jar) : await req;
      assert.equal(got.status, 404, "상세");

      const profileReq = request(app).get(`/api/users/${ownerId}/shorts`);
      const profile = jar ? await profileReq.set("Cookie", jar) : await profileReq;
      assert.ok(!profile.body.data.some((s: { id: string }) => s.id === id), "프로필");

      const searchReq = request(app).get("/api/search").query({ q: "비공개 실험" });
      const search = jar ? await searchReq.set("Cookie", jar) : await searchReq;
      assert.ok(!search.body.data.shorts.some((s: { id: string }) => s.id === id), "검색");
    }
  });

  it("작성자 본인 프로필과 검색에는 보인다", async () => {
    const profile = await request(app).get(`/api/users/${ownerId}/shorts`).set("Cookie", ownerJar);
    assert.ok(profile.body.data.some((s: { id: string }) => s.id === id));
    const search = await request(app).get("/api/search").query({ q: "비공개 실험" }).set("Cookie", ownerJar);
    assert.ok(search.body.data.shorts.some((s: { id: string }) => s.id === id));
  });

  it("남은 댓글 읽기·쓰기·좋아요·재생목록 담기가 막힌다", async () => {
    const readGuest = await request(app).get(`/api/shorts/${id}/comments`);
    assert.equal(readGuest.status, 404);
    const readOther = await request(app).get(`/api/shorts/${id}/comments`).set("Cookie", otherJar);
    assert.equal(readOther.status, 404);
    const write = await request(app).post(`/api/shorts/${id}/comments`).set("Cookie", otherJar).send({ text: "몰래" });
    assert.equal(write.status, 404);
    const like = await request(app).post(`/api/shorts/${id}/like`).set("Cookie", otherJar).send({ action: "like" });
    assert.equal(like.status, 404);

    const pl = await request(app).post("/api/playlists").set("Cookie", otherJar).send({ title: "내 목록" });
    const add = await request(app)
      .post(`/api/playlists/${pl.body.data.id}/items`)
      .set("Cookie", otherJar)
      .send({ shortId: id });
    assert.equal(add.status, 404);
  });

  it("작성자는 비공개여도 댓글을 쓸 수 있고, 다시 공개하면 모두에게 보인다", async () => {
    const own = await request(app).post(`/api/shorts/${id}/comments`).set("Cookie", ownerJar).send({ text: "내 영상 메모" });
    assert.equal(own.status, 201);

    const back = await request(app).patch(`/api/shorts/${id}`).set("Cookie", ownerJar).send({ visibility: "public" });
    assert.equal(back.body.data.visibility, "public");
    assert.ok((await feedIds()).includes(id));
    const got = await request(app).get(`/api/shorts/${id}`);
    assert.equal(got.status, 200);
  });

  it("공개로 담긴 재생목록 항목도 비공개로 바꾸면 남에게 안 보인다", async () => {
    const s = await newShort("재생목록 비공개");
    const pl = await request(app).post("/api/playlists").set("Cookie", ownerJar).send({ title: "내 목록" });
    await request(app).post(`/api/playlists/${pl.body.data.id}/items`).set("Cookie", ownerJar).send({ shortId: s.id });

    const before = await request(app).get(`/api/playlists/${pl.body.data.id}`);
    assert.ok(before.body.data.items.some((x: { id: string }) => x.id === s.id));

    await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send({ visibility: "private" });
    const guest = await request(app).get(`/api/playlists/${pl.body.data.id}`);
    assert.ok(!guest.body.data.items.some((x: { id: string }) => x.id === s.id));
    const mine = await request(app).get(`/api/playlists/${pl.body.data.id}`).set("Cookie", ownerJar);
    assert.ok(mine.body.data.items.some((x: { id: string }) => x.id === s.id));
  });
});

describe("관리자 콘솔 목록", () => {
  it("비공개 쇼츠도 운영자에게는 보인다 (신고된 영상을 숨겨 검토를 피할 수 없다)", async () => {
    const s = await newShort("운영자가 봐야 하는 비공개");
    await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send({ visibility: "private" });

    assert.ok(!(await feedIds()).includes(s.id), "공개 피드에는 없다");
    const admin = await createAdminAndLogin(app, "keeper3", "admin12345");
    const res = await request(app).get("/api/admin/content/shorts").set("Cookie", admin.jar);
    assert.equal(res.status, 200);
    const found = (res.body.data as { id: string; visibility: string }[]).find((x) => x.id === s.id);
    assert.ok(found, "관리자 목록에는 있다");
    assert.equal(found.visibility, "private");
  });

  it("관리자가 아니면 401", async () => {
    assert.equal((await request(app).get("/api/admin/content/shorts")).status, 401);
    const asUser = await request(app).get("/api/admin/content/shorts").set("Cookie", ownerJar);
    assert.equal(asUser.status, 401);
  });
});

describe("댓글 허용 끄기", () => {
  it("끄면 새 댓글·답글이 403, 기존 댓글은 읽힌다. 다시 켜면 쓸 수 있다", async () => {
    const s = await newShort("댓글 실험");
    const first = await request(app).post(`/api/shorts/${s.id}/comments`).set("Cookie", otherJar).send({ text: "먼저 쓴 댓글" });
    assert.equal(first.status, 201);

    const off = await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send({ commentsEnabled: false });
    assert.equal(off.body.data.commentsEnabled, false);

    const blocked = await request(app).post(`/api/shorts/${s.id}/comments`).set("Cookie", otherJar).send({ text: "또 쓰기" });
    assert.equal(blocked.status, 403);
    const reply = await request(app)
      .post(`/api/shorts/${s.id}/comments`)
      .set("Cookie", otherJar)
      .send({ text: "답글", parentId: first.body.data.id });
    assert.equal(reply.status, 403);

    const list = await request(app).get(`/api/shorts/${s.id}/comments`);
    assert.equal(list.body.data.length, 1, "기존 댓글은 그대로");

    const on = await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send({ commentsEnabled: true });
    assert.equal(on.body.data.commentsEnabled, true);
    const again = await request(app).post(`/api/shorts/${s.id}/comments`).set("Cookie", otherJar).send({ text: "다시 쓰기" });
    assert.equal(again.status, 201);
  });
});

describe("비추천 (내 추천에서 제외)", () => {
  it("비로그인은 401, 내 영상은 400, 없는 영상은 404", async () => {
    const mine = await newShort("내 영상");
    const guest = await request(app).post(`/api/shorts/${mine.id}/dislike`);
    assert.equal(guest.status, 401);
    const own = await request(app).post(`/api/shorts/${mine.id}/dislike`).set("Cookie", ownerJar);
    assert.equal(own.status, 400);
    const none = await request(app).post("/api/shorts/s-nope/dislike").set("Cookie", otherJar);
    assert.equal(none.status, 404);
  });

  it("비추천하면 그 유저의 추천 피드에서만 빠지고, 취소하면 돌아온다", async () => {
    const s = await newShort("비추천 대상");
    assert.ok((await feedIds(otherJar)).includes(s.id));

    const res = await request(app).post(`/api/shorts/${s.id}/dislike`).set("Cookie", otherJar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.disliked, true);

    assert.ok(!(await feedIds(otherJar)).includes(s.id), "비추천한 유저의 피드에서는 빠진다");
    assert.ok((await feedIds(ownerJar)).includes(s.id), "작성자에게는 그대로");
    assert.ok((await feedIds()).includes(s.id), "비로그인에게도 그대로");
    const got = await request(app).get(`/api/shorts/${s.id}`).set("Cookie", otherJar);
    assert.equal(got.status, 200, "영상 자체는 남아 있다");

    const twice = await request(app).post(`/api/shorts/${s.id}/dislike`).set("Cookie", otherJar);
    assert.equal(twice.status, 200, "두 번 눌러도 멱등");

    const undo = await request(app).delete(`/api/shorts/${s.id}/dislike`).set("Cookie", otherJar);
    assert.equal(undo.status, 200);
    assert.ok((await feedIds(otherJar)).includes(s.id), "취소하면 다시 보인다");
  });

  it("검색어로 찾을 때는 비추천한 영상도 나온다", async () => {
    const s = await newShort("찾아볼 영상 zebra");
    await request(app).post(`/api/shorts/${s.id}/dislike`).set("Cookie", otherJar);

    const feed = await request(app).get("/api/shorts").query({ q: "zebra" }).set("Cookie", otherJar);
    assert.ok(feed.body.data.some((x: { id: string }) => x.id === s.id));
    const search = await request(app).get("/api/search").query({ q: "zebra" }).set("Cookie", otherJar);
    assert.ok(search.body.data.shorts.some((x: { id: string }) => x.id === s.id));
  });

  it("팔로잉 피드에서도 빠진다", async () => {
    const s = await newShort("팔로잉 비추천");
    await request(app).post(`/api/follows/${ownerId}`).set("Cookie", otherJar);
    const before = await request(app).get("/api/follows/feed").set("Cookie", otherJar);
    assert.ok(before.body.data.some((x: { id: string }) => x.id === s.id));

    await request(app).post(`/api/shorts/${s.id}/dislike`).set("Cookie", otherJar);
    const after = await request(app).get("/api/follows/feed").set("Cookie", otherJar);
    assert.ok(!after.body.data.some((x: { id: string }) => x.id === s.id));
  });

  it("남의 비공개 영상은 비추천 대상도 될 수 없다", async () => {
    const s = await newShort("비공개 비추천");
    await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", ownerJar).send({ visibility: "private" });
    const res = await request(app).post(`/api/shorts/${s.id}/dislike`).set("Cookie", otherJar);
    assert.equal(res.status, 404);
  });
});

describe("삭제 (DELETE /api/shorts/:id)", () => {
  it("다른 유저는 403, 비로그인은 401, 없는 영상은 404", async () => {
    const s = await newShort("지우기 시험");
    assert.equal((await request(app).delete(`/api/shorts/${s.id}`).set("Cookie", otherJar)).status, 403);
    assert.equal((await request(app).delete(`/api/shorts/${s.id}`)).status, 401);
    assert.equal((await request(app).delete("/api/shorts/s-nope").set("Cookie", ownerJar)).status, 404);
    assert.equal((await request(app).get(`/api/shorts/${s.id}`)).status, 200, "남은 그대로");
  });

  it("작성자가 지우면 영상·댓글·재생목록 항목·비추천이 함께 사라지고 파일도 정리된다", async () => {
    const videoUrl = await upload("video");
    const thumb = await upload("image");
    const s = await newShort("지울 영상", { videoUrl, thumb });
    assert.ok(fs.existsSync(fileOf(videoUrl)) && fs.existsSync(fileOf(thumb)));

    await request(app).post(`/api/shorts/${s.id}/comments`).set("Cookie", otherJar).send({ text: "댓글" });
    const pl = await request(app).post("/api/playlists").set("Cookie", otherJar).send({ title: "담기" });
    await request(app).post(`/api/playlists/${pl.body.data.id}/items`).set("Cookie", otherJar).send({ shortId: s.id });
    // 비추천은 다른 유저가 누른다
    const third = await register(`third${Date.now()}`);
    await request(app).post(`/api/shorts/${s.id}/dislike`).set("Cookie", third.jar);

    const del = await request(app).delete(`/api/shorts/${s.id}`).set("Cookie", ownerJar);
    assert.equal(del.status, 200);
    assert.equal(del.body.data.deleted, true);

    assert.equal((await request(app).get(`/api/shorts/${s.id}`)).status, 404);
    assert.ok(!(await feedIds()).includes(s.id));
    const comments = await request(app).get(`/api/shorts/${s.id}/comments`);
    assert.deepEqual(comments.body.data, []);
    const list = await request(app).get(`/api/playlists/${pl.body.data.id}`);
    assert.equal(list.body.data.items.length, 0);
    assert.ok(!fs.existsSync(fileOf(videoUrl)), "영상 파일 삭제");
    assert.ok(!fs.existsSync(fileOf(thumb)), "썸네일 파일 삭제");
  });

  it("다른 쇼츠가 같은 파일을 쓰고 있으면 파일은 남긴다", async () => {
    const shared = await upload("image");
    const a = await newShort("공유 파일 A", { thumb: shared });
    const b = await newShort("공유 파일 B", { thumb: shared });
    await request(app).delete(`/api/shorts/${a.id}`).set("Cookie", ownerJar);
    assert.ok(fs.existsSync(fileOf(shared)), "B 가 쓰는 파일은 남아야 한다");
    await request(app).delete(`/api/shorts/${b.id}`).set("Cookie", ownerJar);
    assert.ok(!fs.existsSync(fileOf(shared)), "마지막 사용처가 사라지면 지운다");
  });

  it("외부 URL 썸네일은 건드리지 않고 삭제가 성공한다", async () => {
    const s = await newShort("외부 썸네일", { thumb: "https://example.com/pic.png" });
    const del = await request(app).delete(`/api/shorts/${s.id}`).set("Cookie", ownerJar);
    assert.equal(del.status, 200);
  });

  it("관리자가 지워도 업로드 파일이 정리된다", async () => {
    const thumb = await upload("image");
    const s = await newShort("관리자 삭제", { thumb });
    const admin = await createAdminAndLogin(app, "keeper2", "admin12345");
    const res = await request(app).delete(`/api/admin/content/shorts/${s.id}`).set("Cookie", admin.jar);
    assert.equal(res.status, 200);
    assert.ok(!fs.existsSync(fileOf(thumb)));
  });

  it("작성자 계정이 아닌 다른 유저의 id 는 모른 척 한다 (본인 것만)", async () => {
    const s = await newShort("본인 확인");
    assert.notEqual(ownerId, otherId);
    const res = await request(app).patch(`/api/shorts/${s.id}`).set("Cookie", otherJar).send({ visibility: "private" });
    assert.equal(res.status, 403);
  });
});
