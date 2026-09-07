import { NextResponse } from 'next/server';
import { svgAvatar } from '@/lib/b20';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = (url.searchParams.get('name') || 'Token').slice(0, 64);
  const symbol = (url.searchParams.get('symbol') || 'TKN').slice(0, 16);
  const index = Number(url.searchParams.get('i') || 0) || 0;
  const svg = svgAvatar(name, symbol, index);
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
