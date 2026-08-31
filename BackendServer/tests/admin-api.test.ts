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
let userId: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  ({ jar: adminJar, id: adminId } = await createAdminAndLogin(app));
  userJar = await loginAs(app, DEMO.handle, DEMO.password);
  userId = (await request(app).get("/api/auth/me").set("Cookie", userJar)).body.data.id;
});

after(() => cleanup());

describe("관리자 권한 게이팅", () => {
  const routes: Array<[string, string]> = [
    ["get", "/api/admin/dashboard/stats"],
    ["get", "/api/admin/reports"],
    ["get", "/api/admin/users"],
    ["get", "/api/admin/support/inquiries"],
    ["delete", "/api/admin/content/shorts/s1"],
  ];

  for (const [method, path] of routes) {
    it(`${method.toUpperCase()} ${path} 는 비로그인 401`, async () => {
      const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[
        method
      ](path);
      assert.equal(res.status, 401);
    });

    it(`${method.toUpperCase()} ${path} 는 일반 유저 쿠키로도 401`, async () => {
      const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[
        method
      ](path).set("Cookie", userJar);
      assert.equal(res.status, 401);
    });
  }
});

describe("신고 처리", () => {
  let reportId: number;

  before(async () => {
    const res = await request(app)
      .post("/api/reports")
      .set("Cookie", userJar)
      .send({ targetType: "short", targetId: "s1", reason: "스팸입니다" });
    reportId = res.body.data.id;
  });

  it("전체 신고 목록을 신고자 핸들과 함께 돌려준다", async () => {
    const res = await request(app).get("/api/admin/reports").set("Cookie", adminJar);
    assert.equal(res.status, 200);
    const found = res.body.data.find((r: { id: number }) => r.id === reportId);
    assert.ok(found);
    assert.equal(found.status, "open");
    assert.equal(found.reporterHandle, DEMO.handle);
    assert.equal(found.reason, "스팸입니다");
  });

  it("status 로 필터링한다", async () => {
    const open = await request(app)
      .get("/api/admin/reports?status=open")
      .set("Cookie", adminJar);
    assert.ok(open.body.data.some((r: { id: number }) => r.id === reportId));

    const resolved = await request(app)
      .get("/api/admin/reports?status=resolved")
      .set("Cookie", adminJar);
    assert.equal(
      resolved.body.data.some((r: { id: number }) => r.id === reportId),
      false
    );
  });

  it("처리 상태를 바꾸면 목록에 반영된다", async () => {
    const res = await request(app)
      .patch(`/api/admin/reports/${reportId}`)
      .set("Cookie", adminJar)
      .send({ status: "resolved" });
    assert.equal(res.status, 200);

    const list = await request(app)
      .get("/api/admin/reports?status=resolved")
      .set("Cookie", adminJar);
    assert.ok(list.body.data.some((r: { id: number }) => r.id === reportId));
  });

  it("알 수 없는 status 는 400", async () => {
    const res = await request(app)
      .patch(`/api/admin/reports/${reportId}`)
      .set("Cookie", adminJar)
      .send({ status: "closed" });
    assert.equal(res.status, 400);
  });

  it("없는 신고는 404", async () => {
    const res = await request(app)
      .patch("/api/admin/reports/999999")
      .set("Cookie", adminJar)
      .send({ status: "resolved" });
    assert.equal(res.status, 404);
  });
});

