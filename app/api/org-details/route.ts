import { NextRequest, NextResponse } from 'next/server';

const MCP_URL = 'https://nhsuk-mcp-feat-app-uks.azurewebsites.net/mcp';

async function callMcp(toolName: string, args: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: toolName, arguments: args } }),
  });
  if (!res.ok) throw new Error(`MCP ${toolName} → ${res.status}`);
  const body = await res.text();
  const dataLine = body.split('\n').find((l) => l.startsWith('data:'));
  if (!dataLine) throw new Error(`MCP ${toolName}: no SSE data line`);
  const data = JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
  type Block = { type: string; text?: string; isError?: boolean };
  const result = data?.result as Record<string, unknown> | undefined;
  const blocks = (result?.content as Block[] | undefined) ?? [];
  const block = blocks.find((c) => c.type === 'text');
  if (!block) return null;
  if (block.isError) throw new Error(`MCP ${toolName} error: ${block.text}`);
  // Some MCP errors arrive as unquoted plain text rather than isError:true
  const text = block.text ?? null;
  if (text && !text.trimStart().startsWith('{') && !text.trimStart().startsWith('[') && !text.trimStart().startsWith('"')) {
    throw new Error(text);
  }
  return text;
}

export async function GET(req: NextRequest) {
  try {
    const odsCode = req.nextUrl.searchParams.get('odsCode');
    if (!odsCode?.trim()) {
      return NextResponse.json({ error: 'odsCode is required' }, { status: 400 });
    }
    const text = await callMcp('get_organisation_details', { odsCode: odsCode.trim() });
    if (!text) return NextResponse.json({ error: 'No details found' }, { status: 404 });
    return NextResponse.json(JSON.parse(text));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/org-details]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
