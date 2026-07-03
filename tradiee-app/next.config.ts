import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['100.81.62.2'],
  async headers() {
    return [
      {
        // Stops any page on the app (including the login/dashboard) from being
        // framed by a third-party site — including a customer's own uploaded
        // custom-hosted site (Sprint B). A future embeddable booking-widget
        // route (Sprint D) can override this on its own path when it exists.
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ]
  },
};

export default nextConfig;
