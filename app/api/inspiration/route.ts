import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MIN_VOLUME_USD = 1000;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const API = 'https://api.geckoterminal.com/api/v2/networks/new_pools';

export async function GET() {
  try {
    const pages = await Promise.all([1, 2, 3].map((page) =>
      fetch(`${API}?page=${page}&include=base_token,quote_token,network`, {
        headers: { accept: 'application/json' },
        next: { revalidate: 60 },
      }).then(async (response) => {
        if (!response.ok) throw new Error(`GeckoTerminal ${response.status}`);
        return response.json();
      }),
    ));

    const included = pages.flatMap((json: any) => Array.isArray(json?.included) ? json.included : []);
    const tokens = new Map(included.map((x: any) => [x.id, x]));
    const now = Date.now();
    const seen = new Set<string>();

    const inspirations = pages.flatMap((json: any) => Array.isArray(json?.data) ? json.data : [])
      .map((pool: any) => {
        const a = pool?.attributes ?? {};
        const created = Date.parse(a.pool_created_at ?? '');
        const volume24h = Number(a.volume_usd?.h24 ?? 0);
        const txns24h = Number(a.transactions?.h24?.buys ?? 0) + Number(a.transactions?.h24?.sells ?? 0);
        const baseId = pool?.relationships?.base_token?.data?.id;
        const base = tokens.get(baseId) as any;
        const tokenName = String(base?.attributes?.name ?? '').trim();
        const symbol = String(base?.attributes?.symbol ?? '').trim();
        const network = String(pool?.relationships?.network?.data?.id ?? pool?.id?.split('_')[0] ?? '').trim();
        const ageHours = created ? (now - created) / 3600000 : 999;
        return { name: tokenName, symbol, network, volume24h, txns24h, createdAt: a.pool_created_at, ageHours };
      })
      .filter((x: any) => {
        const key = `${x.name.toLowerCase()}|${x.symbol.toLowerCase()}|${x.network}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return x.name && x.name.length <= 60 && x.volume24h >= MIN_VOLUME_USD && x.createdAt && now - Date.parse(x.createdAt) <= MAX_AGE_MS;
      })
      .sort((a: any, b: any) => {
        const scoreA = a.volume24h * 0.75 + a.txns24h * 250;
        const scoreB = b.volume24h * 0.75 + b.txns24h * 250;
        return scoreB - scoreA;
      })
      .slice(0, 30);

    return NextResponse.json({
      ok: true,
      filters: { maxAgeHours: 72, minVolumeUsd: MIN_VOLUME_USD },
      count: inspirations.length,
      inspirations,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Inspiration feed unavailable', inspirations: [] }, { status: 502 });
  }
}
