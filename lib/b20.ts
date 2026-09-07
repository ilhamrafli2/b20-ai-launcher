import { encodeAbiParameters, keccak256, stringToBytes, toHex, type Address, type Hex } from 'viem';

export const B20_FACTORY = '0xB20f000000000000000000000000000000000000' as Address;
export const BASE_CHAIN_ID = 8453;

export const B20_FACTORY_ABI = [{
  type: 'function', name: 'createB20', stateMutability: 'payable',
  inputs: [{ name: 'variant', type: 'uint8' }, { name: 'salt', type: 'bytes32' }, { name: 'params', type: 'bytes' }, { name: 'initCalls', type: 'bytes[]' }],
  outputs: [{ name: 'token', type: 'address' }],
}] as const;

export function encodeAssetParams(name: string, symbol: string, admin: Address, decimals = 18): Hex {
  return encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
    [1, name, symbol, admin, decimals],
  );
}

export function randomSalt(seed: string): Hex {
  return keccak256(stringToBytes(`${seed}:${crypto.randomUUID()}`));
}

export function predictB20Address(variant: number, deployer: Address, salt: Hex): Address {
  const digest = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [deployer, salt]));
  const tail = digest.slice(2, 20);
  return (`0xB2${'0'.repeat(18)}${variant.toString(16).padStart(2, '0')}${tail}`) as Address;
}

// Deterministic 2D pixel-art avatar. The visual theme is derived from the token name,
// so the same name always gets the same character/art instead of a generic gradient.
export function svgAvatar(name: string, symbol: string, index: number): string {
  const key = `${name} ${symbol}`.toLowerCase();
  let h = 0;
  for (const c of key) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  const n = Math.abs(h);
  const palettes = [
    ['#7c3aed', '#22d3ee', '#f8fafc'], ['#0f766e', '#34d399', '#ecfeff'],
    ['#b45309', '#fbbf24', '#fff7ed'], ['#be185d', '#fb7185', '#fff1f2'],
    ['#1d4ed8', '#60a5fa', '#eff6ff'], ['#374151', '#a78bfa', '#f9fafb'],
  ];
  const p = palettes[n % palettes.length];
  const theme = key.includes('nova') || key.includes('solar') ? 'space' : key.includes('pixel') || key.includes('byte') ? 'tech' : key.includes('forge') || key.includes('core') ? 'forge' : key.includes('wave') || key.includes('flow') ? 'wave' : key.includes('lunar') || key.includes('cosmo') ? 'moon' : 'hero';
  const stars = Array.from({ length: 10 }, (_, i) => `<rect x="${35 + ((n * (i + 3) * 17) % 430)}" y="${35 + ((n * (i + 5) * 11) % 150)}" width="${i % 3 === 0 ? 8 : 5}" height="${i % 3 === 0 ? 8 : 5}" fill="#fff" opacity="${0.35 + (i % 4) / 10}"/>`).join('');
  const eyes = n % 2 ? '<rect x="188" y="240" width="28" height="28" fill="#111827"/><rect x="296" y="240" width="28" height="28" fill="#111827"/>' : '<rect x="190" y="242" width="24" height="24" fill="#111827"/><rect x="298" y="242" width="24" height="24" fill="#111827"/>';
  const motif = theme === 'space' ? '<path d="M370 125l18 38 40 3-31 25 10 39-37-21-35 21 9-39-30-25 41-3z" fill="#fde047"/>' : theme === 'tech' ? '<path d="M110 370h292v32H110zm42-52h208v32H152zm40-52h128v32H192z" fill="#111827" opacity=".8"/>' : theme === 'forge' ? '<path d="M120 355h272v42H120z" fill="#111827"/><path d="M180 315h152v38H180z" fill="#fbbf24"/>' : theme === 'wave' ? '<path d="M80 390c70-75 140 75 210 0s140 75 210 0" fill="none" stroke="#e0f2fe" stroke-width="24"/>' : theme === 'moon' ? '<circle cx="390" cy="135" r="48" fill="#fef3c7"/><circle cx="410" cy="120" r="48" fill="${p[0]}"/>' : '<path d="M130 375h252v34H130z" fill="#111827" opacity=".8"/>';
  const label = symbol.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" shape-rendering="crispEdges"><rect width="512" height="512" fill="${p[0]}"/><rect x="18" y="18" width="476" height="476" rx="42" fill="${p[1]}" opacity=".28"/>${stars}<circle cx="256" cy="270" r="132" fill="${p[2]}"/><rect x="145" y="155" width="222" height="218" rx="48" fill="${p[1]}"/><rect x="165" y="185" width="182" height="155" rx="30" fill="${p[2]}"/>${eyes}<rect x="222" y="298" width="68" height="18" fill="#111827"/>${motif}<rect x="146" y="420" width="220" height="48" rx="12" fill="#111827"/><text x="256" y="452" text-anchor="middle" font-family="monospace" font-size="26" font-weight="900" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
