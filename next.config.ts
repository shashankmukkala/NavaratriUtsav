import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode indicator badge (bottom-left "N" button) never shows in a
  // production build/on Vercel — this just keeps it off of localhost too,
  // so it doesn't show up in screenshots taken from the dev server.
  devIndicators: false,
};

export default nextConfig;
