'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { randomSalt, svgAvatar } from '@/lib/b20';

type Token = { name: string; symbol: string; about: string; image: string; salt: `0x${string}` };
type Inspiration = { name: string; symbol: string; network: string; volume24h: number; ageHours: number };
const A = ['Nova','Hyper','Pixel','Quantum','Solar','Neon','Aero','Lunar','Turbo','Meta','Cosmo','Vertex'];
const B = ['Rocket','Dragon','Panda','Doge','Cat','Bear','Wolf','Fish','Bird','Leaf','Fire','Ice','Wave','Diamond','Coin','Crown','Moon','Sun','Star','Atom','Bolt','Robot','Cyber','Forge','Core','Labs','Grid','Mint','Pulse','Chain','Vault'];
const words = ['next-gen','community powered','AI-native','open ecosystem','onchain utility','experimental'];

function parseCount(prompt: string) { const m = prompt.match(/(\d{1,3})\s*(?:token|tokens)/i); return Math.min(Math.max(Number(m?.[1] || 10), 1), 100); }
function requestedTheme(prompt: string) {
  const p = prompt.toLowerCase();
  const themes = ['rocket','dragon','panda','doge','dog','cat','bear','wolf','fish','bird','leaf','fire','ice','wave','water','ocean','diamond','gem','coin','money','crown','king','moon','lunar','sun','solar','star','nova','atom','quantum','bolt','lightning','spark','robot','ai','byte','pixel','cyber','neon','aero','wing','forge','anvil','core','reactor','lab','labs','grid','mint','pulse','chain','vault'];
  return themes.find(t => p.includes(t));
}
function inspirationWord(name: string) {
  const stop = new Set(['the','token','coin','finance','finance','protocol','official','inu','usd','usdc','usdt','wrapped','weth','sol','eth']);
  const parts = name.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return parts.find(x => x.length >= 3 && !stop.has(x.toLowerCase())) || 'Nova';
}
function makeFreshName(source: Inspiration, i: number) {
  const word = inspirationWord(source.name);
  const prefix = A[(i * 7 + 2) % A.length];
  const suffix = B[(i * 11 + 5) % B.length];
  return i % 3 === 0 ? `${prefix} ${word}` : i % 3 === 1 ? `${word} ${suffix}` : `${prefix} ${suffix}`;
}
function fallbackInspirations(): Inspiration[] { return B.map((name, i) => ({ name, symbol: name.slice(0, 5).toUpperCase(), network: 'fallback', volume24h: 0, ageHours: 0 })).slice(0, 20); }
function generateTokens(prompt: string, inspirations: Inspiration[]): Token[] {
  const count = parseCount(prompt);
  const requested = requestedTheme(prompt);
  const themeName = requested ? requested[0].toUpperCase() + requested.slice(1) : null;
  const pool = inspirations.length ? inspirations : fallbackInspirations();
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => {
    let name = themeName && i === 0 ? themeName : makeFreshName(pool[i % pool.length], i);
    let attempt = 0;
    while (used.has(name.toLowerCase()) && attempt++ < 10) name = `${name} ${B[(i + attempt) % B.length]}`;
    used.add(name.toLowerCase());
    const symbol = name.split(/\s+/).map(x => x[0]).join('').slice(0, 5).toUpperCase() + (i + 1).toString(36).toUpperCase();
    const source = pool[i % pool.length];
    const about = `${words[i % words.length]} token inspired by a fresh multi-chain pair: ${source.name} (${source.network}), $${Math.round(source.volume24h).toLocaleString()} 24h volume, ${source.ageHours.toFixed(1)}h old.`;
    return { name, symbol, about, image: svgAvatar(name, symbol, i), salt: randomSalt(`${name}-${symbol}-${i}`) };
  });
}

