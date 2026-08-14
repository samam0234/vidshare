import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT) || 4000;
const app = createApp();

app.listen(port, () => {
  console.log("");
  console.log("  VidShare BackendServer");
  console.log(`  → http://localhost:${port}`);
  console.log(`  → health: http://localhost:${port}/api/health`);
  console.log(`  CORS origin: ${process.env.CORS_ORIGIN ?? "http://localhost:3000"}`);
  console.log("");
});
