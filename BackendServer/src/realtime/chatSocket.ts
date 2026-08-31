import type { Server as HttpServer, IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { addChatLine } from "../data/store";
import { getSessionUserId, SESSION_COOKIE } from "../auth/sessions";
import { chatBus } from "./chatBus";
import type { ChatLine } from "../types";

const WS_PATH = "/ws/conversations";

function readSessionCookie(header: string | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/** `/messages` 실시간화용 WebSocket 서버. 세션 쿠키로 인증하고, owner_id 채널을 chatBus 로 구독한다. */
export function attachChatSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== WS_PATH) return;

    const userId = getSessionUserId(readSessionCookie(req.headers.cookie));
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, userId);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, userId: string) => {
    const onLine = (line: ChatLine) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "chat_line", data: line }));
      }
    };
    chatBus.on(userId, onLine);

    ws.on("message", (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (
        !msg ||
        typeof msg !== "object" ||
        (msg as { type?: unknown }).type !== "send"
      ) {
        return;
      }
      const { conversationId, content, isImage } = msg as {
        conversationId?: unknown;
        content?: unknown;
        isImage?: unknown;
      };
      const id = Number(conversationId);
      if (
        !Number.isFinite(id) ||
        typeof content !== "string" ||
        !content.trim()
      ) {
        ws.send(JSON.stringify({ type: "error", message: "invalid payload" }));
        return;
      }

      const line = addChatLine(id, userId, {
        type: "me",
        content,
        isImage: Boolean(isImage),
      });
      if (!line) {
        ws.send(
          JSON.stringify({ type: "error", message: "Conversation not found" })
        );
      }
      // 성공 시 addChatLine 내부에서 chatBus.publish 를 호출하므로
      // 이 소켓을 포함한 본인의 모든 연결에 chat_line 이벤트로 되돌아온다.
    });

    const keepAlive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 25000);
    keepAlive.unref();

    ws.on("close", () => {
      clearInterval(keepAlive);
      chatBus.off(userId, onLine);
    });
  });

  return wss;
}
