import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by Prisma Compute's Next.js deploy target.
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
