import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:3001/api";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@valrify/domain"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
