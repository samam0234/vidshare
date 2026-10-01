import "dotenv/config";
import os from "os";
import http from "http";
import { closeDb, initDb } from "./db/client";
import { createApp } from "./app";
import { attachChatSocket } from "./realtime/chatSocket";

function lanIPv4() {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const addr of list ?? []) {
      if (addr.family === "IPv4" && !addr.internal) out.push(addr.address);
    }
  }
  return out;
}

async function main() {
  // 마이그레이션·시드가 끝난 뒤에야 요청을 받는다.
  await initDb();

  const port = Number(process.env.PORT) || 4000;
  const app = createApp();
  const server = http.createServer(app);
  attachChatSocket(server);

  server.listen(port, "0.0.0.0", () => {
    console.log("");
    console.log("  VidShare BackendServer");
    console.log(`  → http://localhost:${port}`);
    for (const ip of lanIPv4()) {
      console.log(`  → http://${ip}:${port}`);
    }
    console.log(`  → health: http://localhost:${port}/api/health`);
    console.log(`  → ws:     ws://localhost:${port}/ws/conversations`);
    console.log("");
  });

  const shutdown = () => {
    server.close(() => {
      void closeDb().finally(() => process.exit(0));
    });
    // 열린 SSE·WS 연결 때문에 close 가 안 끝나면 강제 종료.
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("서버 시작 실패:", err instanceof Error ? err.message : err);
  process.exit(1);
});
