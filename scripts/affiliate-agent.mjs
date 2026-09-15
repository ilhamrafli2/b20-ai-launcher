import fs from 'node:fs';

const PRODUCTS = 'data/affiliate-products.json';
const QUEUE = 'data/affiliate-queue.json';

const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};

const money = (value) => {
  const n = Number(String(value ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function scoreProduct(p) {
  const price = money(p.price);
  const commission = money(p.commissionPercent ?? p.commission);
  const niche = String(p.niche ?? '').toLowerCase();
  let score = 45;
  if (commission >= 10) score += 22;
  else if (commission >= 7) score += 16;
  else if (commission >= 5) score += 10;
  if (price >= 30000 && price <= 500000) score += 12;
  else if (price > 0 && price < 30000) score += 5;
  if (/(rumah|dapur|kamar|organizer|aksesoris|fashion|kecantikan|elektronik|hp|laptop|motor)/.test(niche)) score += 8;
  if (p.problem) score += 5;
  if (p.proof || p.rating) score += 4;
  return Math.min(99, score);
}

function makeDrafts(p) {
  const name = p.name;
  const price = p.price ? ` sekitar ${p.price}` : '';
  const proof = p.rating ? ` Rating ${p.rating}.` : '';
  const link = p.url;
  return [
    { angle: 'Masalah → solusi', hook: `Kalau kamu sering ${p.problem || 'punya masalah ini'}, coba lihat ${name}.`, body: `Bukan barang wajib buat semua orang, tapi kalau masalahnya memang kamu alami, ini bisa jadi solusi simpel${price}.${proof}` },
    { angle: 'Temuan murah', hook: `Nemunya pas lagi scroll: ${name}.`, body: `Yang menarik bukan cuma harganya, tapi fungsi yang ditawarkannya. Cek detail dan review dulu sebelum beli.` },
    { angle: 'POV', hook: `POV: akhirnya nemu ${name} yang sesuai kebutuhan.`, body: `Kalau memang lagi cari kategori ini, masukin wishlist dulu lalu bandingkan dengan produk lain.` },
    { angle: 'Rekomendasi', hook: `${name} masuk daftar yang layak dicek.`, body: `Terutama kalau kamu cari produk di kisaran harga${price || ' yang terjangkau'}.` },
    { angle: 'Soft sell', hook: `Simpan dulu kalau belum butuh sekarang.`, body: `${name} bisa jadi berguna saat kamu memang membutuhkan kategori ini. Jangan checkout hanya karena FOMO.` },
  ].map((d, i) => ({
    ...d,
    cta: `Cek produk: ${link}`,
    score: Math.max(70, scoreProduct(p) - i * 2),
  }));
}

const products = readJson(PRODUCTS, []);
const existing = readJson(QUEUE, []);
const generated = products
  .filter(p => p?.name && p?.url)
  .map(p => ({
    id: p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    generatedAt: new Date().toISOString(),
    status: 'ready_for_review',
    product: p,
    productScore: scoreProduct(p),
    drafts: makeDrafts(p),
  }));

const output = [...existing, ...generated].slice(-100);
fs.writeFileSync(QUEUE, JSON.stringify(output, null, 2) + '\n');
console.log(`Affiliate agent processed ${generated.length} product(s).`);
