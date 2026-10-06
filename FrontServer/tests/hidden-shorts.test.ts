import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HIDDEN_MAX,
  parseHiddenIds,
  withHiddenId,
  withoutHiddenId,
} from "../lib/hidden-shorts";

describe("parseHiddenIds", () => {
  it("비었거나 깨진 값은 빈 배열", () => {
    assert.deepEqual(parseHiddenIds(null), []);
    assert.deepEqual(parseHiddenIds(undefined), []);
    assert.deepEqual(parseHiddenIds(""), []);
    assert.deepEqual(parseHiddenIds("{not json"), []);
    assert.deepEqual(parseHiddenIds('{"a":1}'), []);
    assert.deepEqual(parseHiddenIds('"s-1"'), []);
  });

  it("문자열이 아닌 항목·빈 문자열·중복은 버린다", () => {
    assert.deepEqual(parseHiddenIds('["s-1", 2, null, "", "s-1", "s-2", {"x":1}]'), ["s-1", "s-2"]);
  });

  it("상한을 넘게 저장돼 있으면 최근 것만 남긴다", () => {
    const many = Array.from({ length: HIDDEN_MAX + 20 }, (_, i) => `s-${i}`);
    const parsed = parseHiddenIds(JSON.stringify(many));
    assert.equal(parsed.length, HIDDEN_MAX);
    assert.equal(parsed.at(-1), `s-${HIDDEN_MAX + 19}`);
    assert.equal(parsed[0], "s-20");
  });
});

describe("withHiddenId / withoutHiddenId", () => {
  it("새 id 는 맨 뒤에 붙는다", () => {
    assert.deepEqual(withHiddenId(["a", "b"], "c"), ["a", "b", "c"]);
  });

  it("이미 있으면 중복 없이 맨 뒤로 옮긴다", () => {
    assert.deepEqual(withHiddenId(["a", "b", "c"], "a"), ["b", "c", "a"]);
  });

  it("상한을 넘으면 오래된 것부터 잊는다", () => {
    assert.deepEqual(withHiddenId(["a", "b", "c"], "d", 3), ["b", "c", "d"]);
  });

  it("원본 배열은 바꾸지 않는다", () => {
    const list = ["a", "b"];
    withHiddenId(list, "c");
    withoutHiddenId(list, "a");
    assert.deepEqual(list, ["a", "b"]);
  });

  it("빼기: 없는 id 는 그대로", () => {
    assert.deepEqual(withoutHiddenId(["a", "b"], "a"), ["b"]);
    assert.deepEqual(withoutHiddenId(["a", "b"], "z"), ["a", "b"]);
  });
});
