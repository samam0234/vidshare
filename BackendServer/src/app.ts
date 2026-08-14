import cors from "cors";
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

export function createApp() {
  const app = express();

  const origin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

  app.use(
    cors({
      origin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
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
