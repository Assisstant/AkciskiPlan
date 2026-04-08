import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  async rewrites() {
    return [
      {
        source: "/api/students/:id/plans/:planId/export-json",
        destination: "/api/students/:id/plans/:planId/export"
      },
      {
        source: "/api/students/:id/plans/:planId/import-json",
        destination: "/api/students/:id/plans/:planId/import"
      }
    ];
  }
};

export default nextConfig;
