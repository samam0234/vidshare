import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { createTestApp, DEMO, loginAs } from "./helpers";

let app: Express;
let cleanup: () => void;
let jar: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  jar = await loginAs(app, DEMO.handle, DEMO.password);
});

after(() => cleanup());

const countNotifications = async () => {
  const res = await request(app).get("/api/notifications").set("Cookie", jar);
  return res.body.data.length as number;
};

const writePost = (title: string) =>
  request(app)
    .post("/api/community")
    .set("Cookie", jar)
    .send({ title, body: "본문" });

describe("알림 수신 설정", () => {
  it("기본값은 수신 허용", async () => {
    const res = await request(app)
      .get("/api/notifications/settings")
      .set("Cookie", jar);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.enabled, true);
  });

  it("비로그인 조회는 401", async () => {
    const res = await request(app).get("/api/notifications/settings");
    assert.equal(res.status, 401);
  });

  it("boolean 이 아니면 400", async () => {
    const res = await request(app)
      .patch("/api/notifications/settings")
      .set("Cookie", jar)
      .send({ enabled: "yes" });
    assert.equal(res.status, 400);
  });

  it("수신 ON 이면 글 작성 시 알림이 생긴다", async () => {
    const before = await countNotifications();
    await writePost("수신켬");
    assert.equal(await countNotifications(), before + 1);
  });

  it("수신 OFF 로 바꾸면 알림이 쌓이지 않는다", async () => {
    await request(app)
      .patch("/api/notifications/settings")
      .set("Cookie", jar)
      .send({ enabled: false });

    const before = await countNotifications();
    await writePost("수신끔");
    assert.equal(await countNotifications(), before);
  });

  it("다시 켜면 설정이 유지된다", async () => {
    await request(app)
      .patch("/api/notifications/settings")
      .set("Cookie", jar)
      .send({ enabled: true });

    const res = await request(app)
      .get("/api/notifications/settings")
      .set("Cookie", jar);
    assert.equal(res.body.data.enabled, true);
  });
});

describe("알림 벌크 동작", () => {
  it("전체 읽음 처리 후 미읽이 0", async () => {
    await writePost("읽음처리대상");
    await request(app)
      .patch("/api/notifications/read-all")
      .set("Cookie", jar);

    const res = await request(app).get("/api/notifications").set("Cookie", jar);
    const unread = res.body.data.filter((n: { read: boolean }) => !n.read);
    assert.equal(unread.length, 0);
  });

  it("전체 삭제 후 목록이 빈다", async () => {
    await request(app).delete("/api/notifications").set("Cookie", jar);
    assert.equal(await countNotifications(), 0);
  });
});

describe("알림 실시간 스트림 (SSE)", () => {
  it("비로그인 연결은 401", async () => {
    const res = await request(app).get("/api/notifications/stream");
    assert.equal(res.status, 401);
  });

  it("로그인 상태면 text/event-stream 으로 연결되고 새 알림을 즉시 흘려보낸다", async () => {
    const http = await import("node:http");
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    server.unref();
    const { port } = server.address() as { port: number };

    const controller = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/api/notifications/stream`, {
      headers: { Cookie: jar },
      signal: controller.signal,
    });
    assert.equal(res.status, 200);
    assert.match(String(res.headers.get("content-type")), /text\/event-stream/);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    const readUntilNotification = (async () => {
      while (!buf.includes("event: notification")) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value);
      }
    })();

    // 스트림 연결이 자리 잡을 시간을 준 뒤 알림을 발생시킨다.
    await new Promise((r) => setTimeout(r, 100));
    await writePost("실시간알림테스트");
    await readUntilNotification;

    controller.abort();
    server.close();

    assert.match(buf, /event: notification/);
    assert.match(buf, /실시간알림테스트|category/);
  });
});
