import { NextResponse } from 'next/server';

type Product = {
  name: string;
  price?: number;
  commission?: number;
  category?: string;
  rating?: number;
  sales?: number;
  url: string;
};

function score(p: Product) {
  let s = 0;
  if ((p.commission ?? 0) >= 10) s += 30; else if ((p.commission ?? 0) >= 5) s += 20; else if ((p.commission ?? 0) > 0) s += 10;
  if ((p.price ?? 0) >= 50000 && (p.price ?? 0) <= 500000) s += 20;
  if ((p.rating ?? 0) >= 4.8) s += 20; else if ((p.rating ?? 0) >= 4.6) s += 15; else if ((p.rating ?? 0) >= 4.3) s += 8;
  if ((p.sales ?? 0) >= 1000) s += 20; else if ((p.sales ?? 0) >= 100) s += 12;
  if ((p.category ?? '').length > 0) s += 10;
  return Math.min(100, s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const products: Product[] = Array.isArray(body?.products) ? body.products : [];
    const ranked = products
      .filter((p) => p?.name && p?.url)
      .map((p) => ({ ...p, score: score(p) }))
      .sort((a, b) => b.score - a.score);
    return NextResponse.json({
      mode: 'affiliate-product-hunter',
      count: ranked.length,
      winners: ranked.filter((p) => p.score >= 60).slice(0, 20),
      ranked: ranked.slice(0, 50),
      note: 'Hunter menerima kandidat produk dari sumber resmi/API atau import CSV. Tidak melakukan scraping login/private data.'
    });
  } catch {
    return NextResponse.json({ error: 'Payload produk tidak valid.' }, { status: 400 });
  }
}
