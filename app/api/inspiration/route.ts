import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MIN_VOLUME_USD = 1000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const API = 'https://api.geckoterminal.com/api/v2/networks/new_pools?include=base_token,quote_token,network';

export async function GET() {
  try {
    const response = await fetch(API, { headers: { accept: 'application/json' }, next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`GeckoTerminal ${response.status}`);
    const json = await response.json();
    const included = Array.isArray(json?.included) ? json.included : [];
    const tokens = new Map(included.map((x: any) => [x.id, x]));
    const now = Date.now();

    const inspirations = (Array.isArray(json?.data) ? json.data : [])
      .map((pool: any) => {
        const a = pool?.attributes ?? {};
        const created = Date.parse(a.pool_created_at ?? '');
        const volume24h = Number(a.volume_usd?.h24 ?? 0);
        const baseId = pool?.relationships?.base_token?.data?.id;
        const base = tokens.get(baseId) as any;
        const tokenName = String(base?.attributes?.name ?? '').trim();
        const symbol = String(base?.attributes?.symbol ?? '').trim();
        const network = String(pool?.relationships?.network?.data?.id ?? pool?.id?.split('_')[0] ?? '').trim();
        return { name: tokenName, symbol, network, volume24h, createdAt: a.pool_created_at, ageHours: created ? (now - created) / 3600000 : 999 };
      })
      .filter((x: any) => x.name && x.name.length <= 60 && x.volume24h >= MIN_VOLUME_USD && x.createdAt && now - Date.parse(x.createdAt) <= MAX_AGE_MS)
      .sort((a: any, b: any) => b.volume24h - a.volume24h)
      .slice(0, 20);

    return NextResponse.json({ ok: true, filters: { maxAgeHours: 24, minVolumeUsd: MIN_VOLUME_USD }, count: inspirations.length, inspirations });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Inspiration feed unavailable', inspirations: [] }, { status: 502 });
  }
}
