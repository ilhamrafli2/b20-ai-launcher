import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenAddress: string }> },
) {
  try {
    const { tokenAddress } = await params;
    if (!isAddress(tokenAddress)) {
      return NextResponse.json({ error: 'Invalid token address.' }, { status: 400 });
    }

    const response = await fetch(
      `https://api.bankr.bot/token-launches/${tokenAddress}/fees?days=30`,
      { cache: 'no-store' },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || 'Could not read creator fees.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fee lookup failed.' },
      { status: 502 },
    );
  }
}
