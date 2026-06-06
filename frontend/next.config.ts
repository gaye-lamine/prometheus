import type { NextConfig } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/simulations/:path*",
        destination: `${apiBase}/api/simulations/:path*`,
      },
    ];
  },
};

export default nextConfig;
