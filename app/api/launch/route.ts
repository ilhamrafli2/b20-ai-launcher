import { NextResponse } from 'next/server';
import { Cc0B20Launchpad } from '@cc0company/sdk';
import { isAddress } from 'viem';

export const runtime = 'nodejs';

const MAX_NAME = 64;
const MAX_SYMBOL = 16;
const MAX_ABOUT = 500;
const MAX_IMAGE = 8 * 1024 * 1024;

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
    const image = clean(body?.image, MAX_IMAGE);

    if (!isAddress(address)) {
      return NextResponse.json({ error: 'Invalid reward wallet address.' }, { status: 400 });
    }
    if (!name || !symbol || !image) {
      return NextResponse.json({ error: 'name, symbol and image are required.' }, { status: 400 });
    }
    if (!/^[A-Z0-9]{1,16}$/.test(symbol)) {
      return NextResponse.json({ error: 'Ticker must contain only A-Z and 0-9.' }, { status: 400 });
    }

    // The sponsored SDK path is intentionally server-side. CC0 documents that
    // sponsored endpoints do not expose CORS and are session-gated.
    const launchpad = new Cc0B20Launchpad({ chainId: 8453 });
    const sponsorship = await launchpad.sponsorshipStatus();
    if (!sponsorship.active) {
      return NextResponse.json(
        { error: 'CC0 B20 sponsorship is inactive or this server has no valid CC0 session. No paid fallback was used.' },
        { status: 503 },
      );
    }

    const result = await launchpad.launchB20Sponsored({
      name,
      symbol,
      image,
      supply: '1000000000',
      rewardRecipient: address,
      lpPreset: 'degen',
      ...(description ? { description } : {}),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sponsored launch failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
