import { NextResponse } from 'next/server';
import { encodeFunctionData, isAddress, type Address } from 'viem';

export const runtime = 'nodejs';
const OPENLAUNCH_FACTORY = '0x815542E8b392389A1389E22E588E4B62A67Ade72' as Address;
const DEFAULT_SUPPLY = 0n;
const START_TICK = 184200;
const LP_FEE = 10000;
const ZERO = '0x0000000000000000000000000000000000000000' as Address;

const LAUNCH_ABI = [{ type: 'function', name: 'launch', stateMutability: 'nonpayable', inputs: [{ name: 'p', type: 'tuple', components: [
  { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' },
  { name: 'supply', type: 'uint256' }, { name: 'startTick', type: 'int24' }, { name: 'lpFee', type: 'uint24' }, { name: 'salt', type: 'bytes32' },
  { name: 'recipients', type: 'tuple[]', components: [{ name: 'payout', type: 'address' }, { name: 'bps', type: 'uint16' }] },
]}], outputs: [{ name: 'token', type: 'address' }, { name: 'tokenId', type: 'uint256' }] }] as const;

type Json = Record<string, any>;
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validSalt(value: unknown): `0x${string}` | null { const v = clean(value, 66); return /^0x[0-9a-fA-F]{64}$/.test(v) ? v as `0x${string}` : null; }

function buildLaunch(body: Json, index: number) {
  const creator = clean(body?.rewardRecipient, 42) as Address;
  const name = clean(body?.name, 32);
  const symbol = clean(body?.symbol, 10).toUpperCase();
  const salt = validSalt(body?.salt);
  const metadataURI = clean(body?.metadataURI, 500);
  if (!isAddress(creator)) throw new Error(`Token ${index + 1}: invalid creator wallet address.`);
  if (!name) throw new Error(`Token ${index + 1}: name is required.`);
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) throw new Error(`Token ${index + 1}: ticker must contain only A-Z/0-9.`);
  if (!salt) throw new Error(`Token ${index + 1}: invalid salt.`);

  const args = [{
    name, symbol, metadataURI, quote: ZERO, supply: DEFAULT_SUPPLY,
    startTick: START_TICK, lpFee: LP_FEE, salt,
    recipients: [{ payout: creator, bps: 10000 }],
  }] as const;
  return { to: OPENLAUNCH_FACTORY, data: encodeFunctionData({ abi: LAUNCH_ABI, functionName: 'launch', args }), value: '0x0' };
}

export async function POST(request: Request) {
  try {
    const body: Json = await request.json();
    const items = Array.isArray(body?.tokens) ? body.tokens : [body];
    if (items.length < 1 || items.length > 1000) return NextResponse.json({ error: 'Batch must contain 1-1000 tokens.' }, { status: 400 });
    const calls = items.map((item: Json, index: number) => buildLaunch(item, index));
    return NextResponse.json({
      ok: true, provider: 'openlaunch+coinbase-smart-account', sponsored: true,
      chain: 'base-mainnet', chainId: 8453, calls, count: calls.length,
      note: `Prepared ${calls.length} direct OpenLaunch calls using native ETH, fixed 1B supply, startTick 184200 and 1% LP fee.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
