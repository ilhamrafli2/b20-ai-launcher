import { NextResponse } from 'next/server';

const owner = process.env.GITHUB_REPO_OWNER || 'ilhamrafli2';
const repo = process.env.GITHUB_REPO_NAME || 'b20-ai-launcher';
const branch = process.env.GITHUB_REPO_BRANCH || 'main';
const path = 'data/affiliate-queue.json';
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
  const content = Buffer.from(JSON.stringify(items.slice(-200), null, 2) + '\n').toString('base64');
  const r = await fetch(api, { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ message, content, sha, branch }) });
  if (!r.ok) throw new Error(`GitHub write ${r.status}`);
}

export async function GET() {
  try { const { items } = await getFile(); return NextResponse.json({ items }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Queue unavailable' }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = await getFile();
    if (body?.create) {
      const item = body.create;
      if (!item?.id || !item?.product?.name || !Array.isArray(item?.drafts)) return NextResponse.json({ error: 'Queue item tidak valid.' }, { status: 400 });
      const items = [item, ...current.items.filter((x: any) => x.id !== item.id)];
      await save(items, current.sha, `chore: add affiliate item ${item.id}`);
      return NextResponse.json({ ok: true, item });
    }
    const id = String(body?.id || ''); const status = String(body?.status || '');
    if (!id || !['ready_for_review', 'approved', 'rejected', 'published'].includes(status)) return NextResponse.json({ error: 'id/status tidak valid.' }, { status: 400 });
    const items = current.items.map((x: any) => x.id === id ? { ...x, status, updatedAt: new Date().toISOString() } : x);
    await save(items, current.sha, `chore: ${status} affiliate item ${id}`);
    return NextResponse.json({ ok: true, status });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Queue update failed' }, { status: 500 }); }
}
