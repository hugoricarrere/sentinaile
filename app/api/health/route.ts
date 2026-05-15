import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Simple health-check endpoint for Vercel uptime monitoring and deployment verification.
 * Returns build timestamp, runtime, and environment info.
 */
export const dynamic = 'force-dynamic'

const BUILD_TIME = new Date().toISOString()

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'SentinAile',
      buildTime: BUILD_TIME,
      serverTime: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'unknown',
      hasMapboxToken: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      hasWindyKey: !!process.env.WINDY_API_KEY,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  )
}
