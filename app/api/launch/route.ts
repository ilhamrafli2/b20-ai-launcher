import { NextResponse } from 'next/server';
import { encodeFunctionData, isAddress, keccak256, toBytes, type Address } from 'viem';

export const runtime = 'nodejs';

// OpenLaunch Base mainnet factory. One launch() call creates a fixed-supply
// ERC-20, opens a Uniswap v4 pool and permanently locks the supply as LP.
const OPENLAUNCH_FACTORY = '0x815542E8b392389A1389E22E588E4B62A67Ade72' as Address;
// Keep the value as a decimal string so this file does not require BigInt
// literal syntax during TypeScript's lower-target type checking.
const DEFAULT_SUPPLY = BigInt('1000000000000000000000000000');
const START_TICK = 0;
const LP_FEE = 0;
const ZERO = '0x0000000000000000000000000000000000000000' as Address;

const FACTORY_ABI = [{
  type: 'function',
  name: 'launch',
  stateMutability: 'nonpayable',
  inputs: [{
    name: 'p',
    type: 'tuple',
    components: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'quote', type: 'address' },
      { name: 'supply', type: 'uint256' },
      { name: 'startTick', type: 'int24' },
      { name: 'lpFee', type: 'uint24' },
      { name: 'salt', type: 'bytes32' },
      { name: 'recipients', type: 'tuple[]', components: [
        { name: 'payout', type: 'address' },
        { name: 'bps', type: 'uint16' },
      ] },
    ],
  }],
  outputs: [
    { name: 'token', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
  ],
}] as const;

type Json = Record<string, any>;
function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  try {
    const body: Json = await request.json();
    const creator = clean(body?.rewardRecipient, 42) as Address;
    const name = clean(body?.name, 100);
    const symbol = clean(body?.symbol, 10).toUpperCase();
    const saltInput = clean(body?.salt, 200) || `${name}-${symbol}-${Date.now()}`;
    const metadataURI = clean(body?.metadataURI, 500);

    if (!isAddress(creator)) return NextResponse.json({ error: 'Invalid creator wallet address.' }, { status: 400 });
    if (!name || !symbol) return NextResponse.json({ error: 'name and symbol are required.' }, { status: 400 });
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return NextResponse.json({ error: 'Ticker must contain only A-Z and 0-9, max 10 characters.' }, { status: 400 });

    const salt = keccak256(toBytes(saltInput));
    const data = encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: 'launch',
      args: [{
        name,
        symbol,
        metadataURI,
        quote: ZERO,
        supply: DEFAULT_SUPPLY,
        startTick: START_TICK,
        lpFee: LP_FEE,
        salt,
        recipients: [],
      }],
    });

    return NextResponse.json({
      ok: true,
      provider: 'openlaunch',
      sponsored: false,
      chain: 'base-mainnet',
      chainId: 8453,
      to: OPENLAUNCH_FACTORY,
      data,
      value: '0x0',
      supply: DEFAULT_SUPPLY.toString(),
      startTick: START_TICK,
      lpFee: LP_FEE,
      quote: ZERO,
      note: 'OpenLaunch Base factory. Fixed-supply ERC-20 + Uniswap v4 pool + permanently locked liquidity. No platform fee; wallet pays Base gas directly.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Launch preparation failed.' }, { status: 400 });
  }
}
