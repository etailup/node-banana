import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/three/**/*",
      "./node_modules/three-stdlib/**/*",
      "./node_modules/@react-three/**/*",
      "./node_modules/stats-gl/**/*",
      "./node_modules/@mediapipe/**/*",
      "./node_modules/hls.js/**/*",
      "./workflows/**/*",
      "./examples/**/*",
      "./.git/**/*",
      "./screenshots/**/*",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
