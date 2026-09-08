import { NextResponse } from 'next/server';
import { encodeFunctionData, isAddress, keccak256, toBytes, type Address } from 'viem';

export const runtime = 'nodejs';
const OPENLAUNCH_FACTORY = '0x815542E8b392389A1389E22E588E4B62A67Ade72' as Address;
const DEFAULT_SUPPLY = BigInt('1000000000000000000000000000');
// OpenLaunch requires a valid tick aligned to 200 and above the minimum tick.
const START_TICK = 184200;
// Match the factory's tested launch configuration: 1% static LP fee.
const LP_FEE = 10000;
const ZERO = '0x0000000000000000000000000000000000000000' as Address;

const LAUNCH_ABI = [{ type: 'function', name: 'launch', stateMutability: 'nonpayable', inputs: [{ name: 'p', type: 'tuple', components: [
  { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' },
  { name: 'supply', type: 'uint256' }, { name: 'startTick', type: 'int24' }, { name: 'lpFee', type: 'uint24' }, { name: 'salt', type: 'bytes32' },
  { name: 'recipients', type: 'tuple[]', components: [{ name: 'payout', type: 'address' }, { name: 'bps', type: 'uint16' }] },
]}], outputs: [{ name: 'token', type: 'address' }, { name: 'tokenId', type: 'uint256' }] }] as const;

type Json = Record<string, any>;
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

function launchData(body: Json, index: number) {
  const creator = clean(body?.rewardRecipient, 42) as Address;
  const name = clean(body?.name, 100);
  const symbol = clean(body?.symbol, 10).toUpperCase();
  const suppliedSalt = clean(body?.salt, 200);
  const saltInput = suppliedSalt || `${name}-${symbol}-${Date.now()}-${index}-${Math.random()}`;
  const metadataURI = clean(body?.metadataURI, 500);

  if (!isAddress(creator)) throw new Error('Invalid creator wallet address.');
  if (!name || !symbol) throw new Error('name and symbol are required.');
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) throw new Error('Ticker must contain only A-Z and 0-9, max 10 characters.');

  // Quote is native ETH (address(0)), so any non-zero CREATE2 token address
  // satisfies OpenLaunch's token > quote ordering rule. Do not call findSalt:
  // preparing 1,000 tokens would otherwise create 1,000 RPC requests at once.
  const salt = keccak256(toBytes(`${creator}:${saltInput}`));

  return encodeFunctionData({
    abi: LAUNCH_ABI,
    functionName: 'launch',
    args: [{ name, symbol, metadataURI, quote: ZERO, supply: DEFAULT_SUPPLY, startTick: START_TICK, lpFee: LP_FEE, salt, recipients: [] }],
  });
}

export async function POST(request: Request) {
  try {
    const body: Json = await request.json();
    const items = Array.isArray(body?.tokens) ? body.tokens : [body];
    if (items.length < 1 || items.length > 1000) return NextResponse.json({ error: 'Batch must contain 1-1000 tokens.' }, { status: 400 });

    const calls = items.map((item: Json, index: number) => ({
      to: OPENLAUNCH_FACTORY,
      data: launchData(item, index),
      value: '0x0',
    }));

    return NextResponse.json({
      ok: true,
      provider: 'openlaunch+coinbase-smart-account',
      sponsored: true,
      chain: 'base-mainnet',
      chainId: 8453,
      calls,
      count: items.length,
      note: `Prepared ${items.length} direct OpenLaunch calls without RPC preflight. Native ETH quote makes salt ordering deterministic; tested 1% launch fee configuration is used.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Launch preparation failed.' }, { status: 400 });
  }
}