export default function Home() {
  const [prompt, setPrompt] = useState('Buatkan 100 token di Base dengan nama terinspirasi token baru 24 jam terakhir, volume minimal $1,000');
  const [tokens, setTokens] = useState<Token[]>([]); const [status, setStatus] = useState('Ready'); const [deployed, setDeployed] = useState(0);
  const { address, isConnected } = useAccount(); const { connect, connectors, isPending } = useConnect(); const { disconnect } = useDisconnect();
  async function connectWallet(connectorIndex?: number) {
    const available = connectors.filter(c => c.ready !== false);
    const connector = connectorIndex === undefined ? available[0] : connectors[connectorIndex];
    if (!connector) { setStatus('Wallet connector unavailable. Open this page inside Coinbase Wallet or another supported wallet browser.'); return; }
    try { setStatus(`Opening ${connector.name}…`); await connect({ connector }); }
    catch (e) { setStatus(`Wallet connection failed: ${e instanceof Error ? e.message : 'Try again'}`); }
  }
  async function generate() {
    setStatus('Scanning fresh multi-chain pairs: ≤24h and ≥$1,000 volume…');
    try {
      const response = await fetch('/api/inspiration', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Trend feed unavailable');
      const inspirations = Array.isArray(data?.inspirations) ? data.inspirations as Inspiration[] : [];
      if (!inspirations.length) throw new Error('No qualifying pairs found right now.');
      setTokens(generateTokens(prompt, inspirations)); setDeployed(0); setStatus(`Generated from ${inspirations.length} qualifying fresh pairs — ≤24h, ≥$1K volume`);
    } catch (e) { setStatus(`Could not load live inspiration: ${e instanceof Error ? e.message : 'try again'}`); }
  }
  async function deployAll() {
    if (!address || !tokens.length) return;
    try {
      setStatus('Checking CC0 sponsored gas…');
      for (let i = deployed; i < tokens.length; i++) {
        const t = tokens[i]; setStatus(`Sponsored launch ${i + 1}/${tokens.length}…`);
        const response = await fetch('/api/launch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: t.name, symbol: t.symbol, about: t.about, image: t.image, rewardRecipient: address }) });
        const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'Sponsored launch failed');
        setDeployed(i + 1); setStatus(`LIVE ${i + 1}/${tokens.length} — CC0 paid deployment gas`);
      }
      setStatus(`Done — ${tokens.length} B20 launch(es). User wallet gas: 0 ETH.`);
    } catch (e) { setStatus(`Stopped safely: ${e instanceof Error ? e.message : 'sponsored launch failed'}`); }
  }
  const canDeploy = isConnected && !!address && tokens.length > 0;
  const injected = connectors.findIndex(c => c.id === 'injected');
  const coinbase = connectors.findIndex(c => c.id === 'coinbaseWalletSDK');
  return <main className="wrap"><header><div><div className="eyebrow">BASE · B20 · LIVE TREND INSPIRED</div><h1>B20 AI Launcher</h1><p>Fresh pairs → filtered by age & volume → new token names → matching pixel-art.</p></div><div className="actions"><a className="ghost" href="https://cc0.company/my" target="_blank" rel="noreferrer">Login / Open CC0</a>{isConnected ? <button className="ghost" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)}</button> : <><button disabled={isPending} onClick={() => connectWallet(coinbase >= 0 ? coinbase : undefined)}>{isPending ? 'Opening Wallet…' : '🟦 Coinbase Wallet'}</button>{injected >= 0 && <button className="ghost" disabled={isPending} onClick={() => connectWallet(injected)}>🌐 Browser Wallet</button>}</>}</div></header><section className="card hero"><label>Describe your launch</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} /><div className="actions"><button onClick={generate}>🔥 Generate From Live Trends</button>{canDeploy && <button className="primary" onClick={deployAll}>🚀 Sponsored Deploy {tokens.length}</button>}</div><div className="status"><span className="dot" />{status} · Base Mainnet</div></section>{tokens.length > 0 && <section className="card"><div className="sectionHead"><h2>Preview</h2><span>{deployed}/{tokens.length} deployed</span></div><div className="grid">{tokens.map((t, i) => <article className="token" key={t.salt}><img src={t.image} alt={`${t.name} ${t.symbol}`} /><div><strong>{t.name}</strong><b>{t.symbol}</b><p>{t.about}</p></div><small>#{i + 1}</small></article>)}</div></section>}<section className="note"><strong>Discovery filter:</strong> fresh pools across GeckoTerminal-supported networks, maximum 24 hours old and minimum $1,000 24h volume. <strong>Names:</strong> generated as new combinations from qualifying names, not direct copies. <strong>Artwork:</strong> the resulting token name determines the pixel-art subject. <strong>CC0:</strong> sponsored launch remains fail-closed when sponsorship is unavailable.</section></main>;
}
