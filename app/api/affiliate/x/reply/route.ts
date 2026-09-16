import { NextResponse } from 'next/server';

function extractPostId(input: string) {
  const value = input.trim();
  if (/^\d{8,30}$/.test(value)) return value;
  try {
    const u = new URL(value);
    const match = u.pathname.match(/(?:status|statuses)\/(\d{8,30})/i);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

export async function POST(req: Request) {
  const token = process.env.X_USER_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'X belum terhubung. Tambahkan X_USER_ACCESS_TOKEN di environment Vercel.' }, { status: 503 });
  }

  try {
    const { postUrl, text } = await req.json();
    const postId = extractPostId(String(postUrl || ''));
    const replyText = String(text || '').trim();

    if (!postId) return NextResponse.json({ error: 'Link Post X tidak valid. Gunakan URL x.com/.../status/ID.' }, { status: 400 });
    if (!replyText) return NextResponse.json({ error: 'Isi komentar belum ada.' }, { status: 400 });
    if (replyText.length > 280) return NextResponse.json({ error: `Komentar terlalu panjang (${replyText.length}/280 karakter).` }, { status: 400 });

    const r = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: replyText,
        reply: { in_reply_to_tweet_id: postId },
      }),
      cache: 'no-store',
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const detail = data?.detail || data?.title || data?.errors?.[0]?.message || 'X menolak komentar.';
      return NextResponse.json({ error: detail, x: data }, { status: r.status });
    }

    return NextResponse.json({ ok: true, postId: data?.data?.id || '', text: data?.data?.text || replyText });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal mengirim komentar ke X.' }, { status: 500 });
  }
}
