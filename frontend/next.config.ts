import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable strict mode
  allowedDevOrigins: ["10.207.18.43", "localhost"],
  devIndicators: false
}

export default nextConfig;
