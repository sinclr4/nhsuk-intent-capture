import { NextRequest, NextResponse } from 'next/server';

const ENDPOINT = 'https://nhsuk-ai-ap2-uks-resource.services.ai.azure.com/api/projects/nhsuk-ai-ap2-uks';
const API_KEY = process.env.AZURE_AI_API_KEY!;
const AGENT_NAME = 'nhsuk-service-finder';
const AGENT_VERSION = '8';
const BASE = `${ENDPOINT}/openai/v1`;
const AGENT_HEADERS = { 'Content-Type': 'application/json', 'api-key': API_KEY };
const MCP_URL = 'https://nhsuk-mcp-feat-app-uks.azurewebsites.net/mcp';
const POSTCODE_RE = /[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}/i;

// ── MCP helpers ──────────────────────────────────────────────────────────────

async function callMcp(toolName: string, args: Record<string, unknown> = {}): Promise<string | null> {
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

type ServiceType = { id: string; name: string };
let serviceTypesCache: ServiceType[] | null = null;

async function getServiceTypes(): Promise<ServiceType[]> {
  if (serviceTypesCache) return serviceTypesCache;
  try {
    const text = await callMcp('get_nhs_service_types');
    if (!text) return [];
    const parsed = JSON.parse(text) as { services?: ServiceType[] };
    serviceTypesCache = parsed.services ?? [];
    return serviceTypesCache;
  } catch (err) {
    console.error('[getServiceTypes]', err);
    return [];
  }
}

// ── Agent helpers ─────────────────────────────────────────────────────────────

async function postAgent(path: string, body: unknown) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { method: 'POST', headers: AGENT_HEADERS, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(`POST ${url} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function extractAgentText(response: Record<string, unknown>): string {
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

type AgentResponse = {
  status: 'ok' | 'unresolvable';
  results: ServiceResult[] | null;
  message: string | null;
};

async function callAgentForSearch(service: string, postcode: string): Promise<AgentResponse> {
  const conversation = await postAgent('/conversations', {
    items: [{ type: 'message', role: 'user', content: JSON.stringify({ service, postcode }) }],
  });
  const response = await postAgent('/responses', {
    conversation: (conversation as { id: string }).id,
    agent_reference: { name: AGENT_NAME, version: AGENT_VERSION, type: 'agent_reference' },
  });
  const raw = extractAgentText(response)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  return JSON.parse(raw) as AgentResponse;
}

export type ServiceResult = {
  OrganisationName: string;
  OrganisationTypeID: string;
  ODSCode: string;
  Address: string;
  Postcode: string | null;
  Phone: string | null;
  Website: string | null;
  Email: string | null;
  Distance: number;
  Geocode: { Latitude: number; Longitude: number; Postcode: string | null } | null;
  IsOpenNow: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const { service, location } = (await req.json()) as { service?: string; location?: string };
    if (!service?.trim()) {
      return NextResponse.json({ error: 'service is required' }, { status: 400 });
    }
    if (!location?.trim()) {
      return NextResponse.json({ error: 'location is required' }, { status: 400 });
    }

    // 2. Check service against known types (by id or name); use agent as fallback
    const serviceTypes = await getServiceTypes();
    const normalised = service.trim().toLowerCase();
    const directMatch = serviceTypes.find(
      (t) => t.id.toLowerCase() === normalised || t.name.toLowerCase() === normalised,
    );

    if (directMatch) {
      // Direct match — call MCP ourselves
      const text = await callMcp('search_nhs_services', { serviceType: directMatch.id, location: location.trim() });
      if (!text) return NextResponse.json({ results: [], matchedService: directMatch.name });
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const raw = parsed.organisations ?? parsed.results ?? parsed;
        const results: ServiceResult[] = Array.isArray(raw) ? raw : [];
        return NextResponse.json({ results, matchedService: directMatch.name });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isDown = msg.includes('error occurred');
        return NextResponse.json(
          { error: isDown ? 'NHS service search is temporarily unavailable. Please try again in a few minutes.' : 'Unexpected response from NHS service search. Please try again.' },
          { status: 503 },
        );
      }
    }

    // No direct match — agent resolves the service type AND returns search results
    const agentResponse = await callAgentForSearch(service.trim(), location.trim());
    if (agentResponse.status === 'unresolvable') {
      return NextResponse.json({ error: agentResponse.message }, { status: 422 });
    }
    return NextResponse.json({ results: agentResponse.results ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/find-services]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
