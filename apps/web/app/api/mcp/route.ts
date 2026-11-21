import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authorize, CORS, origin } from '@/lib/mcp/auth';
import { buildMcpServer } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * MCP endpoint (Streamable HTTP, stateless) for municipal AI clients: Claude custom connectors, ChatGPT, Claude Code, …
 * Login: OAuth with the demo code, or `Authorization: Bearer <code>`. See docs/MCP.md.
 * Query: ?lang=en for English answers, ?bins=osm for the real (OpenStreetMap) bins.
 */
async function handle(req: Request) {
  if (!authorize(req.headers.get('authorization'))) {
    const base = origin(req);
    return new Response(JSON.stringify({ error: 'unauthorized', error_description: 'Sign in to RecycleIQ (demo login code).' }), {
      status: 401,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/api/mcp"`,
      },
    });
  }
  const url = new URL(req.url);
  const server = buildMcpServer({ lang: url.searchParams.get('lang') === 'en' ? 'en' : 'el', binSource: url.searchParams.get('bins') === 'osm' ? 'osm' : 'synthetic' });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
