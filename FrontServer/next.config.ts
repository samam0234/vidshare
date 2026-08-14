import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network host to access Next dev resources (helpful when testing
  // from another device on the LAN). Add other IPs if needed.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["192.168.45.40"],
};

export default nextConfig;
