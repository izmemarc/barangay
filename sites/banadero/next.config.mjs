import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load shared env vars from monorepo root (site .env.local takes precedence)
config({ path: resolve(__dirname, '../../.env.local') })

// Load site-specific config (non-secret: template IDs, folder IDs, slug, etc.)
const siteConfig = JSON.parse(readFileSync(resolve(__dirname, 'site.config.json'), 'utf-8'))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: siteConfig,
  // CRITICAL: Transpile workspace packages
  transpilePackages: ['@barangay/shared', '@barangay/ui'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  outputFileTracingRoot: resolve(__dirname, '../../'),
  trailingSlash: false,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  turbopack: {
    root: resolve(__dirname, '../../'),
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/404'
      }
    ]
  },
  async redirects() {
    return []
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*\\.(jpg|jpeg|png|gif|ico|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Expires',
            value: new Date(Date.now() + 31536000 * 1000).toUTCString(),
          },
        ],
      },
      {
        source: '/:path*\\.(css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Expires',
            value: new Date(Date.now() + 31536000 * 1000).toUTCString(),
          },
        ],
      },
      {
        source: '/:path*\\.(woff|woff2|eot|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Expires',
            value: new Date(Date.now() + 31536000 * 1000).toUTCString(),
          },
        ],
      },
      {
        source: '/:path*\\.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
          {
            key: 'Expires',
            value: new Date(Date.now() + 3600 * 1000).toUTCString(),
          },
        ],
      },
    ]
  },
}

export default nextConfig
