import { NextResponse } from 'next/server';

function clean(v: unknown, max = 500) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/');
}

function meta(html: string, key: string) {
  const wanted = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (name && new RegExp(`^${wanted}$`, 'i').test(name) && content) return clean(decodeHtml(content));
  }
  return '';
}

function jsonLd(html: string) {
  const blocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1]);
      const roots = Array.isArray(data) ? data : [data];
      const items = roots.flatMap((x: any) => [x, ...(Array.isArray(x?.['@graph']) ? x['@graph'] : [])]);
      const product = items.find((x: any) => {
        const type = x?.['@type'];
        return Array.isArray(type) ? type.some((t) => String(t).toLowerCase() === 'product') : String(type || '').toLowerCase() === 'product';
      });
      if (product) return product;
    } catch {}
  }
  return null;
}

function titleFromUrl(url: string) {
  try {
    const u = new URL(url);
    const parts = decodeURIComponent(u.pathname).split('/').filter(Boolean);
    const slug = parts.find((x) => /-i\.\d+\.\d+/.test(x)) || parts.at(-1) || '';
    const beforeId = slug.replace(/-i\.\d+\.\d+.*$/i, '');
    if (!beforeId || /^\d+$/.test(beforeId)) return '';
    return clean(beforeId.replace(/[-_]+/g, ' '));
  } catch {
    return '';
  }
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
    if (!r.ok) return NextResponse.json({
      error: `Halaman produk tidak bisa dibaca (${r.status}). Coba gunakan link produk lengkap atau isi nama produk manual.`,
      canContinue: true,
      finalUrl: r.url || input.toString(),
    }, { status: 422 });

    const html = (await r.text()).slice(0, 2_500_000);
    const product = jsonLd(html);
    const pageTitle = clean(decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, '')));
    const name = clean(product?.name) || meta(html, 'og:title') || meta(html, 'twitter:title') || pageTitle || titleFromUrl(r.url || input.toString());
    const description = clean(product?.description, 700) || meta(html, 'og:description') || meta(html, 'description');
    const offers = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
    const price = clean(offers?.price);
    const currency = clean(offers?.priceCurrency);
    const rating = clean(product?.aggregateRating?.ratingValue);
    const image = clean(Array.isArray(product?.image) ? product.image[0] : product?.image || meta(html, 'og:image'), 1000);
    const finalUrl = r.url || input.toString();

    if (!name) return NextResponse.json({
      error: 'Metadata produk tidak tersedia dari link ini. Masukkan nama produk secara manual untuk lanjut.',
      canContinue: true,
      finalUrl,
      product: { name: '', url: finalUrl, source: input.hostname },
    }, { status: 422 });

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
