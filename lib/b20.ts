import { encodeAbiParameters, keccak256, stringToBytes, type Address, type Hex } from 'viem';

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

// Deterministic 2D pixel-art avatar. Every meaningful word in the token name
// selects a matching object/character, while the full name controls the palette.
export function svgAvatar(name: string, symbol: string, index: number): string {
  const key = `${name} ${symbol}`.toLowerCase();
  let h = 0;
  for (const c of key) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  const n = Math.abs(h);
  const palettes = [
    ['#312e81', '#7c3aed', '#f8fafc'], ['#064e3b', '#10b981', '#ecfeff'],
    ['#78350f', '#f59e0b', '#fff7ed'], ['#831843', '#ec4899', '#fff1f2'],
    ['#1e3a8a', '#3b82f6', '#eff6ff'], ['#111827', '#8b5cf6', '#f9fafb'],
  ];
  const p = palettes[n % palettes.length];
  const words = key.split(/\s+/);
  const has = (w: string) => words.includes(w) || key.includes(w);
  const theme = has('nova') || has('solar') ? 'star' : has('hyper') || has('turbo') ? 'speed' : has('pixel') || has('byte') ? 'robot' : has('quantum') ? 'atom' : has('neon') ? 'cyber' : has('aero') ? 'wing' : has('lunar') || has('cosmo') ? 'moon' : has('vertex') ? 'crystal' : has('forge') ? 'anvil' : has('spark') ? 'bolt' : has('core') ? 'reactor' : has('flow') || has('wave') ? 'wave' : has('labs') ? 'flask' : has('grid') ? 'grid' : has('mint') ? 'coin' : has('pulse') ? 'pulse' : has('chain') ? 'chain' : has('vault') ? 'vault' : 'hero';
  const stars = Array.from({ length: 12 }, (_, i) => `<rect x="${28 + ((n * (i + 3) * 17) % 450)}" y="${28 + ((n * (i + 5) * 11) % 170)}" width="${i % 3 === 0 ? 8 : 5}" height="${i % 3 === 0 ? 8 : 5}" fill="#fff" opacity="${0.35 + (i % 4) / 10}"/>`).join('');
  const eyes = n % 2 ? '<rect x="188" y="238" width="28" height="28" fill="#111827"/><rect x="296" y="238" width="28" height="28" fill="#111827"/>' : '<rect x="190" y="240" width="24" height="24" fill="#111827"/><rect x="298" y="240" width="24" height="24" fill="#111827"/>';
  const motif = {
    star: '<path d="M390 78l13 29 31 2-24 20 8 30-28-16-28 16 8-30-24-20 31-2z" fill="#fde047"/><circle cx="115" cy="125" r="18" fill="#fff"/>',
    speed: '<path d="M105 365h230l-48-38 115-20-82-38 45-40H180l-36 54 54 20-70 32 48 12z" fill="#facc15"/><rect x="115" y="397" width="280" height="12" fill="#fff" opacity=".7"/>',
    robot: '<rect x="135" y="350" width="242" height="52" fill="#111827"/><rect x="160" y="363" width="38" height="20" fill="#22d3ee"/><rect x="215" y="363" width="38" height="20" fill="#a78bfa"/><rect x="270" y="363" width="38" height="20" fill="#34d399"/>',
    atom: '<circle cx="386" cy="120" r="55" fill="none" stroke="#e0f2fe" stroke-width="12"/><ellipse cx="386" cy="120" rx="85" ry="30" fill="none" stroke="#e0f2fe" stroke-width="9" transform="rotate(45 386 120)"/><circle cx="386" cy="120" r="14" fill="#fef08a"/>',
    cyber: '<path d="M115 350h282v48H115z" fill="#111827"/><path d="M145 375h48m25 0h48m25 0h48" stroke="#22d3ee" stroke-width="12"/>',
    wing: '<path d="M85 365l115-105 40 48 42-70 145 127-160-43z" fill="#e0f2fe"/><path d="M427 365l-115-105-40 48-42-70-145 127 160-43z" fill="#bae6fd"/>',
    moon: `<circle cx="395" cy="125" r="58" fill="#fef3c7"/><circle cx="420" cy="105" r="58" fill="${p[0]}"/>`,
    crystal: '<path d="M120 385l70-150 68 55 65-75 82 170-142-32z" fill="#c4b5fd"/><path d="M190 235l68 55-58 42zm133-20l-65 75 83 25z" fill="#f5f3ff"/>',
    anvil: '<path d="M115 360h282v45H115zM175 320h160v42H175zM145 300h222v35H145z" fill="#111827"/><path d="M205 285h102v18H205z" fill="#fbbf24"/>',
    bolt: '<path d="M280 215h-80l-50 105h75l-30 100 110-145h-75z" fill="#fde047" stroke="#fff" stroke-width="7"/>',
    reactor: '<circle cx="395" cy="130" r="62" fill="none" stroke="#a7f3d0" stroke-width="16"/><circle cx="395" cy="130" r="28" fill="#34d399"/><path d="M395 68v-32m0 156v-32m62-30h32m-156 0h-32" stroke="#fff" stroke-width="9"/>',
    wave: '<path d="M55 375c60-95 120 95 180 0s120 95 180 0 90 40 130-20" fill="none" stroke="#e0f2fe" stroke-width="22"/>',
    flask: '<path d="M225 205h62v65l65 120H160l65-120z" fill="#dbeafe"/><path d="M188 345h136" stroke="#34d399" stroke-width="25"/><rect x="225" y="180" width="62" height="28" fill="#111827"/>',
    grid: '<path d="M105 235h302M105 300h302M105 365h302M170 205v190M256 205v190M342 205v190" stroke="#e0e7ff" stroke-width="12"/>',
    coin: '<circle cx="395" cy="130" r="62" fill="#fbbf24"/><circle cx="395" cy="130" r="44" fill="none" stroke="#fff7ed" stroke-width="9"/><path d="M395 98v64m-20-48h28c18 0 18 28 0 28h-25c-18 0-18 28 0 28h29" stroke="#fff" stroke-width="9" fill="none"/>',
    pulse: '<path d="M70 335h70l35-95 55 150 45-105 38 50h105" fill="none" stroke="#f9a8d4" stroke-width="15"/>',
    chain: '<circle cx="345" cy="120" r="48" fill="none" stroke="#e0f2fe" stroke-width="20"/><circle cx="405" cy="180" r="48" fill="none" stroke="#bae6fd" stroke-width="20"/>',
    vault: '<rect x="330" y="65" width="120" height="120" rx="12" fill="#94a3b8"/><circle cx="390" cy="125" r="34" fill="#111827"/><circle cx="390" cy="125" r="9" fill="#fbbf24"/><path d="M390 125l25-20" stroke="#fff" stroke-width="8"/>',
    hero: '<path d="M130 375h252v34H130z" fill="#111827" opacity=".8"/>',
  }[theme];
  const label = symbol.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
  const title = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" shape-rendering="crispEdges"><rect width="512" height="512" fill="${p[0]}"/>${stars}<rect x="18" y="18" width="476" height="476" rx="42" fill="${p[1]}" opacity=".24"/><circle cx="256" cy="270" r="132" fill="${p[2]}"/><rect x="145" y="155" width="222" height="218" rx="48" fill="${p[1]}"/><rect x="165" y="185" width="182" height="155" rx="30" fill="${p[2]}"/>${eyes}<rect x="222" y="298" width="68" height="18" fill="#111827"/>${motif}<rect x="70" y="420" width="372" height="48" rx="12" fill="#111827"/><text x="256" y="443" text-anchor="middle" font-family="monospace" font-size="16" font-weight="900" fill="#fff">${title.slice(0, 32)}</text><text x="256" y="460" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="#a7f3d0">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
