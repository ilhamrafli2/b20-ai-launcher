import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.trim() || '';
  const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 90);

  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Invalid wallet address.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://api.bankr.bot/public/doppler/creator-fees/${address}?days=${days}`,
      { cache: 'no-store' },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Fee lookup failed.' }, { status: 502 });
  }
}
