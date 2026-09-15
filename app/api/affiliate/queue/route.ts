import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_REPO_OWNER || 'ilhamrafli2';
const repo = process.env.GITHUB_REPO_NAME || 'b20-ai-launcher';
const branch = process.env.GITHUB_REPO_BRANCH || 'main';
const path = 'data/affiliate-queue.json';
const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

async function getFile() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN belum dikonfigurasi.');
  const r = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  if (!r.ok) throw new Error(`GitHub read ${r.status}`);
  const data = await r.json();
  const text = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
  return { sha: data.sha, items: JSON.parse(text || '[]') };
}

export async function GET() {
  try { const { items } = await getFile(); return NextResponse.json({ items }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Queue unavailable' }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '');
    const status = String(body?.status || '');
    if (!id || !['ready_for_review', 'approved', 'rejected', 'published'].includes(status)) return NextResponse.json({ error: 'id/status tidak valid.' }, { status: 400 });
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN belum dikonfigurasi.');
    const current = await getFile();
    const items = current.items.map((x: any) => x.id === id ? { ...x, status, updatedAt: new Date().toISOString() } : x);
    const content = Buffer.from(JSON.stringify(items, null, 2) + '\n').toString('base64');
    const r = await fetch(api, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `chore: ${status} affiliate item ${id}`, content, sha: current.sha, branch }) });
    if (!r.ok) throw new Error(`GitHub write ${r.status}`);
    return NextResponse.json({ ok: true, status });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Queue update failed' }, { status: 500 }); }
}
