import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REPORT_REASON_MAX,
  buildReportReason,
  shortMenuItems,
  shortMenuRole,
} from "../lib/short-menu";

describe("shortMenuRole", () => {
  it("로그인하지 않았으면 guest", () => {
    assert.equal(shortMenuRole({ userId: undefined, authorId: "u1" }), "guest");
    assert.equal(shortMenuRole({ userId: null, authorId: "u1" }), "guest");
  });

  it("내 영상이면 owner, 남의 영상이면 member", () => {
    assert.equal(shortMenuRole({ userId: "u1", authorId: "u1" }), "owner");
    assert.equal(shortMenuRole({ userId: "u2", authorId: "u1" }), "member");
  });
});

describe("shortMenuItems", () => {
  const actions = (role: Parameters<typeof shortMenuItems>[0]) =>
    shortMenuItems(role).map((i) => i.action);

  it("업로더는 수정과 삭제만 — 비추천·신고·차단은 없다", () => {
    assert.deepEqual(actions("owner"), ["edit", "delete"]);
  });

  it("다른 유저와 비로그인은 같은 메뉴를 본다 (비추천·링크 복사·프로필·신고·차단)", () => {
    const expected = ["notInterested", "copyLink", "profile", "report", "block"];
    assert.deepEqual(actions("member"), expected);
    assert.deepEqual(actions("guest"), expected);
  });

  it("비로그인도 비추천과 링크 복사는 바로 쓴다 — 로그인이 필요한 건 신고·차단뿐", () => {
    const needLogin = shortMenuItems("guest")
      .filter((i) => i.requiresLogin)
      .map((i) => i.action);
    assert.deepEqual(needLogin, ["report", "block"]);
  });

  it("삭제·신고·차단은 위험 표시", () => {
    const danger = [...shortMenuItems("owner"), ...shortMenuItems("member")]
      .filter((i) => i.danger)
      .map((i) => i.action);
    assert.deepEqual(danger.sort(), ["block", "delete", "report"]);
  });
});

describe("buildReportReason", () => {
  it("사유만 고르면 그 문구", () => {
    assert.equal(buildReportReason("스팸 · 광고", ""), "스팸 · 광고");
  });

  it("사유 + 상세는 ' — ' 로 잇는다", () => {
    assert.equal(buildReportReason("폭력 · 혐오", " 욕설이 있어요 "), "폭력 · 혐오 — 욕설이 있어요");
  });

  it("사유를 안 고르면 null", () => {
    assert.equal(buildReportReason("", "내용"), null);
    assert.equal(buildReportReason("   ", ""), null);
  });

  it("기타는 직접 쓴 내용이 있어야 한다", () => {
    assert.equal(buildReportReason("기타", ""), null);
    assert.equal(buildReportReason("기타", "   "), null);
    assert.equal(buildReportReason("기타", "광고성 댓글"), "기타 — 광고성 댓글");
  });

  it("서버 상한(500자)을 넘지 않게 자른다", () => {
    const out = buildReportReason("기타", "가".repeat(900));
    assert.equal(out?.length, REPORT_REASON_MAX);
  });
});
