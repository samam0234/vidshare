import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UPLOAD_TABS, parseUploadTab, uploadHref } from "../lib/upload-tabs";

describe("parseUploadTab", () => {
  it("값이 없으면 기본은 쇼츠", () => {
    assert.equal(parseUploadTab(undefined), "shorts");
    assert.equal(parseUploadTab(null), "shorts");
    assert.equal(parseUploadTab(""), "shorts");
  });

  it("type=longform 이면 롱폼 (대소문자·공백 무시)", () => {
    assert.equal(parseUploadTab("longform"), "longform");
    assert.equal(parseUploadTab(" LongForm "), "longform");
  });

  it("모르는 값은 쇼츠로 떨군다", () => {
    assert.equal(parseUploadTab("community"), "shorts");
    assert.equal(parseUploadTab("<script>"), "shorts");
  });

  it("같은 키가 여러 번 오면 첫 값만 본다", () => {
    assert.equal(parseUploadTab(["longform", "shorts"]), "longform");
    assert.equal(parseUploadTab(["shorts", "longform"]), "shorts");
    assert.equal(parseUploadTab([]), "shorts");
  });
});

describe("uploadHref", () => {
  it("쇼츠는 /upload, 롱폼은 /upload?type=longform", () => {
    assert.equal(uploadHref("shorts"), "/upload");
    assert.equal(uploadHref("longform"), "/upload?type=longform");
  });

  it("만든 주소를 다시 읽으면 같은 탭이 나온다", () => {
    for (const tab of UPLOAD_TABS) {
      const type = new URL(uploadHref(tab.id), "http://x").searchParams.get("type");
      assert.equal(parseUploadTab(type), tab.id);
    }
  });

  it("서브메뉴는 쇼츠가 먼저, 롱폼이 두 번째", () => {
    assert.deepEqual(
      UPLOAD_TABS.map((t) => t.id),
      ["shorts", "longform"]
    );
  });
});
