import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isGuestAllowedPath, loginHref, safeNextPath } from "../lib/guest-routes";

describe("isGuestAllowedPath — 비회원 공개 경로", () => {
  const publicPaths = [
    "/",
    "/login",
    "/register",
    "/longform",
    "/longform/12",
    "/community",
    "/community/3",
    "/chatbot",
    "/chatbot/7",
    "/search",
    "/profile/u1",
    "/profile/u1/followers",
    "/profile/u1/following",
    "/playlists/1",
    "/terms",
  ];

  for (const p of publicPaths) {
    it(`${p} 는 비회원도 볼 수 있다`, () => {
      assert.equal(isGuestAllowedPath(p), true);
    });
  }
});

describe("isGuestAllowedPath — 로그인 필요 경로", () => {
  const privatePaths = [
    "/upload",
    "/messages",
    "/messages/3",
    "/notifications",
    "/notifications/5",
    "/support",
    "/support/2",
    "/following",
  ];

  for (const p of privatePaths) {
    it(`${p} 는 로그인이 필요하다`, () => {
      assert.equal(isGuestAllowedPath(p), false);
    });
  }

  it("개인 피드(/following)와 공개 팔로잉 목록을 혼동하지 않는다", () => {
    assert.equal(isGuestAllowedPath("/following"), false);
    assert.equal(isGuestAllowedPath("/profile/u1/following"), true);
  });
});

describe("loginHref", () => {
  it("next 를 인코딩해 붙인다", () => {
    assert.equal(loginHref("/search?q=a"), "/login?next=%2Fsearch%3Fq%3Da");
  });

  it("외부 URL 은 루트로 떨군다", () => {
    assert.equal(loginHref("https://evil.example"), "/login?next=%2F");
    assert.equal(loginHref("//evil.example"), "/login?next=%2F");
  });

  it("로그인 페이지로 되돌아가는 순환을 막는다", () => {
    assert.equal(loginHref("/login"), "/login?next=%2F");
  });
});

describe("safeNextPath", () => {
  it("내부 경로는 그대로 둔다", () => {
    assert.equal(safeNextPath("/community/1"), "/community/1");
  });

  it("프로토콜 상대 URL 은 막는다", () => {
    assert.equal(safeNextPath("//evil.example"), "/");
  });

  it("빈 값은 루트", () => {
    assert.equal(safeNextPath(""), "/");
    assert.equal(safeNextPath(null), "/");
  });
});
