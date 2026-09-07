import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

export const runtime = 'nodejs';

const MAX_NAME = 100;
const MAX_SYMBOL = 10;
const MAX_ABOUT = 500;

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = clean(body?.rewardRecipient, 42);
    const name = clean(body?.name, MAX_NAME);
    const symbol = clean(body?.symbol, MAX_SYMBOL).toUpperCase();
    const description = clean(body?.about, MAX_ABOUT);

    if (!isAddress(address)) {
      return NextResponse.json({ error: 'Invalid reward wallet address.' }, { status: 400 });
    }
    if (!name || !symbol) {
      return NextResponse.json({ error: 'name and symbol are required.' }, { status: 400 });
    }
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) {
      return NextResponse.json({ error: 'Ticker must contain only A-Z and 0-9, max 10 characters.' }, { status: 400 });
    }

    const partnerKey = process.env.BANKR_PARTNER_KEY;
    if (!partnerKey) {
      return NextResponse.json(
        { error: 'Bankr partner launch is not configured yet. Add BANKR_PARTNER_KEY to the Vercel production environment.' },
        { status: 503 },
      );
    }

    const origin = new URL(request.url).origin;
    const image = `${origin}/api/avatar?name=${encodeURIComponent(name)}&symbol=${encodeURIComponent(symbol)}`;

    const response = await fetch('https://api.bankr.bot/token-launches/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Partner-Key': partnerKey,
      },
      body: JSON.stringify({
        tokenName: name,
        tokenSymbol: symbol,
        ...(description ? { description } : {}),
        image,
        chain: 'base',
        feeRecipient: { type: 'wallet', value: address },
        // Keep the creator reward in the quote asset (WETH) for a simple,
        // transparent rewards dashboard and predictable creator accounting.
        quoteOnlyFees: true,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after');
      const detail = data?.error || data?.message || `Bankr launch failed (${response.status})`;
      return NextResponse.json(
        { error: retryAfter ? `${detail} Retry after ${retryAfter}s.` : detail, bankrStatus: response.status },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      provider: 'bankr',
      chain: 'base',
      tokenAddress: data.tokenAddress,
      poolId: data.poolId,
      txHash: data.txHash,
      activityId: data.activityId,
      feeDistribution: data.feeDistribution,
      quoteOnlyFees: true,
      rewardRecipient: address,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bankr launch failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
