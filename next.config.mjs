// GITHUB_PAGES=true builds a static export for GitHub Pages, served under /<repo>/.
// Vercel builds the normal server app, with the headers below.
const pages = process.env.GITHUB_PAGES === 'true'
const basePath = pages ? '/CorporateTransparencyHackathon' : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(pages
    ? { output: 'export', basePath, trailingSlash: true, images: { unoptimized: true } }
    : {
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
              ],
            },
          ]
        },
      }),
}

export default nextConfig
