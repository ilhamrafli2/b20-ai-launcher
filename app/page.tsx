'use client';

import { useMemo, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWriteContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { B20_FACTORY, B20_FACTORY_ABI, encodeAssetParams, randomSalt, svgAvatar } from '@/lib/b20';
import type { Address } from 'viem';

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
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const canDeploy = isConnected && !!address && tokens.length > 0;
  const networkLabel = useMemo(() => chainId === base.id ? 'Base Mainnet' : chainId ? `Chain ${chainId}` : 'Not connected', [chainId]);

  async function connectWallet() {
    const connector = connectors[0];
    if (connector) connect({ connector });
  }

  function generate() {
    setTokens(generateTokens(prompt));
    setDeployed(0);
    setStatus('Preview generated — review before signing');
  }

  async function deployAll() {
    if (!address) return;
    try {
      if (chainId !== base.id) await switchChainAsync({ chainId: base.id });
      setStatus('Deploying… your wallet may ask for a signature for each transaction.');
      for (let i = deployed; i < tokens.length; i++) {
        const t = tokens[i];
        await writeContractAsync({
          address: B20_FACTORY,
          abi: B20_FACTORY_ABI,
          functionName: 'createB20',
          args: [0, t.salt, encodeAssetParams(t.name, t.symbol, address as Address, 18), []],
          value: 0n,
          chainId: base.id,
        });
        setDeployed(i + 1);
        setStatus(`Deployed ${i + 1}/${tokens.length}`);
      }
      setStatus(`Done — ${tokens.length} B20 token(s) submitted.`);
    } catch (e) {
      setStatus(`Stopped: ${e instanceof Error ? e.message : 'transaction rejected'}`);
    }
  }

  return <main className="wrap">
    <header><div><div className="eyebrow">BASE · B20</div><h1>B20 AI Launcher</h1><p>Prompt → generate → connect wallet → deploy.</p></div>
      {isConnected ? <button className="ghost" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)}</button> : <button onClick={connectWallet}>Connect Wallet</button>}
    </header>

    <section className="card hero">
      <label>Describe your launch</label>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
      <div className="actions"><button onClick={generate}>Generate Preview</button>{canDeploy && <button className="primary" onClick={deployAll}>Deploy {tokens.length} B20</button>}</div>
      <div className="status"><span className="dot" />{status} · {networkLabel}</div>
    </section>

    {tokens.length > 0 && <section className="card"><div className="sectionHead"><h2>Preview</h2><span>{deployed}/{tokens.length} deployed</span></div>
      <div className="grid">{tokens.map((t, i) => <article className="token" key={t.salt}><img src={t.image} alt=""/><div><strong>{t.name}</strong><b>{t.symbol}</b><p>{t.about}</p></div><small>#{i + 1}</small></article>)}</div>
    </section>}

    <section className="note"><strong>Safety:</strong> this app never asks for your seed phrase or private key. The current MVP uses normal wallet transactions; true one-approval automation requires an account-abstraction/paymaster layer and explicit spending authorization.</section>
  </main>;
}
