'use client';

import { useState } from 'react';

export default function XAutoComment() {
  const [postUrl, setPostUrl] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Siap. Masukkan link Post X dan komentar.');

  async function send() {
    if (!postUrl.trim()) return setStatus('Masukkan link Post X dulu.');
    if (!text.trim()) return setStatus('Isi komentar dulu.');
    if (text.trim().length > 280) return setStatus(`Komentar ${text.trim().length}/280 karakter.`);
    setBusy(true);
    setStatus('🚀 Mengirim komentar ke X…');
    try {
      const r = await fetch('/api/affiliate/x/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl, text: text.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'X menolak komentar.');
      setStatus(`Berhasil ✓ Post ID: ${d.postId}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Gagal mengirim komentar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 18px', fontFamily: 'system-ui' }}>
      <a href="/affiliate" style={{ opacity: .65 }}>← Affiliate Operator</a>
      <h1>𝕏 Auto Comment</h1>
      <p style={{ opacity: .65 }}>Kirim komentar melalui X API resmi. Token tidak pernah ditampilkan di browser.</p>

      <section style={{ border: '1px solid #ddd', borderRadius: 16, padding: 20 }}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: 7 }}>Link Post X</label>
        <input
          style={{ width: '100%', fontSize: 16, padding: 13, borderRadius: 10, border: '1px solid #ccc', boxSizing: 'border-box' }}
          placeholder="https://x.com/username/status/1234567890"
          value={postUrl}
          onChange={e => setPostUrl(e.target.value)}
        />

        <label style={{ display: 'block', fontWeight: 700, margin: '18px 0 7px' }}>Komentar</label>
        <textarea
          style={{ width: '100%', minHeight: 130, fontSize: 16, padding: 13, borderRadius: 10, border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
          maxLength={280}
          placeholder="Tulis komentar yang relevan…"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div style={{ fontSize: 12, opacity: .55, textAlign: 'right', marginTop: 5 }}>{text.length}/280</div>

        <button
          onClick={send}
          disabled={busy}
          style={{ marginTop: 14, padding: '13px 20px', borderRadius: 10, border: 0, fontWeight: 700 }}
        >
          {busy ? '⏳ Mengirim…' : '🚀 KOMEN OTOMATIS'}
        </button>
        <div style={{ marginTop: 14, opacity: .75 }}>{status}</div>
      </section>

      <section style={{ marginTop: 18, padding: 16, borderRadius: 14, background: '#f7f7f7', fontSize: 14 }}>
        <b>Catatan X API</b>
        <p style={{ marginBottom: 0 }}>Untuk akses self-serve, X saat ini membatasi reply API: akun yang kamu balas harus lebih dulu menyebut akunmu atau meng-quote salah satu post-mu. Thread/reply ke post milik akunmu sendiri tetap dapat digunakan.</p>
      </section>
    </main>
  );
}
