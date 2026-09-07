'use client';

import { useMemo, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { base } from 'wagmi/chains';
import { Cc0B20Launchpad } from '@cc0company/sdk';
import { randomSalt, svgAvatar } from '@/lib/b20';
import type { Address } from 'viem';

type Token = { name: string; symbol: string; about: string; image: string; salt: `0x${string}` };
const A = ['Nova','Hyper','Pixel','Quantum','Solar','Neon','Aero','Lunar','Turbo','Meta','Cosmo','Vertex'];
const B = ['Forge','Spark','Core','Flow','Labs','Grid','Mint','Pulse','Wave','Chain','Byte','Vault'];
const words = ['next-gen','community powered','AI-native','open ecosystem','onchain utility','experimental'];
function parseCount(prompt: string) { const m = prompt.match(/(\d{1,3})\s*(?:token|tokens)/i); return Math.min(Math.max(Number(m?.[1] || 10), 1), 100); }
function generateTokens(prompt: string): Token[] { const count = parseCount(prompt); return Array.from({ length: count }, (_, i) => { const name = `${A[(i * 7) % A.length]} ${B[(i * 11 + 3) % B.length]}`; const symbol = `${A[(i * 5) % A.length][0]}${B[(i * 9 + 1) % B.length].slice(0, 4)}`.toUpperCase(); const about = `${words[i % words.length]} token generated from your prompt.`; return { name, symbol, about, image: svgAvatar(name, symbol, i), salt: randomSalt(`${name}-${symbol}-${i}`) }; }); }

export default function Home() {
  const [prompt, setPrompt] = useState('Buatkan 100 token di Base dengan nama random, ticker random, image random, about random');
  const [tokens, setTokens] = useState<Token[]>([]); const [status, setStatus] = useState('Ready'); const [deployed, setDeployed] = useState(0);
  const { address, isConnected } = useAccount(); const { connect, connectors } = useConnect(); const { disconnect } = useDisconnect();
  async function connectWallet() { const connector = connectors[0]; if (connector) connect({ connector }); }
  function generate() { setTokens(generateTokens(prompt)); setDeployed(0); setStatus('Preview generated — sponsorship checked at launch'); }
  async function deployAll() {
    if (!address || !tokens.length) return;
    try {
      setStatus('Checking CC0 gas sponsorship…');
      const b20 = new Cc0B20Launchpad({ chainId: base.id });
      const sponsorship = await b20.sponsorshipStatus();
      if (!sponsorship.active) throw new Error('CC0 sponsorship is not active right now. No paid fallback was used.');
      setStatus(`CC0 sponsorship ACTIVE — launching ${tokens.length} B20(s)…`);
      for (let i = deployed; i < tokens.length; i++) {
        const t = tokens[i];
        await b20.launchB20Sponsored({ name: t.name, symbol: t.symbol, image: t.image, supply: '1000000000', rewardRecipient: address as Address, lpPreset: 'degen' });
        setDeployed(i + 1); setStatus(`Sponsored: ${i + 1}/${tokens.length} B20 deployed — gas paid by CC0`);
      }
      setStatus(`Done — ${tokens.length} sponsored B20 launch(es). Wallet gas: 0 ETH.`);
    } catch (e) { setStatus(`Stopped safely: ${e instanceof Error ? e.message : 'sponsored launch failed'}`); }
  }
  const canDeploy = isConnected && !!address && tokens.length > 0;
  return <main className="wrap"><header><div><div className="eyebrow">BASE · B20 · CC0 SPONSORED</div><h1>B20 AI Launcher</h1><p>Prompt → generate → sponsored launch. No seed phrase. No paid fallback.</p></div>{isConnected ? <button className="ghost" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)}</button> : <button onClick={connectWallet}>Connect Wallet</button>}</header><section className="card hero"><label>Describe your launch</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} /><div className="actions"><button onClick={generate}>Generate Preview</button>{canDeploy && <button className="primary" onClick={deployAll}>🚀 Sponsored Deploy {tokens.length}</button>}</div><div className="status"><span className="dot" />{status} · Base Mainnet</div></section>{tokens.length > 0 && <section className="card"><div className="sectionHead"><h2>Preview</h2><span>{deployed}/{tokens.length} deployed</span></div><div className="grid">{tokens.map((t, i) => <article className="token" key={t.salt}><img src={t.image} alt=""/><div><strong>{t.name}</strong><b>{t.symbol}</b><p>{t.about}</p></div><small>#{i + 1}</small></article>)}</div></section>}<section className="note"><strong>Gas sponsorship:</strong> CC0 sponsorship is checked first. If inactive/capped, the app stops instead of asking your wallet to pay gas.</section></main>;
}
