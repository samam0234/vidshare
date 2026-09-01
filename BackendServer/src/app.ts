import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import morgan from "morgan";
import { errorHandler, notFound } from "./middleware/errorHandler";
import healthRouter from "./routes/health";
import shortsRouter from "./routes/shorts";
import commentsRouter from "./routes/comments";
import usersRouter from "./routes/users";
import notificationsRouter from "./routes/notifications";
import messagesRouter from "./routes/messages";
import supportRouter from "./routes/support";
import authRouter from "./routes/auth";
import chatbotRouter from "./routes/chatbot";
import chatbotThreadsRouter from "./routes/chatbot-threads";
import longformRouter from "./routes/longform";
import communityRouter from "./routes/community";
import conversationsRouter from "./routes/conversations";
import uploadsRouter from "./routes/uploads";
import searchRouter from "./routes/search";
import followsRouter from "./routes/follows";
import blocksRouter from "./routes/blocks";
import reportsRouter from "./routes/reports";
import playlistsRouter from "./routes/playlists";
import adminAuthRouter from "./routes/admin/auth";
import adminReportsRouter from "./routes/admin/reports";
import adminUsersRouter from "./routes/admin/users";
import adminContentRouter from "./routes/admin/content";
import adminSupportRouter from "./routes/admin/support";
import adminDashboardRouter from "./routes/admin/dashboard";
import { ensureUploadsDir, uploadsDir } from "./upload/files";

function isPrivateHostname(hostname: string) {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

export function isDevAllowedOrigin(origin: string, extra: string[]) {
  if (extra.includes(origin) || extra.includes("*")) return true;
  try {
    const { hostname } = new URL(origin);
    return isPrivateHostname(hostname);
  } catch {
    return false;
  }
}

/** 프로덕션은 CORS_ORIGIN 화이트리스트만. 개발은 사설망도 허용. */
export function isAllowedCorsOrigin(origin: string, extra: string[]) {
  if (extra.includes("*") || extra.includes(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  return isDevAllowedOrigin(origin, extra);
}

export function createApp() {
  const app = express();

  const extraOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedCorsOrigin(origin, extraOrigins)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    })
  );
  // 챗봇 이미지 첨부가 base64로 실려 온다.
  app.use(express.json({ limit: "12mb" }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  ensureUploadsDir();
  app.use(
    "/uploads",
    express.static(uploadsDir(), {
      index: false,
      dotfiles: "ignore",
      maxAge: "7d",
      immutable: true,
      setHeaders(res) {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Disposition", "inline");
      },
    })
  );

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      name: "VidShare BackendServer",
      docs: "/api/health",
      endpoints: [
        "GET  /api/health",
        "GET  /api/search?q=",
        "GET  /api/shorts",
        "GET  /api/shorts/:id",
        "POST /api/shorts",
        "POST /api/shorts/:id/like",
        "GET  /api/shorts/:shortId/comments",
        "POST /api/shorts/:shortId/comments",
        "POST /api/auth/register",
        "POST /api/auth/login",
        "POST /api/auth/logout",
        "GET  /api/auth/me",
        "GET  /api/users",
        "GET  /api/users/me",
        "GET  /api/users/:id",
        "GET  /api/users/:id/shorts",
        "GET  /api/follows/feed",
        "GET  /api/follows/:id",
        "GET  /api/follows/:id/followers",
        "GET  /api/follows/:id/following",
        "POST /api/follows/:id",
        "DELETE /api/follows/:id",
        "GET  /api/blocks",
        "GET  /api/blocks/:id/status",
        "POST /api/blocks/:id",
        "DELETE /api/blocks/:id",
        "POST /api/reports",
        "GET  /api/playlists?ownerId=",
        "POST /api/playlists",
        "GET  /api/playlists/:id",
        "DELETE /api/playlists/:id",
        "POST /api/playlists/:id/items",
        "DELETE /api/playlists/:id/items/:shortId",
        "GET  /api/notifications",
        "GET  /api/notifications/settings",
        "PATCH /api/notifications/settings",
        "PATCH /api/notifications/read-all",
        "DELETE /api/notifications",
        "PATCH /api/notifications/:id",
        "DELETE /api/notifications/:id",
        "GET  /api/messages/users",
        "GET  /api/messages/:userId",
        "POST /api/messages/:userId",
        "GET  /api/conversations",
        "GET  /api/conversations/:id",
        "POST /api/conversations",
        "POST /api/conversations/:id/lines",
        "WS   /ws/conversations",
        "GET  /api/longform",
        "GET  /api/longform/:id",
        "POST /api/longform",
        "GET  /api/community",
        "GET  /api/community/:id",
        "POST /api/community",
        "GET  /api/support/faq",
        "GET  /api/support/inquiries",
        "GET  /api/support/inquiries/:id",
        "POST /api/support/inquiries",
        "POST /api/chatbot/complete",
        "GET  /api/chatbot/threads",
        "GET  /api/chatbot/threads/:id",
        "POST /api/chatbot/threads",
        "PATCH /api/chatbot/threads/:id",
        "DELETE /api/chatbot/threads/:id",
        "POST /api/chatbot/threads/:id/messages",
        "POST /api/uploads?kind=image|video",
        "GET  /uploads/:file",
        "POST /api/admin/auth/login",
        "POST /api/admin/auth/logout",
        "GET  /api/admin/auth/me",
        "GET  /api/admin/dashboard/stats",
        "GET  /api/admin/reports?status=",
        "PATCH /api/admin/reports/:id",
        "GET  /api/admin/users?q=",
        "PATCH /api/admin/users/:id/suspend",
        "DELETE /api/admin/content/shorts/:id",
        "DELETE /api/admin/content/longform/:id",
        "DELETE /api/admin/content/community/:id",
        "DELETE /api/admin/content/comments/:id",
        "GET  /api/admin/support/inquiries",
        "GET  /api/admin/support/inquiries/:id",
        "PATCH /api/admin/support/inquiries/:id/reply",
      ],
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/shorts", shortsRouter);
  app.use("/api/shorts/:shortId/comments", commentsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/follows", followsRouter);
  app.use("/api/blocks", blocksRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/playlists", playlistsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/longform", longformRouter);
  app.use("/api/community", communityRouter);
  app.use("/api/support", supportRouter);
  app.use("/api/chatbot/threads", chatbotThreadsRouter);
  app.use("/api/chatbot", chatbotRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/admin/auth", adminAuthRouter);
  app.use("/api/admin/dashboard", adminDashboardRouter);
  app.use("/api/admin/reports", adminReportsRouter);
  app.use("/api/admin/users", adminUsersRouter);
  app.use("/api/admin/content", adminContentRouter);
  app.use("/api/admin/support", adminSupportRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
