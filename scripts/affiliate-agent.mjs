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

function localDrafts(p) {
  const price = p.price ? ` sekitar ${p.price}` : '';
  const proof = p.rating ? ` Rating ${p.rating}.` : '';
  return [
    { angle: 'Masalah → solusi', hook: `Kalau kamu sering ${p.problem || 'punya masalah ini'}, coba lihat ${p.name}.`, body: `Kalau masalahnya memang kamu alami, ini bisa jadi solusi simpel${price}.${proof}` },
    { angle: 'Temuan murah', hook: `Nemunya pas lagi scroll: ${p.name}.`, body: `Yang menarik adalah fungsi yang ditawarkannya. Cek detail dan review dulu sebelum beli.` },
    { angle: 'POV', hook: `POV: akhirnya nemu ${p.name} yang sesuai kebutuhan.`, body: `Kalau memang lagi cari kategori ini, masukin wishlist dulu lalu bandingkan.` },
    { angle: 'Rekomendasi', hook: `${p.name} masuk daftar yang layak dicek.`, body: `Terutama kalau kamu cari produk di kisaran harga${price || ' yang terjangkau'}.` },
    { angle: 'Soft sell', hook: `Simpan dulu kalau belum butuh sekarang.`, body: `${p.name} bisa jadi berguna saat kamu memang membutuhkan kategori ini. Jangan checkout hanya karena FOMO.` },
  ].map((d, i) => ({ ...d, caption: `${d.body} #affiliate`, cta: `Cek produk: ${p.url}`, score: Math.max(70, scoreProduct(p) - i * 2) }));
}

async function aiDrafts(p) {
  const key = process.env.AI_API_KEY;
  if (!key) return null;
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const prompt = `Buat JSON object dengan key drafts berisi tepat 5 draft affiliate berbahasa Indonesia. Tiap item: angle, hook, caption, cta, score. Jangan mengarang klaim, diskon, rating, penjualan, pengalaman pribadi, atau hasil. Caption natural, singkat, anti-spam, dan sertakan disclosure bahwa link adalah link affiliate. Produk: ${JSON.stringify(p)}`;
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.8, messages: [
      { role: 'system', content: 'Kamu editor affiliate Indonesia yang jujur dan anti-clickbait.' },
      { role: 'user', content: prompt },
    ], response_format: { type: 'json_object' } }),
  });
  if (!r.ok) throw new Error(`AI provider ${r.status}`);
  const data = await r.json();
  const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
  if (!Array.isArray(parsed.drafts)) throw new Error('Invalid AI output');
  return parsed.drafts.slice(0, 5);
}

const products = readJson(PRODUCTS, []);
const existing = readJson(QUEUE, []);
const generated = [];

for (const p of products.filter(p => p?.name && p?.url)) {
  let drafts = null;
  try { drafts = await aiDrafts(p); } catch (e) { console.log(`AI fallback for ${p.name}: ${e.message}`); }
  drafts ||= localDrafts(p);
  generated.push({
    id: `${p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    status: 'ready_for_review',
    product: p,
    productScore: scoreProduct(p),
    mode: process.env.AI_API_KEY ? 'ai-provider-or-fallback' : 'free-local-agent',
    drafts,
  });
}

const output = [...existing, ...generated].slice(-100);
fs.writeFileSync(QUEUE, JSON.stringify(output, null, 2) + '\n');
console.log(`Affiliate agent processed ${generated.length} product(s).`);
