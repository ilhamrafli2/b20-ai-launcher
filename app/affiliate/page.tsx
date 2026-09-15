'use client';

import { useEffect, useState } from 'react';
type Draft={angle?:string;hook:string;caption:string;cta:string;score:number};
type Product={id?:string;name:string;price?:string;commission?:string;url:string;niche?:string;problem?:string;rating?:string;image?:string;source?:string};
type QueueItem={id:string;status:string;product:Product;productScore:number;drafts:Draft[]};

export default function AffiliateAgent(){
 const [product,setProduct]=useState<Product>({name:'',price:'',commission:'',url:'',niche:'barang viral',problem:'',rating:''});
 const [drafts,setDrafts]=useState<Draft[]>([]); const [busy,setBusy]=useState(false); const [status,setStatus]=useState('Paste link produk untuk mulai.'); const [tab,setTab]=useState<'generator'|'queue'|'catalog'>('generator'); const [queue,setQueue]=useState<QueueItem[]>([]); const [catalog,setCatalog]=useState<Product[]>([]);
 async function loadQueue(){try{const r=await fetch('/api/affiliate/queue',{cache:'no-store'});const d=await r.json();if(r.ok)setQueue(d.items||[]);}catch{}}
 async function loadCatalog(){try{const r=await fetch('/api/affiliate/products',{cache:'no-store'});const d=await r.json();if(r.ok)setCatalog(d.items||[]);}catch{}}
 useEffect(()=>{loadQueue();loadCatalog()},[]);
 async function generateFor(p:Product){
  const r=await fetch('/api/affiliate/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:p})});
  const d=await r.json(); if(!r.ok)throw new Error(d.error||'Gagal membuat konten');
  setDrafts(d.drafts||[]); return d;
 }
 async function analyzeAndGenerate(){
  const url=product.url.trim(); if(!url)return setStatus('Paste link Shopee dulu.');
  setBusy(true); setDrafts([]); setStatus('🔎 Membaca link produk…');
  try{
   const rr=await fetch('/api/affiliate/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
   const rd=await rr.json();
   if(!rr.ok){
    if(rd.canContinue){
      setProduct(p=>({...p,url:rd.finalUrl||url,name:p.name||rd.product?.name||''}));
      setStatus('⚠️ Link tidak memberi metadata produk. Isi nama produk di kolom di bawah, lalu klik GENERATE 5.');
      return;
    }
    throw new Error(rd.error||'Link produk tidak bisa dibaca');
   }
   const resolved={...rd.product,url};
   setProduct(resolved);
   setStatus('🤖 Data ketemu. AI sedang membuat 5 konten…');
   const gd=await generateFor(resolved);
   try{await fetch('/api/affiliate/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:resolved})});await loadCatalog();}catch{}
   setStatus(`Selesai ✓ ${gd.drafts?.length||0} konten dibuat · ${gd.mode}`);
  }catch(e){setStatus(e instanceof Error?e.message:'Gagal memproses link');}finally{setBusy(false)}
 }
 async function manualGenerate(){
  if(!product.url.trim())return setStatus('Paste link produk dulu.');
  if(!product.name.trim())return setStatus('Isi nama produk dulu supaya AI bisa membuat konten yang relevan.');
  setBusy(true);setDrafts([]);setStatus('🤖 Membuat 5 konten dari data manual…');
  try{
   const p={...product,url:product.url.trim(),name:product.name.trim()};
   const gd=await generateFor(p);
   try{await fetch('/api/affiliate/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:p})});await loadCatalog();}catch{}
   setStatus(`Selesai ✓ ${gd.drafts?.length||0} konten dibuat · ${gd.mode}`);
  }catch(e){setStatus(e instanceof Error?e.message:'Gagal membuat konten');}finally{setBusy(false)}
 }
 async function runAgent(){setBusy(true);setStatus('🤖 Agent menilai catalog dan membuat konten…');try{const r=await fetch('/api/affiliate/run',{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Agent gagal');await loadQueue();setTab('queue');setStatus(`Agent selesai · ${d.generated} produk baru masuk queue`)}catch(e){setStatus(e instanceof Error?e.message:'Agent gagal')}finally{setBusy(false)}}
 async function saveProduct(){if(!product.name||!product.url)return setStatus('Link produk belum diisi.');setBusy(true);try{const r=await fetch('/api/affiliate/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Gagal');await loadCatalog();setStatus('Produk tersimpan ✓')}catch(e){setStatus(e instanceof Error?e.message:'Gagal')}finally{setBusy(false)}}
 function copy(d:Draft){navigator.clipboard?.writeText(`${d.hook}\n\n${d.caption}\n\n${d.cta}`);setStatus('Konten disalin ✓')}
 async function addQueue(){if(!drafts.length)return;setBusy(true);try{const item={id:`manual-${Date.now()}`,status:'ready_for_review',product,drafts,productScore:Math.max(...drafts.map(x=>x.score))};const r=await fetch('/api/affiliate/queue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({create:item})});if(!r.ok){const d=await r.json();throw new Error(d.error||'Gagal menyimpan queue')}setQueue(q=>[item,...q]);setTab('queue');setStatus('Masuk approval queue ✓')}catch(e){setStatus(e instanceof Error?e.message:'Gagal')}finally{setBusy(false)}}
 async function setItemStatus(id:string,status:string){try{const r=await fetch('/api/affiliate/queue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});if(!r.ok){const d=await r.json();throw new Error(d.error||'Gagal update')}setQueue(q=>q.map(x=>x.id===id?{...x,status}:x));setStatus(`${status} ✓`)}catch(e){setStatus(e instanceof Error?e.message:'Gagal')}}
 return <main style={{maxWidth:1150,margin:'0 auto',padding:'32px 18px',fontFamily:'system-ui'}}>
  <header style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'center',flexWrap:'wrap'}}><div><small style={{letterSpacing:2,opacity:.55}}>FREE · AFFILIATE AGENT</small><h1 style={{margin:'4px 0'}}>Affiliate Operator</h1><p style={{opacity:.65}}>Paste link → Auto Analyze → AI Content → Approval</p></div><button onClick={runAgent} disabled={busy} style={{padding:'13px 18px',borderRadius:12,border:0,fontWeight:700}}>{busy?'⚙️ Agent bekerja…':'🤖 RUN AGENT'}</button></header>
  <nav style={{display:'flex',gap:8,margin:'22px 0',flexWrap:'wrap'}}>{[['generator','🤖 Generator'],['catalog','🗂️ Product Catalog'],['queue','📋 Approval Queue']].map(([k,label])=><button key={k} onClick={()=>{setTab(k as any);if(k==='queue')loadQueue();if(k==='catalog')loadCatalog()}} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #ddd',fontWeight:tab===k?'700':'400'}}>{label}</button>)}</nav>
  {tab==='generator'?<>
   <section style={{border:'1px solid #ddd',borderRadius:16,padding:20}}><h2>1. Paste Link Produk</h2><p style={{opacity:.65,marginTop:-6}}>Cukup kasih link. Sistem mencoba membaca nama, harga, rating, deskripsi, gambar, lalu membuat konten.</p><input autoFocus style={{width:'100%',fontSize:16,padding:14,borderRadius:10,border:'1px solid #ccc'}} placeholder="Paste link Shopee Affiliate di sini…" value={product.url} onChange={e=>setProduct({...product,url:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&!busy)analyzeAndGenerate()}}/><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}><button onClick={analyzeAndGenerate} disabled={busy} style={{padding:'13px 20px',borderRadius:10,border:0,fontWeight:700}}>{busy?'⏳ Memproses…':'✨ ANALYZE + GENERATE 5'}</button><button onClick={manualGenerate} disabled={busy||!product.name} style={{padding:'13px 18px',borderRadius:10}}>✍️ GENERATE DARI DATA MANUAL</button><button onClick={saveProduct} disabled={busy||!product.name} style={{padding:'13px 18px',borderRadius:10}}>＋ Simpan</button></div><div style={{marginTop:14,opacity:.7}}>{status}</div>
    <div style={{marginTop:16,padding:14,borderRadius:12,border:'1px dashed #ccc'}}><label style={{display:'block',fontWeight:700,marginBottom:7}}>Nama produk <span style={{opacity:.55,fontWeight:400}}>(fallback jika Shopee tidak memberi metadata)</span></label><input style={{width:'100%',fontSize:16,padding:12,borderRadius:10,border:'1px solid #ccc'}} placeholder="Contoh: Vacuum Cleaner Mini Portable" value={product.name} onChange={e=>setProduct({...product,name:e.target.value})}/><div style={{fontSize:12,opacity:.55,marginTop:7}}>Untuk short link Shopee tertentu, server tidak bisa membaca detail produk. Ini bukan berarti linknya rusak.</div></div>
    {product.name&&<div style={{marginTop:18,padding:14,borderRadius:12,background:'#f7f7f7'}}><b>{product.name}</b><div style={{marginTop:5,opacity:.7}}>{product.price||'Harga tidak tersedia'} · rating {product.rating||'tidak tersedia'} · {product.source||'Shopee'}</div>{product.problem&&<div style={{marginTop:7,fontSize:14}}>{product.problem.slice(0,350)}</div>}<div style={{marginTop:7,fontSize:12,opacity:.55}}>Komisi: {product.commission||'belum tersedia dari halaman publik'}</div></div>}
   </section>
   {drafts.length>0&&<section style={{marginTop:20}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}><h2>2. Content Studio</h2><button onClick={addQueue} disabled={busy} style={{padding:'10px 14px',borderRadius:10}}>✓ Save to Approval Queue</button></div><div style={{display:'grid',gap:12}}>{drafts.map((d,i)=><article key={i} style={{border:'1px solid #ddd',borderRadius:14,padding:16}}><div style={{display:'flex',justifyContent:'space-between'}}><b>#{i+1} · {d.angle||'AI angle'} · {d.score}/100</b><button onClick={()=>copy(d)}>Copy</button></div><h3>{d.hook}</h3><p style={{whiteSpace:'pre-wrap'}}>{d.caption}</p><p><b>{d.cta}</b></p></article>)}</div></section>}
  </>:tab==='catalog'?<section><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}><div><h2>Product Catalog</h2><p style={{opacity:.6}}>Produk yang kamu paste disimpan dan bisa dinilai Agent berikutnya.</p></div><button onClick={runAgent} disabled={busy}>{busy?'Working…':'🤖 Run Agent Sekarang'}</button></div>{catalog.length===0?<div style={{padding:30,border:'1px dashed #bbb',borderRadius:14}}>Catalog masih kosong. Paste link produk dari Generator.</div>:catalog.map(p=><article key={p.id||p.url} style={{border:'1px solid #ddd',borderRadius:14,padding:16,marginBottom:10}}><b>{p.name}</b><div style={{opacity:.65}}>{p.price||'-'} · rating {p.rating||'-'} · komisi {p.commission||'-'}</div><div style={{fontSize:13,marginTop:5,wordBreak:'break-all'}}>{p.url}</div></article>)}</section>
  :<section><div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>{[['Ready',queue.filter(x=>x.status==='ready_for_review').length],['Approved',queue.filter(x=>x.status==='approved').length],['Published',queue.filter(x=>x.status==='published').length],['Rejected',queue.filter(x=>x.status==='rejected').length]].map(x=><div key={String(x[0])} style={{border:'1px solid #ddd',borderRadius:14,padding:16}}><small>{x[0]}</small><h2 style={{margin:'5px 0'}}>{x[1]}</h2></div>)}</div><button onClick={loadQueue} style={{marginBottom:12}}>↻ Refresh</button>{queue.length===0?<div style={{padding:30,border:'1px dashed #bbb',borderRadius:14}}>Queue kosong. Paste link produk lalu generate.</div>:queue.map(item=><article key={item.id} style={{border:'1px solid #ddd',borderRadius:14,padding:18,marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:10}}><div><b>{item.product.name}</b><div style={{opacity:.65}}>Product score {item.productScore}/100 · {item.status}</div></div><div><button onClick={()=>setItemStatus(item.id,'approved')} style={{marginRight:8}}>✓ Approve</button><button onClick={()=>setItemStatus(item.id,'rejected')} style={{marginRight:8}}>✕ Reject</button>{item.status==='approved'&&<button onClick={()=>setItemStatus(item.id,'published')}>🚀 Published</button>}</div></div><div style={{display:'grid',gap:8,marginTop:12}}>{item.drafts.map((d,i)=><div key={i} style={{padding:12,border:'1px solid #eee',borderRadius:10}}><b>{d.angle||`Draft ${i+1}`}</b><p>{d.hook}</p><button onClick={()=>copy(d)}>Copy</button></div>)}</div></article>)}</section>}
  <footer style={{marginTop:30,fontSize:13,opacity:.55}}>Mode link-first: tidak perlu App ID/Secret untuk membuat konten. Data produk hanya dibaca dari halaman publik yang dapat diakses server. Posting nyata tetap hanya melalui API resmi platform.</footer>
 </main>
}
