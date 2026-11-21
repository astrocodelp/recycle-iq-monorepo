import { CORS, origin } from '@/lib/mcp/auth';

/** RFC 9728: tells MCP clients where to sign in for /api/mcp. */
export function GET(req: Request) {
  const base = origin(req);
  return Response.json(
    { resource: `${base}/api/mcp`, authorization_servers: [base], bearer_methods_supported: ['header'], resource_name: 'RecycleIQ', scopes_supported: ['recycleiq'] },
    { headers: CORS },
  );
}
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
