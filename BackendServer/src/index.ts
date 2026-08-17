import "dotenv/config";
import os from "os";
import { createApp } from "./app";

const port = Number(process.env.PORT) || 4000;
const app = createApp();

function lanIPv4() {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const addr of list ?? []) {
      if (addr.family === "IPv4" && !addr.internal) out.push(addr.address);
    }
  }
  return out;
}

app.listen(port, "0.0.0.0", () => {
  console.log("");
  console.log("  VidShare BackendServer");
  console.log(`  → http://localhost:${port}`);
  for (const ip of lanIPv4()) {
    console.log(`  → http://${ip}:${port}`);
  }
  console.log(`  → health: http://localhost:${port}/api/health`);
  console.log("");
});
