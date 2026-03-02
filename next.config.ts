import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "three",
    "three-stdlib",
    "stats-gl",
    "@react-three/fiber",
    "@react-three/drei",
    "@mediapipe/tasks-vision",
    "hls.js",
  ],
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/three/**",
      "./node_modules/three-stdlib/**",
      "./node_modules/stats-gl/**",
      "./node_modules/@react-three/**",
      "./node_modules/@mediapipe/**",
      "./node_modules/hls.js/**",
      "./node_modules/typescript/**",
      "./examples/**",
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
