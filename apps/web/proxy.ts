import { NextResponse, type NextRequest } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id',
  'Access-Control-Max-Age': '86400',
};

/** Answer CORS preflights for the public API (the Expo web build and other municipal clients). */
export function proxy(req: NextRequest) {
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: CORS });
  return NextResponse.next();
}

export const config = { matcher: '/api/v1/:path*' };
