import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

export const runtime = 'nodejs';

const MAX_NAME = 100;
const MAX_SYMBOL = 10;
const MAX_ABOUT = 500;
const MCP_URL = 'https://bonker.wtf/api/mcp';

type Json = Record<string, any>;

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function mcpRequest(method: string, params: Json, key: string, id: number, sessionId?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    cache: 'no-store',
  });

  const text = await response.text();
  let payload: any = null;
  for (const line of text.split(/\r?\n/).reverse()) {
    const candidate = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
    if (!candidate || candidate === '[DONE]') continue;
    try {
      payload = JSON.parse(candidate);
      break;
    } catch {}
  }
  if (!payload) {
    try { payload = JSON.parse(text); } catch { payload = { error: text || `Bonker MCP HTTP ${response.status}` }; }
  }
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `Bonker MCP HTTP ${response.status}`);
  if (payload?.error) throw new Error(payload.error.message || 'Bonker MCP request failed.');
  return { payload, sessionId: response.headers.get('mcp-session-id') || sessionId };
}

function toolResult(payload: any) {
  return payload?.result?.structuredContent || payload?.result?.content || payload?.result || payload;
}

function findDeep(value: any, keys: string[]): any {
  if (!value || typeof value !== 'object') return undefined;
  for (const key of keys) if (value[key] != null) return value[key];
  for (const child of Object.values(value)) {
    const found = findDeep(child, keys);
    if (found != null) return found;
  }
  return undefined;
}

function buildPrepareArgs(schema: any, input: {name:string;symbol:string;description:string;image:string;address:string}) {
  const props = schema?.properties || {};
  const args: Json = {};
  const set = (names: string[], value: any) => {
    const key = names.find((x) => Object.prototype.hasOwnProperty.call(props, x));
    if (key) args[key] = value;
  };
  set(['chain','network'], 'base');
  set(['name','tokenName'], input.name);
  set(['symbol','ticker','tokenSymbol'], input.symbol);
  set(['description','about'], input.description);
  set(['imageUrl','imageURL','image','logoUrl','logo'], input.image);
  set(['creator','creatorAddress','rewardRecipient','recipient','walletAddress'], input.address);
  set(['rewardRecipients'], [{ address: input.address, bps: 10000 }]);
  return args;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = clean(body?.rewardRecipient, 42);
    const name = clean(body?.name, MAX_NAME);
    const symbol = clean(body?.symbol, MAX_SYMBOL).toUpperCase();
    const description = clean(body?.about, MAX_ABOUT);
    const image = clean(body?.image, 2000);

    if (!isAddress(address)) return NextResponse.json({ error: 'Invalid reward wallet address.' }, { status: 400 });
    if (!name || !symbol) return NextResponse.json({ error: 'name and symbol are required.' }, { status: 400 });
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return NextResponse.json({ error: 'Ticker must contain only A-Z and 0-9, max 10 characters.' }, { status: 400 });

    const key = process.env.BONKER_MCP_KEY;
    if (!key) {
      return NextResponse.json({
        error: 'Bonker gasless launch is not configured. Add BONKER_MCP_KEY (bnk_mcp_...) to Vercel Production. Create the key in your Bonker account; Bonker requires a connected wallet plus two linked social accounts and sponsors one Base launch per wallet per 24h.',
      }, { status: 503 });
    }

    // Discover the live MCP schema first so the integration survives small API
    // field-name changes without hard-coding Bonker internals.
    const init = await mcpRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'B20 AI Launcher', version: '1.0.0' },
    }, key, 1);
    let sessionId = init.sessionId;
    const listed = await mcpRequest('tools/list', {}, key, 2, sessionId);
    sessionId = listed.sessionId;
    const tools = listed.payload?.result?.tools || [];
    const prepare = tools.find((t: any) => t.name === 'prepare_launch');
    if (!prepare) throw new Error('Bonker MCP does not expose prepare_launch right now.');

    const prepared = await mcpRequest('tools/call', {
      name: 'prepare_launch',
      arguments: buildPrepareArgs(prepare.inputSchema, { name, symbol, description, image, address }),
    }, key, 3, sessionId);
    sessionId = prepared.sessionId;

    const preparedData = toolResult(prepared.payload);
    const launchId = findDeep(preparedData, ['launchId','launch_id','id','preparedLaunchId']);
    if (!launchId) {
      const errorText = findDeep(preparedData, ['error','message']);
      throw new Error(errorText || 'Bonker prepared the launch but returned no launch ID.');
    }

    const launchTool = tools.find((t: any) => t.name === 'launch_token');
    if (!launchTool) throw new Error('Bonker MCP does not expose launch_token right now.');
    const launchProps = launchTool.inputSchema?.properties || {};
    const launchKey = ['launchId','launch_id','preparedLaunchId','id'].find((x) => Object.prototype.hasOwnProperty.call(launchProps, x)) || 'launchId';
    const launched = await mcpRequest('tools/call', {
      name: 'launch_token',
      arguments: { [launchKey]: launchId },
    }, key, 4, sessionId);

    const launchedData = toolResult(launched.payload);
    const tokenAddress = findDeep(launchedData, ['tokenAddress','token_address','address','contractAddress']);
    const txHash = findDeep(launchedData, ['txHash','tx_hash','transactionHash','transaction_hash','hash']);

    return NextResponse.json({
      ok: true,
      provider: 'bonker',
      sponsored: true,
      chain: 'base',
      tokenAddress,
      txHash,
      launchId,
      rewardRecipient: address,
      note: 'Bonker gas-sponsored launch. One sponsored launch per wallet per rolling 24h.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bonker launch failed.';
    return NextResponse.json({ error: message, provider: 'bonker' }, { status: 502 });
  }
}
