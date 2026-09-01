import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toHttpError } from "../src/chatbot/complete";

/**
 * 업스트림이 멎었을 때 사용자에게 `ETIMEDOUT` 같은 날 코드가 새어 나가지
 * 않도록 고정한다. 공급자마다 중단을 알리는 방식이 달라 형태별로 확인한다.
 */
describe("챗봇 에러 변환", () => {
  const timeoutCases: Array<[string, Error]> = [
    ["Node 소켓 타임아웃", Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" })],
    ["AbortSignal.timeout", Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" })],
    ["Groq 중단", Object.assign(new Error("Request was aborted."), { name: "APIUserAbortError" })],
    ["undici 연결 타임아웃", Object.assign(new Error("Connect Timeout Error"), { code: "UND_ERR_CONNECT_TIMEOUT" })],
    [
      "cause 로 감싼 타임아웃",
      Object.assign(new Error("fetch failed"), {
        cause: Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }),
      }),
    ],
  ];

  for (const [label, err] of timeoutCases) {
    it(`${label} → 504, 원본 코드 노출 안 함`, () => {
      const http = toHttpError(err);
      assert.equal(http.status, 504);
      assert.match(http.message, /제한 시간/);
      assert.doesNotMatch(http.message, /ETIMEDOUT|abort|Timeout/i);
    });
  }

  it("연결 실패 → 502 + 네트워크 안내", () => {
    const http = toHttpError(
      Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })
    );
    assert.equal(http.status, 502);
    assert.match(http.message, /연결하지 못했습니다/);
    assert.doesNotMatch(http.message, /ECONNREFUSED/);
  });

  it("그 외 모델 오류는 원본 메시지를 502 로 전달", () => {
    const http = toHttpError(new Error("Vide가 빈 답을 반환했습니다."));
    assert.equal(http.status, 502);
    assert.equal(http.message, "Vide가 빈 답을 반환했습니다.");
  });
});
