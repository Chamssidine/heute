import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @heute/domain est publié en TypeScript source (pas de build).
  transpilePackages: ["@heute/domain"],
};

export default nextConfig;
