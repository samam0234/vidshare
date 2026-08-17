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
};

export default nextConfig;
