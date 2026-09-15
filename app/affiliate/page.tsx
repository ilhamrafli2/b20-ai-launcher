'use client';

import { useState } from 'react';

type Draft = { hook: string; caption: string; cta: string; score: number };
type Product = { name: string; price?: string; commission?: string; url: string; niche?: string };

export default function AffiliateAgent() {
  const [product, setProduct] = useState<Product>({ name: '', price: '', commission: '', url: '', niche: 'barang viral' });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready');

  async function generate() {
    if (!product.name || !product.url) return setStatus('Isi nama produk dan link affiliate dulu.');
    setBusy(true); setStatus('Agent sedang membuat variasi konten…');
    try {
      const r = await fetch('/api/affiliate/generate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ product }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gagal membuat konten');
      setDrafts(d.drafts || []); setStatus(`Selesai · ${d.drafts?.length || 0} draft dibuat`);
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Gagal'); }
    finally { setBusy(false); }
  }

  return <main style={{maxWidth:1100,margin:'40px auto',padding:20,fontFamily:'system-ui'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div><div style={{fontSize:12,letterSpacing:2,opacity:.6}}>FREE · AFFILIATE AGENT</div><h1 style={{margin:'6px 0'}}>Affiliate Agent</h1><p style={{opacity:.7}}>Product → AI-style content engine → approval queue.</p></div>
      <a href="/" style={{opacity:.7}}>← B20 Launcher</a>
    </div>
    <section style={{border:'1px solid #ddd',borderRadius:16,padding:20,marginTop:20}}>
      <h2>1. Masukkan produk</h2>
      <div style={{display:'grid',gap:10,gridTemplateColumns:'2fr 1fr 1fr'}}>
        <input placeholder="Nama produk" value={product.name} onChange={e=>setProduct({...product,name:e.target.value})} />
        <input placeholder="Harga" value={product.price} onChange={e=>setProduct({...product,price:e.target.value})} />
        <input placeholder="Komisi" value={product.commission} onChange={e=>setProduct({...product,commission:e.target.value})} />
      </div>
      <input style={{width:'100%',marginTop:10}} placeholder="Link affiliate" value={product.url} onChange={e=>setProduct({...product,url:e.target.value})} />
      <input style={{width:'100%',marginTop:10}} placeholder="Niche" value={product.niche} onChange={e=>setProduct({...product,niche:e.target.value})} />
      <button onClick={generate} disabled={busy} style={{marginTop:14,padding:'12px 18px',borderRadius:10,border:0,cursor:'pointer'}}>{busy?'⚙️ Agent bekerja…':'🤖 Generate 5 Variasi'}</button>
      <span style={{marginLeft:12,opacity:.65}}>{status}</span>
    </section>
    {drafts.length>0 && <section style={{marginTop:20}}><h2>2. Approval Queue</h2><div style={{display:'grid',gap:12}}>{drafts.map((d,i)=><article key={i} style={{border:'1px solid #ddd',borderRadius:14,padding:16}}><div style={{display:'flex',justifyContent:'space-between'}}><b>#{i+1} · Score {d.score}/100</b><button onClick={()=>navigator.clipboard?.writeText(`${d.hook}\n\n${d.caption}\n\n${d.cta}\n${product.url}`)}>Copy</button></div><p><b>{d.hook}</b></p><p style={{whiteSpace:'pre-wrap'}}>{d.caption}</p><p>{d.cta}</p></article>)}</div></section>}
    <p style={{marginTop:25,fontSize:13,opacity:.6}}>V1 sengaja tidak auto-post. Gunakan API resmi platform saat integrasi distribusi ditambahkan; jangan simpan password atau private key.</p>
  </main>;
}
