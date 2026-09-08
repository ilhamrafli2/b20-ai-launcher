import { NextResponse } from 'next/server';
import { encodeFunctionData, isAddress, keccak256, toBytes, type Address } from 'viem';

export const runtime = 'nodejs';
const OPENLAUNCH_FACTORY = '0x815542E8b392389A1389E22E588E4B62A67Ade72' as Address;
const DEFAULT_SUPPLY = BigInt('1000000000000000000000000000');
const START_TICK = 0;
const LP_FEE = 0;
const ZERO = '0x0000000000000000000000000000000000000000' as Address;

const LAUNCH_ABI = [{ type: 'function', name: 'launch', stateMutability: 'nonpayable', inputs: [{ name: 'p', type: 'tuple', components: [
  { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' },
  { name: 'supply', type: 'uint256' }, { name: 'startTick', type: 'int24' }, { name: 'lpFee', type: 'uint24' }, { name: 'salt', type: 'bytes32' },
  { name: 'recipients', type: 'tuple[]', components: [{ name: 'payout', type: 'address' }, { name: 'bps', type: 'uint16' }] },
]}], outputs: [{ name: 'token', type: 'address' }, { name: 'tokenId', type: 'uint256' }] }] as const;

type Json = Record<string, any>;
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function launchData(body: Json) {
  const creator = clean(body?.rewardRecipient, 42) as Address;
  const name = clean(body?.name, 100);
  const symbol = clean(body?.symbol, 10).toUpperCase();
  const saltInput = clean(body?.salt, 200) || `${name}-${symbol}-${Date.now()}`;
  const metadataURI = clean(body?.metadataURI, 500);
  if (!isAddress(creator)) throw new Error('Invalid creator wallet address.');
  if (!name || !symbol) throw new Error('name and symbol are required.');
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) throw new Error('Ticker must contain only A-Z and 0-9, max 10 characters.');
  return encodeFunctionData({ abi: LAUNCH_ABI, functionName: 'launch', args: [{ name, symbol, metadataURI, quote: ZERO, supply: DEFAULT_SUPPLY, startTick: START_TICK, lpFee: LP_FEE, salt: keccak256(toBytes(saltInput)), recipients: [] }] });
}

export async function POST(request: Request) {
  try {
    const body: Json = await request.json();
    const items = Array.isArray(body?.tokens) ? body.tokens : [body];
    if (items.length < 1 || items.length > 1000) return NextResponse.json({ error: 'Batch must contain 1-1000 tokens.' }, { status: 400 });

    // Do not wrap launches in Multicall3. Coinbase Smart Account / EIP-5792
    // can execute these factory calls directly as one sponsored UserOperation.
    // This avoids an inner Multicall3 revert and keeps calldata smaller.
    const calls = items.map((item: Json) => ({
      to: OPENLAUNCH_FACTORY,
      data: launchData(item),
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
      note: `One sponsored Smart Account batch contains ${items.length} direct OpenLaunch calls. Coinbase CDP Paymaster sponsors gas subject to its policy and credits.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Launch preparation failed.' }, { status: 400 });
  }
}
