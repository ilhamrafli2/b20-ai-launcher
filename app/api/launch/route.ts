import { NextResponse } from 'next/server';
import { createPublicClient, encodeFunctionData, http, isAddress, keccak256, toBytes, type Address } from 'viem';
import { base } from 'viem/chains';

export const runtime = 'nodejs';
const OPENLAUNCH_FACTORY = '0x815542E8b392389A1389E22E588E4B62A67Ade72' as Address;
const DEFAULT_SUPPLY = BigInt('1000000000000000000000000000');
const START_TICK = 184200;
const LP_FEE = 10000;
const ZERO = '0x0000000000000000000000000000000000000000' as Address;
const FALLBACK_METADATA = 'https://b20-ai-launcher.vercel.app/';

const LAUNCH_ABI = [{ type: 'function', name: 'launch', stateMutability: 'nonpayable', inputs: [{ name: 'p', type: 'tuple', components: [
  { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' },
  { name: 'supply', type: 'uint256' }, { name: 'startTick', type: 'int24' }, { name: 'lpFee', type: 'uint24' }, { name: 'salt', type: 'bytes32' },
  { name: 'recipients', type: 'tuple[]', components: [{ name: 'payout', type: 'address' }, { name: 'bps', type: 'uint16' }] },
]}], outputs: [{ name: 'token', type: 'address' }, { name: 'tokenId', type: 'uint256' }] }] as const;

const PREDICT_ABI = [{ type: 'function', name: 'predictToken', stateMutability: 'view', inputs: [
  { name: 'launcher', type: 'address' }, { name: 'salt', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' },
  { name: 'supply', type: 'uint256' }, { name: 'metadataURI', type: 'string' },
], outputs: [{ name: 'token', type: 'address' }] }] as const;

type Json = Record<string, any>;
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }

function buildLaunch(body: Json, index: number) {
  const creator = clean(body?.rewardRecipient, 42) as Address;
  const name = clean(body?.name, 32);
  const symbol = clean(body?.symbol, 10).toUpperCase();
  const suppliedSalt = clean(body?.salt, 200);
  const saltInput = suppliedSalt || `${name}-${symbol}-${Date.now()}-${index}-${Math.random()}`;
  const metadataURI = clean(body?.metadataURI, 500) || FALLBACK_METADATA;

  if (!isAddress(creator)) throw new Error('Invalid creator wallet address.');
  if (!name || !symbol) throw new Error('name and symbol are required.');
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) throw new Error('Ticker must contain only A-Z and 0-9, max 10 characters.');

  const salt = keccak256(toBytes(`${creator}:${saltInput}`));
  const args = [{
    name, symbol, metadataURI, quote: ZERO, supply: DEFAULT_SUPPLY, startTick: START_TICK, lpFee: LP_FEE, salt,
    recipients: [{ payout: creator, bps: 10000 }] as { payout: Address; bps: number }[],
  }] as const;
  return { creator, args, salt, metadataURI, data: encodeFunctionData({ abi: LAUNCH_ABI, functionName: 'launch', args }) };
}

function errorText(error: unknown) {
  const e = error as any;
  const parts = [e?.shortMessage, e?.details, e?.message, e?.cause?.shortMessage, e?.cause?.details, e?.cause?.message, e?.cause?.data?.errorName, e?.cause?.data?.message, e?.cause?.data?.data, e?.data].filter((x) => typeof x === 'string' && x);
  return [...new Set(parts)].join(' | ').slice(0, 1800) || String(error);
}

export async function POST(request: Request) {
  try {
    const body: Json = await request.json();
    const items = Array.isArray(body?.tokens) ? body.tokens : [body];
    if (items.length < 1 || items.length > 1000) return NextResponse.json({ error: 'Batch must contain 1-1000 tokens.' }, { status: 400 });

    const built = items.map((item: Json, index: number) => buildLaunch(item, index));
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

    let predictedToken = '';
    try {
      predictedToken = await client.readContract({
        address: OPENLAUNCH_FACTORY,
        abi: PREDICT_ABI,
        functionName: 'predictToken',
        args: [built[0].creator, built[0].salt, built[0].args[0].name, built[0].args[0].symbol, DEFAULT_SUPPLY, built[0].metadataURI],
      });
    } catch (predictionError) {
      const detail = errorText(predictionError);
      return NextResponse.json({
        error: `OpenLaunch preflight failed: ${detail}`,
        revert: detail,
        hint: 'Base RPC/factory read failed before wallet confirmation.',
      }, { status: 422 });
    }

    try {
      await client.simulateContract({ address: OPENLAUNCH_FACTORY, abi: LAUNCH_ABI, functionName: 'launch', args: built[0].args, account: built[0].creator });
    } catch (simulationError) {
      const detail = errorText(simulationError);
      return NextResponse.json({
        error: `OpenLaunch simulation reverted: ${detail}`,
        revert: detail,
        predictedToken,
        hint: 'No wallet confirmation was requested and no gas was spent. Fix the exact revert above, then retry.',
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
      predictedToken,
      calls,
      count: items.length,
      note: `Prepared ${items.length} direct OpenLaunch calls after a read-only Base simulation. Native ETH quote, startTick 184200 and 1% LP fee are used.`,
    });
  } catch (error) {
    return NextResponse.json({ error: errorText(error) || 'Launch preparation failed.' }, { status: 400 });
  }
}
