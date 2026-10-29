export const MCP_URL = 'https://nhsuk-apimlz-int-uks.azure-api.net/nhsuk/mcp';

export function mcpHeaders() {
  const subscriptionKey = process.env.MCP_SUBSCRIPTION_KEY;
  if (!subscriptionKey) throw new Error('MCP_SUBSCRIPTION_KEY is not configured');

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'Subscription-key': subscriptionKey,
  };
}