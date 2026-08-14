import { NextRequest, NextResponse } from 'next/server';

const MCP_URL = 'https://nhsuk-mcp-feat-app-uks.azurewebsites.net/mcp';

type NhsResult = { title?: string; markdown?: string; content?: string; body?: string; url?: string };

async function callMcp(args: Record<string, unknown>): Promise<NhsResult[] | null> {
  try {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'search_nhs_content', arguments: args },
      }),
    });
    if (!res.ok) return null;

    const body = await res.text();
    const dataLine = body.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) return null;

    const data = JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>;
    type Block = { type: string; text?: string };
    const result = data?.result as Record<string, unknown> | undefined;
    const blocks = (result?.content as Block[] | undefined) ?? [];
    const block = blocks.find((c) => c.type === 'text');
    if (!block?.text) return null;

    try {
      const inner = JSON.parse(block.text) as Record<string, unknown>;
      const results = inner.results as NhsResult[] | undefined;
      if (results?.length) return results;
      // Single result at top level
      const md = (inner.markdown ?? inner.content ?? inner.body) as string | undefined;
      if (md) return [{ markdown: md }];
      return null;
    } catch {
      return [{ markdown: block.text }];
    }
  } catch (err) {
    console.error('[health-az callMcp]', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, url } = (await req.json()) as { query?: string; url?: string };

    if (!query?.trim() && !url?.trim()) {
      return NextResponse.json({ error: 'query or url is required' }, { status: 400 });
    }

    let results: NhsResult[] | null = null;

    if (url?.trim()) {
      const path = url.startsWith('https://www.nhs.uk')
        ? new URL(url).pathname
        : url.startsWith('/')
          ? url
          : `/${url}`;
      results = await callMcp({ url: path, maxResults: 1 });
    } else {
      results = await callMcp({ query: query!.trim(), maxResults: 3 });
    }

    if (!results?.length) {
      return NextResponse.json({ error: 'No content found for that search' }, { status: 404 });
    }

    // Single URL fetch or first result for direct content display
    const first = results[0];
    const content = first.markdown ?? first.content ?? first.body;
    if (!content) {
      return NextResponse.json({ error: 'No content found for that search' }, { status: 404 });
    }

    return NextResponse.json({ content, title: first.title });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Something went wrong' },
      { status: 500 },
    );
  }
}
