import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */

  // The project has two package-lock.json files (backend root + frontend).
  // Turbopack auto-detection picks the wrong one, so we pin it explicitly
  // to this directory (frontend/) — NOT the parent.
  turbopack: {
    root: __dirname,
  },

  // Rewrite /api/auth/contact to your Express backend port (e.g., 5000)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*', // Change 5000 to your backend's actual port if different
      },
    ];
  },
};

export default nextConfig;