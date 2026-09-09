import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const FLAUNCH_PREPARE_URL = 'https://mcp.flaunch.gg/v1/base/launch/prepare';

type Json = Record<string, unknown>;

function str(v: unknown, max: number) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail', 'reason']) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (v && typeof v === 'object') {
        const nested = errorMessage(v);
        if (nested) return nested;
      }
    }
    try { return JSON.stringify(value); } catch { return 'Unknown Flaunch error'; }
  }
  return String(value ?? 'Unknown Flaunch error');
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Json;
    const name = str(body.name, 64);
    const symbol = str(body.symbol, 8);
    const description = str(body.description, 1000);
    const imageIpfs = str(body.imageIpfs, 1000);
    const creatorAddress = str(body.creatorAddress, 42);

    if (!name || !symbol || !description || !imageIpfs || !creatorAddress) {
      return NextResponse.json({ error: 'name, symbol, description, imageIpfs and creatorAddress are required.' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9]{1,8}$/.test(symbol)) {
      return NextResponse.json({ error: 'symbol must be 1-8 alphanumeric characters.' }, { status: 400 });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(creatorAddress)) {
      return NextResponse.json({ error: 'creatorAddress must be a valid EVM address.' }, { status: 400 });
    }

    const payload = { name, symbol, description, imageIpfs, creatorAddress };
    const upstream = await fetch(FLAUNCH_PREPARE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const text = await upstream.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch {}

    if (!upstream.ok) {
      const detail = parsed && typeof parsed === 'object'
        ? errorMessage((parsed as Record<string, unknown>).error ?? parsed)
        : text.trim();
      return NextResponse.json({ error: `Flaunch API ${upstream.status}: ${detail || 'request rejected'}` }, { status: upstream.status });
    }

    if (parsed && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>;
      if (p.supported === false || p.success === false) {
        return NextResponse.json({ error: `Flaunch rejected launch: ${errorMessage(p.error ?? p.reason ?? p)}` }, { status: 400 });
      }
      if (p.input && typeof p.input === 'object') return NextResponse.json(parsed);
    }

    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
