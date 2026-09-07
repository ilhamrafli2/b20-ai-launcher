import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const paymasterUrl = process.env.CDP_PAYMASTER_URL;
  if (!paymasterUrl) {
    return NextResponse.json({
      error: 'CDP Paymaster is not configured. Add CDP_PAYMASTER_URL for Base Mainnet in Vercel Production.',
    }, { status: 503 });
  }

  try {
    const body = await request.json();
    const response = await fetch(paymasterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { error: text || 'Paymaster returned an invalid response.' }; }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Paymaster proxy error:', error);
    return NextResponse.json({ error: 'Paymaster proxy failed.' }, { status: 502 });
  }
}
