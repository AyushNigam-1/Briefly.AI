import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable strict mode
  allowedDevOrigins: ["localhost", "localhost"],
  devIndicators: false
}

export default nextConfig;
