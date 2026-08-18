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

export function createApp() {
  const app = express();

  const extraOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isDevAllowedOrigin(origin, extraOrigins)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/", (_req, res) => {
    res.json({
      success: true,
      name: "VidShare BackendServer",
      docs: "/api/health",
      endpoints: [
        "GET  /api/health",
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
        "GET  /api/notifications",
        "DELETE /api/notifications/:id",
        "GET  /api/messages/users",
        "GET  /api/messages/:userId",
        "POST /api/messages/:userId",
        "GET  /api/support/faq",
      ],
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/shorts", shortsRouter);
  app.use("/api/shorts/:shortId/comments", commentsRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/support", supportRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
