import { NextResponse } from 'next/server';

const angles = [
  ['Awalnya nggak nyangka', 'Awalnya gue kira barang ini biasa aja, ternyata kepake banget.'],
  ['Temuan murah', 'Nemunya pas lagi iseng scroll. Harganya masih masuk akal, tapi manfaatnya ternyata lumayan.'],
  ['Masalah → solusi', 'Kalau kamu sering punya masalah soal ini, barang kecil ini bisa jadi solusi yang simpel.'],
  ['POV', 'POV: kamu akhirnya nemu barang yang dari kemarin dicari-cari.'],
  ['Rekomendasi', 'Kalau lagi cari barang seperti ini, ini salah satu yang layak masuk wishlist.'],
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p = body?.product;
    if (!p?.name || !p?.url) return NextResponse.json({ error: 'Nama produk dan link wajib diisi.' }, { status: 400 });
    const drafts = angles.map(([hook, base], i) => ({
      hook: `${hook}: ${p.name}`,
      caption: `${base} ${p.price ? `Harga sekitar ${p.price}. ` : ''}${p.commission ? `Potensi komisi: ${p.commission}. ` : ''}Kalau memang lagi butuh, cek detail dan review pembelinya dulu sebelum checkout.`,
      cta: `🔗 Cek produknya: ${p.url}`,
      score: 86 - i * 3,
    }));
    return NextResponse.json({ drafts, mode: 'free-local-agent' });
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }
}
