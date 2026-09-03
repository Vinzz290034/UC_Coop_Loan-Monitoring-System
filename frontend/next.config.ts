import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */

  // Enable package import optimization to prevent dev server lag from heavy icon & chart libraries
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@base-ui/react', 'tw-animate-css'],
  },

  // The project has two package-lock.json files (backend root + frontend).
  // Turbopack auto-detection picks the wrong one, so we pin it explicitly
  // to this directory (frontend/) — NOT the parent.
  turbopack: {
    root: __dirname,
  },

  // Rewrite /api and /uploads to Express backend port or remote URL
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  allowedDevOrigins: ['192.168.1.10', 'https://[IP_ADDRESS]'],
};

export default nextConfig;