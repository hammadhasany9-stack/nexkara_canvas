/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    // For `next dev` / standalone without Caddy: proxy /api to the backend.
    // Behind Caddy in docker-compose this rewrite is harmless (Caddy handles /api first).
    const api = process.env.INTERNAL_API_BASE || "http://localhost:8000";
    return [{ source: "/api/:path*", destination: `${api}/:path*` }];
  },
};

export default nextConfig;