describe("유저 관리", () => {
  it("유저 목록에 role·suspended·가입일이 실린다", async () => {
    const res = await request(app).get("/api/admin/users").set("Cookie", adminJar);
    assert.equal(res.status, 200);
    const demo = res.body.data.find((u: { id: string }) => u.id === userId);
    assert.ok(demo);
    assert.equal(demo.role, "user");
    assert.equal(demo.suspended, false);
    assert.equal(typeof demo.createdAt, "string");
  });

  it("q 로 핸들을 검색한다", async () => {
    const res = await request(app)
      .get(`/api/admin/users?q=${DEMO.handle}`)
      .set("Cookie", adminJar);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, userId);
  });

  it("자기 자신은 정지할 수 없다", async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${adminId}/suspend`)
      .set("Cookie", adminJar)
      .send({ suspended: true });
    assert.equal(res.status, 400);
  });

  it("다른 관리자도 정지할 수 없다", async () => {
    const { id: otherAdminId } = await createAdminAndLogin(app, "root3", "admin1234");
    const res = await request(app)
      .patch(`/api/admin/users/${otherAdminId}/suspend`)
      .set("Cookie", adminJar)
      .send({ suspended: true });
    assert.equal(res.status, 400);
  });

  it("없는 유저는 404, suspended 가 불리언이 아니면 400", async () => {
    const missing = await request(app)
      .patch("/api/admin/users/no-such-user/suspend")
      .set("Cookie", adminJar)
      .send({ suspended: true });
    assert.equal(missing.status, 404);

    const badBody = await request(app)
      .patch(`/api/admin/users/${userId}/suspend`)
      .set("Cookie", adminJar)
      .send({ suspended: "yes" });
    assert.equal(badBody.status, 400);
  });

  it("정지하면 기존 세션이 끊기고 재로그인도 403", async () => {
    const victimJar = await loginAs(app, DEMO.handle, DEMO.password);
    assert.equal((await request(app).get("/api/auth/me").set("Cookie", victimJar)).status, 200);

    const res = await request(app)
      .patch(`/api/admin/users/${userId}/suspend`)
      .set("Cookie", adminJar)
      .send({ suspended: true });
    assert.equal(res.status, 200);

    // 살아 있던 세션이 즉시 무효화된다
    assert.equal((await request(app).get("/api/auth/me").set("Cookie", victimJar)).status, 401);

    const relogin = await request(app)
      .post("/api/auth/login")
      .send({ handle: DEMO.handle, password: DEMO.password });
    assert.equal(relogin.status, 403);
  });

  it("정지를 풀면 다시 로그인할 수 있다", async () => {
    await request(app)
      .patch(`/api/admin/users/${userId}/suspend`)
      .set("Cookie", adminJar)
      .send({ suspended: false });

    const relogin = await request(app)
      .post("/api/auth/login")
      .send({ handle: DEMO.handle, password: DEMO.password });
    assert.equal(relogin.status, 200);
    userJar = relogin.headers["set-cookie"][0].split(";")[0];
  });
});

describe("콘텐츠 삭제", () => {
  it("쇼츠를 지우면 목록과 댓글이 함께 사라진다", async () => {
    const before = await request(app).get("/api/shorts/s1/comments");
    assert.ok(before.body.data.length > 0);

    const res = await request(app)
      .delete("/api/admin/content/shorts/s1")
      .set("Cookie", adminJar);
    assert.equal(res.status, 200);

    assert.equal((await request(app).get("/api/shorts/s1")).status, 404);
    const list = await request(app).get("/api/shorts");
    assert.equal(
      list.body.data.some((s: { id: string }) => s.id === "s1"),
      false
    );
    // FK ON DELETE CASCADE 로 댓글도 정리된다
    const after = await request(app).get("/api/shorts/s1/comments");
    assert.equal(after.body.data.length, 0);
  });

  it("댓글을 지우면 쇼츠의 댓글 수가 줄어든다", async () => {
    const created = await request(app)
      .post("/api/shorts/s2/comments")
      .set("Cookie", userJar)
      .send({ text: "지워질 댓글" });
    assert.equal(created.status, 201);
    const commentId = created.body.data.id;
    const beforeCount = (await request(app).get("/api/shorts/s2")).body.data.comments;

    const res = await request(app)
      .delete(`/api/admin/content/comments/${commentId}`)
      .set("Cookie", adminJar);
    assert.equal(res.status, 200);

    const afterCount = (await request(app).get("/api/shorts/s2")).body.data.comments;
    assert.equal(afterCount, beforeCount - 1);
  });

  it("커뮤니티 글과 롱폼 영상을 지운다", async () => {
    const post = await request(app)
      .post("/api/community")
      .set("Cookie", userJar)
      .send({ title: "삭제 대상", body: "본문" });
    assert.equal(post.status, 201);
    const postId = post.body.data.id;

    const del = await request(app)
      .delete(`/api/admin/content/community/${postId}`)
      .set("Cookie", adminJar);
    assert.equal(del.status, 200);
    assert.equal((await request(app).get(`/api/community/${postId}`)).status, 404);
  });

  it("없는 콘텐츠 삭제는 404", async () => {
    const short = await request(app)
      .delete("/api/admin/content/shorts/no-such-short")
      .set("Cookie", adminJar);
    assert.equal(short.status, 404);

    const community = await request(app)
      .delete("/api/admin/content/community/999999")
      .set("Cookie", adminJar);
    assert.equal(community.status, 404);
  });
});

describe("고객센터 문의 답변", () => {
  let inquiryId: number;

  before(async () => {
    const res = await request(app)
      .post("/api/support/inquiries")
      .set("Cookie", userJar)
      .send({ subject: "결제 문의", body: "환불이 안 됩니다" });
    inquiryId = res.body.data.id;
  });

  it("관리자는 남의 문의도 볼 수 있다", async () => {
    const list = await request(app)
      .get("/api/admin/support/inquiries")
      .set("Cookie", adminJar);
    assert.equal(list.status, 200);
    const found = list.body.data.find((i: { id: number }) => i.id === inquiryId);
    assert.ok(found);
    assert.equal(found.ownerId, userId);
    assert.equal(found.authorHandle, DEMO.handle);
  });

  it("unreplied=1 은 아직 답변 없는 문의만 준다", async () => {
    const res = await request(app)
      .get("/api/admin/support/inquiries?unreplied=1")
      .set("Cookie", adminJar);
    assert.ok(res.body.data.some((i: { id: number }) => i.id === inquiryId));
  });

  it("답변하면 작성자에게 알림이 가고 본인 조회에도 답변이 보인다", async () => {
    const res = await request(app)
      .patch(`/api/admin/support/inquiries/${inquiryId}/reply`)
      .set("Cookie", adminJar)
      .send({ reply: "환불 절차를 안내드립니다." });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.adminReply, "환불 절차를 안내드립니다.");
    assert.equal(typeof res.body.data.repliedAt, "string");

    // 문의를 넣은 유저 쪽에서도 답변이 보인다
    const mine = await request(app)
      .get(`/api/support/inquiries/${inquiryId}`)
      .set("Cookie", userJar);
    assert.equal(mine.body.data.adminReply, "환불 절차를 안내드립니다.");

    const notis = await request(app).get("/api/notifications").set("Cookie", userJar);
    assert.ok(
      notis.body.data.some((n: { message: string }) => n.message.includes("답변이 등록"))
    );
  });

  it("답변 후에는 unreplied 목록에서 빠진다", async () => {
    const res = await request(app)
      .get("/api/admin/support/inquiries?unreplied=1")
      .set("Cookie", adminJar);
    assert.equal(
      res.body.data.some((i: { id: number }) => i.id === inquiryId),
      false
    );
  });

  it("빈 답변은 400, 없는 문의는 404", async () => {
    const empty = await request(app)
      .patch(`/api/admin/support/inquiries/${inquiryId}/reply`)
      .set("Cookie", adminJar)
      .send({ reply: "   " });
    assert.equal(empty.status, 400);

    const missing = await request(app)
      .patch("/api/admin/support/inquiries/999999/reply")
      .set("Cookie", adminJar)
      .send({ reply: "안녕하세요" });
    assert.equal(missing.status, 404);
  });
});

describe("대시보드 통계", () => {
  it("운영 지표를 한 번에 돌려준다", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard/stats")
      .set("Cookie", adminJar);
    assert.equal(res.status, 200);
    const s = res.body.data;
    for (const key of [
      "userCount",
      "suspendedCount",
      "openReportCount",
      "inquiryCount",
      "unrepliedInquiryCount",
      "shortCount",
      "longformCount",
      "communityCount",
    ]) {
      assert.equal(typeof s[key], "number", `${key} 가 숫자가 아님`);
    }
    assert.ok(s.userCount > 0);
    assert.ok(s.inquiryCount >= 1);
  });
});
