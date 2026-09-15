import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_REPO_OWNER || 'ilhamrafli2';
const repo = process.env.GITHUB_REPO_NAME || 'b20-ai-launcher';
const branch = process.env.GITHUB_REPO_BRANCH || 'main';
const path = 'data/affiliate-products.json';
const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
const headers = () => ({ Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' });

async function getFile() {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN belum dikonfigurasi.');
  const r = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers: headers(), cache: 'no-store' });
  if (!r.ok) throw new Error(`GitHub read ${r.status}`);
  const data = await r.json();
  const text = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { sha: data.sha, items: JSON.parse(text || '[]') };
}

async function save(items: any[], sha: string, message: string) {
  const content = Buffer.from(JSON.stringify(items.slice(-500), null, 2) + '\n').toString('base64');
  const r = await fetch(api, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ message, content, sha, branch }) });
  if (!r.ok) throw new Error(`GitHub write ${r.status}`);
}

export async function GET() {
  try { const { items } = await getFile(); return NextResponse.json({ items }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Catalog unavailable' }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const p = body?.product;
    if (!p?.name || !p?.url) return NextResponse.json({ error: 'Nama produk dan link affiliate wajib diisi.' }, { status: 400 });
    const current = await getFile();
    const item = { ...p, id: p.id || `product-${Date.now()}`, updatedAt: new Date().toISOString() };
    const items = [item, ...current.items.filter((x: any) => x.id !== item.id && x.url !== item.url)];
    await save(items, current.sha, `chore: add affiliate product ${item.id}`);
    return NextResponse.json({ ok: true, item });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Catalog update failed' }, { status: 500 }); }
}
