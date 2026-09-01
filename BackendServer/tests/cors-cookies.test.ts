import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedCorsOrigin } from "../src/app.js";
import { sessionCookieOptions } from "../src/auth/cookieOptions.js";

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    prev[key] = process.env[key];
    const next = env[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("CORS", () => {
  it("개발에서는 사설망을 허용한다", () => {
    withEnv({ NODE_ENV: "development" }, () => {
      assert.equal(isAllowedCorsOrigin("http://192.168.1.2:3000", []), true);
    });
  });

  it("프로덕션에서는 화이트리스트만 허용한다", () => {
    withEnv({ NODE_ENV: "production" }, () => {
      assert.equal(isAllowedCorsOrigin("http://192.168.1.2:3000", []), false);
      assert.equal(
        isAllowedCorsOrigin("https://app.example.com", [
          "https://app.example.com",
        ]),
        true
      );
    });
  });
});

describe("세션 쿠키", () => {
  it("COOKIE_DOMAIN 과 none+secure 를 반영한다", () => {
    withEnv(
      { NODE_ENV: "production", COOKIE_DOMAIN: ".example.com", COOKIE_SAMESITE: "none" },
      () => {
        const opts = sessionCookieOptions(1000);
        assert.equal(opts.domain, ".example.com");
        assert.equal(opts.sameSite, "none");
        assert.equal(opts.secure, true);
        assert.equal(opts.httpOnly, true);
      }
    );
  });
});
