import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const beneficiaryAddress = typeof body?.beneficiaryAddress === 'string' ? body.beneficiaryAddress.trim() : '';
    const tokenAddresses = Array.isArray(body?.tokenAddresses) ? body.tokenAddresses.filter((x: unknown): x is string => typeof x === 'string') : [];

    if (!isAddress(beneficiaryAddress)) return NextResponse.json({ error: 'Invalid beneficiary wallet.' }, { status: 400 });
    if (!tokenAddresses.length || tokenAddresses.length > 50 || tokenAddresses.some((x) => !isAddress(x))) {
      return NextResponse.json({ error: 'Provide 1–50 valid token addresses.' }, { status: 400 });
    }

    const upstream = await fetch('https://api.bankr.bot/public/doppler/build-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ beneficiaryAddress, tokenAddresses }),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Claim build failed.' }, { status: 502 });
  }
}
