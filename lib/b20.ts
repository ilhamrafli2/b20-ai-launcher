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

// Deterministic 2D pixel-art avatar. The artwork is semantic: the strongest
// keyword in the token name selects the actual object (ROCKET -> rocket,
// DRAGON -> dragon, DOG -> dog, etc.). The token name/symbol only affect the
// palette and label, so every generated token stays visually consistent.
export function svgAvatar(name: string, symbol: string, index: number): string {
  const key = `${name} ${symbol}`.toLowerCase();
  let h = 0;
  for (const c of key) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  const n = Math.abs(h) + index;
  const palettes = [
    ['#312e81', '#7c3aed', '#f8fafc'], ['#064e3b', '#10b981', '#ecfeff'],
    ['#78350f', '#f59e0b', '#fff7ed'], ['#831843', '#ec4899', '#fff1f2'],
    ['#1e3a8a', '#3b82f6', '#eff6ff'], ['#111827', '#8b5cf6', '#f9fafb'],
  ];
  const p = palettes[n % palettes.length];
  const has = (...values: string[]) => values.some(v => key.includes(v));

  // Direct semantic mapping. Put specific words before broad themes.
  const theme =
    has('rocket', 'spacecraft', 'spaceship') ? 'rocket' :
    has('dragon') ? 'dragon' :
    has('panda') ? 'panda' :
    has('doge', 'dog', 'puppy', 'shiba') ? 'dog' :
    has('cat', 'kitty') ? 'cat' :
    has('bear') ? 'bear' :
    has('bull') ? 'bull' :
    has('wolf') ? 'wolf' :
    has('fish', 'shark') ? 'fish' :
    has('bird', 'eagle') ? 'bird' :
    has('tree', 'leaf', 'forest', 'nature') ? 'leaf' :
    has('fire', 'flame') ? 'fire' :
    has('ice', 'snow', 'frost') ? 'ice' :
    has('water', 'ocean', 'sea', 'wave') ? 'wave' :
    has('diamond', 'gem', 'crystal') ? 'diamond' :
    has('coin', 'money', 'cash', 'mint') ? 'coin' :
    has('crown', 'king', 'queen') ? 'crown' :
    has('moon', 'lunar') ? 'moon' :
    has('sun', 'solar') ? 'sun' :
    has('star', 'nova') ? 'star' :
    has('atom', 'quantum') ? 'atom' :
    has('bolt', 'lightning', 'spark') ? 'bolt' :
    has('robot', 'ai', 'byte', 'pixel') ? 'robot' :
    has('cyber', 'neon') ? 'cyber' :
    has('aero', 'wing') ? 'wing' :
    has('anvil', 'forge') ? 'anvil' :
    has('reactor', 'core') ? 'reactor' :
    has('flask', 'lab', 'labs') ? 'flask' :
    has('grid') ? 'grid' :
    has('pulse') ? 'pulse' :
    has('chain') ? 'chain' :
    has('vault') ? 'vault' :
    has('hyper', 'turbo', 'speed') ? 'speed' :
    'hero';

  const stars = Array.from({ length: 12 }, (_, i) => `<rect x="${28 + ((n * (i + 3) * 17) % 450)}" y="${28 + ((n * (i + 5) * 11) % 170)}" width="${i % 3 === 0 ? 8 : 5}" height="${i % 3 === 0 ? 8 : 5}" fill="#fff" opacity="${0.35 + (i % 4) / 10}"/>`).join('');
  const eyes = '<rect x="188" y="238" width="28" height="28" fill="#111827"/><rect x="296" y="238" width="28" height="28" fill="#111827"/>';

  const motif: Record<string, string> = {
    rocket: '<path d="M256 105c-34 30-55 78-55 133v74l55 58 55-58v-74c0-55-21-103-55-133z" fill="#f8fafc"/><path d="M201 270l-52 42 52 10zm110 0l52 42-52 10z" fill="#fbbf24"/><circle cx="256" cy="202" r="25" fill="#38bdf8" stroke="#111827" stroke-width="10"/><path d="M225 325l31 70 31-70z" fill="#f97316"/><path d="M205 156l-28-28 38 8zm102 0l28-28-38 8z" fill="#f97316"/>',
    dragon: '<path d="M145 345l35-105 48 35 28-80 28 80 48-35 35 105-62-22-49 42-49-42z" fill="#ef4444"/><path d="M208 235l-48-68 80 38 16-60 16 60 80-38-48 68" fill="#22c55e"/><rect x="205" y="275" width="28" height="28" fill="#fff"/><rect x="279" y="275" width="28" height="28" fill="#fff"/>',
    panda: '<circle cx="256" cy="280" r="100" fill="#f8fafc"/><circle cx="195" cy="225" r="40" fill="#111827"/><circle cx="317" cy="225" r="40" fill="#111827"/><circle cx="215" cy="280" r="25" fill="#111827"/><circle cx="297" cy="280" r="25" fill="#111827"/><ellipse cx="256" cy="335" rx="30" ry="20" fill="#111827"/>',
    dog: '<path d="M150 225l55-55 51 35 51-35 55 55v130l-55 45H205l-55-45z" fill="#d97706"/><path d="M150 225l-48-38 35 95 42-35zm212 0l48-38-35 95-42-35z" fill="#92400e"/><rect x="198" y="250" width="30" height="30" fill="#111827"/><rect x="284" y="250" width="30" height="30" fill="#111827"/><rect x="235" y="315" width="42" height="28" rx="10" fill="#111827"/>',
    cat: '<path d="M150 360V210l55-65 51 48 51-48 55 65v150z" fill="#c4b5fd"/><rect x="198" y="245" width="28" height="28" fill="#111827"/><rect x="286" y="245" width="28" height="28" fill="#111827"/><path d="M238 315h36" stroke="#111827" stroke-width="12"/>',
    bear: '<path d="M145 220a55 55 0 0 1 70-52 70 70 0 0 1 82 0 55 55 0 0 1 70 52v130l-55 55H200l-55-55z" fill="#92400e"/><circle cx="205" cy="245" r="20" fill="#111827"/><circle cx="307" cy="245" r="20" fill="#111827"/><ellipse cx="256" cy="320" rx="45" ry="32" fill="#f59e0b"/>',
    bull: '<path d="M155 220l-65-55 70 12 35 30h122l35-30 70-12-65 55v125l-60 50H215l-60-50z" fill="#ef4444"/><path d="M185 205l-55-35 18 70zm142 0l55-35-18 70z" fill="#f8fafc"/><rect x="200" y="255" width="30" height="30" fill="#111827"/><rect x="282" y="255" width="30" height="30" fill="#111827"/>',
    wolf: '<path d="M145 355V205l65-75 46 58 46-58 65 75v150l-65 45H210z" fill="#94a3b8"/><path d="M145 205l-40-55 70 38zm222 0l40-55-70 38z" fill="#64748b"/><rect x="198" y="250" width="30" height="30" fill="#111827"/><rect x="284" y="250" width="30" height="30" fill="#111827"/>',
    fish: '<path d="M125 300c55-105 190-105 245 0-55 105-190 105-245 0z" fill="#38bdf8"/><path d="M370 300l75-60v120z" fill="#0ea5e9"/><circle cx="205" cy="270" r="18" fill="#111827"/><path d="M240 330h70" stroke="#e0f2fe" stroke-width="12"/>',
    bird: '<path d="M130 320l90-105 36 55 36-55 90 105-126 42z" fill="#60a5fa"/><circle cx="286" cy="230" r="14" fill="#111827"/><path d="M175 300l-65-20 45 48z" fill="#fbbf24"/>',
    leaf: '<path d="M145 360C125 235 220 130 380 125c-5 160-100 255-235 235z" fill="#22c55e"/><path d="M155 350L350 155" stroke="#dcfce7" stroke-width="14"/>',
    fire: '<path d="M256 115c-45 62-18 85-68 125-42 34-48 98-5 140 48 48 131 48 171 0 44-52 22-120-25-155-30-23-37-56-31-110-25 24-35 49-42 73-12-27-13-47 0-73z" fill="#f97316"/><path d="M256 205c-22 38-9 58-31 78-22 21-20 56 2 76 29 27 71 23 94-6 23-30 7-65-18-82-18-13-25-34-22-55-13 14-19 28-20 42-8-17-9-31-5-53z" fill="#fde047"/>',
    ice: '<path d="M160 170h192l48 48v150l-48 48H160l-48-48V218z" fill="#bae6fd"/><path d="M160 170l48 48h144l-48-48zm-48 48l48 48v150l-48-48z" fill="#e0f2fe"/><path d="M208 218l-48 48h144l48-48z" fill="#f0f9ff"/>',
    wave: '<path d="M55 365c60-95 120 95 180 0s120 95 180 0 90 40 130-20" fill="none" stroke="#e0f2fe" stroke-width="22"/>',
    diamond: '<path d="M130 220l65-70h122l65 70-126 190z" fill="#67e8f9"/><path d="M130 220h252l-126 190zm65-70l61 70 61-70m-122 70l61 190 61-190" fill="none" stroke="#f8fafc" stroke-width="10"/>',
    coin: '<circle cx="395" cy="130" r="62" fill="#fbbf24"/><circle cx="395" cy="130" r="44" fill="none" stroke="#fff7ed" stroke-width="9"/><path d="M395 98v64m-20-48h28c18 0 18 28 0 28h-25c-18 0-18 28 0 28h29" stroke="#fff" stroke-width="9" fill="none"/>',
    crown: '<path d="M125 205l55 55 76-95 76 95 55-55-20 150H145z" fill="#facc15" stroke="#fff7ed" stroke-width="8"/><circle cx="180" cy="205" r="16" fill="#fef08a"/><circle cx="256" cy="165" r="16" fill="#fef08a"/><circle cx="332" cy="205" r="16" fill="#fef08a"/>',
    moon: '<circle cx="395" cy="125" r="58" fill="#fef3c7"/><circle cx="420" cy="105" r="58" fill="' + p[0] + '"/>',
    sun: '<circle cx="395" cy="125" r="55" fill="#fde047"/><path d="M395 45v-25m0 185v-25m80-55h25M290 125h-25m155-80l18-18m-96 176l-18 18m96 0l18 18m-96-176l-18-18" stroke="#fde047" stroke-width="14"/>',
    star: '<path d="M390 78l13 29 31 2-24 20 8 30-28-16-28 16 8-30-24-20 31-2z" fill="#fde047"/>',
    atom: '<circle cx="386" cy="120" r="55" fill="none" stroke="#e0f2fe" stroke-width="12"/><ellipse cx="386" cy="120" rx="85" ry="30" fill="none" stroke="#e0f2fe" stroke-width="9" transform="rotate(45 386 120)"/><circle cx="386" cy="120" r="14" fill="#fef08a"/>',
    bolt: '<path d="M280 215h-80l-50 105h75l-30 100 110-145h-75z" fill="#fde047" stroke="#fff" stroke-width="7"/>',
    robot: '<rect x="135" y="350" width="242" height="52" fill="#111827"/><rect x="160" y="363" width="38" height="20" fill="#22d3ee"/><rect x="215" y="363" width="38" height="20" fill="#a78bfa"/><rect x="270" y="363" width="38" height="20" fill="#34d399"/>',
    cyber: '<path d="M115 350h282v48H115z" fill="#111827"/><path d="M145 375h48m25 0h48m25 0h48" stroke="#22d3ee" stroke-width="12"/>',
    wing: '<path d="M85 365l115-105 40 48 42-70 145 127-160-43z" fill="#e0f2fe"/><path d="M427 365l-115-105-40 48-42-70-145 127 160-43z" fill="#bae6fd"/>',
    anvil: '<path d="M115 360h282v45H115zM175 320h160v42H175zM145 300h222v35H145z" fill="#111827"/><path d="M205 285h102v18H205z" fill="#fbbf24"/>',
    reactor: '<circle cx="395" cy="130" r="62" fill="none" stroke="#a7f3d0" stroke-width="16"/><circle cx="395" cy="130" r="28" fill="#34d399"/><path d="M395 68v-32m0 156v-32m62-30h32m-156 0h-32" stroke="#fff" stroke-width="9"/>',
    flask: '<path d="M225 205h62v65l65 120H160l65-120z" fill="#dbeafe"/><path d="M188 345h136" stroke="#34d399" stroke-width="25"/><rect x="225" y="180" width="62" height="28" fill="#111827"/>',
    grid: '<path d="M105 235h302M105 300h302M105 365h302M170 205v190M256 205v190M342 205v190" stroke="#e0e7ff" stroke-width="12"/>',
    pulse: '<path d="M70 335h70l35-95 55 150 45-105 38 50h105" fill="none" stroke="#f9a8d4" stroke-width="15"/>',
    chain: '<circle cx="345" cy="120" r="48" fill="none" stroke="#e0f2fe" stroke-width="20"/><circle cx="405" cy="180" r="48" fill="none" stroke="#bae6fd" stroke-width="20"/>',
    vault: '<rect x="330" y="65" width="120" height="120" rx="12" fill="#94a3b8"/><circle cx="390" cy="125" r="34" fill="#111827"/><circle cx="390" cy="125" r="9" fill="#fbbf24"/><path d="M390 125l25-20" stroke="#fff" stroke-width="8"/>',
    speed: '<path d="M105 365h230l-48-38 115-20-82-38 45-40H180l-36 54 54 20-70 32 48 12z" fill="#facc15"/><rect x="115" y="397" width="280" height="12" fill="#fff" opacity=".7"/>',
    hero: '<path d="M130 375h252v34H130z" fill="#111827" opacity=".8"/>',
  };

  const label = symbol.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
  const title = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" shape-rendering="crispEdges"><rect width="512" height="512" fill="${p[0]}"/>${stars}<rect x="18" y="18" width="476" height="476" rx="42" fill="${p[1]}" opacity=".24"/><circle cx="256" cy="270" r="132" fill="${p[2]}"/><rect x="145" y="155" width="222" height="218" rx="48" fill="${p[1]}"/><rect x="165" y="185" width="182" height="155" rx="30" fill="${p[2]}"/>${motif[theme]}${theme === 'rocket' || theme === 'dragon' || theme === 'panda' || theme === 'dog' || theme === 'cat' || theme === 'bear' || theme === 'bull' || theme === 'wolf' || theme === 'fish' || theme === 'bird' ? '' : eyes}<rect x="222" y="298" width="68" height="18" fill="#111827" opacity="${theme === 'rocket' ? 0 : 1}"/><rect x="70" y="420" width="372" height="48" rx="12" fill="#111827"/><text x="256" y="443" text-anchor="middle" font-family="monospace" font-size="16" font-weight="900" fill="#fff">${title.slice(0, 32)}</text><text x="256" y="460" text-anchor="middle" font-family="monospace" font-size="13" font-weight="700" fill="#a7f3d0">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
