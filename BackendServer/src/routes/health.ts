import { Router } from "../middleware/asyncRouter";
import { getDb } from "../db/client";

const router = Router();

/** DB 까지 닿는지 확인한다. 배포 스크립트·모니터링이 이 응답으로 성공 여부를 본다. */
router.get("/", async (_req, res) => {
  let db: "ok" | "down" = "ok";
  try {
    await getDb().get("SELECT 1 AS ok");
  } catch {
    db = "down";
  }
  res.status(db === "ok" ? 200 : 503).json({
    success: db === "ok",
    service: "VidShare BackendServer",
    status: db === "ok" ? "ok" : "degraded",
    db,
    time: new Date().toISOString(),
  });
});

export default router;
