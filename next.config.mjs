/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // HTTPS-only wildcard: branding/banners are admin-configured and can come
    // from arbitrary CDNs, so a static allowlist would break deployments.
    // Protocol is pinned to https to avoid mixed-content loading.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  async rewrites() {
    // Dev-only fallback proxy for same-origin /api/wp/* calls when
    // NEXT_PUBLIC_FXSIM_API isn't set (see getApiBaseUrl() in src/lib/fxsim.ts,
    // which always prefers the real backend URL when it's configured). This
    // must never hardcode a real deployment's target — a machine-local
    // LocalWP hostname baked in here previously caused every production API
    // call to fail with DNS_HOSTNAME_NOT_FOUND, because Vercel can't resolve
    // a hostname that only exists on one developer's laptop.
    const localBackend = process.env.LOCAL_WP_BACKEND_URL || 'http://propfirm.local'
    return [
      {
        source: '/api/wp/:path*',
        destination: `${localBackend}/wp-json/fxsim/v1/:path*`
      }
    ]
  },
};
export default nextConfig;
