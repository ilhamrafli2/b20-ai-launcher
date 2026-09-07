'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { randomSalt, svgAvatar } from '@/lib/b20';

type Token = { name: string; symbol: string; about: string; image: string; salt: `0x${string}` };
const A = ['Nova','Hyper','Pixel','Quantum','Solar','Neon','Aero','Lunar','Turbo','Meta','Cosmo','Vertex'];
const B = ['Forge','Spark','Core','Flow','Labs','Grid','Mint','Pulse','Wave','Chain','Byte','Vault'];
const words = ['next-gen','community powered','AI-native','open ecosystem','onchain utility','experimental'];
function parseCount(prompt: string) { const m = prompt.match(/(\d{1,3})\s*(?:token|tokens)/i); return Math.min(Math.max(Number(m?.[1] || 10), 1), 100); }
function generateTokens(prompt: string): Token[] { const count = parseCount(prompt); return Array.from({ length: count }, (_, i) => { const name = `${A[(i * 7) % A.length]} ${B[(i * 11 + 3) % B.length]}`; const symbol = `${A[(i * 5) % A.length][0]}${B[(i * 9 + 1) % B.length].slice(0, 4)}`.toUpperCase(); const about = `${words[i % words.length]} token generated from your prompt.`; return { name, symbol, about, image: svgAvatar(name, symbol, i), salt: randomSalt(`${name}-${symbol}-${i}`) }; }); }

export default function Home() {
  const [prompt, setPrompt] = useState('Buatkan 100 token di Base dengan nama random, ticker random, image random, about random');
  const [tokens, setTokens] = useState<Token[]>([]); const [status, setStatus] = useState('Ready'); const [deployed, setDeployed] = useState(0);
  const { address, isConnected } = useAccount(); const { connect, connectors, isPending } = useConnect(); const { disconnect } = useDisconnect();
  async function connectWallet(connectorIndex?: number) {
    const available = connectors.filter(c => c.ready !== false);
    const connector = connectorIndex === undefined ? available[0] : connectors[connectorIndex];
    if (!connector) { setStatus('Wallet connector unavailable. Open this page inside Coinbase Wallet or another supported wallet browser.'); return; }
    try { setStatus(`Opening ${connector.name}…`); await connect({ connector }); }
    catch (e) { setStatus(`Wallet connection failed: ${e instanceof Error ? e.message : 'Try again'}`); }
  }
  function generate() { setTokens(generateTokens(prompt)); setDeployed(0); setStatus('Preview generated — ready for sponsored launch'); }
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
  return <main className="wrap"><header><div><div className="eyebrow">BASE · B20 · CC0 SPONSORED</div><h1>B20 AI Launcher</h1><p>Prompt → generate → sponsored launch. No seed phrase. No paid fallback.</p></div><div className="actions"><a className="ghost" href="https://cc0.company/my" target="_blank" rel="noreferrer">Login / Open CC0</a>{isConnected ? <button className="ghost" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)}</button> : <><button disabled={isPending} onClick={() => connectWallet(coinbase >= 0 ? coinbase : undefined)}>{isPending ? 'Opening Wallet…' : '🟦 Coinbase Wallet'}</button>{injected >= 0 && <button className="ghost" disabled={isPending} onClick={() => connectWallet(injected)}>🌐 Browser Wallet</button>}</>}</div></header><section className="card hero"><label>Describe your launch</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} /><div className="actions"><button onClick={generate}>Generate Preview</button>{canDeploy && <button className="primary" onClick={deployAll}>🚀 Sponsored Deploy {tokens.length}</button>}</div><div className="status"><span className="dot" />{status} · Base Mainnet</div></section>{tokens.length > 0 && <section className="card"><div className="sectionHead"><h2>Preview</h2><span>{deployed}/{tokens.length} deployed</span></div><div className="grid">{tokens.map((t, i) => <article className="token" key={t.salt}><img src={t.image} alt={`${t.name} ${t.symbol}`} /><div><strong>{t.name}</strong><b>{t.symbol}</b><p>{t.about}</p></div><small>#{i + 1}</small></article>)}</div></section>}<section className="note"><strong>Wallet:</strong> pilih Coinbase Wallet atau Browser Wallet. Di iPhone Safari biasa, browser wallet yang tidak punya extension tidak akan muncul; buka launcher dari dalam wallet browser. <strong>CC0:</strong> login tetap dikelola CC0/Privy. <strong>Gas:</strong> sponsored launch tetap fail-closed jika sponsorship CC0 tidak tersedia.</section></main>;
}
