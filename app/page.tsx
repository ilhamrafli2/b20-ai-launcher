'use client';

import { useMemo, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Cc0B20Launchpad } from '@cc0company/sdk';

import { base } from 'wagmi/chains';
import { randomSalt, svgAvatar } from '@/lib/b20';

type Token = { name: string; symbol: string; about: string; image: string; salt: `0x${string}` };

const A = ['Nova','Hyper','Pixel','Quantum','Solar','Neon','Aero','Lunar','Turbo','Meta','Cosmo','Vertex'];
const B = ['Forge','Spark','Core','Flow','Labs','Grid','Mint','Pulse','Wave','Chain','Byte','Vault'];
const words = ['next-gen','community powered','AI-native','open ecosystem','onchain utility','experimental'];

function parseCount(prompt: string) {
  const m = prompt.match(/(\d{1,3})\s*(?:token|tokens)/i);
  return Math.min(Math.max(Number(m?.[1] || 10), 1), 100);
}

function generateTokens(prompt: string): Token[] {
  const count = parseCount(prompt);
  return Array.from({ length: count }, (_, i) => {
    const name = `${A[(i * 7) % A.length]} ${B[(i * 11 + 3) % B.length]}`;
    const symbol = `${A[(i * 5) % A.length][0]}${B[(i * 9 + 1) % B.length].slice(0, 4)}`.toUpperCase();
    const about = `${words[i % words.length]} token generated from your prompt.`;
    return { name, symbol, about, image: svgAvatar(name, symbol, i), salt: randomSalt(`${name}-${symbol}-${i}`) };
  });
}

export default function Home() {
  const [prompt, setPrompt] = useState('Buatkan 100 token di Base dengan nama random, ticker random, image random, about random');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [status, setStatus] = useState('Ready');
  const [deployed, setDeployed] = useState(0);
  const [sponsored, setSponsored] = useState<boolean | null>(null);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const networkLabel = useMemo(() => isConnected ? `Base · ${address?.slice(0, 6)}…${address?.slice(-4)}` : 'Wallet not connected', [isConnected, address]);

  async function connectWallet() {
    const connector = connectors[0];
    if (connector) connect({ connector });
  }

  function generate() {
    setTokens(generateTokens(prompt));
    setDeployed(0);
    setSponsored(null);
    setStatus('Preview generated — review before sponsored launch');
  }

  async function deployAllSponsored() {
    if (!address || tokens.length === 0) return;
    try {
      const b20 = new Cc0B20Launchpad({ chainId: base.id });
      setStatus('Checking CC0 sponsorship…');
      const sponsorship = await b20.sponsorshipStatus();
      setSponsored(Boolean(sponsorship.active));
      if (!sponsorship.active) {
        setStatus('CC0 sponsorship is currently inactive or your wallet is over the daily cap. No gas will be charged by this button.');
        return;
      }

      setStatus('Sponsored mode active — CC0 pays deployment gas.');
      for (let i = deployed; i < tokens.length; i++) {
        const t = tokens[i];
        await b20.launchB20Sponsored({
          name: t.name,
          symbol: t.symbol,
          image: t.image,
          description: t.about,
          supply: '1000000000',
          lpPreset: 'degen',
          adminMode: 'managed',
          rewardRecipient: address,
        });
        setDeployed(i + 1);
        setStatus(`Sponsored launch ${i + 1}/${tokens.length} complete`);
      }
      setStatus(`Done — ${tokens.length} B20 token(s) launched with CC0 sponsorship.`);
    } catch (e) {
      setStatus(`Stopped: ${e instanceof Error ? e.message : 'sponsored launch failed'}`);
    }
  }

  const canLaunch = isConnected && !!address && tokens.length > 0;

  return <main className="wrap">
    <header>
      <div><div className="eyebrow">BASE · B20 · CC0 SPONSORED</div><h1>B20 AI Launcher</h1><p>Prompt → generate → CC0 sponsors deployment gas → B20 live.</p></div>
      {isConnected ? <button className="ghost" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)}</button> : <button onClick={connectWallet}>Connect Wallet</button>}
    </header>

    <section className="card hero">
      <label>Describe your launch</label>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
      <div className="actions">
        <button onClick={generate}>Generate Preview</button>
        {canLaunch && <button className="primary" onClick={deployAllSponsored}>Launch {tokens.length} B20 — Sponsored</button>}
      </div>
      <div className="status"><span className="dot" />{status} · {networkLabel}</div>
      {sponsored !== null && <div className="status">CC0 sponsorship: <strong>{sponsored ? 'ACTIVE — no ETH required for deployment' : 'INACTIVE — launch blocked to prevent gas charge'}</strong></div>}
    </section>

    {tokens.length > 0 && <section className="card"><div className="sectionHead"><h2>Preview</h2><span>{deployed}/{tokens.length} launched</span></div>
      <div className="grid">{tokens.map((t, i) => <article className="token" key={t.salt}><img src={t.image} alt=""/><div><strong>{t.name}</strong><b>{t.symbol}</b><p>{t.about}</p></div><small>#{i + 1}</small></article>)}</div>
    </section>}

    <section className="note"><strong>Gas:</strong> this launcher uses CC0's sponsored B20 flow. When sponsorship is active, CC0's sponsor wallet signs and pays deployment gas; the creator wallet remains the reward recipient. The app never asks for a seed phrase/private key and intentionally stops instead of falling back to a paid transaction. CC0 applies a per-wallet daily sponsorship cap.</section>
  </main>;
}
