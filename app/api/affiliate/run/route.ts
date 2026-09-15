import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_REPO_OWNER || 'ilhamrafli2';
const repo = process.env.GITHUB_REPO_NAME || 'b20-ai-launcher';
const branch = process.env.GITHUB_REPO_BRANCH || 'main';
const productsPath = 'data/affiliate-products.json';
const queuePath = 'data/affiliate-queue.json';
const gh = (path: string) => `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
const headers = () => ({ Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' });

async function read(path: string) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN belum dikonfigurasi.');
  const r = await fetch(`${gh(path)}?ref=${encodeURIComponent(branch)}`, { headers: headers(), cache: 'no-store' });
  if (!r.ok) throw new Error(`GitHub read ${path}: ${r.status}`);
  const data = await r.json();
  return { sha: data.sha, items: JSON.parse(Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8') || '[]') };
}

async function write(path: string, items: any[], sha: string, message: string) {
  const content = Buffer.from(JSON.stringify(items.slice(-200), null, 2) + '\n').toString('base64');
  const r = await fetch(gh(path), { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ message, content, sha, branch }) });
  if (!r.ok) throw new Error(`GitHub write ${path}: ${r.status}`);
}

const money = (v: any) => Number(String(v ?? '').replace(/[^0-9]/g, '')) || 0;
function score(p: any) {
  const price = money(p.price), commission = money(p.commissionPercent ?? p.commission);
  let s = 45;
  if (commission >= 10) s += 22; else if (commission >= 7) s += 16; else if (commission >= 5) s += 10;
  if (price >= 30000 && price <= 500000) s += 12; else if (price > 0 && price < 30000) s += 5;
  if (/(rumah|dapur|kamar|organizer|aksesoris|fashion|kecantikan|elektronik|hp|laptop|motor)/i.test(String(p.niche || ''))) s += 8;
  if (p.problem) s += 5; if (p.proof || p.rating) s += 4;
  return Math.min(99, s);
}

function localDrafts(p: any) {
  const s = score(p), price = p.price ? ` sekitar ${p.price}` : '';
  return [
    ['Masalah → solusi', `Kalau kamu sering ${p.problem || 'punya masalah ini'}, coba lihat ${p.name}.`, `Kalau masalahnya memang kamu alami, ini bisa jadi solusi simpel${price}. Cek detail dan review sebelum beli.`],
    ['Temuan murah', `Nemunya pas lagi scroll: ${p.name}.`, `Yang menarik adalah fungsi yang ditawarkannya. Bandingkan harga dan review dulu sebelum checkout.`],
    ['POV', `POV: akhirnya nemu ${p.name} yang sesuai kebutuhan.`, `Kalau memang lagi cari kategori ini, simpan dulu dan cek apakah benar sesuai kebutuhanmu.`],
    ['Rekomendasi', `${p.name} masuk daftar yang layak dicek.`, `Terutama kalau kamu sedang mencari produk di kisaran harga${price || ' yang terjangkau'}.`],
    ['Soft sell', `Simpan dulu kalau belum butuh sekarang.`, `${p.name} bisa berguna saat memang dibutuhkan. Jangan checkout hanya karena FOMO.`],
  ].map(([angle, hook, caption], i) => ({ angle, hook, caption: `${caption} Disclosure: link ini adalah link affiliate.`, cta: `Cek produk: ${p.url}`, score: Math.max(70, s - i * 2) }));
}

async function aiDrafts(p: any) {
  const key = process.env.AI_API_KEY; if (!key) return null;
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const r = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, temperature: 0.8, messages: [{ role: 'system', content: 'Kamu editor affiliate Indonesia yang jujur, natural, anti-spam dan anti-clickbait.' }, { role: 'user', content: `Buat JSON object dengan key drafts berisi tepat 5 draft affiliate. Tiap item: angle, hook, caption, cta, score. Jangan mengarang klaim, diskon, rating, penjualan, pengalaman pribadi, atau hasil. Sertakan disclosure link affiliate. Produk: ${JSON.stringify(p)}` }], response_format: { type: 'json_object' } }) });
  if (!r.ok) throw new Error(`AI provider ${r.status}`);
  const data = await r.json(), parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
  return Array.isArray(parsed.drafts) ? parsed.drafts.slice(0, 5) : null;
}

export async function POST() {
  try {
    const catalog = await read(productsPath), queue = await read(queuePath);
    const candidates = catalog.items.filter((p: any) => p?.name && p?.url).map((p: any) => ({ p, score: score(p) })).filter((x: any) => x.score >= 60).sort((a: any, b: any) => b.score - a.score);
    const existingUrls = new Set(queue.items.map((x: any) => x?.product?.url));
    const generated: any[] = [];
    for (const c of candidates) {
      if (existingUrls.has(c.p.url)) continue;
      let drafts = null; try { drafts = await aiDrafts(c.p); } catch {}
      drafts ||= localDrafts(c.p);
      generated.push({ id: `agent-${Date.now()}-${generated.length}`, generatedAt: new Date().toISOString(), status: 'ready_for_review', product: c.p, productScore: c.score, mode: process.env.AI_API_KEY ? 'ai-provider-or-fallback' : 'free-local-agent', drafts });
    }
    if (generated.length) await write(queuePath, [...queue.items, ...generated], queue.sha, `chore: agent generated ${generated.length} affiliate item(s)`);
    return NextResponse.json({ ok: true, candidates: candidates.length, generated: generated.length, skippedExisting: candidates.length - generated.length });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Agent gagal berjalan.' }, { status: 500 }); }
}
