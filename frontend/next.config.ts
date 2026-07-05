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
};

export default nextConfig;
