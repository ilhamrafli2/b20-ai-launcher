import { NextResponse } from 'next/server';
import { encodeAbiParameters, encodeFunctionData, isAddress, keccak256, toBytes, type Address } from 'viem';

export const runtime = 'nodejs';

const B20_FACTORY = '0xB20f000000000000000000000000000000000000' as Address;
const B20_ASSET_VARIANT = 0;
const B20_PARAMS_VERSION = 1;
const B20_DECIMALS = 18;
const DEFAULT_SUPPLY = BigInt('1000000000') * BigInt('1000000000000000000');

const FACTORY_ABI = [{ type: 'function', name: 'createB20', stateMutability: 'nonpayable', inputs: [
  { name: 'variant', type: 'uint8' }, { name: 'salt', type: 'bytes32' }, { name: 'params', type: 'bytes' }, { name: 'initCalls', type: 'bytes[]' },
], outputs: [{ name: 'tokenAddress', type: 'address' }] }] as const;

// B20 Asset exposes batchMint(recipients, amounts), not mint(to, amount).
// The factory bootstrap window allows this init call before initialization closes.
const TOKEN_ABI = [
  { type: 'function', name: 'batchMint', stateMutability: 'nonpayable', inputs: [
    { name: 'recipients', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' },
  ], outputs: [] },
] as const;

type Json = Record<string, any>;
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

function predictB20Address(deployer: Address, salt: `0x${string}`): Address {
  const h = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [deployer, salt]));
  const variantHex = B20_ASSET_VARIANT.toString(16).padStart(2, '0');
  return (`0xB2${'0'.repeat(18)}${variantHex}${h.slice(2, 20)}`) as Address;
}

export async function POST(request: Request) {
  try {
    const body: Json = await request.json();
    const address = clean(body?.rewardRecipient, 42) as Address;
    const name = clean(body?.name, 100);
    const symbol = clean(body?.symbol, 10).toUpperCase();
    const saltInput = clean(body?.salt, 200) || `${name}-${symbol}-${Date.now()}`;
    if (!isAddress(address)) return NextResponse.json({ error: 'Invalid creator wallet address.' }, { status: 400 });
    if (!name || !symbol) return NextResponse.json({ error: 'name and symbol are required.' }, { status: 400 });
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return NextResponse.json({ error: 'Ticker must contain only A-Z and 0-9, max 10 characters.' }, { status: 400 });

    const salt = keccak256(toBytes(saltInput));
    const params = encodeAbiParameters(
      [{ type: 'uint8' }, { type: 'string' }, { type: 'string' }, { type: 'address' }, { type: 'uint8' }],
      [B20_PARAMS_VERSION, name, symbol, '0x0000000000000000000000000000000000000000', B20_DECIMALS],
    );
    const mint = encodeFunctionData({
      abi: TOKEN_ABI,
      functionName: 'batchMint',
      args: [[address], [DEFAULT_SUPPLY]],
    });
    const data = encodeFunctionData({ abi: FACTORY_ABI, functionName: 'createB20', args: [B20_ASSET_VARIANT, salt, params, [mint]] });

    return NextResponse.json({
      ok: true,
      provider: 'base-b20-native',
      sponsored: false,
      chain: 'base-mainnet',
      chainId: 8453,
      to: B20_FACTORY,
      data,
      value: '0x0',
      tokenAddress: predictB20Address(address, salt),
      rewardRecipient: address,
      supply: DEFAULT_SUPPLY.toString(),
      note: 'Native Base B20 Asset creation on Base Mainnet. Initial supply is batch-minted during the factory bootstrap; the wallet pays the Base network fee directly.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'B20 launch preparation failed.' }, { status: 400 });
  }
}
