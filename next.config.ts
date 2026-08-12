import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by Prisma Compute's Next.js deploy target.
  output: "standalone",
  images: {
    unoptimized: true,
  },
  // No CSP here deliberately: the Razorpay checkout widget (PaymentPanel.tsx)
  // loads a script from checkout.razorpay.com and opens its own iframe/popup
  // at payment time, and getting a CSP right for that without being able to
  // exercise it against a live checkout in this environment risks silently
  // breaking payments. These four are safe, inert additions that don't
  // depend on any third-party integration behaving a particular way.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
