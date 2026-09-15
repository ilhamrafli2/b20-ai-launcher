import { NextResponse } from 'next/server';

const angles = [
  ['Awalnya nggak nyangka', 'Awalnya gue kira barang ini biasa aja, ternyata kepake banget.'],
  ['Temuan murah', 'Nemunya pas lagi iseng scroll. Harganya masih masuk akal, tapi manfaatnya ternyata lumayan.'],
  ['Masalah → solusi', 'Kalau kamu sering punya masalah soal ini, barang kecil ini bisa jadi solusi yang simpel.'],
  ['POV', 'POV: kamu akhirnya nemu barang yang dari kemarin dicari-cari.'],
  ['Rekomendasi', 'Kalau lagi cari barang seperti ini, ini salah satu yang layak masuk wishlist.'],
];

function localDrafts(p: any) {
  return angles.map(([hook, base], i) => ({
    hook: `${hook}: ${p.name}`,
    caption: `${base} ${p.price ? `Harga sekitar ${p.price}. ` : ''}${p.commission ? `Potensi komisi: ${p.commission}. ` : ''}Kalau memang lagi butuh, cek detail dan review pembelinya dulu sebelum checkout.`,
    cta: `🔗 Cek produknya: ${p.url}`,
    score: 86 - i * 3,
  }));
}

async function aiDrafts(p: any) {
  const key = process.env.AI_API_KEY;
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  if (!key) return null;

  const prompt = `Buat 5 draft konten affiliate Indonesia untuk produk berikut. Jangan mengarang klaim, rating, diskon, hasil, atau pengalaman pribadi. Gunakan bahasa natural, tidak norak, tidak spam. Setiap draft harus punya angle, hook, caption, CTA, score (0-100). Sertakan disclosure singkat bahwa link adalah link affiliate. Produk: ${JSON.stringify(p)}`;
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      messages: [
        { role: 'system', content: 'Kamu adalah editor affiliate yang jujur dan anti-clickbait.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) throw new Error(`AI provider error ${r.status}`);
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed?.drafts)) throw new Error('Format AI tidak valid');
  return parsed.drafts.slice(0, 5).map((d: any) => ({
    hook: String(d.hook || ''),
    caption: String(d.caption || ''),
    cta: String(d.cta || `🔗 Cek produknya: ${p.url}`),
    score: Math.max(0, Math.min(100, Number(d.score) || 70)),
  }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p = body?.product;
    if (!p?.name || !p?.url) return NextResponse.json({ error: 'Nama produk dan link wajib diisi.' }, { status: 400 });

    try {
      const drafts = await aiDrafts(p);
      if (drafts) return NextResponse.json({ drafts, mode: 'ai-provider' });
    } catch {
      // Graceful fallback keeps the free/local version usable when the provider is absent or fails.
    }

    return NextResponse.json({ drafts: localDrafts(p), mode: 'free-local-agent' });
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }
}
