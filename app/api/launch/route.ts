import { NextResponse } from 'next/server';
import { createPublicClient, encodeFunctionData, http, isAddress, keccak256, toBytes, type Address } from 'viem';
import { base } from 'viem/chains';

export const runtime = 'nodejs';
const OPENLAUNCH_FACTORY = '0x815542E8b392389A1389E22E588E4B62A67Ade72' as Address;
const DEFAULT_SUPPLY = BigInt('1000000000000000000000000000');
// OpenLaunch's own fork tests use this launch configuration.
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

function buildLaunch(body: Json, index: number) {
  const creator = clean(body?.rewardRecipient, 42) as Address;
  const name = clean(body?.name, 100);
  const symbol = clean(body?.symbol, 10).toUpperCase();
  const suppliedSalt = clean(body?.salt, 200);
  const saltInput = suppliedSalt || `${name}-${symbol}-${Date.now()}-${index}-${Math.random()}`;
  const metadataURI = clean(body?.metadataURI, 500);

  if (!isAddress(creator)) throw new Error('Invalid creator wallet address.');
  if (!name || !symbol) throw new Error('name and symbol are required.');
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) throw new Error('Ticker must contain only A-Z and 0-9, max 10 characters.');

  const salt = keccak256(toBytes(`${creator}:${saltInput}`));
  const args = [{ name, symbol, metadataURI, quote: ZERO, supply: DEFAULT_SUPPLY, startTick: START_TICK, lpFee: LP_FEE, salt, recipients: [] as { payout: Address; bps: number }[] }] as const;
  return { creator, args, data: encodeFunctionData({ abi: LAUNCH_ABI, functionName: 'launch', args }) };
}

function errorText(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const anyError = error as Error & { shortMessage?: string; cause?: unknown; details?: string };
  return anyError.shortMessage || anyError.details || anyError.message;
}

export async function POST(request: Request) {
  try {
    const body: Json = await request.json();
    const items = Array.isArray(body?.tokens) ? body.tokens : [body];
    if (items.length < 1 || items.length > 1000) return NextResponse.json({ error: 'Batch must contain 1-1000 tokens.' }, { status: 400 });

    const built = items.map((item: Json, index: number) => buildLaunch(item, index));

    // Do one read-only eth_call before handing anything to Coinbase. This gives us
    // the real OpenLaunch revert instead of the wallet's generic UserOperation error.
    // Only the first token is simulated so preparing 1,000 tokens does not hammer RPC.
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
    try {
      await client.simulateContract({ address: OPENLAUNCH_FACTORY, abi: LAUNCH_ABI, functionName: 'launch', args: built[0].args, account: built[0].creator });
    } catch (simulationError) {
      return NextResponse.json({
        error: 'OpenLaunch simulation reverted before wallet confirmation.',
        revert: errorText(simulationError),
        hint: 'The launcher stopped before spending gas. Fix the exact contract validation shown in revert, then retry.',
      }, { status: 422 });
    }

    const calls = built.map((x) => ({ to: OPENLAUNCH_FACTORY, data: x.data, value: '0x0' }));
    return NextResponse.json({
      ok: true,
      provider: 'openlaunch+coinbase-smart-account',
      sponsored: true,
      chain: 'base-mainnet',
      chainId: 8453,
      preflight: 'passed',
      calls,
      count: items.length,
      note: `Prepared ${items.length} direct OpenLaunch calls after a read-only Base simulation. Native ETH quote, startTick 184200 and 1% LP fee are used.`,
    });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) || 'Launch preparation failed.' }, { status: 400 });
  }
}
