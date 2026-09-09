import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const FLANCH_PREPARE_URL = 'https://mcp.flaunch.gg/v1/base/launch/prepare';

type Json = Record<string, unknown>;

function str(v: unknown, max: number) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Json;
    const name = str(body.name, 64);
    const symbol = str(body.symbol, 8);
    const description = str(body.description, 1000);
    const imageIpfs = str(body.imageIpfs, 1000);
    const creatorAddress = str(body.creatorAddress, 42);

    if (!name || !symbol || !description || !creatorAddress) {
      return NextResponse.json({ error: 'name, symbol, description and creatorAddress are required.' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9]{1,8}$/.test(symbol)) {
      return NextResponse.json({ error: 'symbol must be 1-8 alphanumeric characters.' }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(creatorAddress)) {
      return NextResponse.json({ error: 'creatorAddress must be a valid EVM address.' }, { status: 400 });
    }

    const payload = { name, symbol, description, imageIpfs, creatorAddress };
    const upstream = await fetch(FLANCH_PREPARE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
