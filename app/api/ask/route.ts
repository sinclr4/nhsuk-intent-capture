import { NextRequest, NextResponse } from 'next/server';

const ENDPOINT = process.env.AZURE_AI_ENDPOINT!;
const API_KEY = process.env.AZURE_AI_API_KEY!;
const AGENT_NAME = 'nhsuk-intent-capture';
const AGENT_VERSION = '10';
const BASE = `${ENDPOINT}/openai/v1`;
const HEADERS = { 'Content-Type': 'application/json', 'api-key': API_KEY };
const MCP_URL = 'https://nhsuk-mcp-feat-app-uks.azurewebsites.net/mcp';

async function post(path: string, body: unknown) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(`POST ${url} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function extractText(response: Record<string, unknown>): string {
  if (typeof response.output_text === 'string') return response.output_text;
  type ContentBlock = { type: string; text?: string };
  type OutputItem = { type: string; role?: string; content?: ContentBlock[] };
  const output = response.output as OutputItem[] | undefined;
  return (
    output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .find((c) => c.type === 'output_text' || c.type === 'text')?.text ?? ''
  );
}

function getNhsPath(url: string): string | null {
  if (!url.startsWith('https://www.nhs.uk')) return null;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

async function fetchNhsContent(path: string): Promise<string | null> {
  try {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'search_nhs_content', arguments: { query: '', url: path, maxResults: 1 } },
      }),
    });
    if (!res.ok) return null;
    // MCP server responds with SSE — find the data: line containing the result
    const body = await res.text();
    const dataLine = body.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) return null;
    const data = JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
    type Block = { type: string; text?: string; markdown?: string };
    const result = data?.result as Record<string, unknown> | undefined;
    const blocks = (result?.content as Block[] | undefined) ?? [];
    const block = blocks.find((c) => c.type === 'text');
    if (!block?.text) return null;
    // The text field is itself a JSON payload — extract the markdown from within
    try {
      const inner = JSON.parse(block.text) as Record<string, unknown>;
      // Try common locations for the actual article content
      type Result = { markdown?: string; content?: string; body?: string };
      const results = inner.results as Result[] | undefined;
      if (results?.[0]) {
        return results[0].markdown ?? results[0].content ?? results[0].body ?? null;
      }
      return (inner.markdown ?? inner.content ?? inner.body) as string | null ?? null;
    } catch {
      // If it's not JSON, return the raw text as markdown
      return block.text;
    }
  } catch (err) {
    console.error('[fetchNhsContent]', err);
    return null;
  }
}

type Outcome = {
  recommended: boolean;
  title: string;
  description: string;
  action: { type: 'deepLink' | 'web'; label: string; target: string };
  nhsContent?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { concern } = (await req.json()) as { concern?: string };
    if (!concern?.trim()) {
      return NextResponse.json({ error: 'concern is required' }, { status: 400 });
    }

    const conversation = await post('/conversations', {
      items: [{ type: 'message', role: 'user', content: concern.trim() }],
    });

    const response = await post('/responses', {
      conversation: conversation.id,
      agent_reference: { name: AGENT_NAME, version: AGENT_VERSION, type: 'agent_reference' },
    });

    const raw = extractText(response);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned) as { outcomes: Outcome[] };

    // Fetch NHS article content in parallel for web outcomes on www.nhs.uk
    const outcomes = await Promise.all(
      parsed.outcomes.map(async (o) => {
        const nhsPath = o.action.type === 'web' ? getNhsPath(o.action.target) : null;
        if (!nhsPath) return o;
        return { ...o, nhsContent: await fetchNhsContent(nhsPath) };
      }),
    );

    return NextResponse.json({ outcomes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/ask]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
