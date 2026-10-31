const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self' https://*.clerk.com https://*.clerk.accounts.dev",
      "img-src 'self' data: blob: https://img.clerk.com https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev",
      "connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://vitals.vercel-insights.com",
      "frame-src https://*.clerk.com https://*.clerk.accounts.dev",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
