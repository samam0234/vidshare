import assert from "node:assert/strict";
import http from "node:http";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import type { Express } from "express";
import { WebSocket } from "ws";
import { createTestApp, DEMO, loginAs } from "./helpers";
import { attachChatSocket } from "../src/realtime/chatSocket";

let app: Express;
let cleanup: () => void;
let jar: string;
let server: http.Server;
let wsUrl: string;

before(async () => {
  ({ app, cleanup } = await createTestApp());
  jar = await loginAs(app, DEMO.handle, DEMO.password);

  server = http.createServer(app);
  attachChatSocket(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  server.unref();
  const { port } = server.address() as { port: number };
  wsUrl = `ws://127.0.0.1:${port}/ws/conversations`;
});

after(() => {
  server.close();
  cleanup();
});

async function createConversation(targetName: string) {
  const res = await request(app)
    .post("/api/conversations")
    .set("Cookie", jar)
    .send({ targetName });
  return res.body.data.id as number;
}

describe("메시지 실시간 소켓 (WS)", () => {
  it("세션 쿠키 없이 연결하면 거부된다", async () => {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.on("open", () => reject(new Error("인증 없이 연결되면 안 된다")));
      ws.on("error", () => resolve());
      ws.on("close", () => resolve());
    });
  });

  it("연결 후 send 프레임을 보내면 chat_line 이벤트로 되돌아온다", async () => {
    const conversationId = await createConversation("WS 테스트 상대");

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl, { headers: { Cookie: jar } });
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("chat_line 이벤트를 받지 못했다"));
      }, 4000);

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            type: "send",
            conversationId,
            content: "실시간 메시지 테스트",
          })
        );
      });

      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== "chat_line") return;
        clearTimeout(timer);
        assert.equal(msg.data.conversationId, conversationId);
        assert.equal(msg.data.content, "실시간 메시지 테스트");
        assert.equal(msg.data.type, "me");
        ws.close();
        resolve();
      });

      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  });

  it("존재하지 않는 대화로 send 하면 error 프레임을 받는다", async () => {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl, { headers: { Cookie: jar } });
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("error 이벤트를 받지 못했다"));
      }, 4000);

      ws.on("open", () => {
        ws.send(
          JSON.stringify({ type: "send", conversationId: 999999, content: "no" })
        );
      });

      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== "error") return;
        clearTimeout(timer);
        ws.close();
        resolve();
      });

      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  });

  it("REST 로 보낸 메시지도 열린 소켓에 실시간으로 도착한다", async () => {
    const conversationId = await createConversation("REST→WS 테스트 상대");

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl, { headers: { Cookie: jar } });
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("chat_line 이벤트를 받지 못했다"));
      }, 4000);

      ws.on("open", async () => {
        await request(app)
          .post(`/api/conversations/${conversationId}/lines`)
          .set("Cookie", jar)
          .send({ type: "me", content: "REST 로 보낸 메시지" });
      });

      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== "chat_line") return;
        clearTimeout(timer);
        assert.equal(msg.data.conversationId, conversationId);
        assert.equal(msg.data.content, "REST 로 보낸 메시지");
        ws.close();
        resolve();
      });

      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  });
});
