import { NextResponse } from 'next/server';

function clean(v: unknown, max = 500) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/gi, "'");
}

function meta(html: string, key: string) {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i'));
  return clean(decodeHtml(a?.[1] || b?.[1] || ''));
}

function jsonLd(html: string) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data, ...(Array.isArray(data?.['@graph']) ? data['@graph'] : [])];
      const product = items.find((x: any) => String(x?.['@type'] || '').toLowerCase() === 'product');
      if (product) return product;
    } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') return NextResponse.json({ error: 'Link produk wajib diisi.' }, { status: 400 });
    let input: URL;
    try { input = new URL(url.trim()); } catch { return NextResponse.json({ error: 'Link tidak valid.' }, { status: 400 }); }
    if (!['http:', 'https:'].includes(input.protocol)) return NextResponse.json({ error: 'Link harus HTTP/HTTPS.' }, { status: 400 });

    const r = await fetch(input.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AffiliateProductResolver/1.0)' },
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    });
    if (!r.ok) return NextResponse.json({ error: `Halaman produk tidak bisa dibaca (${r.status}). Coba buka link di browser dan gunakan link affiliate yang bisa diakses publik.` }, { status: 422 });
    const html = (await r.text()).slice(0, 2_500_000);
    const product = jsonLd(html);
    const name = clean(product?.name) || meta(html, 'og:title') || meta(html, 'twitter:title') || clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, ''));
    const description = clean(product?.description, 700) || meta(html, 'og:description') || meta(html, 'description');
    const price = clean(product?.offers?.price || (Array.isArray(product?.offers) ? product.offers[0]?.price : ''));
    const currency = clean(product?.offers?.priceCurrency || (Array.isArray(product?.offers) ? product.offers[0]?.priceCurrency : ''));
    const rating = clean(product?.aggregateRating?.ratingValue);
    const image = clean(product?.image || meta(html, 'og:image'), 1000);
    const finalUrl = r.url || input.toString();

    if (!name) return NextResponse.json({ error: 'Nama produk tidak terbaca dari halaman. Link masih bisa dipakai, tetapi isi nama produk manual.' }, { status: 422 });
    return NextResponse.json({
      ok: true,
      product: {
        name,
        url: finalUrl,
        price: price ? `${currency && currency !== 'IDR' ? `${currency} ` : 'Rp '}${price}` : '',
        rating,
        problem: description,
        niche: 'barang viral',
        commission: '',
        image,
        source: input.hostname,
        resolvedAt: new Date().toISOString(),
      },
      note: 'Data hanya diambil dari metadata/markup halaman publik; kolom yang tidak tersedia dibiarkan kosong.',
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal membaca link produk.' }, { status: 500 });
  }
}
