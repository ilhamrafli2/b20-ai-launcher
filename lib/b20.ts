import { encodeAbiParameters, keccak256, stringToBytes, toHex, type Address, type Hex } from 'viem';

export const B20_FACTORY = '0xB20f000000000000000000000000000000000000' as Address;
export const BASE_CHAIN_ID = 8453;

export const B20_FACTORY_ABI = [{
  type: 'function',
  name: 'createB20',
  stateMutability: 'payable',
  inputs: [
    { name: 'variant', type: 'uint8' },
    { name: 'salt', type: 'bytes32' },
    { name: 'params', type: 'bytes' },
    { name: 'initCalls', type: 'bytes[]' },
  ],
  outputs: [{ name: 'token', type: 'address' }],
}] as const;

/** Official B20 Asset create params, version 1. */
export function encodeAssetParams(name: string, symbol: string, admin: Address, decimals = 18): Hex {
  return encodeAbiParameters(
    [
      { type: 'uint8' },
      { type: 'string' },
      { type: 'string' },
      { type: 'address' },
      { type: 'uint8' },
    ],
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

export function svgAvatar(name: string, symbol: string, index: number): string {
  const hue = (index * 47) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue},80%,60%)"/><stop offset="1" stop-color="hsl(${(hue + 80) % 360},80%,45%)"/></linearGradient></defs><rect width="512" height="512" rx="96" fill="url(#g)"/><circle cx="256" cy="220" r="105" fill="rgba(255,255,255,.18)"/><text x="256" y="285" text-anchor="middle" font-family="Arial" font-size="92" font-weight="700" fill="white">${symbol.slice(0,5)}</text><text x="256" y="420" text-anchor="middle" font-family="Arial" font-size="28" fill="white">${name.slice(0,22)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
