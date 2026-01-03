import { NextResponse } from 'next/server';

// Build version - uses Vercel's git commit SHA or falls back to build time
// This changes on each deployment, triggering the update prompt
const BUILD_VERSION = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  || process.env.BUILD_ID
  || '1.0.0';

export async function GET() {
  return NextResponse.json({
    version: BUILD_VERSION,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
