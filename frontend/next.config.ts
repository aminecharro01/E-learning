import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 'unsafe-inline' on script-src is required for the small inline dark-mode-init
// script in app/layout.tsx (a static constant, not user input — see that file).
// Everything user-authored (lesson HTML) goes through DOMPurify before render
// (RichHtmlContent.tsx), so CSP here is defense-in-depth, not the primary guard.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${API_URL} https://images.unsplash.com`,
  `media-src 'self' blob: ${API_URL}`,
  `connect-src 'self' ${API_URL}`,
  "font-src 'self' data:",
  // PdfViewer.tsx embeds the API's own /api/assets/{id}/file in an <iframe> -
  // without API_URL here the frame-src check blocks it before the request
  // ever reaches the backend's own frame-ancestors check.
  `frame-src 'self' ${API_URL} https://iframe.mediadelivery.net`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
