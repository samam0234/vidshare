import type { NextConfig } from "next";
import os from "os";

/** Hostnames that may open this Next dev server (localhost + current LAN IPs). */
function lanDevHosts() {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const addr of list ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        hosts.add(addr.address);
      }
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevHosts(),
  // Playwright E2E는 별도 distDir을 써서 평소 켜 둔 dev 서버(.next lock)와 충돌하지 않게 한다.
  ...(process.env.PLAYWRIGHT_E2E ? { distDir: ".next-e2e" } : {}),
};

const lanIps = lanDevHosts().filter(
  (h) => h !== "localhost" && h !== "127.0.0.1"
);
if (lanIps.length) {
  console.log(
    `[vidshare] LAN front: ${lanIps.map((ip) => `http://${ip}:3000`).join("  ")}`
  );
}

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
